import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { body, noQuery, name } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { errorResponse, respond } from '@/lib/response'
import { cookieName, lifetime, signSession } from '@/lib/session'

export function POST(req: NextRequest) {
  return respond(async () => {
    noQuery(req)
    const { username, password } = await body(req, z.strictObject({ username: name, password: z.string().min(1) }))
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user || user.role === 'TEACHER' || !await bcrypt.compare(password, user.password)) {
      return errorResponse('用户名或密码错误', 401)
    }
    if (user.role === 'PRINCIPAL' && !user.schoolId) return errorResponse('账号尚未绑定学校', 403)
    const response = NextResponse.json({ user: { id: user.id, username, role: user.role, schoolId: user.schoolId } })
    response.cookies.set(cookieName, signSession(user), {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: lifetime, secure: req.nextUrl.protocol === 'https:',
    })
    return response
  })
}
