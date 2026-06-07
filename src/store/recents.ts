import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RecentsState {
  lastListened: { chapterId: number; reciterId: number } | null
  setLastListened: (chapterId: number, reciterId: number) => void
  clear: () => void
}

/** Remembers the most recent listen so the home can offer "Continue listening". */
export const useRecents = create<RecentsState>()(
  persist(
    (set) => ({
      lastListened: null,
      setLastListened: (chapterId, reciterId) => set({ lastListened: { chapterId, reciterId } }),
      clear: () => set({ lastListened: null }),
    }),
    { name: 'quran-recents' },
  ),
)
