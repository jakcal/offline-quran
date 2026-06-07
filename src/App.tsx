import { useEffect } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { PlayerBar } from './components/PlayerBar'
import { ReciterPicker } from './components/ReciterPicker'
import { SurahList } from './components/SurahList'
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
        <div className="mx-auto w-full max-w-2xl px-3 pt-3">
          <ReciterPicker />
        </div>
        <div className="mt-3">
          <SurahList />
        </div>
        <Footer />
      </main>
      <PlayerBar />
    </div>
  )
}

export default App
