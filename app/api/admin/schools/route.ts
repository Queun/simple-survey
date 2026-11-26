import { withAuth } from '@/lib/auth'
import { body } from '@/lib/api'
import { makeClasses } from '@/lib/classes'
import { schoolForm } from '@/lib/forms'
import { newRegistrationCode } from '@/lib/registration-code'
import { prisma } from '@/lib/prisma'
import { schoolSelect } from '@/lib/schools'

export const GET = withAuth('ADMIN', async () => Response.json(await prisma.school.findMany({
  select: schoolSelect, orderBy: { id: 'desc' },
})))

export const POST = withAuth('ADMIN', async req => {
  const { grades, ...data } = await body(req, schoolForm)
  const school = await prisma.school.create({ data: { ...data, registrationCode: newRegistrationCode(), classes: { create: makeClasses(grades) } }, select: schoolSelect })
  return Response.json(school, { status: 201 })
})
