/**
 * Types and helpers for the November 2026 features (singers, arrangements,
 * team assignments, templates, feedback). Their tables come from
 * supabase/features_2026_11.sql — until that has been run, queries fail with a
 * "table not found" error, which `isMissingTable` detects so the UI can show a
 * friendly notice instead of an error.
 */

export interface Singer {
  id: string
  name: string
  voice: string | null
  notes: string | null
  user_id: string | null
  created_by: string
  created_at: string
}

export interface SingerSongKey {
  id: string
  singer_id: string
  song_id: string
  key: string
  notes: string | null
  created_by: string
}

export interface Arrangement {
  id: string
  song_id: string
  name: string
  key: string | null
  tempo: number | null
  structure: string | null
  intro: string | null
  ending: string | null
  notes: string | null
  created_by: string
  created_at: string
}

export type AssignmentStatus = 'pending' | 'confirmed' | 'declined'

export interface Assignment {
  id: string
  service_id: string
  role: string
  person_name: string
  user_id: string | null
  singer_id: string | null
  status: AssignmentStatus
  tasks: string | null
  created_by: string
  created_at: string
}

export interface TemplateSlot {
  label: string
  song_id: string | null
  song_title?: string | null
  key: string | null
}

export interface ServiceTemplate {
  id: string
  name: string
  type: string | null
  theme: string | null
  notes: string | null
  slots: TemplateSlot[]
  created_by: string
  created_at: string
}

export interface Feedback {
  id: string
  service_id: string
  song_id: string | null
  author_id: string
  author_name: string | null
  went_well: string | null
  difficult: string | null
  transition_notes: string | null
  created_at: string
}

export const TEAM_ROLES = [
  'Worship leader', 'Vocalist', 'Keys', 'Acoustic guitar', 'Electric guitar', 'Bass', 'Drums',
  'Sound', 'Projection', 'Other',
] as const

/** True when a Supabase/PostgREST error means the table (or column) hasn't been created yet. */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204' || error.code === '42703'
    || /could not find the table|does not exist|schema cache/i.test(error.message ?? '')
}

export const MIGRATION_HINT =
  'This feature needs a one-time database update (supabase/features_2026_11.sql). Ask your SongSaver admin to apply it.'
