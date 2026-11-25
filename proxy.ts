import { NextRequest, NextResponse } from 'next/server'
import { cookieName, readSession } from './lib/session'

export function proxy(req: NextRequest) {
  const session = readSession(req.cookies.get(cookieName)?.value)
  const home = session?.role === 'ADMIN' ? '/admin' : session?.role === 'PRINCIPAL' ? '/principal' : '/login'
  const path = req.nextUrl.pathname
  if (path === '/login' ? home === path : path === home || path.startsWith(home + '/')) return NextResponse.next()
  return NextResponse.redirect(new URL(home, req.url))
}

export const config = { matcher: ['/admin/:path*', '/principal/:path*', '/login'] }
