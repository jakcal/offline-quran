export interface Chapter {
  id: number
  nameSimple: string
  nameArabic: string
  translatedName: string
  versesCount: number
  revelationPlace: string
}

export interface Reciter {
  id: number
  name: string
  style: string | null
}

/** An audio file persisted in IndexedDB for offline playback. */
export interface AudioRecord {
  key: string // `${reciterId}:${chapterId}`
  reciterId: number
  chapterId: number
  blob: Blob
  size: number
  contentType: string
  savedAt: number
}

/** A single verse with its Arabic text in multiple scripts. */
export interface VerseText {
  key: string // e.g. "2:255"
  text: string // Uthmani
  indopak: string
  tajweed: string // Uthmani with <tajweed> color tags
  verseNumber: number
  page: number // mushaf page number
  juz: number
}

/** A chapter's full Arabic text, persisted for offline reading. */
export interface VerseRecord {
  chapterId: number
  verses: VerseText[]
  savedAt: number
}

/** Aggregated listening stats for one surah (summed across reciters), in IndexedDB. */
export interface SurahStat {
  chapterId: number
  plays: number // number of listening sessions started
  seconds: number // total audio-seconds actually listened
  lastPlayedAt: number
}

/** A hadith collection available from the hadith-api (bundled metadata). */
export interface HadithCollection {
  slug: string
  name: string // English title
  arabic: string // Arabic title
  note: string // translator / short note
  eng: string // english edition id, e.g. "eng-bukhari"
  ara: string // arabic edition id, e.g. "ara-bukhari"
}

/** One merged hadith (Arabic source + English translation). */
export interface HadithItem {
  number: number
  arabic: string
  english: string
  grades: string[]
  reference: { book: number; hadith: number }
}

/** A fully-loaded collection, cached in IndexedDB after first view. */
export interface HadithCollectionData {
  slug: string
  name: string
  sections: Record<string, string>
  items: HadithItem[]
}

export interface HadithCacheRecord {
  slug: string
  data: HadithCollectionData
  savedAt: number
}

export type DownloadState = 'idle' | 'downloading' | 'done' | 'error'

export interface DownloadProgress {
  state: DownloadState
  received: number
  total: number // 0 when the server doesn't send Content-Length
  error?: string
}
