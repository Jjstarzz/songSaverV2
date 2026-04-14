import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Scan ALL env keys for anything resembling our token
  const geniusKeys = Object.keys(process.env).filter(k =>
    k.toLowerCase().includes('genius') || k.toLowerCase().includes('access_token')
  )

  return NextResponse.json({
    geniusKeys,                       // all matching key names found
    totalEnvKeys: Object.keys(process.env).length,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  })
}
