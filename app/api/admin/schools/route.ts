import { withAuth } from '@/lib/auth'
import { body } from '@/lib/api'
import { makeClasses } from '@/lib/classes'
import { schoolForm } from '@/lib/forms'
import { prisma } from '@/lib/prisma'
import { schoolInclude } from '@/lib/schools'

export const GET = withAuth('ADMIN', async () => Response.json(await prisma.school.findMany({
  include: schoolInclude, orderBy: { id: 'desc' },
})))

export const POST = withAuth('ADMIN', async req => {
  const { grades, classCount, ...data } = await body(req, schoolForm)
  const school = await prisma.school.create({ data: { ...data, classes: { create: makeClasses(grades, classCount) } }, include: schoolInclude })
  return Response.json(school, { status: 201 })
})
