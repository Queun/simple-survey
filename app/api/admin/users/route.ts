import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { withAuth } from '@/lib/auth'
import { body, query } from '@/lib/api'
import { accountFields, accountRole, validSchool } from '@/lib/forms'
import { accountSelect } from '@/lib/accounts'
import { prisma } from '@/lib/prisma'

export const GET = withAuth('ADMIN', async req => {
  const { role } = query(req, z.strictObject({ role: accountRole.optional() }))
  return Response.json(await prisma.user.findMany({ where: { role }, select: accountSelect, orderBy: { id: 'desc' } }))
}, { hasQuery: true })

export const POST = withAuth('ADMIN', async req => {
  const data = await body(req, z.strictObject({ ...accountFields, password: z.string().min(1) }).refine(validSchool))
  const password = await bcrypt.hash(data.password, 10)
  return Response.json(await prisma.user.create({ data: { ...data, password }, select: accountSelect }), { status: 201 })
})
