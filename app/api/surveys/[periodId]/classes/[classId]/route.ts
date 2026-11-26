import { NextRequest } from 'next/server'
import { Context, noQuery, param } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/response'
import { assignedInPeriod, assertOpen } from '@/lib/survey'

export function GET(req: NextRequest, ctx: Context) {
  return respond(async () => {
    noQuery(req)
    const periodId = await param(ctx, 'periodId')
    const classId = await param(ctx, 'classId')
    const period = await prisma.period.findUniqueOrThrow({ where: { id: periodId } })
    assertOpen(period)
    const group = await prisma.schoolClass.findUniqueOrThrow({ where: { id: classId }, select: {
      assignments: { where: assignedInPeriod(periodId, classId), orderBy: { subject: { order: 'asc' } },
        select: { subject: { select: { id: true, name: true } }, teacher: { select: { name: true } } } },
    } })
    return Response.json({ subjects: group.assignments.map(a => ({ ...a.subject, teacherName: a.teacher.name })) })
  })
}
