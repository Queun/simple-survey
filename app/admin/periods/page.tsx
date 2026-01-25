'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import PeriodForm from '@/components/PeriodForm'
import { LinkGeneratorModal } from '@/components/LinkGeneratorModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Power, Calendar, Users, Link as LinkIcon } from 'lucide-react'

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

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLinkGenerator, setShowLinkGenerator] = useState<number | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
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
      setError('加载调研期列表失败')
    } finally {
      setLoading(false)
    }
  }

  async function togglePeriodStatus(periodId: number, currentStatus: boolean) {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/periods/${periodId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (!res.ok) {
        throw new Error('Failed to toggle period status')
      }

      // 刷新列表
      fetchPeriods()
    } catch (err) {
      console.error('Error toggling period:', err)
      alert('切换状态失败')
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">期数管理</h2>
            <p className="mt-2 text-gray-600">创建和管理调研期，配置学科和题目</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>创建调研期</span>
          </Button>
        </div>

        {/* 期数列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">加载中...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-lg text-red-600">{error}</div>
          </div>
        ) : periods.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">暂无调研期，点击上方按钮创建第一个调研期</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {periods.map((period) => (
              <Card key={period.id} className={period.isActive ? 'border-green-500 border-2' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-xl">{period.name}</CardTitle>
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
                      <div className="flex items-center space-x-6 mt-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(period.startDate)} - {formatDate(period.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>{period._count?.submissions || 0} 份提交</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePeriodStatus(period.id, period.isActive)}
                        className="flex items-center space-x-2"
                      >
                        <Power className="h-4 w-4" />
                        <span>{period.isActive ? '关闭' : '开启'}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/admin/periods/${period.id}`
                        }}
                        className="flex items-center space-x-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>编辑</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">学科列表</h4>
                      <div className="flex flex-wrap gap-2">
                        {period.subjects.map((subject, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>题目数量: {period._count?.questions || 0}</span>
                      <span>•</span>
                      <a
                        href={`/admin/periods/${period.id}/questions`}
                        className="text-blue-600 hover:underline"
                      >
                        配置题目
                      </a>
                      <span>•</span>
                      <a
                        href={`/survey/${period.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        查看学生页面
                      </a>
                      <span>•</span>
                      <button
                        onClick={() => setShowLinkGenerator(period.id)}
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <LinkIcon className="h-3 w-3" />
                        生成链接
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 创建期数模态框 */}
        {showCreateModal && (
          <PeriodForm
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              fetchPeriods()
              setShowCreateModal(false)
            }}
          />
        )}

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
    </AdminLayout>
  )
}
