import { z } from 'zod'
import { id, name } from './api'

const unique = (items: unknown[]) => new Set(items).size === items.length
export const schoolForm = z.strictObject({
  name, code: name.regex(/^[a-zA-Z0-9]+$/), stage: z.enum(['PRIMARY', 'MIDDLE', 'HIGH']),
  grades: z.array(z.strictObject({ name, classCount: id.max(50) })).min(1).max(30)
    .refine(grades => unique(grades.map(grade => grade.name))),
})
export const subjectForm = z.strictObject({ name, order: z.int32().nonnegative() })
// 学校按北京时间理解日期：开始日从当天 0 点起，结束日包含当天整天
const schoolDay = (edge: 'start' | 'end') => z.iso.date()
  .transform(day => new Date(`${day}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}+08:00`))
  .or(z.iso.datetime({ offset: true }).pipe(z.coerce.date()))
export const periodForm = z.strictObject({
  name, startDate: schoolDay('start'), endDate: schoolDay('end'),
  subjectIds: z.array(id).min(1).refine(unique), isActive: z.boolean().default(true),
}).refine(p => p.startDate <= p.endDate)
export const questionForm = z.strictObject({
  content: name, options: z.array(z.strictObject({ label: name, score: z.int32().nonnegative() }))
    .min(1).refine(options => options.some(o => o.score > 0)),
})
export const reorderForm = z.strictObject({ questionIds: z.array(id).refine(unique) })
export const accountRole = z.enum(['ADMIN', 'PRINCIPAL'])
export const accountFields = { username: name, role: accountRole, schoolId: id.nullish() }
export const validSchool = (u: { role: string, schoolId?: number | null }) => u.role === 'PRINCIPAL' ? !!u.schoolId : !u.schoolId
