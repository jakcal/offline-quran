import { ADHKAR } from '../data'
import { SLOTS, SLOT_LABEL, useAdhkarReminders } from '../store/adhkarReminders'
import { track } from './analytics'
import { getMeta, setMeta } from './db'
import type { AdhkarSlot, Dhikr } from './types'

/**
 * Local adhkar reminders.
 *
 * The web has no reliable background scheduler — the Notification Triggers API
 * never shipped — so a reminder fires through whichever of these gets there first:
 *
 *  1. A timer, while the app is open (or backgrounded but not yet discarded).
 *  2. A catch-up check on startup / when the tab becomes visible again, which
 *     fires a reminder that came due while the app was closed.
 *  3. Periodic Background Sync (installed Chromium PWAs only), where the service
 *     worker wakes up on its own and checks the schedule mirrored into IndexedDB.
 *
 * On iOS only (1) and (2) apply, so a reminder there lands when the app is next
 * opened. The UI says as much rather than promising alarm-clock behaviour.
 */

/** Key for the schedule snapshot the service worker reads (see public/sw-adhkar.js). */
const SCHEDULE_KEY = 'adhkarSchedule'

/** How late a missed reminder can be and still be worth showing on catch-up. */
const CATCH_UP_WINDOW_MS = 6 * 60 * 60 * 1000

/** Re-check at least this often, since long timers get throttled or suspended. */
const MAX_TIMER_MS = 30 * 60 * 1000

export interface ScheduleSnapshot {
  enabled: Record<AdhkarSlot, boolean>
  time: Record<AdhkarSlot, string>
  lastFired: Record<AdhkarSlot, number>
  rotation: Record<AdhkarSlot, number>
  catchUpWindowMs: number
  /** Texts inlined so the service worker needs no bundle access. */
  adhkar: Record<AdhkarSlot, Dhikr[]>
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function notificationPermission(): NotificationPermission {
  return notificationsSupported() ? Notification.permission : 'denied'
}

/** Ask the browser for notification permission. Must be called from a user gesture. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission

  const result = await Notification.requestPermission()
  track('notification_permission', { result })
  return result
}

// ---------------------------------------------------------------------------
// Occurrence math
// ---------------------------------------------------------------------------

function parseTime(time: string): [number, number] {
  const [h, m] = time.split(':').map(Number)
  return [Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0]
}

/** Timestamp of `time` on the local day `dayOffset` days from `now`. */
function occurrence(now: number, time: string, dayOffset: number): number {
  const [h, m] = parseTime(time)
  const d = new Date(now)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

/** The most recent time this reminder was due, at or before `now`. */
export function lastOccurrenceAtOrBefore(now: number, time: string): number {
  const today = occurrence(now, time, 0)
  return today <= now ? today : occurrence(now, time, -1)
}

/** The next time this reminder falls due, strictly after `now`. */
export function nextOccurrenceAfter(now: number, time: string): number {
  const today = occurrence(now, time, 0)
  return today > now ? today : occurrence(now, time, 1)
}

// ---------------------------------------------------------------------------
// Showing a notification
// ---------------------------------------------------------------------------

export function formatDhikr(dhikr: Dhikr): string {
  const times = dhikr.count > 1 ? ` (×${dhikr.count})` : ''
  return `${dhikr.arabic}${times}\n${dhikr.english}`
}

/**
 * Show one dhikr as a notification. Goes through the service-worker registration
 * because `new Notification()` is not allowed on Android Chrome; the constructor
 * is only a desktop fallback for when no worker is registered yet.
 */
export async function showDhikrNotification(slot: AdhkarSlot, dhikr: Dhikr): Promise<void> {
  if (notificationPermission() !== 'granted') return

  const title = `${SLOT_LABEL[slot].ar} · ${SLOT_LABEL[slot].en}`
  const options = {
    body: formatDhikr(dhikr),
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: `adhkar-${slot}`,
    renotify: true,
    lang: 'ar',
    dir: 'auto',
    data: { url: '/', slot },
  } as NotificationOptions

  const registration = await navigator.serviceWorker.getRegistration()
  if (registration) {
    await registration.showNotification(title, options)
    return
  }
  try {
    new Notification(title, options)
  } catch {
    // Constructor is unavailable on mobile — nothing more we can do here.
  }
}

/** Fire a slot's reminder right now, on demand (the "Preview" button). */
export async function previewReminder(slot: AdhkarSlot): Promise<void> {
  await showDhikrNotification(slot, useAdhkarReminders.getState().nextDhikr(slot))
  track('adhkar_reminder_preview', { slot })
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

let timer: ReturnType<typeof setTimeout> | undefined
let started = false

async function fire(slot: AdhkarSlot, due: number): Promise<void> {
  const state = useAdhkarReminders.getState()
  const dhikr = state.nextDhikr(slot)
  // Mark before awaiting so a concurrent check can't fire the same one twice.
  state.markFired(slot, due)
  await showDhikrNotification(slot, dhikr)
  track('adhkar_reminder', { slot })
}

/** Fire anything that is due, then arm a timer for whatever comes next. */
function evaluate(): void {
  if (timer !== undefined) clearTimeout(timer)
  timer = undefined

  const { enabled, time, lastFired } = useAdhkarReminders.getState()
  const now = Date.now()
  let soonest = Infinity

  for (const slot of SLOTS) {
    if (!enabled[slot]) continue

    const due = lastOccurrenceAtOrBefore(now, time[slot])
    // Anything older than the catch-up window is left unfired and unmarked:
    // tomorrow's occurrence becomes the next due one and fires on time.
    if (due > lastFired[slot] && now - due <= CATCH_UP_WINDOW_MS && notificationPermission() === 'granted') {
      void fire(slot, due)
    }
    soonest = Math.min(soonest, nextOccurrenceAfter(now, time[slot]))
  }

  if (soonest === Infinity) return
  timer = setTimeout(evaluate, Math.min(Math.max(soonest - now, 1000), MAX_TIMER_MS))
}

/** Mirror the schedule into IndexedDB so the service worker can act on it. */
async function syncScheduleToWorker(): Promise<void> {
  const { enabled, time, lastFired, rotation } = useAdhkarReminders.getState()
  const snapshot: ScheduleSnapshot = {
    enabled,
    time,
    lastFired,
    rotation,
    catchUpWindowMs: CATCH_UP_WINDOW_MS,
    adhkar: ADHKAR,
  }
  await setMeta(SCHEDULE_KEY, snapshot).catch(() => {})
  await updatePeriodicSync(SLOTS.some((s) => enabled[s]))
}

/**
 * Ask for background wake-ups so reminders can fire with the app closed. Only
 * installed Chromium PWAs grant this; everywhere else it silently no-ops.
 */
async function updatePeriodicSync(wanted: boolean): Promise<void> {
  try {
    const registration = (await navigator.serviceWorker.getRegistration()) as
      | (ServiceWorkerRegistration & {
          periodicSync?: {
            register: (tag: string, opts: { minInterval: number }) => Promise<void>
            unregister: (tag: string) => Promise<void>
          }
        })
      | undefined
    const periodicSync = registration?.periodicSync
    if (!periodicSync) return

    if (!wanted) {
      await periodicSync.unregister('adhkar-check')
      return
    }
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName,
    })
    if (status.state !== 'granted') return
    await periodicSync.register('adhkar-check', { minInterval: 60 * 60 * 1000 })
  } catch {
    // Unsupported or refused — timers and catch-up still cover the app being open.
  }
}

/**
 * Pull back anything the service worker fired while the app was closed, so we
 * don't show the same reminder a second time on the next open.
 */
async function hydrateFromWorker(): Promise<void> {
  const saved = await getMeta<ScheduleSnapshot>(SCHEDULE_KEY).catch(() => undefined)
  if (!saved?.lastFired) return

  useAdhkarReminders.setState((s) => ({
    lastFired: {
      morning: Math.max(s.lastFired.morning, saved.lastFired.morning ?? 0),
      evening: Math.max(s.lastFired.evening, saved.lastFired.evening ?? 0),
    },
    rotation: saved.rotation ?? s.rotation,
  }))
}

/** Start the reminder scheduler. Safe to call once on app start. */
export function startAdhkarReminders(): void {
  if (started || !notificationsSupported()) return
  started = true

  void hydrateFromWorker().then(() => {
    evaluate()
    void syncScheduleToWorker()
  })

  // Re-check whenever the app comes back — timers get throttled or dropped
  // entirely while a tab is backgrounded, and the device clock may have moved.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') evaluate()
  })
  window.addEventListener('focus', evaluate)

  useAdhkarReminders.subscribe(() => {
    evaluate()
    void syncScheduleToWorker()
  })
}
