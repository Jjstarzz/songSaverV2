'use client'

/* eslint-disable @next/next/no-img-element -- tiny Cloudinary thumbnails */
import { useState } from 'react'
import { Check } from 'lucide-react'
import {
  BACKGROUNDS, BACKGROUND_GROUPS, getBackground, thumbnailUrl, type BackgroundKind,
} from '@/lib/presentationBackgrounds'
import { PresentationStyles } from './BackgroundLayer'

/**
 * Background chooser: a tab per kind (Colours / Motion / Video / Photos) and
 * a grid of 16:9 previews. Videos and photos show real frames; motion tiles
 * animate. Opens on the tab of the current background.
 */
export function BackgroundPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [group, setGroup] = useState<BackgroundKind>(() => getBackground(value).kind)
  const items = BACKGROUNDS.filter((b) => b.kind === group)

  return (
    <div>
      <PresentationStyles />
      <div role="tablist" aria-label="Background type" style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {BACKGROUND_GROUPS.map((g) => {
          const active = g.kind === group
          const hasSelected = getBackground(value).kind === g.kind
          return (
            <button
              key={g.kind}
              role="tab"
              aria-selected={active}
              onClick={() => setGroup(g.kind)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
                fontSize: '0.72rem', fontWeight: 600,
                background: active ? 'rgba(35,102,83,0.3)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${active ? 'rgba(140,201,179,0.6)' : 'rgba(255,255,255,0.1)'}`,
                color: active ? '#b5dccd' : 'rgba(255,255,255,0.55)',
                position: 'relative',
              }}
            >
              {g.label}
              {hasSelected && !active && (
                <span aria-hidden style={{ position: 'absolute', top: 5, right: 7, width: 5, height: 5, borderRadius: '50%', background: '#8cc9b3' }} />
              )}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
        {items.map((bg) => {
          const selected = bg.id === value
          const thumb = thumbnailUrl(bg)
          return (
            <button
              key={bg.id}
              onClick={() => onChange(bg.id)}
              aria-pressed={selected}
              aria-label={`${bg.label} background`}
              style={{
                position: 'relative', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', padding: 0,
                border: selected ? '2px solid #8cc9b3' : '1px solid rgba(255,255,255,0.12)',
                boxShadow: selected ? '0 0 0 3px rgba(140,201,179,0.25)' : 'none',
                background: bg.css,
              }}
            >
              {bg.kind === 'motion' && <span aria-hidden className={`live-${bg.id}`} style={{ position: 'absolute', inset: 0 }} />}
              {thumb && (
                <img src={thumb} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <span style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 6px 4px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                color: '#fff', fontSize: '0.62rem', fontWeight: 600, textAlign: 'left',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {bg.label}
              </span>
              {selected && (
                <span aria-hidden style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%', background: '#236653', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check style={{ width: 11, height: 11, color: '#fff' }} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
