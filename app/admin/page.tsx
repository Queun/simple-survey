'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { School, Users, ClipboardList, FileCheck } from 'lucide-react'

interface DashboardStats {
  totalSchools: number
  totalPeriods: number
  activePeriods: number
  totalSubmissions: number
  recentSubmissions: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  async function fetchDashboardStats() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/dashboard', {
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

  const statCards = [
    {
      title: '学校总数',
      value: stats?.totalSchools || 0,
      icon: School,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: '调研期总数',
      value: stats?.totalPeriods || 0,
      icon: ClipboardList,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: '进行中的调研',
      value: stats?.activePeriods || 0,
      icon: FileCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: '总提交数',
      value: stats?.totalSubmissions || 0,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 页面标题 */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">仪表盘</h2>
          <p className="mt-2 text-gray-600">系统概览和关键指标</p>
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

        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/admin/periods"
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                <h3 className="font-semibold text-blue-900">创建调研期</h3>
                <p className="text-sm text-blue-700 mt-1">
                  开始新的学校调研活动
                </p>
              </a>
              <a
                href="/admin/statistics"
                className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors cursor-pointer"
              >
                <h3 className="font-semibold text-green-900">查看统计</h3>
                <p className="text-sm text-green-700 mt-1">
                  分析各学校的调研数据
                </p>
              </a>
              <a
                href="/admin/export"
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
              >
                <h3 className="font-semibold text-purple-900">导出数据</h3>
                <p className="text-sm text-purple-700 mt-1">
                  下载Excel格式的统计报告
                </p>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* 系统说明 */}
        <Card>
          <CardHeader>
            <CardTitle>系统说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>学校调研系统</strong> 用于收集学生对教师和学科的匿名反馈。
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>创建调研期并配置题目和学科</li>
              <li>学生通过链接匿名填写问卷</li>
              <li>查看各学校的统计数据和对比分析</li>
              <li>导出数据用于进一步分析</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
