import { z } from 'zod'
import { urlId } from './api'

export const reportQuery = z.strictObject({ periodId: urlId.optional() })
export const schoolReportQuery = reportQuery.extend({ grade: z.string().trim().min(1).optional() })
