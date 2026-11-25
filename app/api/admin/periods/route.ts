import { withAuth } from '@/lib/auth'
import { body } from '@/lib/api'
import { periodForm } from '@/lib/forms'
import { periodInclude, periodView } from '@/lib/periods'
import { prisma } from '@/lib/prisma'

export const GET = withAuth('ADMIN', async () => {
  const periods = await prisma.period.findMany({ include: periodInclude, orderBy: { id: 'desc' } })
  return Response.json(periods.map(periodView))
})
export const POST = withAuth('ADMIN', async req => {
  const { subjectIds, ...data } = await body(req, periodForm)
  const period = await prisma.period.create({
    data: { ...data, subjects: { create: subjectIds.map(subjectId => ({ subjectId })) } }, include: periodInclude,
  })
  return Response.json(periodView(period), { status: 201 })
})
