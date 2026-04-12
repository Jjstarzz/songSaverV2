'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, Upload, Play, Pause, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSupabase } from '@/hooks/useSupabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ui/Toaster'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface RecordingEntry {
  id: string
  blob: Blob
  url: string
  duration: number
  name: string
  timestamp: Date
}

export function AudioRecorder() {
  const supabase = useSupabase()
  const { user } = useAuth()

  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [recordings, setRecordings] = useState<RecordingEntry[]>([])
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const name = `Rehearsal ${new Date().toLocaleTimeString()}`
        setRecordings((prev) => [
          {
            id: Math.random().toString(36).slice(2),
            blob,
            url,
            duration: duration,
            name,
            timestamp: new Date(),
          },
          ...prev,
        ])
        stream.getTracks().forEach((t) => t.stop())
        setDuration(0)
      }

      mr.start()
      setRecording(true)
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    } catch {
      toast.error('Microphone permission denied')
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
  }

  const playPause = (rec: RecordingEntry) => {
    if (playingId === rec.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    const audio = new Audio(rec.url)
    audioRef.current = audio
    audio.play()
    setPlayingId(rec.id)
    audio.onended = () => setPlayingId(null)
  }

  const deleteRecording = (id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id))
    if (playingId === id) {
      audioRef.current?.pause()
      setPlayingId(null)
    }
  }

  const uploadRecording = async (rec: RecordingEntry) => {
    if (!user) return
    setUploading(rec.id)
    try {
      const fileName = `${user.id}/${Date.now()}.webm`
      const { data, error } = await supabase.storage
        .from('recordings')
        .upload(fileName, rec.blob, { contentType: 'audio/webm' })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from('recordings').getPublicUrl(fileName)

      await supabase.from('rehearsal_recordings').insert({
        file_url: publicUrl,
        file_name: rec.name,
        duration_s: rec.duration,
        uploaded_by: user.id,
      })

      toast.success('Recording uploaded')
    } catch {
      toast.error('Upload failed — check storage bucket setup')
    } finally {
      setUploading(null)
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      audioRef.current?.pause()
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Record button */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {recording && (
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
          )}
          <button
            onClick={recording ? stopRecording : startRecording}
            className={cn(
              'relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95',
              recording
                ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] text-white'
                : 'bg-white/[0.08] border-2 border-white/20 text-white/70 hover:bg-white/[0.14] hover:text-white'
            )}
          >
            {recording ? <Square className="w-7 h-7 fill-current" /> : <Mic className="w-7 h-7" />}
          </button>
        </div>

        {recording ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-mono text-white/80">{formatDuration(duration)}</span>
          </div>
        ) : (
          <p className="text-sm text-white/40">Tap to record</p>
        )}
      </div>

      {/* Recordings list */}
      {recordings.length > 0 && (
        <div className="space-y-3">
          <p className="section-label">This Session</p>
          {recordings.map((rec) => (
            <div key={rec.id} className="glass-card p-3 flex items-center gap-3">
              <button
                onClick={() => playPause(rec)}
                className="w-9 h-9 rounded-xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center text-accent-400 hover:bg-accent-500/30 transition-all"
              >
                {playingId === rec.id ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{rec.name}</p>
                <p className="text-xs text-white/40">{formatDuration(rec.duration)}</p>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => uploadRecording(rec)}
                loading={uploading === rec.id}
                title="Upload to cloud"
              >
                <Upload className="w-3.5 h-3.5" />
              </Button>

              <button
                onClick={() => deleteRecording(rec.id)}
                className="text-red-400/40 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
