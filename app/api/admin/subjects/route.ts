import { withAuth } from '@/lib/auth'
import { body } from '@/lib/api'
import { subjectForm } from '@/lib/forms'
import { prisma } from '@/lib/prisma'

export const GET = withAuth('ADMIN', async () => Response.json(await prisma.subject.findMany({
  orderBy: [{ order: 'asc' }, { id: 'asc' }],
})))
export const POST = withAuth('ADMIN', async req => Response.json(await prisma.subject.create({
  data: await body(req, subjectForm),
}), { status: 201 }))
