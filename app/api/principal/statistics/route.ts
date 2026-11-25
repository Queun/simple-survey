import { withAuth } from '@/lib/auth'
import { query } from '@/lib/api'
import { schoolReportQuery } from '@/lib/statistics-request'
import { principalStatistics, reportingPeriods } from '@/lib/statistics'

export const GET = withAuth('PRINCIPAL', async (req, user) => {
  const params = query(req, schoolReportQuery)
  const { period } = await reportingPeriods(params.periodId)
  const data = period ? await principalStatistics(user.schoolId!, period.id, params.grade) : null
  return Response.json({ period, data }, { headers: { 'Cache-Control': 'private, no-store' } })
}, { hasQuery: true })
