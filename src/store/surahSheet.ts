import { create } from 'zustand'

interface SurahSheetState {
  chapterId: number | null
  open: (chapterId: number) => void
  close: () => void
}

/** The Listen/Read detail sheet shown when a surah is tapped. */
export const useSurahSheet = create<SurahSheetState>((set) => ({
  chapterId: null,
  open: (chapterId) => set({ chapterId }),
  close: () => set({ chapterId: null }),
}))
