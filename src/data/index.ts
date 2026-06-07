import type { Chapter, Reciter } from '../lib/types'
import chaptersJson from './chapters.json'
import recitersJson from './reciters.json'

/**
 * Canonical Quran metadata, fetched once from api.quran.com and bundled so the
 * app browses fully offline on first launch. Reciters are refreshed from the
 * network when online (see lib/api.ts), falling back to this snapshot.
 */
export const CHAPTERS = chaptersJson as Chapter[]
export const RECITERS = recitersJson as Reciter[]

export const CHAPTER_BY_ID = new Map(CHAPTERS.map((c) => [c.id, c]))

/** Mishari Rashid al-`Afasy — a sensible, widely-loved default reciter. */
export const DEFAULT_RECITER_ID = RECITERS.some((r) => r.id === 7) ? 7 : RECITERS[0].id
