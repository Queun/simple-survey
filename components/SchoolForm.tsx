'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

interface SchoolFormData {
  name: string
  code: string
}

interface SchoolFormProps {
  schoolId?: number
  initialData?: SchoolFormData
  onClose: () => void
  onSuccess: () => void
}

export default function SchoolForm({ schoolId, initialData, onClose, onSuccess }: SchoolFormProps) {
  const [formData, setFormData] = useState<SchoolFormData>(
    initialData || {
      name: '',
      code: ''
    }
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // 验证
    if (!formData.name.trim()) {
      setError('请输入学校名称')
      return
    }

    if (!formData.code.trim()) {
      setError('请输入学校代码')
      return
    }

    // 验证代码格式（只允许字母和数字）
    if (!/^[a-zA-Z0-9]+$/.test(formData.code)) {
      setError('学校代码只能包含字母和数字')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const url = schoolId ? `/api/admin/schools/${schoolId}` : '/api/admin/schools'
      const method = schoolId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '操作失败')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving school:', err)
      setError(err.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {schoolId ? '编辑学校' : '创建学校'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 学校名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">学校名称 *</Label>
            <input
              id="name"
              type="text"
              placeholder="例如：北京市第一中学"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* 学校代码 */}
          <div className="space-y-2">
            <Label htmlFor="code">学校代码 *</Label>
            <input
              id="code"
              type="text"
              placeholder="例如：BJ001（只能包含字母和数字）"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-gray-500">
              学校代码用于标识学校，创建后不建议修改
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : schoolId ? '保存' : '创建'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
