import { z } from 'zod'
import { id, name } from './api'

const unique = (items: unknown[]) => new Set(items).size === items.length
export const schoolForm = z.strictObject({
  name, code: name.regex(/^[a-zA-Z0-9]+$/), stage: z.enum(['PRIMARY', 'MIDDLE', 'HIGH']),
  grades: z.array(name).min(1).max(30).refine(unique), classCount: id.max(50),
})
export const subjectForm = z.strictObject({ name, order: z.int32().nonnegative() })
export const periodForm = z.strictObject({
  name, startDate: z.iso.date().or(z.iso.datetime({ offset: true })).pipe(z.coerce.date()),
  endDate: z.iso.date().or(z.iso.datetime({ offset: true })).pipe(z.coerce.date()),
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
