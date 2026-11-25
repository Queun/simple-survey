import { ExportPage } from '@/components/statistics/shared'
import { pageScope, ReportPageProps } from '@/lib/statistics-page'

export default async function Page({ searchParams }: ReportPageProps) {
  const selection = await pageScope('PRINCIPAL', await searchParams)
  return <ExportPage role="principal" selection={selection} />
}
