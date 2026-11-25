import { withAuth } from '@/lib/auth'
import { query } from '@/lib/api'
import { reportQuery } from '@/lib/statistics-request'
import { adminStatistics, reportingPeriods } from '@/lib/statistics'
import { adminWorkbook, downloadWorkbook } from '@/lib/statistics-workbook'
import { RequestError } from '@/lib/response'

export const GET = withAuth('ADMIN', async (req) => {
  const params = query(req, reportQuery)
  const { period } = await reportingPeriods(params.periodId)
  if (!period) throw new RequestError('请先选择调研期')
  const data = await adminStatistics(period.id)
  return downloadWorkbook(adminWorkbook(data), `admin-${period.id}`)
}, { hasQuery: true })
