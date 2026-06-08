import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { track } from '../lib/analytics'

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
    (set, get) => ({
      bookmarks: [],
      lastRead: null,
      toggleBookmark: (key) => {
        const has = get().bookmarks.includes(key)
        track(has ? 'bookmark_remove' : 'bookmark_add', { verse_key: key })
        set((s) => ({
          bookmarks: has ? s.bookmarks.filter((k) => k !== key) : [...s.bookmarks, key],
        }))
      },
      setLastRead: (chapterId, verseKey = null) => set({ lastRead: { chapterId, verseKey } }),
      clearLastRead: () => set({ lastRead: null }),
    }),
    { name: 'quran-bookmarks' },
  ),
)
