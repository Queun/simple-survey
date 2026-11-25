import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { body, id, noQuery } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { errorResponse, respond } from '@/lib/response'
import { sessionResponse } from '@/lib/session-response'
import { teacherForm } from '@/lib/teacher-forms'

export function POST(req: NextRequest) {
  return respond(async () => {
    noQuery(req)
    const data = await body(req, teacherForm.extend({ schoolId: id }))
    try {
      const teacher = await prisma.teacher.create({ data: { ...data, source: 'SELF' }, select: { id: true } })
      return sessionResponse(req, { id: teacher.id, role: 'TEACHER' }, { ok: true }, 201)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return errorResponse('该手机号已登记，请直接登录', 409)
      }
      throw error
    }
  })
}
