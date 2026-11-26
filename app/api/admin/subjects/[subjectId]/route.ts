import { withAuth } from '@/lib/auth'
import { body, param } from '@/lib/api'
import { subjectForm } from '@/lib/forms'
import { prisma } from '@/lib/prisma'

export const PUT = withAuth('ADMIN', async (req, user, ctx) => Response.json(await prisma.subject.update({
  where: { id: await param(ctx, 'subjectId') }, data: await body(req, subjectForm),
})))
export const DELETE = withAuth('ADMIN', async (_, user, ctx) => {
  await prisma.subject.delete({ where: { id: await param(ctx, 'subjectId') } })
  return Response.json({ ok: true })
})
