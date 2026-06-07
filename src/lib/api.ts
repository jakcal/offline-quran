import { RECITERS } from '../data'
import type { Reciter } from './types'

const BASE = 'https://api.quran.com/api/v4'

/**
 * Resolve the public MP3 URL for a full chapter by a given reciter.
 * The URL points at quran.com's CDN (download.quranicaudio.com) and needs no auth.
 */
export async function fetchChapterAudioUrl(reciterId: number, chapterId: number): Promise<string> {
  const res = await fetch(`${BASE}/chapter_recitations/${reciterId}/${chapterId}`)
  if (!res.ok) throw new Error(`Audio lookup failed (HTTP ${res.status})`)
  const json = (await res.json()) as { audio_file?: { audio_url?: string } }
  const url = json.audio_file?.audio_url
  if (!url) throw new Error('No audio URL returned for this surah')
  return url
}

interface RawRecitation {
  id: number
  reciter_name: string
  style: string | null
}

/** Fetch the live reciter list, falling back to the bundled snapshot offline. */
export async function fetchReciters(): Promise<Reciter[]> {
  try {
    const res = await fetch(`${BASE}/resources/recitations?language=en`)
    if (!res.ok) throw new Error(String(res.status))
    const json = (await res.json()) as { recitations?: RawRecitation[] }
    const list = (json.recitations ?? []).map((r) => ({
      id: r.id,
      name: r.reciter_name,
      style: r.style ?? null,
    }))
    return list.length
      ? list.sort((a, b) => a.name.localeCompare(b.name) || (a.style ?? '').localeCompare(b.style ?? ''))
      : RECITERS
  } catch {
    return RECITERS
  }
}
