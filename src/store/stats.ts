import { create } from 'zustand'
import { addListenSeconds, clearStats, getAllStats, incrementPlay } from '../lib/db'
import type { SurahStat } from '../lib/types'

interface StatsState {
  /** Per-surah totals, keyed by chapterId. Mirrors the IndexedDB `stats` table. */
  byChapter: Record<number, SurahStat>
  loaded: boolean
  /** Hydrate from IndexedDB once on app start. */
  load: () => Promise<void>
  /** Add listened audio-seconds to a surah (in-memory + persisted). */
  addListen: (chapterId: number, seconds: number) => void
  /** Count one new listening session for a surah. */
  addPlay: (chapterId: number) => void
  /** Wipe all stats. */
  reset: () => Promise<void>
}

const blank = (chapterId: number): SurahStat => ({ chapterId, plays: 0, seconds: 0, lastPlayedAt: 0 })

export const useStats = create<StatsState>((set, get) => ({
  byChapter: {},
  loaded: false,

  load: async () => {
    if (get().loaded) return
    const all = await getAllStats()
    const byChapter: Record<number, SurahStat> = {}
    for (const s of all) byChapter[s.chapterId] = s
    set({ byChapter, loaded: true })
  },

  addListen: (chapterId, seconds) => {
    if (!(seconds > 0)) return
    set((s) => {
      const cur = s.byChapter[chapterId] ?? blank(chapterId)
      return {
        byChapter: { ...s.byChapter, [chapterId]: { ...cur, seconds: cur.seconds + seconds, lastPlayedAt: Date.now() } },
      }
    })
    void addListenSeconds(chapterId, seconds)
  },

  addPlay: (chapterId) => {
    set((s) => {
      const cur = s.byChapter[chapterId] ?? blank(chapterId)
      return {
        byChapter: { ...s.byChapter, [chapterId]: { ...cur, plays: cur.plays + 1, lastPlayedAt: Date.now() } },
      }
    })
    void incrementPlay(chapterId)
  },

  reset: async () => {
    set({ byChapter: {} })
    await clearStats()
  },
}))

/** Summed totals across all surahs, for the global "Your listening" view. */
export interface GlobalStats {
  seconds: number
  plays: number
  surahs: number // distinct surahs with any listening time
}

export function globalStats(byChapter: Record<number, SurahStat>): GlobalStats {
  let seconds = 0
  let plays = 0
  let surahs = 0
  for (const s of Object.values(byChapter)) {
    seconds += s.seconds
    plays += s.plays
    if (s.seconds > 0) surahs += 1
  }
  return { seconds, plays, surahs }
}
