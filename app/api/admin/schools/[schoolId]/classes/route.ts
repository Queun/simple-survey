import { withAuth } from '@/lib/auth'
import { param } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { classOrder } from '@/lib/schools'

export const GET = withAuth('ADMIN', async (_, user, ctx) => {
  const school = await prisma.school.findUniqueOrThrow({
    where: { id: await param(ctx, 'schoolId') }, select: { classes: { orderBy: classOrder } },
  })
  return Response.json(school.classes)
})
