import { z } from 'zod'
import { withAuth } from '@/lib/auth'
import { body, param } from '@/lib/api'
import { periodForm } from '@/lib/forms'
import { periodInclude, periodView } from '@/lib/periods'
import { prisma } from '@/lib/prisma'

export const GET = withAuth('ADMIN', async (_, user, ctx) => Response.json(periodView(await prisma.period.findUniqueOrThrow({
  where: { id: await param(ctx, 'periodId') }, include: periodInclude,
}))))

export const PUT = withAuth('ADMIN', async (req, user, ctx) => {
  const id = await param(ctx, 'periodId')
  const { subjectIds, ...data } = await body(req, periodForm)
  const period = await prisma.period.update({
    where: { id }, data: { ...data, subjects: { deleteMany: {}, create: subjectIds.map(subjectId => ({ subjectId })) } },
    include: periodInclude,
  })
  return Response.json(periodView(period))
})

export const PATCH = withAuth('ADMIN', async (req, user, ctx) => Response.json(await prisma.period.update({
  where: { id: await param(ctx, 'periodId') }, data: await body(req, z.strictObject({ isActive: z.boolean() })),
})))

export const DELETE = withAuth('ADMIN', async (_, user, ctx) => {
  await prisma.period.delete({ where: { id: await param(ctx, 'periodId') } })
  return Response.json({ ok: true })
})
