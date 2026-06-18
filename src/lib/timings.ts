import { fetchChapterTimings } from './api'
import { audioKey, getTimings, setTimings } from './db'
import type { ChapterTimingRecord, VerseTiming } from './types'

/**
 * Get a recording's ayah timings, cache-first. Reads from IndexedDB if present
 * (works offline, and backfills surahs downloaded before this feature existed),
 * otherwise fetches from quran.com and stores it. Returns null when neither a
 * cache hit nor a network fetch is possible, so callers degrade gracefully.
 */
export async function getChapterTimings(
  reciterId: number,
  chapterId: number,
): Promise<ChapterTimingRecord | null> {
  const cached = await getTimings(reciterId, chapterId)
  if (cached) return cached

  if (!navigator.onLine) return null
  try {
    const { duration, verses } = await fetchChapterTimings(reciterId, chapterId)
    const rec: ChapterTimingRecord = {
      key: audioKey(reciterId, chapterId),
      reciterId,
      chapterId,
      duration,
      verses,
      savedAt: Date.now(),
    }
    await setTimings(rec)
    return rec
  } catch {
    return null
  }
}

/**
 * Binary-search the ayah playing at `ms` (milliseconds into the surah audio).
 * Returns the verse key, or null when before the first ayah / in a gap.
 */
export function activeVerseAt(verses: VerseTiming[], ms: number): string | null {
  let lo = 0
  let hi = verses.length - 1
  let hit: string | null = null
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const v = verses[mid]
    if (ms < v.from) hi = mid - 1
    else if (ms >= v.to) lo = mid + 1
    else {
      hit = v.key
      break
    }
  }
  return hit
}
