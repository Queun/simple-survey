'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

interface PeriodFormData {
  name: string
  startDate: string
  endDate: string
  subjectIds: number[]
  isActive: boolean
}

interface PeriodFormProps {
  periodId?: number
  initialData?: PeriodFormData
  onClose: () => void
  onSuccess: () => void
}

export default function PeriodForm({ periodId, initialData, onClose, onSuccess }: PeriodFormProps) {
  const [formData, setFormData] = useState<PeriodFormData>(
    initialData || {
      name: '',
      startDate: '',
      endDate: '',
      subjectIds: [],
      isActive: true
    }
  )
  const [subjects, setSubjects] = useState<{id: number, name: string}[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/subjects').then(async res => {
      if (!res.ok) throw new Error()
      setSubjects(await res.json())
    }).catch(() => setError('加载学科列表失败'))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // 验证
    if (!formData.name.trim()) {
      setError('请输入期数名称')
      return
    }

    if (!formData.startDate || !formData.endDate) {
      setError('请选择开始和结束日期')
      return
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('结束日期必须晚于开始日期')
      return
    }

    if (formData.subjectIds.length === 0) {
      setError('请至少添加一个学科')
      return
    }

    setLoading(true)

    try {

      const url = periodId ? `/api/admin/periods/${periodId}` : '/api/admin/periods'
      const method = periodId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {

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
    } catch (err) {
      console.error('Error saving period:', err)
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {periodId ? '编辑调研期' : '创建调研期'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 期数名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">期数名称 *</Label>
            <input
              id="name"
              type="text"
              placeholder="例如：2024秋季测评"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* 日期范围 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">开始日期 *</Label>
              <input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">结束日期 *</Label>
              <input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* 学科列表 */}
          <fieldset className="space-y-2">
            <legend>本期学科 *</legend>
            {subjects.map(subject => (
              <label key={subject.id} className="mr-4 inline-flex items-center gap-2">
                <input type="checkbox" checked={formData.subjectIds.includes(subject.id)} onChange={e => {
                  const subjectIds = e.target.checked ? [...formData.subjectIds, subject.id] : formData.subjectIds.filter(id => id !== subject.id)
                  setFormData({ ...formData, subjectIds })
                }} />
                {subject.name}
              </label>
            ))}
            {!subjects.length && <p className="text-sm text-gray-600">请先在学科管理中添加学科。</p>}
          </fieldset>

          {/* 状态 */}
          <div className="flex items-center space-x-2">
            <input
              id="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="font-normal cursor-pointer">
              开启此调研期
            </Label>
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
              {loading ? '保存中...' : periodId ? '保存' : '创建'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
