import { useEffect, useState } from 'react'
import { formatDuration } from '../lib/format'
import {
  nextOccurrenceAfter,
  notificationPermission,
  notificationsSupported,
  previewReminder,
  requestNotificationPermission,
} from '../lib/notifications'
import type { AdhkarSlot } from '../lib/types'
import { SLOTS, SLOT_LABEL, useAdhkarReminders } from '../store/adhkarReminders'
import { BellIcon, MoonIcon, SunriseIcon } from './icons'

const SLOT_ICON = { morning: SunriseIcon, evening: MoonIcon }

/** A clock that ticks while the sheet is open, so "in 3h 12m" stays honest. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [active])
  return now
}

/** Reminder settings for the morning + evening adhkar. */
export function AdhkarReminders() {
  const [permission, setPermission] = useState(notificationPermission)
  const enabled = useAdhkarReminders((s) => s.enabled)
  const time = useAdhkarReminders((s) => s.time)
  const setEnabled = useAdhkarReminders((s) => s.setEnabled)
  const setTime = useAdhkarReminders((s) => s.setTime)

  const anyOn = SLOTS.some((slot) => enabled[slot])
  const now = useNow(anyOn)

  const supported = notificationsSupported()

  async function toggle(slot: AdhkarSlot, on: boolean) {
    if (!on) {
      setEnabled(slot, false)
      return
    }
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'granted') setEnabled(slot, true)
  }

  return (
    <section className="space-y-2 pt-2">
      <h3 className="flex items-center gap-2 px-1 text-sm font-bold">
        <BellIcon className="h-4 w-4 text-brand" />
        Adhkar reminders
      </h3>

      {!supported ? (
        <p className="rounded-card border border-line bg-surface px-4 py-3 text-xs text-muted">
          This browser can&apos;t show notifications. On iPhone, add Offline Quran to your Home Screen
          first, then open it from there.
        </p>
      ) : (
        <>
          {SLOTS.map((slot) => (
            <SlotRow
              key={slot}
              slot={slot}
              on={enabled[slot]}
              time={time[slot]}
              now={now}
              onToggle={(on) => void toggle(slot, on)}
              onTimeChange={(value) => setTime(slot, value)}
            />
          ))}

          {permission === 'denied' && (
            <p className="px-1 text-xs text-muted">
              Notifications are blocked for this site. Allow them in your browser&apos;s site settings
              to turn reminders on.
            </p>
          )}

          <p className="px-1 text-xs text-muted">
            Reminders arrive while the app is open, and a missed one shows the next time you open it.
            Installed on Android, they can also arrive in the background.
          </p>
        </>
      )}
    </section>
  )
}

interface SlotRowProps {
  slot: AdhkarSlot
  on: boolean
  time: string
  now: number
  onToggle: (on: boolean) => void
  onTimeChange: (time: string) => void
}

function SlotRow({ slot, on, time, now, onToggle, onTimeChange }: SlotRowProps) {
  const Icon = SLOT_ICON[slot]
  const dueIn = Math.round((nextOccurrenceAfter(now, time) - now) / 1000)

  return (
    <div className="rounded-card border border-line bg-surface">
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon className={`h-5 w-5 shrink-0 ${on ? 'text-brand' : 'text-muted'}`} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{SLOT_LABEL[slot].en}</span>
          <span className="block font-arabic text-xs text-muted" dir="rtl">
            {SLOT_LABEL[slot].ar}
          </span>
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${SLOT_LABEL[slot].en} reminder`}
          onClick={() => onToggle(!on)}
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-line'}`}
        >
          {/* Anchored with left/top rather than the knob's static position,
              which a button's centred text alignment would otherwise shift. */}
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              on ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {on && (
        <div className="flex items-center gap-3 border-t border-line px-4 py-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">At</span>
            <input
              type="time"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              aria-label={`${SLOT_LABEL[slot].en} time`}
              className="rounded-lg border border-line bg-paper px-2 py-1 font-semibold text-ink"
            />
          </label>

          <span className="min-w-0 flex-1 truncate text-xs text-muted">in {formatDuration(dueIn)}</span>

          <button
            type="button"
            onClick={() => void previewReminder(slot)}
            className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-semibold text-brand active:bg-line"
          >
            Preview
          </button>
        </div>
      )}
    </div>
  )
}
