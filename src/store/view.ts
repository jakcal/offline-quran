import { create } from 'zustand'

export type AppView = 'quran' | 'hadith'

interface ViewState {
  view: AppView
  setView: (v: AppView) => void
}

/** Top-level section the home is showing: Quran (listen/read) or Hadith. */
export const useView = create<ViewState>((set) => ({
  view: 'quran',
  setView: (view) => set({ view }),
}))
