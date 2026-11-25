'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from './ui/button'

const adminLinks = [
  ['/admin', '看板'], ['/admin/schools', '学校管理'], ['/admin/subjects', '学科管理'],
  ['/admin/periods', '调研期管理'], ['/admin/users', '账号管理'],
  ['/admin/statistics', '数据统计'], ['/admin/export', '数据导出'],
]
const principalLinks = [['/principal', '本校看板'], ['/principal/teachers', '教师管理'], ['/principal/statistics', '本校统计'], ['/principal/export', '数据导出']]

export default function RoleLayout({ role, children }: { role: 'ADMIN' | 'PRINCIPAL', children: React.ReactNode }) {
  const path = usePathname()
  const admin = role === 'ADMIN'
  async function logout() {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      if (!res.ok) throw new Error()
      window.location.replace('/login')
    } catch { alert('退出失败，请重试') }
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-5 py-4">
        <strong>学校评教 · {admin ? '管理后台' : '校长端'}</strong>
        <Button variant="outline" size="sm" onClick={logout}>退出登录</Button>
      </header>
      <div className="md:flex">
        <nav className="flex flex-wrap gap-1 border-b bg-white p-3 md:min-h-[90vh] md:w-48 md:flex-col md:border-r">
          {(admin ? adminLinks : principalLinks).map(([href, label]) => (
            <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}
              className="rounded px-3 py-2 text-sm hover:bg-gray-100 aria-[current=page]:bg-blue-50 aria-[current=page]:text-blue-700">
              {label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
