import { create } from 'zustand'
import { CHAPTER_BY_ID, DEFAULT_RECITER_ID, RECITERS } from '../data'
import { fetchChapterAudioUrl } from '../lib/api'
import { track } from '../lib/analytics'
import { getAudio, setMeta } from '../lib/db'
import { activeVerseAt, getChapterTimings } from '../lib/timings'
import type { VerseTiming } from '../lib/types'
import { useDownloads } from './downloads'
import { useRecents } from './recents'
import { useStats } from './stats'

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

// ---- Ayah sync-highlighting ---------------------------------------------
// Timings for the surah currently loaded, used to map playback time → ayah.
// Kept outside React state; the active key is mirrored into the store below.
let currentTimings: VerseTiming[] | null = null

/** Load (cache-first) the active recording's ayah timings, ignoring stale loads. */
function loadTimings(reciterId: number, chapterId: number) {
  currentTimings = null
  usePlayer.setState({ activeVerseKey: null })
  void getChapterTimings(reciterId, chapterId).then((rec) => {
    // A newer surah/reciter may have started while this was in flight — drop it.
    const { chapterId: curChapter, reciterId: curReciter } = usePlayer.getState()
    if (!rec || curChapter !== chapterId || curReciter !== reciterId) return
    currentTimings = rec.verses
    updateActiveVerse()
  })
}

/** Recompute the highlighted ayah from the current playback position. */
function updateActiveVerse() {
  if (!currentTimings) return
  const key = activeVerseAt(currentTimings, audio.currentTime * 1000)
  if (key !== usePlayer.getState().activeVerseKey) usePlayer.setState({ activeVerseKey: key })
}

// Resume support: seek to a saved position once the audio metadata is ready.
let pendingSeek: number | null = null
function applyPendingSeek() {
  if (pendingSeek == null) return
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    // If the saved spot is at/after this recording's end — e.g. resuming into a
    // shorter reciter's version — start over rather than jumping to the very end
    // (which would instantly fire 'ended' and auto-advance to the next surah).
    audio.currentTime = pendingSeek < audio.duration - 2 ? pendingSeek : 0
    pendingSeek = null
  }
}

// ---- Listening-stats accumulation ---------------------------------------
// Measures real audio-seconds heard by summing small timeupdate deltas, so
// seeks and paused gaps don't inflate the totals.
let lastTickTime = 0 // last currentTime observed while counting
let unsavedSeconds = 0 // listened seconds not yet written to the stats store
let lastStatsFlush = 0
let countedChapter: number | null = null // chapter whose play we've already counted

function flushStats() {
  if (unsavedSeconds <= 0) return
  const { chapterId } = usePlayer.getState()
  const secs = unsavedSeconds
  unsavedSeconds = 0
  lastStatsFlush = Date.now()
  if (chapterId != null) useStats.getState().addListen(chapterId, secs)
}

// Throttled persistence of listening progress for "Continue listening".
let lastProgressSave = 0
function saveProgress(force = false) {
  const now = Date.now()
  if (!force && now - lastProgressSave < 4000) return
  const { chapterId, reciterId } = usePlayer.getState()
  // Only advance the throttle clock once we actually persist, so a forced save
  // before the duration is known doesn't suppress the next few real saves.
  if (chapterId != null && Number.isFinite(audio.duration) && audio.duration > 0) {
    lastProgressSave = now
    useRecents.getState().setLastListened(chapterId, reciterId, audio.currentTime, audio.duration)
  }
}

// ---- Sleep timer ---------------------------------------------------------
// A wall-clock countdown that pauses playback when it reaches zero. Kept
// outside React state; the remaining seconds are mirrored into the store.
let sleepEndAt: number | null = null
let sleepInterval: ReturnType<typeof setInterval> | null = null

function clearSleep() {
  if (sleepInterval != null) {
    clearInterval(sleepInterval)
    sleepInterval = null
  }
  sleepEndAt = null
  usePlayer.setState({ sleepRemaining: null, sleepAfterTrack: false })
}

function tickSleep() {
  if (sleepEndAt == null) return
  const remaining = Math.max(0, Math.round((sleepEndAt - Date.now()) / 1000))
  if (remaining <= 0) {
    clearSleep()
    audio.pause()
    return
  }
  usePlayer.setState({ sleepRemaining: remaining })
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
  speed: number
  /** Verse key (e.g. "2:255") currently being recited, or null. Drives reader highlighting. */
  activeVerseKey: string | null
  /** Seconds left on the sleep timer, or null when it isn't running. */
  sleepRemaining: number | null
  /** True when playback should stop at the end of the current surah instead of on a clock. */
  sleepAfterTrack: boolean

  setReciter: (id: number) => void
  setVolume: (v: number) => void
  setSpeed: (s: number) => void
  /** Start a sleep timer that pauses playback after `minutes`. */
  startSleepTimer: (minutes: number) => void
  /** Stop playback once the current surah finishes. */
  sleepAfterCurrent: () => void
  /** Cancel any pending sleep timer. */
  cancelSleepTimer: () => void
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
  speed: 1,
  activeVerseKey: null,
  sleepRemaining: null,
  sleepAfterTrack: false,

  setVolume: (v) => {
    const vol = Math.min(1, Math.max(0, v))
    audio.volume = vol
    set({ volume: vol })
  },

  setSpeed: (s) => {
    const speed = Math.min(4, Math.max(0.25, s))
    audio.playbackRate = speed
    set({ speed })
    void setMeta('speed', speed)
  },

  startSleepTimer: (minutes) => {
    clearSleep()
    sleepEndAt = Date.now() + minutes * 60_000
    sleepInterval = setInterval(tickSleep, 1000)
    set({ sleepRemaining: minutes * 60, sleepAfterTrack: false })
    track('sleep_timer', { minutes })
  },

  sleepAfterCurrent: () => {
    clearSleep()
    set({ sleepAfterTrack: true })
    track('sleep_timer', { minutes: 'end_of_surah' })
  },

  cancelSleepTimer: () => clearSleep(),

  setReciter: (id) => {
    if (id === get().reciterId) return
    const { chapterId, reciterId: prevReciter } = get()
    set({ reciterId: id })
    void setMeta('reciterId', id)
    // Switching voice mid-listen swaps the recording but keeps your place (and
    // play/pause state), rather than restarting the surah from the beginning.
    if (chapterId != null) {
      const saved = useRecents.getState().progressFor(chapterId, prevReciter)
      // Prefer the live position; fall back to the saved one if the audio
      // hasn't reported a real time yet (e.g. metadata still loading).
      const at = audio.currentTime > 1 ? audio.currentTime : (saved?.position ?? 0)
      const wasPaused = audio.paused
      void get()
        .play(chapterId, id, at)
        .then(() => {
          if (wasPaused) audio.pause()
        })
    }
  },

  play: async (chapterId, reciterIdOverride, startAt) => {
    // Attribute any unsaved listening time to the outgoing surah before switching.
    flushStats()
    const reciterId = reciterIdOverride ?? get().reciterId
    if (reciterIdOverride != null && reciterIdOverride !== get().reciterId) {
      set({ reciterId: reciterIdOverride })
      void setMeta('reciterId', reciterIdOverride)
    }
    set({ chapterId, loading: true, error: null })
    pendingSeek = startAt != null && startAt > 1 ? startAt : null
    track('play_surah', { chapter_id: chapterId, reciter_id: reciterId, resumed: pendingSeek != null })
    // Load ayah timings (cache-first) in parallel with the audio for sync-highlighting.
    loadTimings(reciterId, chapterId)

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

      audio.playbackRate = get().speed
      await audio.play()
      applyPendingSeek()
      // Record the now-playing surah only after playback actually started, so a
      // surah that fails to play never wipes its own previously-saved position.
      saveProgress(true)
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
  lastTickTime = audio.currentTime // baseline so the first delta isn't a seek jump
  // Count a play once per surah session (reciter swaps / resumes keep the same id).
  const { chapterId } = usePlayer.getState()
  if (chapterId != null && chapterId !== countedChapter) {
    countedChapter = chapterId
    useStats.getState().addPlay(chapterId)
  }
})
audio.addEventListener('pause', () => {
  usePlayer.setState({ isPlaying: false })
  syncPlaybackState()
  saveProgress(true)
  flushStats()
})
audio.addEventListener('seeked', () => {
  lastTickTime = audio.currentTime // don't count the jump as listened time
  updateActiveVerse()
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
  updateActiveVerse()
  saveProgress()
  // Sum only small forward deltas — a seek or buffering gap is ignored.
  const t = audio.currentTime
  const d = t - lastTickTime
  lastTickTime = t
  if (!audio.paused && d > 0 && d < 2) {
    unsavedSeconds += d
    if (Date.now() - lastStatsFlush > 10_000) flushStats()
  }
})
audio.addEventListener('durationchange', () => {
  usePlayer.setState({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 })
  updatePositionState()
})
audio.addEventListener('ended', () => {
  // Persist the finished surah's final position + listening time before advancing,
  // since 'ended' doesn't fire 'pause' and the throttled save may be seconds old.
  saveProgress(true)
  flushStats()
  // A "stop after this surah" sleep timer ends here instead of advancing.
  if (usePlayer.getState().sleepAfterTrack) {
    clearSleep()
    return
  }
  usePlayer.getState().next()
})
audio.addEventListener('error', () => {
  if (usePlayer.getState().chapterId != null)
    usePlayer.setState({ loading: false, error: 'Playback error — the audio could not be loaded.' })
})

// Flush pending progress + stats when the tab is hidden or closed — mobile
// browsers often don't fire 'pause' when the app is backgrounded or killed.
const flushOnHide = () => {
  saveProgress(true)
  flushStats()
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushOnHide()
})
window.addEventListener('pagehide', flushOnHide)

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
