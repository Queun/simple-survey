import Link from 'next/link'
import { buttonStyle, linkStyle, SchoolCards, Title } from '@/components/statistics/shared'
import { pageScope } from '@/lib/statistics-page'
import { principalOverview } from '@/lib/statistics'

export default async function Page() {
  const { schoolId, period } = await pageScope('PRINCIPAL')
  const school = await principalOverview(schoolId!, period?.id ?? null)
  return <section className="max-w-6xl space-y-6"><Title title={school.name + ' · 本校概况'} />
    <p>{period?.name ?? '当前没有进行中的调研期'}</p><SchoolCards school={school} />
    <div className="flex items-center gap-5"><Link className={buttonStyle} href="/principal/statistics">查看评价看板</Link>
      <Link className={linkStyle} href="/principal/teachers">教师管理</Link></div>
  </section>
}
