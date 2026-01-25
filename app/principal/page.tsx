'use client'

import { useEffect, useState } from 'react'
import PrincipalLayout from '@/components/PrincipalLayout'
import { LinkGeneratorModal } from '@/components/LinkGeneratorModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileCheck, BarChart3, Users, TrendingUp, Link as LinkIcon, Calendar } from 'lucide-react'

interface PrincipalStats {
  schoolName: string
  totalSubmissions: number
  activePeriods: number
  averageScore: number
  recentSubmissions: number
}

interface Period {
  id: number
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  subjects: string[]
  _count?: {
    questions: number
    submissions: number
  }
}

interface User {
  id: number
  username: string
  role: 'ADMIN' | 'PRINCIPAL'
  schoolId?: number
}

export default function PrincipalDashboard() {
  const [stats, setStats] = useState<PrincipalStats | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showLinkGenerator, setShowLinkGenerator] = useState<number | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetchDashboardStats()
    fetchPeriods()

    // 加载用户信息
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }
  }, [])

  async function fetchDashboardStats() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/principal/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }

      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPeriods() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/periods', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch periods')
      }

      const data = await res.json()
      setPeriods(data)
    } catch (err) {
      console.error('Error fetching periods:', err)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const statCards = [
    {
      title: '本校提交数',
      value: stats?.totalSubmissions || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: '进行中的调研',
      value: stats?.activePeriods || 0,
      icon: FileCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: '平均得分',
      value: stats?.averageScore ? stats.averageScore.toFixed(2) : '0.00',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: '最近提交数',
      value: stats?.recentSubmissions || 0,
      icon: BarChart3,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  return (
    <PrincipalLayout>
      <div className="space-y-8">
        {/* 页面标题 */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {stats?.schoolName || '我的学校'} - 仪表盘
          </h2>
          <p className="mt-2 text-gray-600">查看本校的调研数据和统计信息</p>
        </div>

        {/* 统计卡片 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">加载中...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-lg text-red-600">{error}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card) => {
              const Icon = card.icon
              return (
                <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {card.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">
                      {card.value}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* 调研期列表 - 新增 */}
        <Card>
          <CardHeader>
            <CardTitle>调研期列表</CardTitle>
          </CardHeader>
          <CardContent>
            {periods.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无调研期
              </div>
            ) : (
              <div className="space-y-3">
                {periods.map((period) => (
                  <div
                    key={period.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      period.isActive ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-gray-900">{period.name}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            period.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {period.isActive ? '进行中' : '已关闭'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(period.startDate)} - {formatDate(period.endDate)}
                          </span>
                        </div>
                        <span>•</span>
                        <span>{period.subjects.length} 个学科</span>
                        <span>•</span>
                        <span>{period._count?.submissions || 0} 份提交</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLinkGenerator(period.id)}
                      className="flex items-center space-x-2"
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span>生成链接</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/principal/statistics"
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                <h3 className="font-semibold text-blue-900">本校统计</h3>
                <p className="text-sm text-blue-700 mt-1">
                  查看详细的学科和班级统计数据
                </p>
              </a>
              <a
                href="/principal/comparison"
                className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors cursor-pointer"
              >
                <h3 className="font-semibold text-green-900">校际对比</h3>
                <p className="text-sm text-green-700 mt-1">
                  与其他学校进行对比分析
                </p>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* 说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>
              作为校长，您可以查看本校的调研数据，包括：
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>各学科的学生评价统计</li>
              <li>不同班级和年级的数据对比</li>
              <li>与其他学校的横向对比（排名、雷达图）</li>
              <li>按调研期筛选历史数据</li>
              <li>生成预填链接，方便学生填写问卷</li>
            </ul>
          </CardContent>
        </Card>

        {/* 链接生成器模态框 */}
        {showLinkGenerator !== null && user && (
          <LinkGeneratorModal
            periodId={showLinkGenerator}
            userRole={user.role}
            userSchoolId={user.schoolId}
            onClose={() => setShowLinkGenerator(null)}
          />
        )}
      </div>
    </PrincipalLayout>
  )
}
