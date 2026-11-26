import { NextRequest, NextResponse } from 'next/server'
import { emptyBody, noQuery } from '@/lib/api'
import { respond } from '@/lib/response'
import { cookieName } from '@/lib/session'

export function POST(req: NextRequest) {
  return respond(async () => {
    noQuery(req)
    await emptyBody(req)
    const response = NextResponse.json({ ok: true })
    response.cookies.delete(cookieName)
    return response
  })
}
