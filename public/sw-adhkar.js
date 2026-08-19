/**
 * Adhkar reminders, service-worker side.
 *
 * Imported into the generated Workbox worker (see vite.config.ts) so it can:
 *   - focus/open the app when a reminder notification is tapped, and
 *   - fire reminders that fall due while the app is closed, on installed
 *     Chromium PWAs that grant Periodic Background Sync.
 *
 * The schedule is mirrored into IndexedDB by src/lib/notifications.ts under the
 * `adhkarSchedule` key of Dexie's `meta` table — the worker cannot read the
 * app's localStorage, so IndexedDB is the shared channel between the two.
 */

const DB_NAME = 'offline-quran'
const META_STORE = 'meta'
const SCHEDULE_KEY = 'adhkarSchedule'
const SYNC_TAG = 'adhkar-check'

const SLOTS = ['morning', 'evening']
const SLOT_LABEL = {
  morning: { en: 'Morning adhkar', ar: 'أذكار الصباح' },
  evening: { en: 'Evening adhkar', ar: 'أذكار المساء' },
}

function openDb() {
  return new Promise((resolve, reject) => {
    // No version: attach to whatever the app already created, never upgrade.
    const request = indexedDB.open(DB_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function readSchedule(db) {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(META_STORE)) return resolve(null)
    const request = db.transaction(META_STORE, 'readonly').objectStore(META_STORE).get(SCHEDULE_KEY)
    request.onsuccess = () => resolve(request.result ? request.result.value : null)
    request.onerror = () => resolve(null)
  })
}

function writeSchedule(db, value) {
  return new Promise((resolve) => {
    if (!db.objectStoreNames.contains(META_STORE)) return resolve()
    const tx = db.transaction(META_STORE, 'readwrite')
    tx.objectStore(META_STORE).put({ key: SCHEDULE_KEY, value })
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

/** The most recent time `HH:MM` was due, at or before `now`. Mirrors lib/notifications.ts. */
function lastOccurrenceAtOrBefore(now, time) {
  const parts = String(time).split(':')
  const hours = Number(parts[0]) || 0
  const minutes = Number(parts[1]) || 0

  const today = new Date(now)
  today.setHours(hours, minutes, 0, 0)
  if (today.getTime() <= now) return today.getTime()

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(hours, minutes, 0, 0)
  return yesterday.getTime()
}

function formatDhikr(dhikr) {
  const times = dhikr.count > 1 ? ' (×' + dhikr.count + ')' : ''
  return dhikr.arabic + times + '\n' + dhikr.english
}

/** Fire every reminder that came due while the app was closed. */
async function checkDueReminders() {
  if (self.Notification && self.Notification.permission !== 'granted') return

  let db
  try {
    db = await openDb()
  } catch {
    return
  }

  const schedule = await readSchedule(db)
  if (!schedule || !schedule.enabled) return

  const now = Date.now()
  const window = schedule.catchUpWindowMs || 6 * 60 * 60 * 1000
  let changed = false

  for (const slot of SLOTS) {
    if (!schedule.enabled[slot]) continue

    const list = (schedule.adhkar && schedule.adhkar[slot]) || []
    if (list.length === 0) continue

    const due = lastOccurrenceAtOrBefore(now, schedule.time[slot])
    if (due <= (schedule.lastFired[slot] || 0) || now - due > window) continue

    const index = (schedule.rotation[slot] || 0) % list.length
    const dhikr = list[index]

    await self.registration.showNotification(SLOT_LABEL[slot].ar + ' · ' + SLOT_LABEL[slot].en, {
      body: formatDhikr(dhikr),
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'adhkar-' + slot,
      renotify: true,
      lang: 'ar',
      dir: 'auto',
      data: { url: '/', slot },
    })

    schedule.lastFired[slot] = due
    schedule.rotation[slot] = (index + 1) % list.length
    changed = true
  }

  // Persist so the app doesn't re-show these the next time it opens.
  if (changed) await writeSchedule(db, schedule)
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === SYNC_TAG) event.waitUntil(checkDueReminders())
})

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {}
  if (!data.slot) return // not ours — leave it to any other handler

  event.notification.close()
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(data.url || '/')
    })(),
  )
})
