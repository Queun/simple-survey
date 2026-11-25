import Link from 'next/link'
import type { ReactNode } from 'react'
import type { PrincipalStatistics, ReportingPeriods } from '@/lib/statistics'

export const numberText = (value: number | null) => value === null ? '—' : value.toFixed(1)
export const linkStyle = 'font-medium text-blue-700 underline-offset-4 hover:underline focus-visible:underline'
export const selectStyle = 'min-h-10 rounded-md border bg-white px-3 text-sm'
export const buttonStyle = 'inline-flex min-h-10 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800'
export const panel = 'space-y-4 rounded-xl border bg-white p-4 sm:p-6'

export function Title({ title, children }: { title: string, children?: ReactNode }) {
  return <header className="flex flex-wrap items-end justify-between gap-4">
    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>{children}
  </header>
}

export function PeriodPicker({ periods, period }: ReportingPeriods) {
  if (!periods.length) return <p>尚未创建调研期。</p>
  return <form method="get" className="flex flex-wrap items-center gap-2">
    <label htmlFor="report-period" className="text-sm font-medium">调研期</label>
    <select id="report-period" name="periodId" defaultValue={period?.id ?? ''} required className={selectStyle}>
      <option value="" disabled>选择调研期</option>
      {periods.map(p => <option key={p.id} value={p.id}>{p.name}{p.current ? '（进行中）' : ''}</option>)}
    </select>
    <button className={buttonStyle}>查看</button>
  </form>
}

export function Cards({ items }: { items: [string, string | number][] }) {
  return <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {items.map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-5">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</dd>
    </div>)}
  </dl>
}

export function SchoolCards({ school }: { school: PrincipalStatistics['school'] }) {
  return <Cards items={[[ '本期提交份数', school.count ], ['参与班级 / 总班级', `${school.participating} / ${school.classes}`],
    ['全校均分', numberText(school.mean)], ['已登记老师', school.teachers]]} />
}

export function Table({ headers, children, numeric = [] }: { headers: string[], children: ReactNode, numeric?: number[] }) {
  return <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm tabular-nums">
    <thead className="border-y bg-slate-50 text-slate-600"><tr>{headers.map((h, i) =>
      <th key={h} scope="col" className={`whitespace-nowrap px-3 py-3 font-medium ${numeric.includes(i) ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
    <tbody className="divide-y">{children}</tbody>
  </table></div>
}
export const cell = 'px-3 py-3'
export const numCell = cell + ' whitespace-nowrap text-right'

export function ExportPage({ role, selection }: { role: 'admin' | 'principal', selection: ReportingPeriods }) {
  const principal = role === 'principal'
  return <section className="max-w-5xl space-y-6">
    <Title title="数据导出"><PeriodPicker {...selection} /></Title>
    <div className={panel}>
      <h2 className="text-lg font-semibold">{selection.period?.name ?? '选择要导出的调研期'}</h2>
      <p>{principal ? '工作簿包含老师汇总、老师与班级明细、学科与年级汇总。' : '工作簿包含各校概况和各校学科汇总。'}</p>
      <p className="text-sm text-slate-600">受匿名保护的分数在 Excel 中留空。</p>
      {selection.period && <a className={buttonStyle} href={`/api/${role}/export?periodId=${selection.period.id}`}>下载 Excel</a>}
    </div>
    <Link className={linkStyle} href={`/${role}/statistics${selection.period ? '?periodId=' + selection.period.id : ''}`}>返回统计看板</Link>
  </section>
}
