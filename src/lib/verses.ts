import { fetchChapterVerses } from './api'
import { db } from './db'
import type { VerseText } from './types'

/**
 * Get a chapter's Arabic text, cache-first. Reads from IndexedDB if present
 * (works offline), otherwise fetches from quran.com and stores it.
 */
export async function getChapterVerses(chapterId: number): Promise<VerseText[]> {
  const cached = await db.verses.get(chapterId)
  if (cached) return cached.verses

  const verses = await fetchChapterVerses(chapterId)
  await db.verses.put({ chapterId, verses, savedAt: Date.now() })
  return verses
}

export async function hasVersesCached(chapterId: number): Promise<boolean> {
  return (await db.verses.get(chapterId)) !== undefined
}
