# Offline Quran

A mobile-first, offline-first PWA for listening to the Holy Quran. Pick a reciter,
tap a surah, and it streams instantly while downloading in the background to
IndexedDB — so next time (even with no connection) it plays straight from the device.
You can download many surahs across **different reciters**; they all collect in the
**Offline** tab, each labelled with its reciter.

Built with **Vite + React + TypeScript + Tailwind v4**, audio and metadata from the
public [quran.com API](https://api.quran.com/api/v4) (no auth; audio served from the
`download.quranicaudio.com` CDN).

## Run

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # production build (dist/)
bun run preview  # serve the production build
```

## How it works

- **Offline-first browse** — the 114 surahs and the reciter list are bundled
  (`src/data/`, a one-time snapshot from quran.com), so the app is fully browsable
  on first launch and offline. The reciter list refreshes from the network when online.
- **Play** — on tap, the player checks IndexedDB first. If cached, it plays the stored
  blob (works offline). Otherwise it resolves the CDN MP3 URL from the API, streams it
  immediately, and kicks off a background download.
- **Background download** — `src/lib/download.ts` streams the surah MP3 with byte
  progress into IndexedDB (via Dexie). Auto-download on play is on by default; each row
  also has a manual download / cancel / remove control. Downloads are keyed by
  `reciterId:chapterId`, so the same surah can be saved from multiple reciters.
- **Offline tab** — lists every saved recording across all reciters (independent of the
  currently selected one); tapping plays that exact reciter's recording.
- **PWA** — `vite-plugin-pwa` precaches the app shell and runtime-caches API metadata.
  Audio is intentionally kept out of the service-worker cache (it lives in IndexedDB).
  Includes a web manifest, maskable icon, and Media Session lock-screen controls.

## Structure

```
src/
  data/        bundled chapters + reciters (offline-first metadata)
  lib/         api client, Dexie schema, download streamer, helpers
  store/       zustand stores — player (singleton <audio>) + downloads
  components/  Header, ReciterPicker (sheet), SurahList, SurahRow,
               DownloadedRow (offline items), PlayerBar, About, Footer, icons
```

## Analytics

Optional Google Analytics 4. Set the Measurement ID to enable it:

```bash
cp .env.example .env   # then set VITE_GA_ID=G-XXXXXXXXXX
```

When `VITE_GA_ID` is unset, analytics is fully disabled (no script loads; events log
to the console in dev). Wired via `src/lib/analytics.ts` and instrumented at the
source (stores + key UI). Tracked events include: `app_open`, `play_surah`,
`resume_listening` / `resume_reading`, `open_surah_sheet`, `open_reader`,
`select_reciter`, `reader_setting`, `verse_copy` / `verse_share`,
`bookmark_add` / `bookmark_remove`, `download_start` / `download_complete` /
`download_error` / `download_cancel` / `download_remove`, `about_open`,
`link_click`, `install_available` / `install_choice` / `pwa_installed`.

## License

[MIT](LICENSE) © Yassine Chandid ([@jakcal](https://github.com/jakcal)).
Not affiliated with or endorsed by quran.com.

If you find this useful, consider [supporting development](https://ko-fi.com/jakcal). ❤️
