'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  User, Mail, Shield, Users, LogOut, ChevronRight,
  Globe, Bell, Moon, Sun, Smartphone, Info, ExternalLink,
  Trash2, Copy, Check, Download
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
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
  const supabase = useSupabase()
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [defaultLang, setDefaultLang] = useState('en')
  const [saving, setSaving] = useState(false)
  const [upgradeEmail, setUpgradeEmail] = useState('')
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [signInEmail, setSignInEmail] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [signInSent, setSignInSent] = useState(false)
  const [activeSection, setActiveSection] = useState<'account' | 'app' | 'team'>('account')

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

  const upgradeAccount = async () => {
    if (!upgradeEmail.trim()) { toast.error('Enter your email'); return }
    setUpgrading(true)
    const { error } = await supabase.auth.updateUser({ email: upgradeEmail })
    if (error) toast.error(error.message)
    else { toast.success('Check your email to confirm!'); setUpgradeOpen(false) }
    setUpgrading(false)
  }

  const copyUserId = () => {
    if (!user?.id) return
    navigator.clipboard.writeText(user.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const signIn = async () => {
    if (!signInEmail.trim()) { toast.error('Enter your email'); return }
    setSigningIn(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: signInEmail.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) toast.error(error.message)
    else setSignInSent(true)
    setSigningIn(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const TABS = [
    { key: 'account', label: 'Account' },
    { key: 'app', label: 'App' },
    { key: 'team', label: 'Team' },
  ] as const

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
                {user?.email ?? (profile?.is_anonymous ? 'Anonymous account' : '')}
              </p>
              {profile?.is_anonymous && (
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  Anonymous
                </span>
              )}
            </div>
          </div>

          {/* Upgrade CTA */}
          {profile?.is_anonymous && !upgradeOpen && (
            <button
              onClick={() => setUpgradeOpen(true)}
              className="w-full glass-card p-4 flex items-center gap-3 text-left hover:bg-white/[0.07] transition-all border border-accent-500/20"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-accent-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Secure your account</p>
                <p className="text-xs text-white/50">Add email to keep your data safe</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </button>
          )}

          {upgradeOpen && (
            <div className="glass-card p-4 space-y-3 animate-fade-in border border-accent-500/20">
              <p className="text-sm font-semibold text-white">Add Email to Your Account</p>
              <p className="text-xs text-white/50">Your existing songs and data will be preserved.</p>
              <Input
                type="email"
                value={upgradeEmail}
                onChange={(e) => setUpgradeEmail(e.target.value)}
                placeholder="your@email.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setUpgradeOpen(false)} disabled={upgrading}>
                  Cancel
                </Button>
                <Button size="sm" onClick={upgradeAccount} loading={upgrading}>
                  Send Confirmation Email
                </Button>
              </div>
            </div>
          )}

          {/* Sign in to existing account */}
          {profile?.is_anonymous && !signInOpen && !upgradeOpen && (
            <button
              onClick={() => setSignInOpen(true)}
              className="w-full glass-card p-4 flex items-center gap-3 text-left hover:bg-white/[0.07] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-white/40" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Sign in to existing account</p>
                <p className="text-xs text-white/50">Already have an account? Sign in with your email</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </button>
          )}

          {signInOpen && !signInSent && (
            <div className="glass-card p-4 space-y-3 animate-fade-in">
              <p className="text-sm font-semibold text-white">Sign In</p>
              <p className="text-xs text-white/50">
                {"We'll send a magic link to your email — no password needed."}
              </p>
              <Input
                type="email"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                placeholder="your@email.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSignInOpen(false)} disabled={signingIn}>
                  Cancel
                </Button>
                <Button size="sm" onClick={signIn} loading={signingIn}>
                  Send Magic Link
                </Button>
              </div>
            </div>
          )}

          {signInSent && (
            <div className="glass-card p-4 text-center space-y-2 animate-fade-in border border-emerald-500/20">
              <p className="text-sm font-semibold text-emerald-400">Check your email</p>
              <p className="text-xs text-white/50">
                We sent a sign-in link to <span className="text-white/70">{signInEmail}</span>. Click it to sign back into your account.
              </p>
              <Button variant="ghost" size="sm" onClick={() => { setSignInSent(false); setSignInEmail(''); setSignInOpen(false) }}>
                Use a different email
              </Button>
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
                description={profile?.is_anonymous ? "You'll start a new anonymous session" : "You can sign back in with your email"}
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

          {/* Import */}
          <div className="glass-card divide-y divide-white/[0.06]">
            <div className="px-4">
              <SettingRow icon={Download} label="Import Songs" description="Bulk import songs from a preset library">
                <Link href="/import" className="text-xs text-accent-400 hover:text-accent-300 transition-colors font-medium">
                  Open →
                </Link>
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
