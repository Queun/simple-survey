'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import SchoolForm from '@/components/SchoolForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Building2, Users, FileText } from 'lucide-react'

interface School {
  id: number
  name: string
  code: string
  grades: string[]
  classCount: number
  _count?: {
    principals: number
    submissions: number
  }
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSchool, setEditingSchool] = useState<School | null>(null)

  useEffect(() => {
    fetchSchools()
  }, [])

  async function fetchSchools() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/schools', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch schools')
      }

      const data = await res.json()
      setSchools(data)
    } catch (err) {
      console.error('Error fetching schools:', err)
      setError('加载学校列表失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteSchool(schoolId: number) {
    if (!confirm('确定要删除这个学校吗？如果学校已有提交数据或绑定的校长账号，将无法删除。')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/schools/${schoolId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete school')
      }

      alert('删除成功')
      fetchSchools()
    } catch (err: any) {
      console.error('Error deleting school:', err)
      alert(err.message || '删除失败')
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">学校管理</h2>
            <p className="mt-2 text-gray-600">管理系统中的所有学校信息</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>创建学校</span>
          </Button>
        </div>

        {/* 统计卡片 */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总学校数</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{schools.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总校长数</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {schools.reduce((sum, school) => sum + (school._count?.principals || 0), 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总提交数</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {schools.reduce((sum, school) => sum + (school._count?.submissions || 0), 0)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 学校列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">加载中...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-lg text-red-600">{error}</div>
          </div>
        ) : schools.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">暂无学校，点击上方按钮创建第一个学校</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {schools.map((school) => (
              <Card key={school.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-xl">{school.name}</CardTitle>
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {school.code}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingSchool(school)}
                        className="flex items-center space-x-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>编辑</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSchool(school.id)}
                        className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>删除</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>{school._count?.principals || 0} 位校长</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>{school._count?.submissions || 0} 份提交</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 创建学校模态框 */}
        {showCreateModal && (
          <SchoolForm
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              fetchSchools()
              setShowCreateModal(false)
            }}
          />
        )}

        {/* 编辑学校模态框 */}
        {editingSchool && (
          <SchoolForm
            schoolId={editingSchool.id}
            initialData={{
              name: editingSchool.name,
              code: editingSchool.code,
              grades: editingSchool.grades.join(','),
              classCount: editingSchool.classCount
            }}
            onClose={() => setEditingSchool(null)}
            onSuccess={() => {
              fetchSchools()
              setEditingSchool(null)
            }}
          />
        )}
      </div>
    </AdminLayout>
  )
}
