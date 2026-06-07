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

export type DownloadState = 'idle' | 'downloading' | 'done' | 'error'

export interface DownloadProgress {
  state: DownloadState
  received: number
  total: number // 0 when the server doesn't send Content-Length
  error?: string
}
