import { CHAPTER_BY_ID, RECITERS } from '../data'
import { useBookmarks } from '../store/bookmarks'
import { usePlayer } from '../store/player'
import { useReader } from '../store/reader'
import { useRecents } from '../store/recents'
import { BookIcon, HeadphonesIcon } from './icons'

export function ContinueSection() {
  const lastListened = useRecents((s) => s.lastListened)
  const lastRead = useBookmarks((s) => s.lastRead)
  const play = usePlayer((s) => s.play)
  const openReader = useReader((s) => s.open)

  const listenCh = lastListened ? CHAPTER_BY_ID.get(lastListened.chapterId) : undefined
  const readCh = lastRead ? CHAPTER_BY_ID.get(lastRead.chapterId) : undefined
  if (!listenCh && !readCh) return null

  const reciterName = lastListened ? RECITERS.find((r) => r.id === lastListened.reciterId)?.name : undefined

  return (
    <div>
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-muted">Continue</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {listenCh && lastListened && (
          <button
            type="button"
            onClick={() => void play(lastListened.chapterId, lastListened.reciterId)}
            className="flex items-center gap-3 rounded-card bg-brand px-4 py-3 text-left text-white transition-transform active:scale-[0.99]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">
              <HeadphonesIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/70">Continue listening</span>
              <span className="block truncate font-semibold">{listenCh.nameSimple}</span>
              {reciterName && <span className="block truncate text-xs text-white/70">{reciterName}</span>}
            </span>
          </button>
        )}
        {readCh && lastRead && (
          <button
            type="button"
            onClick={() => openReader(lastRead.chapterId)}
            className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-brand/40"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand">
              <BookIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Continue reading</span>
              <span className="block truncate font-semibold">{readCh.nameSimple}</span>
              <span className="block truncate text-xs text-muted">
                {lastRead.verseKey ? `Ayah ${lastRead.verseKey}` : 'From the start'}
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
