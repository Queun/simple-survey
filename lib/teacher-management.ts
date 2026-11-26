import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { Context, urlId } from './api'
import { withAuth } from './auth'
import { prisma } from './prisma'
import { RequestError } from './response'
import { classOrder } from './schools'
import { Slot, slotKey } from './teacher-forms'

export function withSchool(handler: (req: NextRequest, schoolId: number, ctx: Context) => Promise<Response>, options?: { hasQuery: true }) {
  return withAuth(['ADMIN', 'PRINCIPAL'], async (req, user, ctx) => {
    const scope = (await ctx.params).schoolId
    const schoolId = scope === 'mine' && user.schoolId ? user.schoolId : urlId.parse(scope)
    if (user.role === 'PRINCIPAL' && user.schoolId !== schoolId) throw new RequestError('只能管理本校教师', 403)
    await prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { id: true } })
    return handler(req, schoolId, ctx)
  }, options)
}

export async function requireTeacher(db: Prisma.TransactionClient, schoolId: number, teacherId: number) {
  const teacher = await db.teacher.findUniqueOrThrow({ where: { id: teacherId }, select: { schoolId: true } })
  if (teacher.schoolId !== schoolId) throw new RequestError('只能操作本校教师', 403)
}

export async function timetable(db: Prisma.TransactionClient, schoolId: number, currentPeriod: boolean) {
  const now = new Date()
  const periods = currentPeriod ? await db.period.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } }, select: { id: true },
  }) : []
  const subjects = await db.subject.findMany({
    where: periods.length ? { periods: { some: { periodId: { in: periods.map(p => p.id) } } } } : {},
    select: { id: true, name: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }],
  })
  const classes = await db.schoolClass.findMany({ where: { schoolId }, orderBy: classOrder, select: {
    id: true, grade: true, name: true,
    assignments: { where: { subjectId: { in: subjects.map(s => s.id) } }, select: {
      subjectId: true, teacher: { select: { id: true, name: true } },
    } },
  } })
  return { subjects, classes }
}

export async function registrationData(teacherId: number) {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: {
    id: true, name: true, school: { select: { id: true, name: true } },
  } })
  if (!teacher) return null
  return { teacher, ...await timetable(prisma, teacher.school.id, false) }
}

export async function validateSlots(db: Prisma.TransactionClient, schoolId: number, slots: Slot[]) {
  if (new Set(slots.map(slotKey)).size !== slots.length) throw new RequestError('班级与学科不能重复')
  const classIds = [...new Set(slots.map(s => s.classId))]
  const subjectIds = [...new Set(slots.map(s => s.subjectId))]
  if (await db.schoolClass.count({ where: { schoolId, id: { in: classIds } } }) !== classIds.length) {
    throw new RequestError('只能登记本校班级', 403)
  }
  if (await db.subject.count({ where: { id: { in: subjectIds } } }) !== subjectIds.length) {
    throw new RequestError('学科不存在')
  }
}

export async function saveOwnAssignments(teacherId: number, schoolId: number, add: Slot[], remove: Slot[]) {
  try {
    await prisma.$transaction(async tx => {
      await validateSlots(tx, schoolId, [...add, ...remove])
      // Only change the cells submitted by this teacher. Never delete a reassigned cell.
      if (remove.length) {
        const requested = new Set(remove.map(slotKey))
        const mine = await tx.teachingAssignment.findMany({ where: { teacherId } })
        const ids = mine.filter(a => requested.has(slotKey(a))).map(a => a.id)
        await tx.teachingAssignment.deleteMany({ where: { teacherId, id: { in: ids } } })
      }
      if (!add.length) return
      const existing = await tx.teachingAssignment.findMany({ where: { class: { schoolId } }, include: {
        teacher: { select: { name: true } }, class: { select: { grade: true, name: true } }, subject: { select: { name: true } },
      } })
      const bySlot = new Map(existing.map(a => [slotKey(a), a]))
      const missing = []
      for (const slot of add) {
        const owner = bySlot.get(slotKey(slot))
        if (!owner) missing.push({ ...slot, teacherId })
        else if (owner.teacherId !== teacherId) {
          throw new RequestError(`${owner.class.grade}${owner.class.name}的${owner.subject.name}已由${owner.teacher.name}老师登记，请联系学校教务处理`, 409)
        }
      }
      if (missing.length) await tx.teachingAssignment.createMany({ data: missing })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new RequestError('所选任课已被登记，请刷新后查看或联系学校教务处理', 409)
    }
    throw error
  }
}
