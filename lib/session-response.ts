import { NextRequest, NextResponse } from 'next/server'
import { cookieName, Identity, lifetime, signSession } from './session'

export function sessionResponse(req: NextRequest, identity: Identity, data: object, status = 200) {
  const response = NextResponse.json(data, { status })
  response.cookies.set(cookieName, signSession(identity), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: lifetime, secure: req.nextUrl.protocol === 'https:',
  })
  return response
}
