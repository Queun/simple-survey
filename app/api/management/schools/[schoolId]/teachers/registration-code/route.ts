import { newRegistrationCode } from '@/lib/registration-code'
import { emptyBody } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { withSchool } from '@/lib/teacher-management'

export const POST = withSchool(async (req, schoolId) => {
  await emptyBody(req)
  const select = { registrationCode: true }
  const where = { id: schoolId }
  const updated = await prisma.$transaction(async tx => {
    const current = await tx.school.findUniqueOrThrow({ where, select })
    const registrationCode = newRegistrationCode(current.registrationCode)
    return tx.school.update({ where, data: { registrationCode }, select })
  })
  return Response.json(updated)
})
