import Dexie, { type Table } from 'dexie'
import type { AudioRecord, VerseRecord } from './types'

export function audioKey(reciterId: number, chapterId: number): string {
  return `${reciterId}:${chapterId}`
}

/** IndexedDB store for downloaded surah audio + small key/value app state. */
class QuranDB extends Dexie {
  audio!: Table<AudioRecord, string>
  verses!: Table<VerseRecord, number>
  meta!: Table<{ key: string; value: unknown }, string>

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
