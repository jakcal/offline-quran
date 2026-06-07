import { useEffect } from 'react'
import { usePlayer } from '../store/player'

/**
 * Global desktop keyboard controls. Active everywhere except text inputs.
 *
 *  Space / K        play · pause
 *  ← / →            seek -5s / +5s
 *  J / L            seek -10s / +10s
 *  P / N  (or Shift+← / Shift+→)   previous / next surah
 *  ↑ / ↓            volume up / down
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Don't double-fire when a button/link is focused (it handles Space itself).
      if (e.key === ' ' && (tag === 'BUTTON' || tag === 'A' || t?.getAttribute('role') === 'button')) return

      const p = usePlayer.getState()

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          p.toggle()
          break
        case 'ArrowRight':
          e.preventDefault()
          if (e.shiftKey) p.next()
          else p.seek(p.currentTime + 5)
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (e.shiftKey) p.prev()
          else p.seek(p.currentTime - 5)
          break
        case 'l':
          p.seek(p.currentTime + 10)
          break
        case 'j':
          p.seek(p.currentTime - 10)
          break
        case 'n':
          p.next()
          break
        case 'p':
          p.prev()
          break
        case 'ArrowUp':
          e.preventDefault()
          p.setVolume(p.volume + 0.1)
          break
        case 'ArrowDown':
          e.preventDefault()
          p.setVolume(p.volume - 0.1)
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
