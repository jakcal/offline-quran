export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Human "listening time", e.g. 5 → "5s", 90 → "1m", 3700 → "1h 1m". */
export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 1) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  if (m > 0) return `${m}m`
  return `${Math.floor(sec)}s`
}

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

/** Render a number with Arabic-Indic digits, e.g. 255 → ٢٥٥ */
export function toArabicNumber(n: number): string {
  return String(n)
    .split('')
    .map((d) => ARABIC_DIGITS[Number(d)] ?? d)
    .join('')
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}
