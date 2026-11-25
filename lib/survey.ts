import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { classOrder } from './schools'
import { prisma } from './prisma'
import { RequestError } from './response'
import { questionForm } from './forms'

export function assertOpen(period: { isActive: boolean, startDate: Date, endDate: Date }) {
  const now = new Date()
  if (!period.isActive) throw new RequestError('该调研期已关闭', 403)
  if (now < period.startDate) throw new RequestError('该调研期尚未开始', 403)
  if (now > period.endDate) throw new RequestError('该调研期已结束', 403)
}

export const surveyOptions = questionForm.shape.options
export type SurveyQuestion = { id: number, order: number, content: string, options: z.infer<typeof surveyOptions> }
export type ClassSubject = { id: number, name: string, teacherName: string }

export async function readSurvey(periodId: number) {
  const period = await prisma.period.findUnique({ where: { id: periodId }, select: {
    id: true, name: true, startDate: true, endDate: true, isActive: true,
    subjects: { select: { subject: { select: { id: true, name: true } } }, orderBy: { subject: { order: 'asc' } } },
    questions: { select: { id: true, order: true, content: true, options: true }, orderBy: { order: 'asc' } },
  } })
  if (!period) throw new RequestError('调研期不存在', 404)
  assertOpen(period)
  const schools = await prisma.school.findMany({ orderBy: { name: 'asc' }, select: {
    id: true, name: true, classes: { select: { id: true, grade: true, name: true }, orderBy: classOrder },
  } })
  return { ...period, subjects: period.subjects.map(row => row.subject),
    questions: period.questions.map(q => ({ ...q, options: surveyOptions.parse(q.options) })),
    schools: schools.map(({ classes, ...school }) => {
      const grades = new Map<string, { id: number, name: string }[]>()
      for (const { id, name, grade } of classes) {
        if (!grades.has(grade)) grades.set(grade, [])
        grades.get(grade)!.push({ id, name })
      }
      return { ...school, grades: Array.from(grades, ([name, classes]) => ({ name, classes })) }
    }),
  }
}

export function assignedInPeriod(periodId: number, classId: number): Prisma.TeachingAssignmentWhereInput {
  return { classId, subject: { periods: { some: { periodId } } } }
}
