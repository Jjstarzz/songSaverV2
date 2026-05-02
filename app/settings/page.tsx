'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  User, Mail, Shield, Users, LogOut, ChevronRight,
  Globe, Bell, Moon, Sun, Smartphone, Info, ExternalLink,
  Trash2, Copy, Check, Download, Upload, Crown,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { useSupabase } from '@/hooks/useSupabase'
import { toast } from '@/components/ui/Toaster'
import { LANGUAGE_NAMES, Profile } from '@/types/database'
import { cn } from '@/lib/utils'

const LANG_OPTIONS = Object.entries(LANGUAGE_NAMES).map(([value, label]) => ({ value, label }))

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
  danger,
}: {
  icon: React.ElementType
  label: string
  description?: string
  children?: React.ReactNode
  danger?: boolean
}) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-white/[0.06] last:border-0">
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        danger ? 'bg-red-500/15 text-red-400' : 'bg-white/[0.06] text-white/50'
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', danger ? 'text-red-400' : 'text-white')}>{label}</p>
        {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { isOwner } = useRole()
  const supabase = useSupabase()
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [defaultLang, setDefaultLang] = useState('en')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkMode, setLinkMode] = useState<'new' | 'existing'>('new')
  const [linkEmail, setLinkEmail] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [activeSection, setActiveSection] = useState<'account' | 'app' | 'team' | 'owner'>('account') // Section type defined below in TABS

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }: { data: Profile | null }) => {
        if (data) {
          setProfile(data)
          setDisplayName(data.display_name ?? '')
          setDefaultLang(data.default_language)
        }
      })
  }, [user, supabase])

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      display_name: displayName.trim() || null,
      default_language: defaultLang,
    }).eq('id', user.id)
    if (error) toast.error('Failed to save')
    else toast.success('Settings saved')
    setSaving(false)
  }

  const copyUserId = () => {
    if (!user?.id) return
    navigator.clipboard.writeText(user.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const submitLink = async () => {
    if (!linkEmail.trim()) { toast.error('Enter your email'); return }
    setLinking(true)
    if (linkMode === 'new') {
      const { error } = await supabase.auth.updateUser({ email: linkEmail.trim() })
      if (error) toast.error(error.message)
      else { toast.success('Check your email to confirm!'); setLinkOpen(false); setLinkEmail('') }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email: linkEmail.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
      })
      if (error) toast.error(error.message)
      else setLinkSent(true)
    }
    setLinking(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const exportData = async () => {
    if (!user) return
    setExporting(true)
    try {
      const [songsRes, servicesRes] = await Promise.all([
        supabase
          .from('songs')
          .select('*, song_lyrics(*)')
          .eq('created_by', user.id)
          .order('title'),
        supabase
          .from('services')
          .select('*, service_songs(order_index, songs(id, title, artist))')
          .eq('created_by', user.id)
          .order('date', { ascending: false }),
      ])

      if (songsRes.error) throw songsRes.error
      if (servicesRes.error) throw servicesRes.error

      const payload = {
        exported_at: new Date().toISOString(),
        version: '1',
        songs: (songsRes.data ?? []).map((s: any) => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          original_language: s.original_language,
          created_at: s.created_at,
          lyrics: (s.song_lyrics ?? []).map((l: any) => ({
            language: l.language,
            lyrics: l.lyrics,
            is_default: l.is_default,
          })),
        })),
        services: (servicesRes.data ?? []).map((s: any) => ({
          id: s.id,
          date: s.date,
          theme: s.theme,
          type: s.type,
          status: s.status,
          notes: s.notes,
          is_public: s.is_public,
          setlist: (s.service_songs ?? [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((ss: any) => ({
              order_index: ss.order_index,
              song_id: ss.songs?.id ?? null,
              song_title: ss.songs?.title ?? null,
              song_artist: ss.songs?.artist ?? null,
            })),
        })),
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `songsaver-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${payload.songs.length} songs and ${payload.services.length} services`)
    } catch {
      toast.error('Export failed')
    }
    setExporting(false)
  }

  type Section = 'account' | 'app' | 'team' | 'owner'
  const TABS: { key: Section; label: string }[] = [
    { key: 'account', label: 'Account' },
    { key: 'app', label: 'App' },
    { key: 'team', label: 'Team' },
    ...(isOwner ? [{ key: 'owner' as Section, label: '👑' }] : []),
  ]

  return (
    <div className="px-4 pb-12">
      <PageHeader title="Settings" />

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              activeSection === key
                ? 'bg-accent-600 text-white shadow-glow-sm'
                : 'text-white/50 hover:text-white/80'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── ACCOUNT TAB ── */}
      {activeSection === 'account' && (
        <div className="space-y-5 animate-fade-in">
          {/* Avatar card */}
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-600 to-purple-700 flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">
                {profile?.display_name || 'Worshiper'}
              </p>
              <p className="text-xs text-white/40 mt-0.5 truncate">
                {user?.email ?? (user?.is_anonymous ? 'Guest account' : '')}
              </p>
              {user?.is_anonymous && (
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  Guest
                </span>
              )}
            </div>
          </div>

          {/* Unified link account card */}
          {user?.is_anonymous && (
            <div className={cn('glass-card overflow-hidden transition-all', linkOpen ? 'border border-accent-500/25' : '')}>
              {/* Header row — always visible */}
              {!linkSent && (
                <button
                  onClick={() => setLinkOpen(v => !v)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-accent-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">Link your account</p>
                    <p className="text-xs text-white/50">Save your data permanently with an email</p>
                  </div>
                  <ChevronRight className={cn('w-4 h-4 text-white/30 transition-transform duration-200', linkOpen && 'rotate-90')} />
                </button>
              )}

              {/* Expanded form */}
              {linkOpen && !linkSent && (
                <div className="px-4 pb-4 space-y-3 animate-fade-in">
                  {/* Mode toggle */}
                  <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl">
                    {(['new', 'existing'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => { setLinkMode(mode); setLinkEmail('') }}
                        className={cn(
                          'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                          linkMode === mode ? 'bg-accent-600 text-white' : 'text-white/50 hover:text-white/70'
                        )}
                      >
                        {mode === 'new' ? 'New account' : 'Sign in'}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-white/40">
                    {linkMode === 'new'
                      ? 'Add an email to this account — your songs and data will be preserved.'
                      : "Already have an account? We'll send a magic link to sign you in."}
                  </p>

                  <Input
                    type="email"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    placeholder="your@email.com"
                    leftIcon={<Mail className="w-4 h-4" />}
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { setLinkOpen(false); setLinkEmail('') }} disabled={linking}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={submitLink} loading={linking}>
                      {linkMode === 'new' ? 'Send Confirmation' : 'Send Magic Link'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Sent confirmation */}
              {linkSent && (
                <div className="p-4 text-center space-y-2 animate-fade-in">
                  <p className="text-sm font-semibold text-emerald-400">Check your email</p>
                  <p className="text-xs text-white/50">
                    We sent a link to <span className="text-white/70">{linkEmail}</span>. Click it to sign in.
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => { setLinkSent(false); setLinkEmail('') }}>
                    Use a different email
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Profile fields */}
          <div className="glass-card p-4 space-y-4">
            <p className="section-label">Profile</p>
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
            <Select
              label="Default Lyrics Language"
              value={defaultLang}
              onChange={(e) => setDefaultLang(e.target.value)}
              options={LANG_OPTIONS}
            />
            <Button onClick={saveProfile} loading={saving} className="w-full">
              Save Profile
            </Button>
          </div>

          {/* Account info */}
          <div className="glass-card divide-y divide-white/[0.06]">
            <div className="px-4">
              <SettingRow icon={User} label="User ID" description="Your unique account identifier">
                <button
                  onClick={copyUserId}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="font-mono">{user?.id?.slice(0, 8)}…</span>
                </button>
              </SettingRow>
            </div>
          </div>

          {/* Sign out */}
          <div className="glass-card divide-y divide-white/[0.06]">
            <div className="px-4">
              <SettingRow
                icon={LogOut}
                label="Sign Out"
                description={user?.is_anonymous ? "You'll start a new anonymous session" : "You can sign back in with your email"}
                danger
              >
                <Button variant="destructive" size="sm" onClick={signOut}>
                  Sign Out
                </Button>
              </SettingRow>
            </div>
          </div>
        </div>
      )}

      {/* ── APP TAB ── */}
      {activeSection === 'app' && (
        <div className="space-y-5 animate-fade-in">
          <div className="glass-card divide-y divide-white/[0.06]">
            <div className="px-4">
              <SettingRow
                icon={mounted && theme === 'light' ? Sun : Moon}
                label="Theme"
                description={mounted ? (theme === 'light' ? 'Light mode — tap to switch to dark' : 'Dark mode — tap to switch to light') : 'Dark mode — tap to switch to light'}
              >
                <button
                  onClick={() => mounted && setTheme(theme === 'light' ? 'dark' : 'light')}
                  className={cn(
                    'relative w-12 h-6 rounded-full shrink-0 border-0 outline-none focus:outline-none focus:ring-0',
                    mounted ? 'transition-colors duration-200' : '',
                    mounted && theme === 'light' ? 'bg-accent-600' : 'bg-white/20'
                  )}
                  aria-label="Toggle theme"
                >
                  <span className={cn(
                    'absolute top-0.5 w-5 h-5 rounded-full shadow-sm pointer-events-none',
                    mounted && theme === 'light' ? 'bg-white translate-x-6' : 'bg-white translate-x-0.5',
                    mounted ? 'transition-transform duration-200' : ''
                  )} />
                </button>
              </SettingRow>
              <SettingRow icon={Globe} label="Language" description="App interface language">
                <span className="text-xs text-white/40 italic">English</span>
              </SettingRow>
              <SettingRow icon={Smartphone} label="Install App" description="Add SongSaver to your home screen">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Use your browser\'s "Add to Home Screen" option')}
                >
                  Install
                </Button>
              </SettingRow>
              <SettingRow icon={Bell} label="Notifications" description="Offline and service reminders">
                <span className="text-xs text-white/40 italic">Coming soon</span>
              </SettingRow>
            </div>
          </div>

          {/* Import / Export */}
          <div className="glass-card divide-y divide-white/[0.06]">
            <div className="px-4">
              <SettingRow icon={Upload} label="Import Songs" description="Bulk import songs from a preset library">
                <Link href="/import" className="text-xs text-accent-400 hover:text-accent-300 transition-colors font-medium">
                  Open →
                </Link>
              </SettingRow>
            </div>
            <div className="px-4">
              <SettingRow icon={Download} label="Export All Data" description="Download your songs, lyrics and services as JSON">
                <Button variant="outline" size="sm" onClick={exportData} loading={exporting}>
                  Export
                </Button>
              </SettingRow>
            </div>
          </div>

          {/* About */}
          <div className="glass-card divide-y divide-white/[0.06]">
            <div className="px-4">
              <SettingRow icon={Info} label="Version" description="SongSaver PWA">
                <span className="text-xs text-white/40 font-mono">v0.1.0</span>
              </SettingRow>
              <SettingRow icon={ExternalLink} label="Source Code" description="View on GitHub">
                <a
                  href="https://github.com/Jjstarzz/songSaverV2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-400 hover:text-accent-300 transition-colors"
                >
                  GitHub →
                </a>
              </SettingRow>
            </div>
          </div>

          {/* Danger zone */}
          <div className="glass-card divide-y divide-white/[0.06] border border-red-500/10">
            <div className="px-4">
              <p className="section-label py-3">Danger Zone</p>
              <SettingRow
                icon={Trash2}
                label="Delete All Data"
                description="Permanently remove all your songs, services, and recordings"
                danger
              >
                <Button variant="destructive" size="sm" onClick={() => toast.error('Contact support to delete your account')}>
                  Delete
                </Button>
              </SettingRow>
            </div>
          </div>
        </div>
      )}

      {/* ── OWNER TAB ── */}
      {activeSection === 'owner' && isOwner && (
        <div className="space-y-5 animate-fade-in">
          {/* Owner badge */}
          <div className="glass-card p-4 flex items-center gap-3 border border-amber-500/20">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Owner Access</p>
              <p className="text-xs text-white/40 mt-0.5">Full control over all content and users</p>
            </div>
          </div>

          {/* Owner actions */}
          <div className="glass-card divide-y divide-white/[0.06]">
            <div className="px-4">
              <SettingRow icon={Users} label="Manage Users" description="View all accounts, remove users">
                <Link href="/settings/users" className="text-xs text-accent-400 hover:text-accent-300 transition-colors font-medium">
                  Open →
                </Link>
              </SettingRow>
            </div>
          </div>

          <p className="text-xs text-white/25 text-center px-4">
            As owner you can delete any song or service in the app, and see all content regardless of visibility settings.
          </p>
        </div>
      )}

      {/* ── TEAM TAB ── */}
      {activeSection === 'team' && (
        <div className="space-y-5 animate-fade-in">
          <div className="glass-card p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-white/30" />
            </div>
            <div>
              <p className="font-semibold text-white">Team Collaboration</p>
              <p className="text-sm text-white/50 mt-1 leading-relaxed">
                Create or join a team to share songs and plan services together with your worship team.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={() => toast.info('Teams coming soon!')}>
                Create a Team
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => toast.info('Teams coming soon!')}>
                Join with Invite Code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
