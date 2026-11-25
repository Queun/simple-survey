import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { withAuth } from '@/lib/auth'
import { body, param } from '@/lib/api'
import { accountSelect } from '@/lib/accounts'
import { accountFields, validSchool } from '@/lib/forms'
import { errorResponse, RequestError } from '@/lib/response'
import { prisma } from '@/lib/prisma'

export const GET = withAuth('ADMIN', async (_, user, ctx) => Response.json(await prisma.user.findUniqueOrThrow({
  where: { id: await param(ctx, 'userId') }, select: accountSelect,
})))
export const PUT = withAuth('ADMIN', async (req, user, ctx) => {
  const id = await param(ctx, 'userId')
  const changes = await body(req, z.strictObject({ ...accountFields, password: z.string().min(1) }).partial())
  const password = changes.password ? await bcrypt.hash(changes.password, 10) : undefined
  const result = await prisma.$transaction(async tx => {
    const current = await tx.user.findUniqueOrThrow({ where: { id } })
    const role = changes.role ?? current.role
    const schoolId = role === 'ADMIN' ? null : changes.schoolId === undefined ? current.schoolId : changes.schoolId
    if (!validSchool({ role, schoolId })) throw new RequestError('校长账号必须绑定学校')
    return tx.user.update({ where: { id }, data: { ...changes, role, schoolId, password }, select: accountSelect })
  })
  return Response.json(result)
})
export const DELETE = withAuth('ADMIN', async (_, user, ctx) => {
  const id = await param(ctx, 'userId')
  if (id === user.id) return errorResponse('不能删除当前登录账号')
  await prisma.user.delete({ where: { id } })
  return Response.json({ ok: true })
})
