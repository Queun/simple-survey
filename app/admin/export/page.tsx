import { ExportPage } from '@/components/statistics/shared'
import { pageScope, ReportPageProps } from '@/lib/statistics-page'

export default async function Page({ searchParams }: ReportPageProps) {
  const selection = await pageScope('ADMIN', await searchParams)
  return <ExportPage role="admin" selection={selection} />
}
