import { NextRequest, NextResponse } from 'next/server'
import { cookieName, readSession } from './lib/session'

const home = { ADMIN: '/admin', PRINCIPAL: '/principal', TEACHER: '/teacher/classes' }

export function proxy(req: NextRequest) {
  const session = readSession(req.cookies.get(cookieName)?.value)
  const path = req.nextUrl.pathname
  if (!session) {
    if (path === '/login' || path === '/teacher') return NextResponse.next()
    return NextResponse.redirect(new URL(path.startsWith('/teacher/') ? '/teacher' : '/login', req.url))
  }
  const target = home[session.role]
  if (path === target || path.startsWith(target + '/')) return NextResponse.next()
  return NextResponse.redirect(new URL(target, req.url))
}

export const config = { matcher: ['/admin/:path*', '/principal/:path*', '/teacher/:path*', '/login'] }
