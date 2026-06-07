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

export type DownloadState = 'idle' | 'downloading' | 'done' | 'error'

export interface DownloadProgress {
  state: DownloadState
  received: number
  total: number // 0 when the server doesn't send Content-Length
  error?: string
}
