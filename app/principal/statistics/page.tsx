import Link from 'next/link'
import PrincipalReport from '@/components/statistics/PrincipalReport'
import { linkStyle, PeriodPicker, SchoolCards, Title } from '@/components/statistics/shared'
import { pageScope, ReportPageProps } from '@/lib/statistics-page'
import { MIN_SUBMISSIONS, principalStatistics } from '@/lib/statistics'

export default async function Page({ searchParams }: ReportPageProps) {
  const selection = await pageScope('PRINCIPAL', await searchParams)
  const { period, grade, schoolId } = selection
  const data = period && await principalStatistics(schoolId!, period.id, grade)
  return <section className="max-w-6xl space-y-6">
    <Title title="本校评价统计"><PeriodPicker {...selection} /></Title>
    {period && data ? <>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{data.school.name} · 全校概况</h2>
        <Link className={linkStyle} href={`/principal/export?periodId=${period.id}`}>导出本期数据</Link></div>
      <SchoolCards school={data.school} />
      <p className="text-sm text-slate-600">得分按百分制显示。少于 {MIN_SUBMISSIONS} 份只显示份数，分数栏显示「—」。</p>
      <PrincipalReport key={JSON.stringify([period.id, grade])} data={data} periodId={period.id} grade={grade} />
    </> : <p>当前没有进行中的调研期。</p>}
  </section>
}
