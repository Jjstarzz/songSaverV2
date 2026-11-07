/**
 * Messages exchanged between a presentation controller and the screens
 * (projector /present and stage monitor /stage) over a Supabase Realtime
 * broadcast channel named `present-<CODE>`.
 *
 *   controller → screens   'slide'          full PresentState (sent on every change)
 *   screens → controller   'request-state'  sent when a screen (re)connects; the
 *                                           controller replies with its latest
 *                                           state, so a projector opened or
 *                                           reloaded mid-service shows the
 *                                           current slide straight away
 */

export const SLIDE_EVENT = 'slide'
export const REQUEST_STATE_EVENT = 'request-state'

export const presentChannelName = (code: string) => `present-${code}`

export interface StageSlide {
  /** Section name ("Chorus") — shown on the stage monitor only, never the projector */
  section: string
  lines: string
  title: string
}

export interface PresentState {
  blank: boolean
  lines: string
  translationLines?: string
  /** Song title, shown small in the corner of the projector */
  title: string
  /** Scripture reference ("John 3:16") — shown as a caption under the verse */
  reference?: string
  /** Section name for the stage monitor (not shown on the projector) */
  section?: string
  upNext?: StageSlide | null

  background: string
  fontSizeKey: string
  fontFamily: string
  textColor: string
  holdingImageUrl?: string
  screensaverEnabled?: boolean
  screensaverInterval?: number
  logoMode?: boolean

  /** @deprecated older controllers only — kept so a stale controller tab still renders scripture references */
  showSectionLabels?: boolean
}
