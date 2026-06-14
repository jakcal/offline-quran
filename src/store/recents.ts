import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { audioKey } from '../lib/db'

export interface ListenProgress {
  chapterId: number
  reciterId: number
  position: number // seconds into the surah audio
  duration: number // total seconds (0 until known)
  updatedAt: number // epoch ms of the last update, for "most recent" ordering
}

interface RecentsState {
  /** Saved listening position per recording, keyed by `reciterId:chapterId`. */
  entries: Record<string, ListenProgress>
  /** Key of the most recently played recording, for the "Continue" card. */
  lastKey: string | null
  setLastListened: (chapterId: number, reciterId: number, position: number, duration: number) => void
  /** Saved progress for one specific recording, if any (imperative read). */
  progressFor: (chapterId: number, reciterId: number) => ListenProgress | undefined
  /** Forget the "Continue" pointer (keeps per-surah positions). */
  clear: () => void
}

/**
 * Remembers listening position **per surah + reciter**, so every recording keeps
 * its own place — switching between surahs no longer wipes where you were.
 * `lastKey` points at the most recent one for the home "Continue" card.
 */
export const useRecents = create<RecentsState>()(
  persist(
    (set, get) => ({
      entries: {},
      lastKey: null,
      setLastListened: (chapterId, reciterId, position, duration) => {
        const key = audioKey(reciterId, chapterId)
        // Coerce away NaN/±Infinity so a bad audio reading can't poison the
        // store (and later render `width: NaN%` in progress bars).
        const pos = Number.isFinite(position) && position > 0 ? position : 0
        const dur = Number.isFinite(duration) && duration > 0 ? duration : 0
        set((s) => {
          const prev = s.entries[key]
          // Keep a previously-known duration if this update hasn't learned it yet.
          const known = dur > 0 ? dur : (prev && prev.duration > 0 ? prev.duration : 0)
          return {
            entries: {
              ...s.entries,
              [key]: { chapterId, reciterId, position: pos, duration: known, updatedAt: Date.now() },
            },
            lastKey: key,
          }
        })
      },
      progressFor: (chapterId, reciterId) => get().entries[audioKey(reciterId, chapterId)],
      clear: () => set({ lastKey: null }),
    }),
    {
      name: 'quran-recents',
      version: 1,
      // v0 stored a single `lastListened`; promote it into the per-surah map.
      migrate: (persisted, version) => {
        if (version >= 1) return persisted as RecentsState
        const l = (persisted as { lastListened?: Partial<ListenProgress> } | undefined)?.lastListened
        if (l && l.chapterId != null && l.reciterId != null) {
          const key = audioKey(l.reciterId, l.chapterId)
          const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)
          return {
            entries: {
              [key]: {
                chapterId: l.chapterId,
                reciterId: l.reciterId,
                position: num(l.position),
                duration: num(l.duration),
                updatedAt: 0,
              },
            },
            lastKey: key,
          } as Partial<RecentsState>
        }
        return { entries: {}, lastKey: null } as Partial<RecentsState>
      },
    },
  ),
)
