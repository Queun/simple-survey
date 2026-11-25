import { withAuth } from '@/lib/auth'
import { query } from '@/lib/api'
import { reportQuery } from '@/lib/statistics-request'
import { adminStatistics, reportingPeriods } from '@/lib/statistics'

export const GET = withAuth('ADMIN', async (req) => {
  const params = query(req, reportQuery)
  const { period } = await reportingPeriods(params.periodId)
  const data = period ? await adminStatistics(period.id) : null
  return Response.json({ period, data }, { headers: { 'Cache-Control': 'private, no-store' } })
}, { hasQuery: true })
