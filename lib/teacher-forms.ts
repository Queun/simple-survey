import { z } from 'zod'
import { id, name } from './api'

export const phone = z.string().trim().regex(/^1[3-9]\d{9}$/)
export const teacherForm = z.strictObject({ name, phone })
export const slotForm = z.strictObject({ classId: id, subjectId: id })
export type Slot = z.infer<typeof slotForm>
export const slotKey = (slot: Slot) => slot.classId + '/' + slot.subjectId
