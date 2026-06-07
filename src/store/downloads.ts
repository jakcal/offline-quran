import { create } from 'zustand'
import { audioKey, deleteAudio, getDownloadedKeys, getMeta, setMeta, totalCacheSize } from '../lib/db'
import { downloadChapter } from '../lib/download'
import type { DownloadProgress } from '../lib/types'

// In-flight requests live outside React state — they aren't serialisable.
const controllers = new Map<string, AbortController>()

interface DownloadsState {
  /** Keys (`reciterId:chapterId`) of fully-cached surahs. */
  downloaded: Set<string>
  /** Live progress for in-flight / failed downloads, keyed the same way. */
  progress: Record<string, DownloadProgress>
  cacheSize: number
  /** When true, every played surah is auto-saved for offline (default on). */
  autoDownload: boolean

  init: () => Promise<void>
  setAutoDownload: (on: boolean) => void
  /** Idempotently ensure a surah is cached; safe to fire-and-forget. */
  ensure: (reciterId: number, chapterId: number, url?: string) => Promise<void>
  cancel: (reciterId: number, chapterId: number) => void
  remove: (reciterId: number, chapterId: number) => Promise<void>
}

export const useDownloads = create<DownloadsState>((set, get) => ({
  downloaded: new Set(),
  progress: {},
  cacheSize: 0,
  autoDownload: true,

  init: async () => {
    const [keys, size, auto] = await Promise.all([
      getDownloadedKeys(),
      totalCacheSize(),
      getMeta<boolean>('autoDownload'),
    ])
    set({ downloaded: new Set(keys), cacheSize: size, autoDownload: auto ?? true })
  },

  setAutoDownload: (on) => {
    set({ autoDownload: on })
    void setMeta('autoDownload', on)
  },

  ensure: async (reciterId, chapterId, url) => {
    const key = audioKey(reciterId, chapterId)
    if (get().downloaded.has(key) || controllers.has(key)) return

    const controller = new AbortController()
    controllers.set(key, controller)
    set((s) => ({ progress: { ...s.progress, [key]: { state: 'downloading', received: 0, total: 0 } } }))

    try {
      await downloadChapter(reciterId, chapterId, {
        url,
        signal: controller.signal,
        onProgress: (received, total) => {
          set((s) => ({ progress: { ...s.progress, [key]: { state: 'downloading', received, total } } }))
        },
      })
      const size = await totalCacheSize()
      set((s) => {
        const downloaded = new Set(s.downloaded).add(key)
        const progress = { ...s.progress }
        delete progress[key]
        return { downloaded, progress, cacheSize: size }
      })
    } catch (err) {
      if (controller.signal.aborted) {
        set((s) => {
          const progress = { ...s.progress }
          delete progress[key]
          return { progress }
        })
      } else {
        const message = err instanceof Error ? err.message : 'Download failed'
        set((s) => ({ progress: { ...s.progress, [key]: { state: 'error', received: 0, total: 0, error: message } } }))
      }
    } finally {
      controllers.delete(key)
    }
  },

  cancel: (reciterId, chapterId) => {
    controllers.get(audioKey(reciterId, chapterId))?.abort()
  },

  remove: async (reciterId, chapterId) => {
    const key = audioKey(reciterId, chapterId)
    controllers.get(key)?.abort()
    await deleteAudio(reciterId, chapterId)
    const size = await totalCacheSize()
    set((s) => {
      const downloaded = new Set(s.downloaded)
      downloaded.delete(key)
      const progress = { ...s.progress }
      delete progress[key]
      return { downloaded, progress, cacheSize: size }
    })
  },
}))
