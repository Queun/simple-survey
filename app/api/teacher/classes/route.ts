import { z } from 'zod'
import { body } from '@/lib/api'
import { withAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/response'
import { slotForm } from '@/lib/teacher-forms'
import { registrationData, saveOwnAssignments } from '@/lib/teacher-management'

export const GET = withAuth('TEACHER', async (_, user) => {
  const data = await registrationData(user.id)
  return data ? Response.json(data) : errorResponse('登录状态已失效', 401)
})

export const PUT = withAuth('TEACHER', async (req, user) => {
  const { add, remove } = await body(req, z.strictObject({ add: z.array(slotForm), remove: z.array(slotForm) }))
  await saveOwnAssignments(user.id, user.schoolId!, add, remove)
  return Response.json({ ok: true })
})
