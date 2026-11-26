import { withAuth } from '@/lib/auth'
import { body, param } from '@/lib/api'
import { questionForm } from '@/lib/forms'
import { prisma } from '@/lib/prisma'

export const GET = withAuth('ADMIN', async (_, user, ctx) => {
  const period = await prisma.period.findUniqueOrThrow({ where: { id: await param(ctx, 'periodId') },
    select: { questions: { orderBy: [{ order: 'asc' }, { id: 'asc' }] } },
  })
  return Response.json(period.questions)
})
export const POST = withAuth('ADMIN', async (req, user, ctx) => {
  const periodId = await param(ctx, 'periodId')
  const data = await body(req, questionForm)
  const question = await prisma.$transaction(async tx => {
    const last = await tx.question.aggregate({ where: { periodId }, _max: { order: true } })
    return tx.question.create({ data: { ...data, periodId, order: (last._max.order ?? 0) + 1 } })
  })
  return Response.json(question, { status: 201 })
})
