import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LastListened {
  chapterId: number
  reciterId: number
  position: number // seconds into the surah audio
  duration: number // total seconds (0 until known)
}

interface RecentsState {
  lastListened: LastListened | null
  setLastListened: (chapterId: number, reciterId: number, position: number, duration: number) => void
  clear: () => void
}

/** Remembers the most recent listen + position so the home can resume it. */
export const useRecents = create<RecentsState>()(
  persist(
    (set) => ({
      lastListened: null,
      setLastListened: (chapterId, reciterId, position, duration) =>
        set({ lastListened: { chapterId, reciterId, position, duration } }),
      clear: () => set({ lastListened: null }),
    }),
    { name: 'quran-recents' },
  ),
)
