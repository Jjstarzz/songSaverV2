export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          default_language: string
          avatar_url: string | null
          is_anonymous: boolean
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          default_language?: string
          avatar_url?: string | null
          is_anonymous?: boolean
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          default_language?: string
          avatar_url?: string | null
          is_anonymous?: boolean
          role?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code?: string
          created_by: string
          created_at?: string
        }
        Update: {
          name?: string
          invite_code?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          role?: 'owner' | 'admin' | 'member'
        }
      }
      songs: {
        Row: {
          id: string
          title: string
          artist: string | null
          default_key: string | null
          preferred_key: string | null
          bpm: number | null
          time_signature: string | null
          mode: 'major' | 'minor' | null
          tags: string[]
          youtube_url: string | null
          spotify_url: string | null
          notes: string | null
          original_language: string | null
          created_by: string
          team_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          artist?: string | null
          default_key?: string | null
          preferred_key?: string | null
          bpm?: number | null
          time_signature?: string | null
          mode?: 'major' | 'minor' | null
          tags?: string[]
          youtube_url?: string | null
          spotify_url?: string | null
          notes?: string | null
          original_language?: string | null
          created_by: string
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          artist?: string | null
          default_key?: string | null
          preferred_key?: string | null
          bpm?: number | null
          time_signature?: string | null
          mode?: 'major' | 'minor' | null
          tags?: string[]
          youtube_url?: string | null
          spotify_url?: string | null
          notes?: string | null
          original_language?: string | null
          team_id?: string | null
          updated_at?: string
        }
      }
      song_lyrics: {
        Row: {
          id: string
          song_id: string
          language: string
          lyrics: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          song_id: string
          language: string
          lyrics: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          lyrics?: string
          is_default?: boolean
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          date: string
          type: 'sunday_morning' | 'midweek' | 'event' | 'other'
          theme: string | null
          notes: string | null
          status: 'draft' | 'confirmed' | 'completed'
          is_public: boolean
          created_by: string
          team_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          type?: 'sunday_morning' | 'midweek' | 'event' | 'other'
          theme?: string | null
          notes?: string | null
          status?: 'draft' | 'confirmed' | 'completed'
          is_public?: boolean
          created_by: string
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          date?: string
          type?: 'sunday_morning' | 'midweek' | 'event' | 'other'
          theme?: string | null
          notes?: string | null
          status?: 'draft' | 'confirmed' | 'completed'
          is_public?: boolean
          team_id?: string | null
          updated_at?: string
        }
      }
      service_songs: {
        Row: {
          id: string
          service_id: string
          song_id: string
          order_index: number
          key_override: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          service_id: string
          song_id: string
          order_index?: number
          key_override?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          order_index?: number
          key_override?: string | null
          notes?: string | null
        }
      }
      rehearsal_recordings: {
        Row: {
          id: string
          file_url: string
          file_name: string | null
          duration_s: number | null
          song_id: string | null
          service_id: string | null
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          file_url: string
          file_name?: string | null
          duration_s?: number | null
          song_id?: string | null
          service_id?: string | null
          uploaded_by: string
          created_at?: string
        }
        Update: {
          file_name?: string | null
          duration_s?: number | null
          song_id?: string | null
          service_id?: string | null
        }
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type Song = Database['public']['Tables']['songs']['Row']
export type SongLyrics = Database['public']['Tables']['song_lyrics']['Row']
export type Service = Database['public']['Tables']['services']['Row']
export type ServiceSong = Database['public']['Tables']['service_songs']['Row']
export type RehearsalRecording = Database['public']['Tables']['rehearsal_recordings']['Row']

export type SongWithLyrics = Song & {
  song_lyrics: SongLyrics[]
}

export type SongWithLanguages = Song & {
  song_lyrics: { language: string; is_default: boolean }[]
  creator_name?: string | null
  last_sung_date?: string | null
  service_songs?: { services: { date: string } | null }[]
}

export interface SongTransition {
  id: string
  from_song_id: string
  to_song_id: string
  notes: string | null
  created_by: string
  created_at: string
  to_song?: Song
}

export interface UserSongPreference {
  id: string
  user_id: string
  song_id: string
  preferred_key: string | null
  created_at: string
  updated_at: string
}

export type ServiceWithSongs = Service & {
  service_songs: (ServiceSong & { songs: Song })[]
}

/** Returns e.g. "D minor", "G major", or just "D" when mode is null */
export function formatKey(key: string | null | undefined, mode: 'major' | 'minor' | null | undefined): string {
  if (!key) return ''
  if (!mode) return key
  return `${key} ${mode}`
}

export const MUSICAL_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
]

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  de: 'German',
  it: 'Italian',
  zh: 'Chinese',
  ko: 'Korean',
  ja: 'Japanese',
  sw: 'Swahili',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  tl: 'Filipino',
  ml: 'Malayalam',
}

export const SERVICE_TYPES = {
  sunday_morning: 'Sunday Morning',
  midweek: 'Midweek',
  event: 'Special Event',
  other: 'Other',
} as const

export const SERVICE_STATUSES = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  completed: 'Completed',
} as const
