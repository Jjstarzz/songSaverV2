/**
 * Presentation backgrounds — one registry for every kind of background.
 *
 *   colour  a static CSS gradient
 *   motion  an animated CSS background (class `live-<id>`, see ANIMATION_CSS)
 *   video   a looping MP4 hosted on Cloudinary
 *   photo   a still image hosted on Cloudinary
 *
 * Render a background with <BackgroundLayer id=… /> and choose one with
 * <BackgroundPicker />; don't branch on the kind elsewhere.
 */

export type BackgroundKind = 'colour' | 'motion' | 'video' | 'photo'

export interface BackgroundDef {
  id: string
  label: string
  kind: BackgroundKind
  /** CSS background for colours; fallback colour shown while media loads */
  css: string
  /** Full-size media URL (video / photo) */
  src?: string
}

export const BACKGROUND_GROUPS: { kind: BackgroundKind; label: string }[] = [
  { kind: 'colour', label: 'Colours' },
  { kind: 'motion', label: 'Motion' },
  { kind: 'video',  label: 'Video' },
  { kind: 'photo',  label: 'Photos' },
]

export const BACKGROUNDS: BackgroundDef[] = [
  { id: 'dark', label: 'Dark', kind: 'colour', css: 'radial-gradient(ellipse at 50% 60%, #1a1a2e 0%, #000 70%)' },
  { id: 'purple', label: 'Purple', kind: 'colour', css: 'radial-gradient(ellipse at 50% 60%, #2d1b69 0%, #06030f 70%)' },
  { id: 'blue', label: 'Blue', kind: 'colour', css: 'radial-gradient(ellipse at 50% 60%, #0c1445 0%, #000 70%)' },
  { id: 'green', label: 'Green', kind: 'colour', css: 'radial-gradient(ellipse at 50% 60%, #0a2e1a 0%, #000 70%)' },
  { id: 'teal', label: 'Teal', kind: 'colour', css: 'radial-gradient(ellipse at 50% 60%, #0a2a2a 0%, #000 70%)' },
  { id: 'crimson', label: 'Red', kind: 'colour', css: 'radial-gradient(ellipse at 50% 60%, #2a0a0a 0%, #000 70%)' },
  { id: 'aurora', label: 'Aurora', kind: 'motion', css: 'linear-gradient(135deg, #1a0a3e, #0a2a2a, #06030f)' },
  { id: 'embers', label: 'Embers', kind: 'motion', css: 'linear-gradient(135deg, #2a0f00, #1a0000, #200500)' },
  { id: 'ocean', label: 'Ocean', kind: 'motion', css: 'linear-gradient(135deg, #000f2a, #001a20, #000a2a)' },
  { id: 'haze', label: 'Haze', kind: 'motion', css: 'linear-gradient(135deg, #1a0a2a, #0a0520, #150025)' },
  { id: 'waves', label: 'Waves', kind: 'motion', css: 'linear-gradient(180deg, #000810 0%, #003366 60%, #004080 100%)' },
  { id: 'nebula', label: 'Nebula', kind: 'motion', css: 'linear-gradient(135deg, #080018, #3a0060, #001040)' },
  { id: 'sunset', label: 'Sunset', kind: 'motion', css: 'linear-gradient(180deg, #050002 0%, #1a0500 50%, #cc5000 100%)' },
  { id: 'storm', label: 'Storm', kind: 'motion', css: 'linear-gradient(135deg, #010308, #0a1430, #050a20)' },
  { id: 'meadow', label: 'Green Meadow', kind: 'video', src: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/v1777415923/green-meadow-under-blue-sky-moewalls-com_uldhna.mp4', css: 'linear-gradient(135deg, #4a7c59, #6db88a, #87ceeb)' },
  { id: 'particles', label: 'Deep Ocean', kind: 'video', src: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/v1777416858/71122-537102350_medium_zp1nof.mp4', css: 'linear-gradient(135deg, #001828, #003050, #004870)' },
  { id: 'bokeh', label: 'Bokeh', kind: 'video', src: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/v1777447384/12530-239934669_rrmykv.mp4', css: 'linear-gradient(135deg, #1a0a2e, #2e1a0a, #0a1a2e)' },
  { id: 'misty', label: 'Misty Colors', kind: 'video', src: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/f_auto/v1778401571/Misty_colors_3_geo_HD_fkbcri.mp4', css: 'linear-gradient(135deg, #6b4fa0, #a07060, #4a6080)' },
  { id: 'kaleidoscope', label: 'Kaleidoscope', kind: 'video', src: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/f_auto/v1778401221/kaleidoscope_mirror_gold_HD_objsbu.mp4', css: 'linear-gradient(135deg, #b8860b, #d4a017, #8b6914)' },
  { id: 'space', label: 'Space', kind: 'video', src: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/f_auto/v1780946255/15522210_1920_1080_24fps_eee9ci.mp4', css: 'linear-gradient(135deg, #030008, #0a0518, #150a30)' },
  { id: 'whitegradient', label: 'White Gradient', kind: 'video', src: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/f_auto/v1780946251/4153410-uhd_3840_2160_25fps_ga1jpj.mp4', css: 'linear-gradient(135deg, #c8c8c8, #e8e8e8, #f8f8f8)' },
  { id: 'sunflower', label: 'Sunflower', kind: 'video', src: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/f_auto/v1780946251/16074944_1080_1920_30fps_ia4cqy.mp4', css: 'linear-gradient(135deg, #8a7a00, #d4a800, #f0c830)' },
  { id: 'bluesky', label: 'Blue Sky Moon', kind: 'video', src: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/f_auto/v1780946251/11939983_1920_1080_60fps_gcnj3z.mp4', css: 'linear-gradient(135deg, #0a2060, #1848b0, #4090e0)' },
  { id: 'colourgradient', label: 'Colour Gradient', kind: 'video', src: 'https://res.cloudinary.com/do3irqqtz/video/upload/q_auto/f_auto/v1780946251/11387730-hd_1920_1080_30fps_sa7yaw.mp4', css: 'linear-gradient(135deg, #e040fb, #7c4dff, #40c4ff)' },
  { id: 'photo-sky', label: 'Sky', kind: 'photo', src: 'https://res.cloudinary.com/do3irqqtz/image/upload/q_auto/f_auto/v1782030986/jeremy-bishop-G9i_plbfDgk-unsplash_o2oxzq.jpg', css: '#000' },
  { id: 'photo-nature', label: 'Nature', kind: 'photo', src: 'https://res.cloudinary.com/do3irqqtz/image/upload/q_auto/f_auto/v1782030994/melanie-magdalena-VdFkSO3uePI-unsplash_e9mxkr.jpg', css: '#000' },
  { id: 'photo-forest', label: 'Forest', kind: 'photo', src: 'https://res.cloudinary.com/do3irqqtz/image/upload/q_auto/f_auto/v1782030996/casey-horner-gzH1qxPLXtA-unsplash_jcvvcs.jpg', css: '#000' },
  { id: 'photo-dawn', label: 'Dawn', kind: 'photo', src: 'https://res.cloudinary.com/do3irqqtz/image/upload/q_auto/f_auto/v1782031108/mohammad-alizade-S5uV7ro4UPY-unsplash_mm6non.jpg', css: '#000' },
]

export const DEFAULT_BACKGROUND_ID = 'dark'

const BY_ID = new Map(BACKGROUNDS.map((b) => [b.id, b]))

/** Look up a background, falling back to the default for unknown/removed ids. */
export function getBackground(id: string | null | undefined): BackgroundDef {
  return (id && BY_ID.get(id)) || BY_ID.get(DEFAULT_BACKGROUND_ID)!
}

/** Insert a Cloudinary transformation right after `/upload/`. */
function cloudinary(url: string, transform: string) {
  return url.includes('res.cloudinary.com') ? url.replace('/upload/', `/upload/${transform}/`) : url
}

/**
 * URL to actually play/show on screen. Capped at 1920px wide — some sources
 * are 4K, which is 4× the download for no visible gain on a projector.
 */
export function mediaUrl(bg: BackgroundDef): string | undefined {
  return bg.src ? cloudinary(bg.src, 'w_1920,c_limit') : undefined
}

/** Small 16:9 still for pickers and previews (~10 KB; a real frame for videos). */
export function thumbnailUrl(bg: BackgroundDef): string | undefined {
  if (!bg.src) return undefined
  if (bg.kind === 'video') return cloudinary(bg.src, 'so_2,w_320,h_180,c_fill').replace(/\.(mp4|webm|mov)$/i, '.jpg')
  return cloudinary(bg.src, 'w_320,h_180,c_fill')
}

/** Larger still used as a video poster so the screen isn't black while it buffers. */
export function posterUrl(bg: BackgroundDef): string | undefined {
  if (bg.kind !== 'video' || !bg.src) return undefined
  return cloudinary(bg.src, 'so_0,w_1280,c_limit').replace(/\.(mp4|webm|mov)$/i, '.jpg')
}

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
