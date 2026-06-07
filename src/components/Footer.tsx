import { LINKS } from '../lib/links'

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-2xl px-6 pt-4 text-center text-xs leading-relaxed text-muted">
      <p>
        Audio &amp; data from{' '}
        <a href={LINKS.source} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
          quran.com
        </a>
        <span className="px-1">·</span>
        Not affiliated with quran.com
      </p>
      <p className="mt-1">
        Free &amp; open source · by{' '}
        <a href={LINKS.authorGithub} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
          {LINKS.author}
        </a>
      </p>
    </footer>
  )
}
