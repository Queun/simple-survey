'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SchoolForm from '@/components/SchoolForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Building2, Users, FileText } from 'lucide-react'

interface School {
  id: number
  name: string
  code: string
  stage: 'PRIMARY' | 'MIDDLE' | 'HIGH'
  classes: { id: number, grade: string, name: string }[]
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

      const res = await fetch('/api/admin/schools')

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
    if (!confirm('确定要删除这个学校吗？\n\n这将同时：\n• 解绑该学校的所有校长账号\n• 删除班级、教师、任课关系及答卷\n\n此操作不可撤销！')) {
      return
    }

    try {

      const res = await fetch(`/api/admin/schools/${schoolId}`, {
        method: 'DELETE'
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete school')
      }

      alert('删除成功')
      fetchSchools()
    } catch (err) {
      console.error('Error deleting school:', err)
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <>
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
                  <Button className="mb-3" variant="outline" size="sm" asChild>
                    <Link href={`/admin/schools/${school.id}/teachers`}>教师管理</Link>
                  </Button>
                  <details className="mb-3 text-sm">
                    <summary className="cursor-pointer">{{ PRIMARY: '小学', MIDDLE: '初中', HIGH: '高中' }[school.stage]} · {school.classes.length} 个班级</summary>
                    {[...new Set(school.classes.map(c => c.grade))].map(grade => (
                      <p key={grade} className="mt-2">{grade}　{school.classes.filter(c => c.grade === grade).map(c => c.name).join('、')}</p>
                    ))}
                  </details>
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
              stage: editingSchool.stage,
              grades: [...new Set(editingSchool.classes.map(c => c.grade))].join(','),
              classCount: editingSchool.classes.filter(c => c.grade === editingSchool.classes[0]?.grade).length || 1
            }}
            onClose={() => setEditingSchool(null)}
            onSuccess={() => {
              fetchSchools()
              setEditingSchool(null)
            }}
          />
        )}
      </div>
    </>
  )
}
