import { getHadithCache, setHadithCache } from './db'
import type { HadithCollection, HadithCollectionData, HadithItem } from './types'

const BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions'

interface RawHadith {
  hadithnumber: number
  text: string
  grades?: { name?: string; grade?: string }[]
  reference: { book: number; hadith: number }
}
interface RawEdition {
  metadata: { name: string; sections: Record<string, string> }
  hadiths: RawHadith[]
}

async function fetchEdition(id: string): Promise<RawEdition> {
  const res = await fetch(`${BASE}/${id}.min.json`)
  if (!res.ok) throw new Error(`Could not load ${id} (${res.status})`)
  return res.json() as Promise<RawEdition>
}

/**
 * Load a collection's Arabic + English texts, merged by hadith number. Served
 * from the IndexedDB cache once viewed, so re-opening + searching works offline.
 */
export async function loadCollection(col: HadithCollection): Promise<HadithCollectionData> {
  const cached = await getHadithCache(col.slug)
  if (cached) return cached.data

  const [eng, ara] = await Promise.all([fetchEdition(col.eng), fetchEdition(col.ara)])
  const arabicByNumber = new Map(ara.hadiths.map((h) => [h.hadithnumber, h.text]))

  const items: HadithItem[] = eng.hadiths.map((h) => ({
    number: h.hadithnumber,
    english: h.text,
    arabic: arabicByNumber.get(h.hadithnumber) ?? '',
    grades: (h.grades ?? []).map((g) => [g.name, g.grade].filter(Boolean).join(': ')).filter(Boolean),
    reference: h.reference,
  }))

  const data: HadithCollectionData = {
    slug: col.slug,
    name: eng.metadata.name,
    sections: eng.metadata.sections,
    items,
  }
  await setHadithCache({ slug: col.slug, data, savedAt: Date.now() })
  return data
}

// Strip Arabic diacritics/tatweel and fold letter variants so search matches
// regardless of harakat, and lowercase Latin text.
const ARABIC_MARKS = /[ً-ْٰـ]/g
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(ARABIC_MARKS, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
}
