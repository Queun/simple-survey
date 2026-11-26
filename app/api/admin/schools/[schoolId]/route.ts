import { withAuth } from '@/lib/auth'
import { body, param } from '@/lib/api'
import { schoolForm } from '@/lib/forms'
import { prisma } from '@/lib/prisma'
import { schoolSelect, syncClasses } from '@/lib/schools'

export const GET = withAuth('ADMIN', async (_, user, ctx) => Response.json(await prisma.school.findUniqueOrThrow({
  where: { id: await param(ctx, 'schoolId') }, select: schoolSelect,
})))

export const PUT = withAuth('ADMIN', async (req, user, ctx) => {
  const id = await param(ctx, 'schoolId')
  const { grades, ...data } = await body(req, schoolForm)
  const school = await prisma.$transaction(async tx => {
    await tx.school.update({ where: { id }, data })
    await syncClasses(tx, id, grades)
    return tx.school.findUniqueOrThrow({ where: { id }, select: schoolSelect })
  })
  return Response.json(school)
})

export const DELETE = withAuth('ADMIN', async (_, user, ctx) => {
  await prisma.school.delete({ where: { id: await param(ctx, 'schoolId') } })
  return Response.json({ ok: true })
})
