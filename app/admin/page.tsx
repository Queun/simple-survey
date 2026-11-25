import Link from 'next/link'
import { buttonStyle, Cards, Title } from '@/components/statistics/shared'
import { pageScope } from '@/lib/statistics-page'
import { adminOverview } from '@/lib/statistics'

export default async function Page() {
  const { period } = await pageScope('ADMIN')
  const data = await adminOverview(period?.id ?? null)
  const rate = data.slots ? (100 * data.filled / data.slots).toFixed(1) + '%' : '—'
  return <section className="max-w-6xl space-y-6"><Title title="平台概况" />
    <p>{period?.name ?? '当前没有进行中的调研期'}</p>
    <Cards items={[[ '学校数', data.schools ], ['本期提交份数', data.count], ['教师登记覆盖率', rate]]} />
    <p className="text-sm text-slate-600">本期各校共 {data.slots} 个班级学科任课位置，已登记 {data.filled} 个。</p>
    <Link className={buttonStyle} href="/admin/statistics">查看各校统计</Link>
  </section>
}
