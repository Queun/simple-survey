import { withAuth } from '@/lib/auth'
import { body, param } from '@/lib/api'
import { reorderForm } from '@/lib/forms'
import { prisma } from '@/lib/prisma'
import { RequestError } from '@/lib/response'

export const PATCH = withAuth('ADMIN', async (req, user, ctx) => {
  const periodId = await param(ctx, 'periodId')
  const { questionIds } = await body(req, reorderForm)
  await prisma.$transaction(async tx => {
    const { questions } = await tx.period.findUniqueOrThrow({
      where: { id: periodId }, select: { questions: { select: { id: true } } },
    })
    const ids = new Set(questions.map(q => q.id))
    if (ids.size !== questionIds.length || questionIds.some(id => !ids.has(id))) {
      throw new RequestError('请提交本期的全部题目')
    }
    for (const [i, id] of questionIds.entries()) {
      await tx.question.update({ where: { id, periodId }, data: { order: i + 1 } })
    }
  })
  return Response.json({ ok: true })
})
