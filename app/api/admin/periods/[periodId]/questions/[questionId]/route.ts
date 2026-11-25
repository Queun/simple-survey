import { withAuth } from '@/lib/auth'
import { body, Context, param } from '@/lib/api'
import { questionForm } from '@/lib/forms'
import { prisma } from '@/lib/prisma'

async function questionKey(ctx: Context) {
  return { id: await param(ctx, 'questionId'), periodId: await param(ctx, 'periodId') }
}
export const GET = withAuth('ADMIN', async (_, user, ctx) => Response.json(await prisma.question.findUniqueOrThrow({
  where: await questionKey(ctx),
})))
export const PUT = withAuth('ADMIN', async (req, user, ctx) => Response.json(await prisma.question.update({
  where: await questionKey(ctx), data: await body(req, questionForm),
})))
export const DELETE = withAuth('ADMIN', async (_, user, ctx) => {
  await prisma.question.delete({ where: await questionKey(ctx) })
  return Response.json({ ok: true })
})
