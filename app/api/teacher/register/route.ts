import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { body, id, noQuery } from '@/lib/api'
import { ipKey, locked, recordFailure } from '@/lib/login-limit'
import { prisma } from '@/lib/prisma'
import { errorResponse, respond } from '@/lib/response'
import { sessionResponse } from '@/lib/session-response'
import { teacherForm } from '@/lib/teacher-forms'

const registration = teacherForm.extend({ schoolId: id, code: z.string().catch('') })
const wrongCode = () => errorResponse('登记口令不正确，请向学校教务确认')
const tooMany = () => errorResponse('登记失败次数过多，请在 15 分钟后再试', 429)

export async function POST(req: NextRequest) {
  const keys = [ipKey(req.headers)]
  if (locked(keys)) return tooMany()
  const response = await respond(async () => {
    noQuery(req)
    const { schoolId, code, name, phone } = await body(req, registration)
    if (!/^\d{6}$/.test(code)) return wrongCode()
    if (locked(keys)) return tooMany()
    try {
      // Check the school's current code and create the teacher in the same write.
      const teacher = await prisma.teacher.create({ data: {
        name, phone, source: 'SELF', school: { connect: { id: schoolId, registrationCode: code } },
      }, select: { id: true } })
      return sessionResponse(req, { id: teacher.id, role: 'TEACHER' }, { ok: true }, 201)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') return wrongCode()
        if (error.code === 'P2002') return errorResponse('该手机号已登记，请直接登录', 409)
      }
      throw error
    }
  })
  if (response.status === 400 || response.status === 409) {
    recordFailure(keys)
    if (locked(keys)) return tooMany()
  }
  return response
}
