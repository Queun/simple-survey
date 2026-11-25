import { NextRequest } from 'next/server'
import { Context, noQuery, param } from '@/lib/api'
import { errorResponse, respond } from '@/lib/response'
import { prisma } from '@/lib/prisma'

export function GET(req: NextRequest, ctx: Context) {
  return respond(async () => {
    noQuery(req)
    const period = await prisma.period.findUniqueOrThrow({ where: { id: await param(ctx, 'periodId') },
      select: { id: true, name: true, startDate: true, endDate: true, isActive: true,
        subjects: { select: { subject: { select: { id: true, name: true } } }, orderBy: { subject: { order: 'asc' } } },
        questions: { orderBy: { order: 'asc' }, select: { id: true, content: true, order: true, options: true } },
      },
    })
    if (!period.isActive) return errorResponse('该调研期已关闭', 403)
    return Response.json({ ...period, subjects: period.subjects.map(s => s.subject) })
  })
}
