import { create } from 'zustand'

interface SettingsSheetState {
  open: boolean
  show: () => void
  hide: () => void
}

/** Bottom sheet holding reciter choice + offline-download options. */
export const useSettingsSheet = create<SettingsSheetState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}))
