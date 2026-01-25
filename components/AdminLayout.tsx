'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogOut, LayoutDashboard, ClipboardList, BarChart3, Download, Users, School } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface User {
  id: number
  username: string
  role: 'ADMIN' | 'PRINCIPAL'
  schoolId?: number
}

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData) as User
      setUser(parsedUser)
    } catch (error) {
      console.error('Failed to parse user data:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isAdmin = user.role === 'ADMIN'
  const baseRoute = isAdmin ? '/admin' : '/principal'

  const navigation = isAdmin
    ? [
        { name: '仪表盘', href: '/admin', icon: LayoutDashboard },
        { name: '期数管理', href: '/admin/periods', icon: ClipboardList },
        { name: '学校管理', href: '/admin/schools', icon: School },
        { name: '数据统计', href: '/admin/statistics', icon: BarChart3 },
        { name: '数据导出', href: '/admin/export', icon: Download },
        { name: '用户管理', href: '/admin/users', icon: Users },
      ]
    : [
        { name: '仪表盘', href: '/principal', icon: LayoutDashboard },
        { name: '本校统计', href: '/principal/statistics', icon: BarChart3 },
        { name: '校际对比', href: '/principal/comparison', icon: BarChart3 },
      ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">
              学校调研系统 {isAdmin ? '- 管理后台' : '- 校长端'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              欢迎，{user.username} ({isAdmin ? '管理员' : '校长'})
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>退出登录</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="flex pt-16">
        {/* 侧边栏 */}
        <aside className="w-64 bg-white border-r border-gray-200 fixed left-0 top-16 bottom-0 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* 主内容 */}
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
