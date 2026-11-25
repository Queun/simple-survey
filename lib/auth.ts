import { NextRequest } from 'next/server'
import { Context, emptyBody, noQuery } from './api'
import { prisma } from './prisma'
import { cookieName, Identity, readSession } from './session'
import { errorResponse, respond } from './response'

type User = Identity & { schoolId: number | null }
export function withAuth(role: Identity['role'], handler: (req: NextRequest, user: User, context: Context) => Promise<Response>, options?: { hasQuery: true }) {
  return (req: NextRequest, context: Context) => respond(async () => {
    const session = readSession(req.cookies.get(cookieName)?.value)
    if (!session) return errorResponse('请先登录', 401)
    if (session.role !== role) return errorResponse('无权访问', 403)
    const user = await prisma.user.findUnique({
      where: { id: session.id }, select: { id: true, role: true, schoolId: true },
    })
    if (!user || user.role !== session.role) return errorResponse('登录状态已失效', 401)
    if (role === 'PRINCIPAL' && !user.schoolId) return errorResponse('账号尚未绑定学校', 403)
    if (!options?.hasQuery) noQuery(req)
    if (req.method === 'DELETE') await emptyBody(req)
    return handler(req, user, context)
  })
}
