import { CHAPTER_BY_ID, RECITERS } from '../data'
import { track } from '../lib/analytics'
import { formatTime } from '../lib/format'
import { useBookmarks } from '../store/bookmarks'
import { usePlayer } from '../store/player'
import { useReader } from '../store/reader'
import { useRecents } from '../store/recents'
import { BookIcon, HeadphonesIcon } from './icons'

export function ContinueSection() {
  const lastListened = useRecents((s) => (s.lastKey ? (s.entries[s.lastKey] ?? null) : null))
  const lastRead = useBookmarks((s) => s.lastRead)
  const play = usePlayer((s) => s.play)
  const openReader = useReader((s) => s.open)

  const listenCh = lastListened ? CHAPTER_BY_ID.get(lastListened.chapterId) : undefined
  const readCh = lastRead ? CHAPTER_BY_ID.get(lastRead.chapterId) : undefined
  if (!listenCh && !readCh) return null

  const reciterName = lastListened ? RECITERS.find((r) => r.id === lastListened.reciterId)?.name : undefined
  const listenPct = lastListened && lastListened.duration > 0 ? Math.min(100, (lastListened.position / lastListened.duration) * 100) : 0

  const verseNum = lastRead?.verseKey ? Number(lastRead.verseKey.split(':')[1]) : 0
  const readPct = readCh && verseNum ? Math.min(100, (verseNum / readCh.versesCount) * 100) : 0

  return (
    <div>
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-muted">Continue</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {listenCh && lastListened && (
          <button
            type="button"
            onClick={() => {
              track('resume_listening', { chapter_id: lastListened.chapterId, reciter_id: lastListened.reciterId })
              // If the surah was finished, start it over instead of seeking to the end.
              const atEnd = lastListened.duration > 0 && lastListened.duration - lastListened.position < 5
              void play(lastListened.chapterId, lastListened.reciterId, atEnd ? 0 : lastListened.position)
            }}
            className="flex flex-col gap-2.5 rounded-card bg-brand px-4 py-3 text-left text-white transition-transform active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">
                <HeadphonesIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/70">Continue listening</span>
                <span className="block truncate font-semibold">{listenCh.nameSimple}</span>
                {reciterName && <span className="block truncate text-xs text-white/70">{reciterName}</span>}
              </span>
            </div>
            {listenPct > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white" style={{ width: `${listenPct}%` }} />
                </div>
                <span className="shrink-0 text-[10px] tabular-nums text-white/80">
                  {formatTime(lastListened.position)} / {formatTime(lastListened.duration)}
                </span>
              </div>
            )}
          </button>
        )}

        {readCh && lastRead && (
          <button
            type="button"
            onClick={() => {
              track('resume_reading', { chapter_id: lastRead.chapterId })
              openReader(lastRead.chapterId)
            }}
            className="flex flex-col gap-2.5 rounded-card border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-brand/40"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand">
                <BookIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Continue reading</span>
                <span className="block truncate font-semibold">{readCh.nameSimple}</span>
                <span className="block truncate text-xs text-muted">
                  {verseNum ? `Ayah ${verseNum} of ${readCh.versesCount}` : 'From the start'}
                </span>
              </span>
            </div>
            {readPct > 0 && (
              <div className="h-1 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-brand" style={{ width: `${readPct}%` }} />
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
