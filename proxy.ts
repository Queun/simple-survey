import { NextRequest, NextResponse } from 'next/server'
import { cookieName, readSession } from './lib/session'

const home = { ADMIN: '/admin', PRINCIPAL: '/principal', TEACHER: '/teacher/classes' }

export function proxy(req: NextRequest) {
  const session = readSession(req.cookies.get(cookieName)?.value)
  const path = req.nextUrl.pathname
  // 登录页只在已是同一类角色时才跳走：共用电脑上别人留下的会话不能挡住另一个角色登录，重新登录会覆盖旧会话
  if (path === '/login') return NextResponse.next()
  if (path === '/teacher' && session?.role !== 'TEACHER') return NextResponse.next()
  if (!session) {
    return NextResponse.redirect(new URL(path.startsWith('/teacher/') ? '/teacher' : '/login', req.url))
  }
  const target = home[session.role]
  if (path === target || path.startsWith(target + '/')) return NextResponse.next()
  return NextResponse.redirect(new URL(target, req.url))
}

export const config = { matcher: ['/admin/:path*', '/principal/:path*', '/teacher/:path*', '/login'] }
