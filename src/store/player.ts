import { create } from 'zustand'
import { CHAPTER_BY_ID, DEFAULT_RECITER_ID, RECITERS } from '../data'
import { fetchChapterAudioUrl } from '../lib/api'
import { track } from '../lib/analytics'
import { getAudio, setMeta } from '../lib/db'
import { useDownloads } from './downloads'
import { useRecents } from './recents'

// One audio element for the whole app, kept outside React state.
const audio = new Audio()
audio.preload = 'metadata'

let currentObjectUrl: string | null = null
function setSource(src: string, isObjectUrl: boolean) {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
  if (isObjectUrl) currentObjectUrl = src
  audio.src = src
}

// Resume support: seek to a saved position once the audio metadata is ready.
let pendingSeek: number | null = null
function applyPendingSeek() {
  if (pendingSeek == null) return
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    audio.currentTime = Math.min(pendingSeek, Math.max(0, audio.duration - 1))
    pendingSeek = null
  }
}

// Throttled persistence of listening progress for "Continue listening".
let lastProgressSave = 0
function saveProgress(force = false) {
  const now = Date.now()
  if (!force && now - lastProgressSave < 4000) return
  lastProgressSave = now
  const { chapterId, reciterId } = usePlayer.getState()
  if (chapterId != null && Number.isFinite(audio.duration) && audio.duration > 0) {
    useRecents.getState().setLastListened(chapterId, reciterId, audio.currentTime, audio.duration)
  }
}

interface PlayerState {
  reciterId: number
  chapterId: number | null
  isPlaying: boolean
  loading: boolean
  error: string | null
  /** True while the current surah streams from the network (not yet cached). */
  streaming: boolean
  currentTime: number
  duration: number
  volume: number

  setReciter: (id: number) => void
  setVolume: (v: number) => void
  /** Play a surah. `reciterId` plays a specific recording; `startAt` resumes from a saved position. */
  play: (chapterId: number, reciterId?: number, startAt?: number) => Promise<void>
  toggle: () => void
  seek: (time: number) => void
  next: () => void
  prev: () => void
}

export const usePlayer = create<PlayerState>((set, get) => ({
  reciterId: DEFAULT_RECITER_ID,
  chapterId: null,
  isPlaying: false,
  loading: false,
  error: null,
  streaming: false,
  currentTime: 0,
  duration: 0,
  volume: 1,

  setVolume: (v) => {
    const vol = Math.min(1, Math.max(0, v))
    audio.volume = vol
    set({ volume: vol })
  },

  setReciter: (id) => {
    if (id === get().reciterId) return
    set({ reciterId: id })
    void setMeta('reciterId', id)
    // Switching voice mid-listen re-plays the current surah with the new reciter.
    const { chapterId } = get()
    if (chapterId != null) void get().play(chapterId)
  },

  play: async (chapterId, reciterIdOverride, startAt) => {
    const reciterId = reciterIdOverride ?? get().reciterId
    if (reciterIdOverride != null && reciterIdOverride !== get().reciterId) {
      set({ reciterId: reciterIdOverride })
      void setMeta('reciterId', reciterIdOverride)
    }
    set({ chapterId, loading: true, error: null })
    useRecents.getState().setLastListened(chapterId, reciterId, startAt ?? 0, 0)
    pendingSeek = startAt != null && startAt > 1 ? startAt : null
    track('play_surah', { chapter_id: chapterId, reciter_id: reciterId, resumed: pendingSeek != null })

    try {
      const cached = await getAudio(reciterId, chapterId)
      if (cached) {
        setSource(URL.createObjectURL(cached.blob), true)
        set({ streaming: false })
      } else {
        if (!navigator.onLine) {
          set({ loading: false, error: 'Not downloaded yet — connect to the internet to stream it.' })
          return
        }
        const url = await fetchChapterAudioUrl(reciterId, chapterId)
        setSource(url, false)
        set({ streaming: true })
        // Save it for offline next time, in the background.
        if (useDownloads.getState().autoDownload) void useDownloads.getState().ensure(reciterId, chapterId, url)
      }

      await audio.play()
      applyPendingSeek()
      updateMediaSession()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not play this surah'
      set({ loading: false, error: message })
    }
  },

  toggle: () => {
    if (get().chapterId == null) return
    if (audio.paused) void audio.play()
    else audio.pause()
  },

  seek: (time) => {
    if (Number.isFinite(time)) audio.currentTime = time
  },

  next: () => {
    const { chapterId } = get()
    if (chapterId != null && chapterId < 114) void get().play(chapterId + 1)
  },

  prev: () => {
    const { chapterId } = get()
    if (chapterId != null && chapterId > 1) void get().play(chapterId - 1)
  },
}))

// ---- Wire the audio element to the store --------------------------------
const hasMediaSession = 'mediaSession' in navigator

function syncPlaybackState() {
  if (hasMediaSession) navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing'
}

/** Feeds the scrubbable position to lock-screen / system media UIs. */
function updatePositionState() {
  if (!hasMediaSession || typeof navigator.mediaSession.setPositionState !== 'function') return
  const duration = audio.duration
  if (!Number.isFinite(duration) || duration <= 0) return
  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: audio.playbackRate || 1,
      position: Math.min(audio.currentTime, duration),
    })
  } catch {
    // setPositionState throws on momentarily-inconsistent values; ignore.
  }
}

audio.addEventListener('play', () => {
  usePlayer.setState({ isPlaying: true })
  syncPlaybackState()
})
audio.addEventListener('pause', () => {
  usePlayer.setState({ isPlaying: false })
  syncPlaybackState()
  saveProgress(true)
})
audio.addEventListener('loadedmetadata', () => {
  applyPendingSeek()
  updatePositionState()
})
audio.addEventListener('playing', () => usePlayer.setState({ isPlaying: true, loading: false }))
audio.addEventListener('waiting', () => usePlayer.setState({ loading: true }))
audio.addEventListener('timeupdate', () => {
  usePlayer.setState({ currentTime: audio.currentTime })
  updatePositionState()
  saveProgress()
})
audio.addEventListener('durationchange', () => {
  usePlayer.setState({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 })
  updatePositionState()
})
audio.addEventListener('ended', () => usePlayer.getState().next())
audio.addEventListener('error', () => {
  if (usePlayer.getState().chapterId != null)
    usePlayer.setState({ loading: false, error: 'Playback error — the audio could not be loaded.' })
})

// ---- Lock-screen / media-key controls ----------------------------------
function updateMediaSession() {
  if (!hasMediaSession) return
  const { chapterId, reciterId } = usePlayer.getState()
  const chapter = chapterId != null ? CHAPTER_BY_ID.get(chapterId) : undefined
  const reciter = RECITERS.find((r) => r.id === reciterId)
  if (!chapter) return

  navigator.mediaSession.metadata = new MediaMetadata({
    title: `${chapter.id}. ${chapter.nameSimple} · ${chapter.nameArabic}`,
    artist: reciter?.name ?? 'Quran',
    album: reciter?.style ? `Offline Quran · ${reciter.style}` : 'Offline Quran',
    artwork: [
      { src: '/icon.svg', sizes: '96x96', type: 'image/svg+xml' },
      { src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
      { src: '/maskable.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
  })
  syncPlaybackState()
  updatePositionState()
}

if (hasMediaSession) {
  const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler)
    } catch {
      // Some platforms don't support every action — skip the unsupported ones.
    }
  }
  setHandler('play', () => void audio.play())
  setHandler('pause', () => audio.pause())
  setHandler('stop', () => {
    audio.pause()
    audio.currentTime = 0
  })
  setHandler('nexttrack', () => usePlayer.getState().next())
  setHandler('previoustrack', () => usePlayer.getState().prev())
  setHandler('seekbackward', (d) => usePlayer.getState().seek(audio.currentTime - (d.seekOffset || 10)))
  setHandler('seekforward', (d) => usePlayer.getState().seek(audio.currentTime + (d.seekOffset || 10)))
  setHandler('seekto', (d) => {
    if (d.seekTime != null) usePlayer.getState().seek(d.seekTime)
  })
}
