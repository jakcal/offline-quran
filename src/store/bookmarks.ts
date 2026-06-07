import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LastRead {
  chapterId: number
  verseKey: string | null
}

interface BookmarksState {
  bookmarks: string[] // verse keys, e.g. "2:255"
  lastRead: LastRead | null
  toggleBookmark: (key: string) => void
  setLastRead: (chapterId: number, verseKey?: string | null) => void
  clearLastRead: () => void
}

export const useBookmarks = create<BookmarksState>()(
  persist(
    (set) => ({
      bookmarks: [],
      lastRead: null,
      toggleBookmark: (key) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(key)
            ? s.bookmarks.filter((k) => k !== key)
            : [...s.bookmarks, key],
        })),
      setLastRead: (chapterId, verseKey = null) => set({ lastRead: { chapterId, verseKey } }),
      clearLastRead: () => set({ lastRead: null }),
    }),
    { name: 'quran-bookmarks' },
  ),
)
