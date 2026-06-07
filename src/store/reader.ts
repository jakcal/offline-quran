import { create } from 'zustand'

interface ReaderState {
  /** Chapter currently open in the reader, or null when closed. */
  chapterId: number | null
  open: (chapterId: number) => void
  close: () => void
}

export const useReader = create<ReaderState>((set) => ({
  chapterId: null,
  open: (chapterId) => set({ chapterId }),
  close: () => set({ chapterId: null }),
}))
