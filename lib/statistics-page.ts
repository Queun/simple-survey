import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { resolveUser } from './auth'
import { cookieName, readSession } from './session'
import { reportingPeriods } from './statistics'
import { reportQuery, schoolReportQuery } from './statistics-request'
import { RequestError } from './response'

export type ReportPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function pageScope(role: 'ADMIN' | 'PRINCIPAL', params: Awaited<ReportPageProps['searchParams']> = {}) {
  const token = readSession((await cookies()).get(cookieName)?.value)
  if (!token || token.role !== role) notFound()
  const user = await resolveUser(token)
  if (!user || user.role !== role || (role === 'PRINCIPAL' && !user.schoolId)) notFound()
  const query = (role === 'PRINCIPAL' ? schoolReportQuery : reportQuery).safeParse(params)
  if (!query.success) notFound()
  try {
    return { ...await reportingPeriods(query.data.periodId), schoolId: user.schoolId,
      grade: typeof params.grade === 'string' ? params.grade : undefined }
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) notFound()
    throw error
  }
}
