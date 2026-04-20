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
]

export const ALL_BACKGROUNDS: Background[] = [...STATIC_BACKGROUNDS, ...LIVE_BACKGROUNDS]
export const LIVE_BG_IDS = new Set(LIVE_BACKGROUNDS.map(b => b.id))

/** Static gradient lookup for non-animated backgrounds */
export const BG_STATIC: Record<string, string> = Object.fromEntries(
  STATIC_BACKGROUNDS.map(b => [b.id, b.gradient])
)

/** CSS keyframes + utility classes injected into the presentation display */
export const ANIMATION_CSS = `
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
`
