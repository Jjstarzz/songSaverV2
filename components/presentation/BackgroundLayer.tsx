'use client'

/* eslint-disable @next/next/no-img-element -- remote CDN media, sized via Cloudinary */
import { ANIMATION_CSS, getBackground, mediaUrl, posterUrl, thumbnailUrl } from '@/lib/presentationBackgrounds'

const FILL: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' }

/** Injects the keyframes/classes the animated ("motion") backgrounds need. Safe to render more than once. */
export function PresentationStyles() {
  // Raw HTML so server rendering doesn't escape the quotes (hydration mismatch)
  return <style dangerouslySetInnerHTML={{ __html: ANIMATION_CSS }} />
}

/**
 * Fills its (positioned) parent with a presentation background.
 * `still` swaps videos for a thumbnail — use it for small previews so the
 * controller doesn't download and play a second copy of the video.
 */
export function BackgroundLayer({ id, still = false }: { id: string; still?: boolean }) {
  const bg = getBackground(id)

  if (bg.kind === 'colour') {
    return <div aria-hidden style={{ ...FILL, background: bg.css }} />
  }

  if (bg.kind === 'motion') {
    return (
      <>
        <PresentationStyles />
        <div aria-hidden className={`live-${bg.id}`} style={FILL} />
      </>
    )
  }

  if (bg.kind === 'video' && !still) {
    return (
      <video
        key={bg.id}
        aria-hidden
        autoPlay loop muted playsInline preload="auto"
        poster={posterUrl(bg)}
        src={mediaUrl(bg)}
        style={{ ...FILL, objectFit: 'cover', background: bg.css }}
      />
    )
  }

  // Photos, and videos in still mode
  return (
    <img
      key={bg.id + (still ? '-still' : '')}
      aria-hidden
      alt=""
      src={still ? thumbnailUrl(bg) : mediaUrl(bg)}
      style={{ ...FILL, objectFit: 'cover', background: bg.css }}
    />
  )
}
