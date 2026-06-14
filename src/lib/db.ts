import Dexie, { type Table } from 'dexie'
import type { AudioRecord, HadithCacheRecord, SurahStat, VerseRecord } from './types'

export function audioKey(reciterId: number, chapterId: number): string {
  return `${reciterId}:${chapterId}`
}

/** IndexedDB store for downloaded surah audio + small key/value app state. */
class QuranDB extends Dexie {
  audio!: Table<AudioRecord, string>
  verses!: Table<VerseRecord, number>
  meta!: Table<{ key: string; value: unknown }, string>
  stats!: Table<SurahStat, number>
  hadith!: Table<HadithCacheRecord, string>

  constructor() {
    super('offline-quran')
    this.version(1).stores({
      audio: 'key, reciterId, chapterId, savedAt',
      meta: 'key',
    })
    this.version(2).stores({
      audio: 'key, reciterId, chapterId, savedAt',
      meta: 'key',
      verses: 'chapterId',
    })
    // v3 adds mushaf page/juz to cached verses — clear old text so it re-fetches.
    this.version(3)
      .stores({
        audio: 'key, reciterId, chapterId, savedAt',
        meta: 'key',
        verses: 'chapterId',
      })
      .upgrade(async (tx) => {
        await tx.table('verses').clear()
      })
    // v4 adds IndoPak + Tajweed scripts to cached verses — clear again to re-fetch.
    this.version(4)
      .stores({
        audio: 'key, reciterId, chapterId, savedAt',
        meta: 'key',
        verses: 'chapterId',
      })
      .upgrade(async (tx) => {
        await tx.table('verses').clear()
      })
    // v5 adds the per-surah listening stats table.
    this.version(5).stores({
      audio: 'key, reciterId, chapterId, savedAt',
      meta: 'key',
      verses: 'chapterId',
      stats: 'chapterId',
    })
    // v6 adds the cached hadith collections table.
    this.version(6).stores({
      audio: 'key, reciterId, chapterId, savedAt',
      meta: 'key',
      verses: 'chapterId',
      stats: 'chapterId',
      hadith: 'slug',
    })
  }
}

export const db = new QuranDB()

export function getAudio(reciterId: number, chapterId: number) {
  return db.audio.get(audioKey(reciterId, chapterId))
}

export function deleteAudio(reciterId: number, chapterId: number) {
  return db.audio.delete(audioKey(reciterId, chapterId))
}

/** Keys of every cached audio file, used to flag downloaded surahs in the UI. */
export async function getDownloadedKeys(): Promise<string[]> {
  return db.audio.toCollection().primaryKeys() as Promise<string[]>
}

/** Total bytes of downloaded audio — shown as "storage used". */
export async function totalCacheSize(): Promise<number> {
  let total = 0
  await db.audio.each((rec) => {
    total += rec.size
  })
  return total
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key)
  return row?.value as T | undefined
}

export function setMeta(key: string, value: unknown) {
  return db.meta.put({ key, value })
}

// ---- Listening stats ----------------------------------------------------
// Read-modify-write inside a transaction; Dexie serialises rw transactions
// sharing a table, so concurrent listen/play updates can't lose each other.

export function addListenSeconds(chapterId: number, seconds: number): Promise<void> {
  return db.transaction('rw', db.stats, async () => {
    const cur = await db.stats.get(chapterId)
    await db.stats.put({
      chapterId,
      plays: cur?.plays ?? 0,
      seconds: (cur?.seconds ?? 0) + seconds,
      lastPlayedAt: Date.now(),
    })
  })
}

export function incrementPlay(chapterId: number): Promise<void> {
  return db.transaction('rw', db.stats, async () => {
    const cur = await db.stats.get(chapterId)
    await db.stats.put({
      chapterId,
      plays: (cur?.plays ?? 0) + 1,
      seconds: cur?.seconds ?? 0,
      lastPlayedAt: Date.now(),
    })
  })
}

export function getAllStats(): Promise<SurahStat[]> {
  return db.stats.toArray()
}

export function clearStats(): Promise<void> {
  return db.stats.clear()
}

// ---- Hadith collection cache --------------------------------------------

export function getHadithCache(slug: string): Promise<HadithCacheRecord | undefined> {
  return db.hadith.get(slug)
}

export function setHadithCache(rec: HadithCacheRecord): Promise<string> {
  return db.hadith.put(rec)
}

/** Slugs of collections cached for offline use. */
export async function getCachedHadithSlugs(): Promise<string[]> {
  return db.hadith.toCollection().primaryKeys() as Promise<string[]>
}
