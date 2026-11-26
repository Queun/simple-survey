import { Prisma } from '@prisma/client'
import { type GradeConfig, makeClasses } from './classes'
import { RequestError } from './response'

export const classOrder = [{ gradeOrder: 'asc' }, { order: 'asc' }, { id: 'asc' }] satisfies Prisma.SchoolClassOrderByWithRelationInput[]
export const schoolSelect = {
  id: true, name: true, code: true, stage: true, createdAt: true,
  classes: { orderBy: classOrder },
  _count: { select: { principals: true, submissions: true } },
} satisfies Prisma.SchoolSelect

// Keep the IDs of matching classes. Removing an occupied class would lose its history.
export async function syncClasses(tx: Prisma.TransactionClient, schoolId: number, grades: GradeConfig[]) {
  const wanted = makeClasses(grades)
  const existing = await tx.schoolClass.findMany({ where: { schoolId }, include: {
    _count: { select: { assignments: true, submissions: true } },
  } })
  const key = (c: { grade: string, name: string }) => JSON.stringify([c.grade, c.name])
  const desired = new Set(wanted.map(key))
  const removed = existing.filter(c => !desired.has(key(c)))
  const occupied = removed.find(c => c._count.assignments || c._count.submissions)
  if (occupied) {
    throw new RequestError(`${occupied.grade}${occupied.name}已有任课关系或答卷，请保留该班级`, 409)
  }
  await tx.schoolClass.deleteMany({ where: { id: { in: removed.map(c => c.id) } } })
  const byName = new Map(existing.map(c => [key(c), c]))
  const added = wanted.filter(c => !byName.has(key(c)))
  if (added.length) await tx.schoolClass.createMany({ data: added.map(c => ({ ...c, schoolId })) })
  for (const row of wanted) {
    const current = byName.get(key(row))
    if (current && (current.gradeOrder !== row.gradeOrder || current.order !== row.order)) {
      await tx.schoolClass.update({ where: { id: current.id }, data: { gradeOrder: row.gradeOrder, order: row.order } })
    }
  }
}
