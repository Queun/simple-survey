import { NextRequest } from 'next/server'
import { z } from 'zod'
import { body, name, noQuery } from '@/lib/api'
import { locked, loginKeys, recordFailure } from '@/lib/login-limit'
import { prisma } from '@/lib/prisma'
import { errorResponse, respond } from '@/lib/response'
import { sessionResponse } from '@/lib/session-response'

export function POST(req: NextRequest) {
  return respond(async () => {
    noQuery(req)
    const input = await body(req, z.strictObject({ name, phone: name }))
    const keys = loginKeys(input.phone, req.headers)
    const lockResponse = () => errorResponse('登录失败次数过多，请在 15 分钟后再试', 429)
    if (locked(keys)) return lockResponse()
    const teacher = await prisma.teacher.findUnique({ where: { phone: input.phone }, select: { id: true, name: true } })
    if (locked(keys)) return lockResponse()
    if (!teacher || teacher.name !== input.name) {
      recordFailure(keys)
      return locked(keys) ? lockResponse() : errorResponse('姓名或手机号有误', 401)
    }
    return sessionResponse(req, { id: teacher.id, role: 'TEACHER' }, { ok: true })
  })
}
