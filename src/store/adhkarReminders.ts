import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ADHKAR } from '../data'
import type { AdhkarSlot } from '../lib/types'

export const SLOTS: AdhkarSlot[] = ['morning', 'evening']

export const SLOT_LABEL: Record<AdhkarSlot, { en: string; ar: string }> = {
  morning: { en: 'Morning adhkar', ar: 'أذكار الصباح' },
  evening: { en: 'Evening adhkar', ar: 'أذكار المساء' },
}

interface AdhkarRemindersState {
  enabled: Record<AdhkarSlot, boolean>
  /** Local wall-clock time in 24h `HH:MM`, matching `<input type="time">`. */
  time: Record<AdhkarSlot, string>
  /** Timestamp of the reminder occurrence we last fired, per slot. */
  lastFired: Record<AdhkarSlot, number>
  /** Index into the slot's dhikr list, so each reminder shows a different one. */
  rotation: Record<AdhkarSlot, number>

  setEnabled: (slot: AdhkarSlot, on: boolean) => void
  setTime: (slot: AdhkarSlot, time: string) => void
  markFired: (slot: AdhkarSlot, occurrence: number) => void
  /** The dhikr this slot will show next, without advancing the rotation. */
  nextDhikr: (slot: AdhkarSlot) => (typeof ADHKAR)[AdhkarSlot][number]
}

/** Adhkar reminder preferences, persisted to localStorage so they survive reloads. */
export const useAdhkarReminders = create<AdhkarRemindersState>()(
  persist(
    (set, get) => ({
      enabled: { morning: false, evening: false },
      time: { morning: '07:00', evening: '17:30' },
      lastFired: { morning: 0, evening: 0 },
      rotation: { morning: 0, evening: 0 },

      setEnabled: (slot, on) => set((s) => ({ enabled: { ...s.enabled, [slot]: on } })),
      setTime: (slot, time) =>
        set((s) => ({
          time: { ...s.time, [slot]: time },
          // A time change starts a fresh schedule — don't let an old firing
          // suppress the newly-chosen slot later today.
          lastFired: { ...s.lastFired, [slot]: 0 },
        })),
      markFired: (slot, occurrence) =>
        set((s) => ({
          lastFired: { ...s.lastFired, [slot]: Math.max(s.lastFired[slot], occurrence) },
          rotation: { ...s.rotation, [slot]: (s.rotation[slot] + 1) % ADHKAR[slot].length },
        })),
      nextDhikr: (slot) => ADHKAR[slot][get().rotation[slot] % ADHKAR[slot].length],
    }),
    { name: 'quran-adhkar-reminders' },
  ),
)
