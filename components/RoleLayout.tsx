'use client'

import { useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)
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
      <header className="flex items-center justify-between gap-2 border-b bg-white px-3 py-3 md:px-5 md:py-4">
        <strong>学校评教 · {admin ? '管理后台' : '校长端'}</strong>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="min-h-11 md:hidden" aria-controls="role-nav"
            aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? '收起菜单' : '菜单'}</Button>
          <Button variant="outline" size="sm" className="max-md:min-h-11" onClick={logout}>退出登录</Button>
        </div>
      </header>
      <div className="md:flex">
        <nav id="role-nav" aria-label={admin ? '管理后台导航' : '校长端导航'}
          className={`${menuOpen ? 'grid' : 'hidden'} grid-cols-2 gap-1 border-b bg-white p-3 md:flex md:min-h-[90vh] md:w-48 md:shrink-0 md:flex-col md:border-r`}>
          {(admin ? adminLinks : principalLinks).map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={path === href ? 'page' : undefined}
              className="rounded px-3 py-2 text-sm max-md:flex max-md:min-h-11 max-md:items-center hover:bg-gray-100 aria-[current=page]:bg-blue-50 aria-[current=page]:text-blue-700">
              {label}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1 p-4 max-md:wrap-anywhere md:p-8">{children}</main>
      </div>
    </div>
  )
}
