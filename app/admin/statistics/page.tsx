import Link from 'next/link'
import { cell, numCell, numberText, panel, linkStyle, PeriodPicker, Table, Title } from '@/components/statistics/shared'
import { pageScope, ReportPageProps } from '@/lib/statistics-page'
import { MIN_SUBMISSIONS, adminStatistics } from '@/lib/statistics'

export default async function Page({ searchParams }: ReportPageProps) {
  const selection = await pageScope('ADMIN', await searchParams)
  const { period } = selection
  const data = period && await adminStatistics(period.id)
  const headers = ['学校', '份数', '参与班级', '全校均分', ...(data?.subjects.map(s => s.name) ?? [])]
  return <section className="space-y-6"><Title title="各校评价统计"><PeriodPicker {...selection} /></Title>
    {data && period ? <div className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">各校整体与学科均分</h2>
        <Link className={linkStyle} href={`/admin/export?periodId=${period.id}`}>导出本期数据</Link></div>
      <p className="text-sm text-slate-600">得分采用百分制。少于 {MIN_SUBMISSIONS} 份或仅涉及一位老师时隐藏得分。</p>
      <Table headers={headers} numeric={headers.map((_, i) => i).slice(1)}>{data.schools.map(s => <tr key={s.id}>
        <th scope="row" className={cell}>{s.name}</th><td className={numCell}>{s.count}</td><td className={numCell}>{s.participating}</td>
        <td className={numCell}>{numberText(s.mean)}</td>{s.subjects.map(sub => <td key={sub.id} className={numCell}>
          {numberText(sub.mean)}<span className="ml-2 text-xs text-slate-500">{sub.count} 份</span>
        </td>)}</tr>)}</Table>
    </div> : <p>当前没有进行中的调研期。</p>}
  </section>
}
