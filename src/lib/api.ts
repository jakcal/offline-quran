import { RECITERS } from '../data'
import type { Reciter, VerseText, VerseTiming } from './types'

const BASE = 'https://api.quran.com/api/v4'
// quran.com's "QDC" audio service carries ayah-level timings aligned to the
// exact full-surah MP3s this app already plays (same audio_url).
const QDC = 'https://api.qurancdn.com/api/qdc'

/** Fetch a chapter's text in all scripts (Uthmani, IndoPak, Tajweed) + page/juz, one request. */
export async function fetchChapterVerses(chapterId: number): Promise<VerseText[]> {
  const fields = 'text_uthmani,text_indopak,text_uthmani_tajweed'
  const res = await fetch(`${BASE}/verses/by_chapter/${chapterId}?fields=${fields}&per_page=300&page=1`)
  if (!res.ok) throw new Error(`Failed to load text (HTTP ${res.status})`)
  const json = (await res.json()) as {
    verses?: {
      verse_key: string
      verse_number: number
      text_uthmani: string
      text_indopak: string
      text_uthmani_tajweed: string
      page_number: number
      juz_number: number
    }[]
  }
  return (json.verses ?? []).map((v) => ({
    key: v.verse_key,
    text: v.text_uthmani,
    indopak: v.text_indopak,
    tajweed: v.text_uthmani_tajweed,
    verseNumber: v.verse_number,
    page: v.page_number,
    juz: v.juz_number,
  }))
}

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

/**
 * Fetch per-ayah timings for a reciter's recording of a surah, used to
 * highlight the current ayah in the reader as the audio plays. Timings line up
 * with the same full-surah MP3 returned by {@link fetchChapterAudioUrl}.
 */
export async function fetchChapterTimings(
  reciterId: number,
  chapterId: number,
): Promise<{ duration: number; verses: VerseTiming[] }> {
  const res = await fetch(`${QDC}/audio/reciters/${reciterId}/audio_files?chapter=${chapterId}&segments=true`)
  if (!res.ok) throw new Error(`Timing lookup failed (HTTP ${res.status})`)
  const json = (await res.json()) as {
    audio_files?: {
      duration?: number
      verse_timings?: { verse_key: string; timestamp_from: number; timestamp_to: number }[]
    }[]
  }
  const file = json.audio_files?.[0]
  const timings = file?.verse_timings
  if (!timings?.length) throw new Error('No timings returned for this recording')
  return {
    duration: file?.duration ?? 0,
    verses: timings.map((t) => ({ key: t.verse_key, from: t.timestamp_from, to: t.timestamp_to })),
  }
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
