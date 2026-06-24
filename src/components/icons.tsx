import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const stroke = (props: IconProps) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
})

export const PlayIcon = (props: IconProps) => (
  <svg {...stroke(props)} fill="currentColor" stroke="none">
    <path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5Z" />
  </svg>
)

export const PauseIcon = (props: IconProps) => (
  <svg {...stroke(props)} fill="currentColor" stroke="none">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
)

export const PrevIcon = (props: IconProps) => (
  <svg {...stroke(props)} fill="currentColor" stroke="none">
    <rect x="5" y="5" width="2.5" height="14" rx="1" />
    <path d="M20 6.2v11.6a1 1 0 0 1-1.55.83l-8.7-5.8a1 1 0 0 1 0-1.66l8.7-5.8A1 1 0 0 1 20 6.2Z" />
  </svg>
)

export const NextIcon = (props: IconProps) => (
  <svg {...stroke(props)} fill="currentColor" stroke="none">
    <rect x="16.5" y="5" width="2.5" height="14" rx="1" />
    <path d="M4 6.2v11.6a1 1 0 0 0 1.55.83l8.7-5.8a1 1 0 0 0 0-1.66l-8.7-5.8A1 1 0 0 0 4 6.2Z" />
  </svg>
)

export const DownloadIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
)

export const CheckIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="m20 6-11 11-5-5" />
  </svg>
)

export const TrashIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7" />
  </svg>
)

export const CloudOffIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M3 3l18 18" />
    <path d="M8.5 8.6A4 4 0 0 0 7 16h9" />
    <path d="M19.3 15.3A3.5 3.5 0 0 0 17 9h-1.3a5 5 0 0 0-7.4-2.6" />
  </svg>
)

export const SearchIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

export const CloseIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const SpinnerIcon = (props: IconProps) => (
  <svg {...stroke(props)} className={`animate-spin ${props.className ?? ''}`}>
    <path d="M21 12a9 9 0 1 1-6.2-8.5" />
  </svg>
)

export const BookmarkIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
  </svg>
)

export const CopyIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a1 1 0 0 1 1-1h10" />
  </svg>
)

export const SlidersIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <line x1="4" y1="8" x2="20" y2="8" />
    <circle cx="14" cy="8" r="2.4" fill="currentColor" stroke="none" />
    <line x1="4" y1="16" x2="20" y2="16" />
    <circle cx="9" cy="16" r="2.4" fill="currentColor" stroke="none" />
  </svg>
)

export const ChevronLeftIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
)

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const HeadphonesIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M4 14v-1a8 8 0 0 1 16 0v1" />
    <rect x="3" y="14" width="4" height="6" rx="1.5" fill="currentColor" stroke="none" />
    <rect x="17" y="14" width="4" height="6" rx="1.5" fill="currentColor" stroke="none" />
  </svg>
)

export const BookIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M12 6.5C10.5 5 8 4.5 4 4.8v12.4c4-.3 6.5.2 8 1.7 1.5-1.5 4-2 8-1.7V4.8c-4-.3-6.5.2-8 1.7Z" />
    <path d="M12 6.5V19" />
  </svg>
)

export const ExternalIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M19 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
)

export const InfoIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
)

export const HeartIcon = (props: IconProps) => (
  <svg {...stroke(props)} fill="currentColor" stroke="none">
    <path d="M12 20.3 4.6 12.9a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5z" />
  </svg>
)

export const GithubIcon = (props: IconProps) => (
  <svg {...stroke(props)} fill="currentColor" stroke="none">
    <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-1.95c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.07.78 2.15v3.18c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
  </svg>
)

export const ShareIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M12 3v12" />
    <path d="m8 7 4-4 4 4" />
    <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
  </svg>
)

export const MoonIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
)

export const MicIcon = (props: IconProps) => (
  <svg {...stroke(props)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
)
