import { fetchChapterAudioUrl } from './api'
import { audioKey, db } from './db'

interface DownloadOpts {
  /** Pre-resolved audio URL (skips the metadata round-trip when we already have it). */
  url?: string
  signal?: AbortSignal
  onProgress?: (received: number, total: number) => void
}

/**
 * Stream a full surah MP3 to IndexedDB, reporting byte progress as it goes.
 * Returns the stored Blob. Throws on network/abort errors.
 */
export async function downloadChapter(
  reciterId: number,
  chapterId: number,
  opts: DownloadOpts = {},
): Promise<Blob> {
  const url = opts.url ?? (await fetchChapterAudioUrl(reciterId, chapterId))

  const res = await fetch(url, { signal: opts.signal })
  if (!res.ok || !res.body) throw new Error(`Download failed (HTTP ${res.status})`)

  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    opts.onProgress?.(received, total)
  }

  const contentType = res.headers.get('content-type') || 'audio/mpeg'
  const blob = new Blob(chunks as BlobPart[], { type: contentType })

  await db.audio.put({
    key: audioKey(reciterId, chapterId),
    reciterId,
    chapterId,
    blob,
    size: blob.size,
    contentType,
    savedAt: Date.now(),
  })

  return blob
}
