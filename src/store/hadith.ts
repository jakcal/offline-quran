import { create } from 'zustand'
import { HADITH_COLLECTIONS } from '../data'
import { track } from '../lib/analytics'
import { loadCollection } from '../lib/hadith'
import type { HadithCollectionData } from '../lib/types'

interface HadithState {
  /** Slug of the open collection, or null when showing the collection list. */
  openSlug: string | null
  data: HadithCollectionData | null
  loading: boolean
  error: string | null
  query: string
  open: (slug: string) => Promise<void>
  retry: () => void
  back: () => void
  setQuery: (q: string) => void
}

export const useHadith = create<HadithState>((set, get) => ({
  openSlug: null,
  data: null,
  loading: false,
  error: null,
  query: '',

  open: async (slug) => {
    const col = HADITH_COLLECTIONS.find((c) => c.slug === slug)
    if (!col) return
    set({ openSlug: slug, data: null, loading: true, error: null, query: '' })
    track('hadith_open', { slug })
    try {
      const data = await loadCollection(col)
      // Bail if the user navigated elsewhere while it loaded.
      if (get().openSlug !== slug) return
      set({ data, loading: false })
    } catch (e) {
      if (get().openSlug !== slug) return
      set({ loading: false, error: e instanceof Error ? e.message : 'Could not load this collection' })
    }
  },

  retry: () => {
    const slug = get().openSlug
    if (slug) void get().open(slug)
  },

  back: () => set({ openSlug: null, data: null, error: null, query: '' }),
  setQuery: (q) => set({ query: q }),
}))
