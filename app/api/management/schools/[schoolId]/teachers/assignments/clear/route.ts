import { z } from 'zod'
import { body } from '@/lib/api'
import { openPeriodWhere } from '@/lib/periods'
import { prisma } from '@/lib/prisma'
import { RequestError } from '@/lib/response'
import { withSchool } from '@/lib/teacher-management'

export const GET = withSchool(async (_, schoolId) => {
  const period = await prisma.period.findFirst({
    where: { ...openPeriodWhere(), submissions: { some: { schoolId } } },
    select: { id: true },
  })
  return Response.json({ hasActiveSubmissions: period !== null })
})

export const POST = withSchool(async (req, schoolId) => {
  const { confirmName } = await body(req, z.strictObject({ confirmName: z.string().min(1) }))
  const result = await prisma.$transaction(async tx => {
    const school = await tx.school.findUniqueOrThrow({ where: { id: schoolId }, select: { name: true } })
    if (confirmName !== school.name) throw new RequestError('输入的学校全称不一致')
    return tx.teachingAssignment.deleteMany({ where: { class: { schoolId } } })
  })
  return Response.json({ count: result.count })
})
