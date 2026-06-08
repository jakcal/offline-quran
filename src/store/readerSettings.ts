import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { track } from '../lib/analytics'

export type ReaderTheme = 'light' | 'sepia' | 'green' | 'dark'
export type ReaderView = 'continuous' | 'paged'
export type ReaderScript = 'uthmani' | 'indopak' | 'tajweed'

const FONT_MIN = 1.3
const FONT_MAX = 3.0
const FONT_STEP = 0.15
const LINE_MIN = 1.9
const LINE_MAX = 3.4
const LINE_STEP = 0.25

interface ReaderSettingsState {
  theme: ReaderTheme
  script: ReaderScript
  view: ReaderView
  fontSize: number // rem
  lineHeight: number // unitless
  hideMarkers: boolean
  setTheme: (t: ReaderTheme) => void
  setScript: (s: ReaderScript) => void
  setView: (v: ReaderView) => void
  toggleMarkers: () => void
  incFont: () => void
  decFont: () => void
  incLine: () => void
  decLine: () => void
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, +n.toFixed(2)))

/** Reader preferences, persisted to localStorage so they survive reloads. */
export const useReaderSettings = create<ReaderSettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      script: 'uthmani',
      view: 'continuous',
      fontSize: 1.8,
      lineHeight: 2.45,
      hideMarkers: false,
      setTheme: (theme) => {
        track('reader_setting', { setting: 'theme', value: theme })
        set({ theme })
      },
      setScript: (script) => {
        track('reader_setting', { setting: 'script', value: script })
        set({ script })
      },
      setView: (view) => {
        track('reader_setting', { setting: 'layout', value: view })
        set({ view })
      },
      toggleMarkers: () =>
        set((s) => {
          track('reader_setting', { setting: 'hide_markers', value: !s.hideMarkers })
          return { hideMarkers: !s.hideMarkers }
        }),
      incFont: () => {
        track('reader_setting', { setting: 'font_size', value: 'inc' })
        set((s) => ({ fontSize: clamp(s.fontSize + FONT_STEP, FONT_MIN, FONT_MAX) }))
      },
      decFont: () => {
        track('reader_setting', { setting: 'font_size', value: 'dec' })
        set((s) => ({ fontSize: clamp(s.fontSize - FONT_STEP, FONT_MIN, FONT_MAX) }))
      },
      incLine: () => {
        track('reader_setting', { setting: 'line_spacing', value: 'inc' })
        set((s) => ({ lineHeight: clamp(s.lineHeight + LINE_STEP, LINE_MIN, LINE_MAX) }))
      },
      decLine: () => {
        track('reader_setting', { setting: 'line_spacing', value: 'dec' })
        set((s) => ({ lineHeight: clamp(s.lineHeight - LINE_STEP, LINE_MIN, LINE_MAX) }))
      },
    }),
    { name: 'quran-reader-settings' },
  ),
)

export const FONT_BOUNDS = { min: FONT_MIN, max: FONT_MAX }
export const LINE_BOUNDS = { min: LINE_MIN, max: LINE_MAX }
