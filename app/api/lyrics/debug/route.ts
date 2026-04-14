import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = process.env.NEXT_PUBLIC_GENIUS_ACCESS_TOKEN ?? process.env.GENIUS_ACCESS_TOKEN
  return NextResponse.json({
    tokenSet: !!token,
    tokenLength: token?.length ?? 0,
    tokenPrefix: token ? token.slice(0, 6) : null,
    nodeEnv: process.env.NODE_ENV,
    usingPublicVar: !!process.env.NEXT_PUBLIC_GENIUS_ACCESS_TOKEN,
  })
}
