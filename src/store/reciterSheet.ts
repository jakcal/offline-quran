import { create } from 'zustand'

interface ReciterSheetState {
  open: boolean
  show: () => void
  hide: () => void
}

/** Global reciter picker sheet, openable from the home chip or a surah sheet. */
export const useReciterSheet = create<ReciterSheetState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}))
