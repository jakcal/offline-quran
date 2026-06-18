import { create } from 'zustand'
import { CHAPTERS } from '../data'
import { track } from '../lib/analytics'
import { audioKey, deleteAudio, deleteTimings, getDownloadedKeys, getMeta, getTimings, setMeta, totalCacheSize } from '../lib/db'
import { downloadChapter } from '../lib/download'
import { getChapterTimings } from '../lib/timings'
import { getChapterVerses } from '../lib/verses'
import type { DownloadProgress } from '../lib/types'

// In-flight requests live outside React state — they aren't serialisable.
const controllers = new Map<string, AbortController>()

// How many surahs to fetch at once during a "download all" run.
const BULK_CONCURRENCY = 3
// Set when the user cancels a bulk run, so in-flight workers stop queueing more.
let bulkAborted = false

/** Progress of an in-flight "download all surahs" run for one reciter. */
interface BulkProgress {
  reciterId: number
  /** Surahs that needed downloading when the run started. */
  total: number
  /** Surahs processed so far (succeeded, failed, or skipped). */
  completed: number
}

interface DownloadsState {
  /** Keys (`reciterId:chapterId`) of fully-cached surahs. */
  downloaded: Set<string>
  /** Live progress for in-flight / failed downloads, keyed the same way. */
  progress: Record<string, DownloadProgress>
  cacheSize: number
  /** When true, every played surah is auto-saved for offline (default on). */
  autoDownload: boolean
  /** Non-null while a "download all" run is in progress. */
  bulk: BulkProgress | null

  init: () => Promise<void>
  setAutoDownload: (on: boolean) => void
  /** Idempotently ensure a surah is cached; safe to fire-and-forget. */
  ensure: (reciterId: number, chapterId: number, url?: string) => Promise<void>
  cancel: (reciterId: number, chapterId: number) => void
  remove: (reciterId: number, chapterId: number) => Promise<void>
  /** Backfill ayah timings for surahs downloaded before sync-highlighting existed. */
  backfillTimings: () => Promise<void>
  /** Download every surah not yet cached for the given reciter. */
  downloadAll: (reciterId: number) => Promise<void>
  /** Stop an in-flight "download all" run, aborting its current downloads. */
  cancelAll: () => void
}

export const useDownloads = create<DownloadsState>((set, get) => ({
  downloaded: new Set(),
  progress: {},
  cacheSize: 0,
  autoDownload: true,
  bulk: null,

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
    track('download_start', { chapter_id: chapterId, reciter_id: reciterId })

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
      track('download_complete', { chapter_id: chapterId, reciter_id: reciterId })
      // Cache the Arabic text + ayah timings too, so a downloaded surah is
      // readable offline and highlights in sync with the recording offline.
      void getChapterVerses(chapterId).catch(() => {})
      void getChapterTimings(reciterId, chapterId).catch(() => {})
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
        track('download_error', { chapter_id: chapterId, reciter_id: reciterId })
      }
    } finally {
      controllers.delete(key)
    }
  },

  cancel: (reciterId, chapterId) => {
    controllers.get(audioKey(reciterId, chapterId))?.abort()
    track('download_cancel', { chapter_id: chapterId, reciter_id: reciterId })
  },

  remove: async (reciterId, chapterId) => {
    const key = audioKey(reciterId, chapterId)
    controllers.get(key)?.abort()
    track('download_remove', { chapter_id: chapterId, reciter_id: reciterId })
    await deleteAudio(reciterId, chapterId)
    await deleteTimings(reciterId, chapterId)
    const size = await totalCacheSize()
    set((s) => {
      const downloaded = new Set(s.downloaded)
      downloaded.delete(key)
      const progress = { ...s.progress }
      delete progress[key]
      return { downloaded, progress, cacheSize: size }
    })
  },

  backfillTimings: async () => {
    if (!navigator.onLine) return
    // Find downloaded surahs whose timings aren't cached yet (e.g. saved before
    // this feature shipped) and fetch them quietly in the background.
    const missing: Array<{ reciterId: number; chapterId: number }> = []
    for (const key of get().downloaded) {
      const [reciterId, chapterId] = key.split(':').map(Number)
      if (Number.isNaN(reciterId) || Number.isNaN(chapterId)) continue
      if (!(await getTimings(reciterId, chapterId))) missing.push({ reciterId, chapterId })
    }
    if (!missing.length) return

    const queue = [...missing]
    const worker = async () => {
      while (queue.length && navigator.onLine) {
        const { reciterId, chapterId } = queue.shift()!
        // getChapterTimings caches on success; errors are swallowed so one
        // failure never stalls the backfill or surfaces to the user.
        await getChapterTimings(reciterId, chapterId).catch(() => {})
      }
    }
    // Low concurrency — this is a quiet, best-effort catch-up, not a priority.
    await Promise.all(Array.from({ length: 2 }, worker))
  },

  downloadAll: async (reciterId) => {
    // One bulk run at a time.
    if (get().bulk) return
    const pending = CHAPTERS.filter((c) => !get().downloaded.has(audioKey(reciterId, c.id)))
    if (pending.length === 0) return

    bulkAborted = false
    set({ bulk: { reciterId, total: pending.length, completed: 0 } })
    track('download_all_start', { reciter_id: reciterId, count: pending.length })

    const queue = pending.map((c) => c.id)
    const worker = async () => {
      while (queue.length && !bulkAborted) {
        const chapterId = queue.shift()!
        // ensure swallows its own errors, so a single failure never stalls the run.
        await get().ensure(reciterId, chapterId)
        set((s) => (s.bulk ? { bulk: { ...s.bulk, completed: s.bulk.completed + 1 } } : {}))
      }
    }
    await Promise.all(Array.from({ length: BULK_CONCURRENCY }, worker))

    track(bulkAborted ? 'download_all_cancel' : 'download_all_complete', { reciter_id: reciterId })
    set({ bulk: null })
  },

  cancelAll: () => {
    bulkAborted = true
    const reciterId = get().bulk?.reciterId
    if (reciterId != null) {
      const prefix = `${reciterId}:`
      for (const [key, controller] of controllers) {
        if (key.startsWith(prefix)) controller.abort()
      }
    }
    set({ bulk: null })
  },
}))
