import { withAuth } from '@/lib/auth'
import { query } from '@/lib/api'
import { schoolReportQuery } from '@/lib/statistics-request'
import { principalStatistics, reportingPeriods } from '@/lib/statistics'
import { principalWorkbook, downloadWorkbook } from '@/lib/statistics-workbook'
import { RequestError } from '@/lib/response'

export const GET = withAuth('PRINCIPAL', async (req, user) => {
  const params = query(req, schoolReportQuery)
  const { period } = await reportingPeriods(params.periodId)
  if (!period) throw new RequestError('请先选择调研期')
  const data = await principalStatistics(user.schoolId!, period.id, params.grade)
  return downloadWorkbook(principalWorkbook(data), `principal-${period.id}`)
}, { hasQuery: true })
