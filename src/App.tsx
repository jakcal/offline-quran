import { useEffect } from 'react'
import { ContinueSection } from './components/ContinueSection'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { PlayerBar } from './components/PlayerBar'
import { Reader } from './components/Reader'
import { ReciterChip } from './components/ReciterChip'
import { ReciterSheet } from './components/ReciterSheet'
import { SurahList } from './components/SurahList'
import { SurahSheet } from './components/SurahSheet'
import { getMeta } from './lib/db'
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts'
import { useDownloads } from './store/downloads'
import { usePlayer } from './store/player'

function App() {
  const hasPlayer = usePlayer((s) => s.chapterId != null)

  useKeyboardShortcuts()

  useEffect(() => {
    void useDownloads.getState().init()
    void getMeta<number>('reciterId').then((id) => {
      if (id != null) usePlayer.getState().setReciter(id)
    })
  }, [])

  return (
    <div className="min-h-full">
      <Header />
      <main className={hasPlayer ? 'pb-44' : 'pb-10'}>
        <div className="mx-auto w-full max-w-2xl space-y-3 px-3 pt-4">
          <ContinueSection />
          <ReciterChip />
        </div>
        <div className="mt-4">
          <SurahList />
        </div>
        <Footer />
      </main>

      <PlayerBar />
      <Reader />
      <SurahSheet />
      <ReciterSheet />
    </div>
  )
}

export default App
