export interface TajweedToken {
  text: string
  cls: string | null
}

/** Split quran.com's `text_uthmani_tajweed` HTML into colorable tokens. */
export function parseTajweed(input: string): TajweedToken[] {
  // The field also embeds end-of-ayah markers like <span class=end>١</span>;
  // we render our own medallion, so drop those before tokenizing.
  const html = input.replace(/<span[^>]*>[\s\S]*?<\/span>/g, '')
  const tokens: TajweedToken[] = []
  const re = /<tajweed class="?([a-z_]+)"?>([\s\S]*?)<\/tajweed>/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (m.index > last) tokens.push({ text: html.slice(last, m.index), cls: null })
    tokens.push({ text: m[2], cls: m[1] })
    last = re.lastIndex
  }
  if (last < html.length) tokens.push({ text: html.slice(last), cls: null })
  return tokens
}

const COLORS: Record<string, string> = {
  ham_wasl: '#9aa0a6',
  slnt: '#9aa0a6',
  laam_shamsiyah: '#9aa0a6',
  madda_normal: '#e11d48',
  madda_permissible: '#e11d48',
  madda_obligatory: '#e11d48',
  madda_obligatory_monfasel: '#e11d48',
  madda_obligatory_mottasel: '#e11d48',
  madda_necessary: '#be123c',
  ghunnah: '#f59e0b',
  qalqalah: '#2563eb',
  ikhafa: '#16a34a',
  ikhafa_shafawi: '#16a34a',
  idgham_ghunnah: '#7c3aed',
  idgham_wo_ghunnah: '#7c3aed',
  idgham_shafawi: '#7c3aed',
  idgham_mutajanisayn: '#7c3aed',
  idgham_mutaqaribayn: '#7c3aed',
  iqlab: '#0891b2',
}

export function tajweedColor(cls: string | null): string | undefined {
  return cls ? COLORS[cls] : undefined
}

export const TAJWEED_LEGEND: { label: string; color: string }[] = [
  { label: 'Necessary prolongation', color: '#be123c' },
  { label: 'Prolongation (Madd)', color: '#e11d48' },
  { label: 'Ghunnah · nasalization', color: '#f59e0b' },
  { label: 'Qalqalah · echo', color: '#2563eb' },
  { label: 'Ikhfa · hiding', color: '#16a34a' },
  { label: 'Idgham · merging', color: '#7c3aed' },
  { label: 'Iqlab · conversion', color: '#0891b2' },
  { label: 'Silent / assimilated', color: '#9aa0a6' },
]
