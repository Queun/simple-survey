'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X, Plus, Trash2 } from 'lucide-react'

interface QuestionOption {
  label: string
  score: number
}

interface QuestionFormData {
  content: string
  options: QuestionOption[]
}

interface QuestionFormProps {
  periodId: number
  questionId?: number
  initialData?: QuestionFormData
  onClose: () => void
  onSuccess: () => void
}

export default function QuestionForm({ periodId, questionId, initialData, onClose, onSuccess }: QuestionFormProps) {
  const [formData, setFormData] = useState<QuestionFormData>(
    initialData || {
      content: '',
      options: [
        { label: '非常满意', score: 5 },
        { label: '满意', score: 4 },
        { label: '一般', score: 3 },
        { label: '不满意', score: 2 },
        { label: '非常不满意', score: 1 }
      ]
    }
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleOptionChange(index: number, field: 'label' | 'score', value: string | number) {
    const newOptions = [...formData.options]
    newOptions[index] = {
      ...newOptions[index],
      [field]: field === 'score' ? parseInt(value as string, 10) : value
    }
    setFormData({ ...formData, options: newOptions })
  }

  function handleAddOption() {
    setFormData({
      ...formData,
      options: [...formData.options, { label: '', score: 0 }]
    })
  }

  function handleRemoveOption(index: number) {
    if (formData.options.length <= 1) {
      alert('至少需要保留一个选项')
      return
    }
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // 验证
    if (!formData.content.trim()) {
      setError('请输入题目内容')
      return
    }

    if (formData.options.length === 0) {
      setError('请至少添加一个选项')
      return
    }

    // 验证选项
    for (let i = 0; i < formData.options.length; i++) {
      const option = formData.options[i]
      if (!option.label.trim()) {
        setError(`选项${i + 1}的标签不能为空`)
        return
      }
      if (isNaN(option.score)) {
        setError(`选项${i + 1}的分数必须是数字`)
        return
      }
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const url = questionId
        ? `/api/admin/periods/${periodId}/questions/${questionId}`
        : `/api/admin/periods/${periodId}/questions`
      const method = questionId ? 'PUT' : 'POST'

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
      console.error('Error saving question:', err)
      setError(err.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {questionId ? '编辑题目' : '创建题目'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 题目内容 */}
          <div className="space-y-2">
            <Label htmlFor="content">题目内容 *</Label>
            <textarea
              id="content"
              placeholder="例如：您对该老师的教学质量满意度如何？"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* 选项列表 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>选项配置 *</Label>
              <Button
                type="button"
                onClick={handleAddOption}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>添加选项</span>
              </Button>
            </div>

            <div className="space-y-3">
              {formData.options.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                  <span className="text-sm font-medium text-gray-600 w-8">{idx + 1}.</span>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="选项标签，如：非常满意"
                      value={option.label}
                      onChange={(e) => handleOptionChange(idx, 'label', e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      placeholder="分数"
                      value={option.score}
                      onChange={(e) => handleOptionChange(idx, 'score', e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
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
              {loading ? '保存中...' : questionId ? '保存' : '创建'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
