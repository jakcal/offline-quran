import { useEffect } from 'react'
import { ContinueSection } from './components/ContinueSection'
import { Footer } from './components/Footer'
import { HadithSection } from './components/HadithSection'
import { Header } from './components/Header'
import { ListeningStats } from './components/ListeningStats'
import { PlayerBar } from './components/PlayerBar'
import { Reader } from './components/Reader'
import { ReciterSheet } from './components/ReciterSheet'
import { SettingsSheet } from './components/SettingsSheet'
import { SurahList } from './components/SurahList'
import { SurahSheet } from './components/SurahSheet'
import { ViewTabs } from './components/ViewTabs'
import { initAnalytics, track } from './lib/analytics'
import { getMeta } from './lib/db'
import { startAdhkarReminders } from './lib/notifications'
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts'
import { useDownloads } from './store/downloads'
import { usePlayer } from './store/player'
import { useStats } from './store/stats'
import { useView } from './store/view'

function App() {
  const hasPlayer = usePlayer((s) => s.chapterId != null)
  const view = useView((s) => s.view)

  useKeyboardShortcuts()

  useEffect(() => {
    initAnalytics()
    track('app_open', {
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      online: navigator.onLine,
    })
    void useDownloads
      .getState()
      .init()
      .then(() => useDownloads.getState().backfillTimings())
    void useStats.getState().load()
    startAdhkarReminders()
    void getMeta<number>('reciterId').then((id) => {
      if (id != null) usePlayer.getState().setReciter(id)
    })
    void getMeta<number>('speed').then((s) => {
      if (s != null) usePlayer.getState().setSpeed(s)
    })
  }, [])

  return (
    <div className="min-h-full">
      <Header />
      <main className={hasPlayer ? 'pb-44' : 'pb-10'}>
        <div className="mx-auto w-full max-w-2xl px-3 pt-4">
          <ViewTabs />
        </div>

        {view === 'quran' ? (
          <>
            <div className="mx-auto w-full max-w-2xl space-y-3 px-3 pt-3">
              <ContinueSection />
              <ListeningStats />
            </div>
            <div className="mt-4">
              <SurahList />
            </div>
          </>
        ) : (
          <HadithSection />
        )}

        <Footer />
      </main>

      <PlayerBar />
      <Reader />
      <SurahSheet />
      <SettingsSheet />
      <ReciterSheet />
    </div>
  )
}

export default App
