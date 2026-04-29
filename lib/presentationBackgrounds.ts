/** Shared background definitions for the presentation system */

export interface Background {
  id: string
  label: string
  live: boolean
  /** Gradient string for static swatches / static display */
  gradient: string
  /** Gradient used for the swatch preview in the controller */
  swatch: string
}

export const STATIC_BACKGROUNDS: Background[] = [
  {
    id: 'dark', label: 'Dark', live: false,
    gradient: 'radial-gradient(ellipse at 50% 60%, #1a1a2e 0%, #000 70%)',
    swatch:   'radial-gradient(ellipse at center, #1a1a2e 0%, #000 70%)',
  },
  {
    id: 'purple', label: 'Purple', live: false,
    gradient: 'radial-gradient(ellipse at 50% 60%, #2d1b69 0%, #06030f 70%)',
    swatch:   'radial-gradient(ellipse at center, #2d1b69 0%, #06030f 70%)',
  },
  {
    id: 'blue', label: 'Blue', live: false,
    gradient: 'radial-gradient(ellipse at 50% 60%, #0c1445 0%, #000 70%)',
    swatch:   'radial-gradient(ellipse at center, #0c1445 0%, #000 70%)',
  },
  {
    id: 'green', label: 'Green', live: false,
    gradient: 'radial-gradient(ellipse at 50% 60%, #0a2e1a 0%, #000 70%)',
    swatch:   'radial-gradient(ellipse at center, #0a2e1a 0%, #000 70%)',
  },
  {
    id: 'teal', label: 'Teal', live: false,
    gradient: 'radial-gradient(ellipse at 50% 60%, #0a2a2a 0%, #000 70%)',
    swatch:   'radial-gradient(ellipse at center, #0a2a2a 0%, #000 70%)',
  },
  {
    id: 'crimson', label: 'Red', live: false,
    gradient: 'radial-gradient(ellipse at 50% 60%, #2a0a0a 0%, #000 70%)',
    swatch:   'radial-gradient(ellipse at center, #2a0a0a 0%, #000 70%)',
  },
]

export const LIVE_BACKGROUNDS: Background[] = [
  {
    id: 'aurora', label: 'Aurora', live: true,
    gradient: '',
    swatch: 'linear-gradient(135deg, #1a0a3e, #0a2a2a, #06030f)',
  },
  {
    id: 'embers', label: 'Embers', live: true,
    gradient: '',
    swatch: 'linear-gradient(135deg, #2a0f00, #1a0000, #200500)',
  },
  {
    id: 'ocean', label: 'Ocean', live: true,
    gradient: '',
    swatch: 'linear-gradient(135deg, #000f2a, #001a20, #000a2a)',
  },
  {
    id: 'haze', label: 'Haze', live: true,
    gradient: '',
    swatch: 'linear-gradient(135deg, #1a0a2a, #0a0520, #150025)',
  },
  {
    id: 'waves', label: 'Waves', live: true,
    gradient: '',
    swatch: 'linear-gradient(180deg, #000810 0%, #003366 60%, #004080 100%)',
  },
  {
    id: 'nebula', label: 'Nebula', live: true,
    gradient: '',
    swatch: 'linear-gradient(135deg, #080018, #3a0060, #001040)',
  },
  {
    id: 'sunset', label: 'Sunset', live: true,
    gradient: '',
    swatch: 'linear-gradient(180deg, #050002 0%, #1a0500 50%, #cc5000 100%)',
  },
  {
    id: 'storm', label: 'Storm', live: true,
    gradient: '',
    swatch: 'linear-gradient(135deg, #010308, #0a1430, #050a20)',
  },
]

export interface VideoBackground {
  id: string
  label: string
  url: string
  swatch: string
}

export const VIDEO_BACKGROUNDS: VideoBackground[] = [
  {
    id: 'meadow',
    label: 'Green Meadow',
    url: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/v1777415923/green-meadow-under-blue-sky-moewalls-com_uldhna.mp4',
    swatch: 'linear-gradient(135deg, #4a7c59, #6db88a, #87ceeb)',
  },
  {
    id: 'particles',
    label: 'Particles',
    url: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/v1777416858/71122-537102350_medium_zp1nof.mp4',
    swatch: 'linear-gradient(135deg, #0a0a1a, #1a1a3e, #2a1a5e)',
  },
  {
    id: 'bokeh',
    label: 'Bokeh',
    url: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/v1777447384/12530-239934669_rrmykv.mp4',
    swatch: 'linear-gradient(135deg, #1a0a2e, #2e1a0a, #0a1a2e)',
  },
]

export const VIDEO_BG_IDS = new Set(VIDEO_BACKGROUNDS.map(b => b.id))
export const VIDEO_BG_URLS: Record<string, string> = Object.fromEntries(
  VIDEO_BACKGROUNDS.map(b => [b.id, b.url])
)

export const ALL_BACKGROUNDS: Background[] = [...STATIC_BACKGROUNDS, ...LIVE_BACKGROUNDS]
export const LIVE_BG_IDS = new Set(LIVE_BACKGROUNDS.map(b => b.id))

/** Static gradient lookup for non-animated backgrounds */
export const BG_STATIC: Record<string, string> = Object.fromEntries(
  STATIC_BACKGROUNDS.map(b => [b.id, b.gradient])
)

/** CSS keyframes + utility classes injected into the presentation display */
export const ANIMATION_CSS = `
/* ── Shifting gradient backgrounds ── */
@keyframes bg-shift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.live-aurora {
  background: linear-gradient(-45deg, #06030f, #1a0a3e, #0a1a2e, #0a2a2a, #1a0a3e, #06030f);
  background-size: 500% 500%;
  animation: bg-shift 15s ease infinite;
}

.live-embers {
  background: linear-gradient(-45deg, #0a0000, #2a0f00, #1a0000, #1f0600, #150300, #0a0000);
  background-size: 500% 500%;
  animation: bg-shift 12s ease infinite;
}

.live-ocean {
  background: linear-gradient(-45deg, #000010, #000f2a, #001a20, #000a2a, #001015, #000010);
  background-size: 500% 500%;
  animation: bg-shift 18s ease infinite;
}

.live-haze {
  background: linear-gradient(-45deg, #0a000f, #1a0a2a, #0a0520, #150025, #0a0a1a, #0a000f);
  background-size: 500% 500%;
  animation: bg-shift 20s ease infinite;
}

/* ── Pseudo-element layered backgrounds ── */

.live-waves, .live-nebula, .live-sunset, .live-storm {
  overflow: hidden;
  position: relative;
}

/* Waves */
.live-waves { background: #000810; }
.live-waves::before {
  content: '';
  position: absolute;
  width: 160%; height: 70%;
  bottom: -20%; left: -30%;
  background: radial-gradient(ellipse at 50% 80%, rgba(0,60,140,0.9) 0%, rgba(0,20,70,0.4) 45%, transparent 70%);
  border-radius: 45%;
  filter: blur(10px);
  animation: wave-rock 7s ease-in-out infinite;
}
.live-waves::after {
  content: '';
  position: absolute;
  width: 150%; height: 55%;
  bottom: -8%; left: -25%;
  background: radial-gradient(ellipse at 50% 90%, rgba(0,110,220,0.5) 0%, rgba(0,50,130,0.2) 50%, transparent 70%);
  border-radius: 40%;
  filter: blur(6px);
  animation: wave-rock 5s ease-in-out infinite reverse;
}
@keyframes wave-rock {
  0%, 100% { transform: translateX(-8%) rotate(-2deg); }
  50%       { transform: translateX(8%)  rotate(2deg);  }
}

/* Nebula */
.live-nebula { background: #030008; }
.live-nebula::before {
  content: '';
  position: absolute;
  inset: -30%;
  background:
    radial-gradient(ellipse 55% 40% at 30% 35%, rgba(130,0,200,0.55) 0%, transparent 60%),
    radial-gradient(ellipse 45% 35% at 70% 65%, rgba(0,60,200,0.45)  0%, transparent 55%),
    radial-gradient(ellipse 40% 50% at 55% 20%, rgba(200,0,130,0.3)  0%, transparent 50%);
  filter: blur(22px);
  animation: nebula-drift 18s ease-in-out infinite;
}
.live-nebula::after {
  content: '';
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(ellipse 30% 40% at 60% 40%, rgba(80,0,160,0.4)  0%, transparent 55%),
    radial-gradient(ellipse 35% 25% at 25% 70%, rgba(0,100,180,0.3) 0%, transparent 50%);
  filter: blur(30px);
  animation: nebula-drift 25s ease-in-out infinite reverse;
}
@keyframes nebula-drift {
  0%, 100% { transform: rotate(0deg)  scale(1);    }
  33%       { transform: rotate(4deg)  scale(1.06); }
  66%       { transform: rotate(-3deg) scale(0.97); }
}

/* Sunset */
.live-sunset { background: linear-gradient(180deg, #050002 0%, #120308 40%, #1a0500 100%); }
.live-sunset::before {
  content: '';
  position: absolute;
  width: 200%; height: 180%;
  bottom: -60%; left: -50%;
  background: radial-gradient(ellipse at 50% 55%, rgba(220,80,0,0.65) 0%, rgba(160,30,0,0.4) 25%, rgba(80,5,0,0.2) 50%, transparent 65%);
  animation: sunset-glow 10s ease-in-out infinite;
}
.live-sunset::after {
  content: '';
  position: absolute;
  width: 180%; height: 120%;
  bottom: -30%; left: -40%;
  background: radial-gradient(ellipse at 50% 70%, rgba(255,120,0,0.3) 0%, rgba(180,40,0,0.15) 35%, transparent 60%);
  animation: sunset-glow 14s ease-in-out infinite reverse;
}
@keyframes sunset-glow {
  0%, 100% { transform: scale(1)    translateY(0);   opacity: 0.85; }
  50%       { transform: scale(1.08) translateY(-4%); opacity: 1;    }
}

/* Storm */
.live-storm { background: #010308; }
.live-storm::before {
  content: '';
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(ellipse 60% 50% at 40% 30%, rgba(20,40,110,0.75) 0%, transparent 60%),
    radial-gradient(ellipse 50% 40% at 70% 65%, rgba(10,20,80,0.55)  0%, transparent 55%);
  filter: blur(16px);
  animation: storm-shift 9s ease-in-out infinite;
}
.live-storm::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 40% at 50% 50%, rgba(60,110,255,0.12) 0%, transparent 70%);
  animation: storm-flash 9s ease-in-out infinite;
}
@keyframes storm-shift {
  0%, 100% { transform: translateX(-5%) scale(1);    }
  50%       { transform: translateX(5%)  scale(1.05); }
}
@keyframes storm-flash {
  0%, 89%, 93%, 100% { opacity: 0.3; }
  91%                { opacity: 1;   }
}
`

/* Font options available to the presenter */
export const FONT_OPTIONS = [
  { id: 'sans',    label: 'Clean',   family: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' },
  { id: 'serif',   label: 'Serif',   family: "Georgia, 'Times New Roman', serif" },
  { id: 'elegant', label: 'Elegant', family: "'Playfair Display', Georgia, serif" },
  { id: 'rounded', label: 'Round',   family: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" },
] as const

export type FontId = typeof FONT_OPTIONS[number]['id']

export const FONT_FAMILY_MAP: Record<string, string> = Object.fromEntries(
  FONT_OPTIONS.map(f => [f.id, f.family])
)

export const SIZE_MULTIPLIERS: Record<string, number> = {
  sm: 0.72,
  md: 1,
  lg: 1.3,
  xl: 1.65,
}

export type FontSizeKey = keyof typeof SIZE_MULTIPLIERS
