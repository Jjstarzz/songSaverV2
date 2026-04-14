import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = process.env.NEXT_PUBLIC_GENIUS_ACCESS_TOKEN ?? process.env.GENIUS_ACCESS_TOKEN
  return NextResponse.json({
    tokenSet: !!token,
    nodeEnv: process.env.NODE_ENV,
    // Which Supabase key name does this project use?
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasPublishableKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelProject: process.env.VERCEL_PROJECT_ID ?? null,
  })
}
