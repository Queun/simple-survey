'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { type GradeConfig, stageGrades } from '@/lib/classes'
import { X } from 'lucide-react'

interface SchoolFormData {
  name: string
  code: string
  stage: keyof typeof stageGrades
  grades: GradeConfig[]
}

interface SchoolFormProps {
  schoolId?: number
  initialData?: SchoolFormData
  onClose: () => void
  onSuccess: () => void
}

const stages = { PRIMARY: '小学', MIDDLE: '初中', HIGH: '高中' }

export default function SchoolForm({ schoolId, initialData, onClose, onSuccess }: SchoolFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name ?? '', code: initialData?.code ?? '', stage: initialData?.stage ?? 'PRIMARY',
  })
  const [gradeText, setGradeText] = useState(
    (initialData?.grades.map(g => g.name) ?? stageGrades.PRIMARY).join(',')
  )
  const [defaultCount, setDefaultCount] = useState(String(initialData?.grades[0]?.classCount ?? 3))
  const [counts, setCounts] = useState(() => new Map(initialData?.grades.map(g => [g.name, String(g.classCount)])))
  const names = gradeText.split(/[,，]/).map(name => name.trim()).filter(Boolean)
  const gradeNames = [...new Set(names)]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) { setError('请输入学校名称'); return }
    if (!formData.code.trim()) { setError('请输入学校代码'); return }
    if (!/^[a-zA-Z0-9]+$/.test(formData.code)) { setError('学校代码只能包含字母和数字'); return }

    if (!names.length) { setError('请至少输入一个年级'); return }
    if (gradeNames.length !== names.length) { setError('年级名称不能重复'); return }
    const grades = gradeNames.map(name => ({ name, classCount: Number(counts.get(name) ?? defaultCount) }))

    setLoading(true)
    try {

      const url = schoolId ? `/api/admin/schools/${schoolId}` : '/api/admin/schools'
      const method = schoolId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, grades })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '操作失败')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-full overflow-y-auto">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{schoolId ? '编辑学校' : '创建学校'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">学校名称 *</Label>
            <input
              id="name"
              type="text"
              placeholder="例如：北京市第一中学"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">学校代码 *</Label>
            <input
              id="code"
              type="text"
              placeholder="例如：BJ001（只能包含字母和数字）"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-gray-500">学校代码用于标识学校，创建后不建议修改</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schoolType">学段类型</Label>
            <select
              id="schoolType"
              value={formData.stage}
              onChange={e => {
                const stage = e.target.value as keyof typeof stages
                setFormData({ ...formData, stage })
                setGradeText(stageGrades[stage].join(','))
                setCounts(new Map())
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {Object.entries(stages).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500">选择学段类型可自动填充年级列表</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grades">年级列表 *</Label>
            <input
              id="grades"
              type="text"
              placeholder="例如：高一,高二,高三 或 初一,初二,初三"
              value={gradeText}
              onChange={(e) => setGradeText(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-gray-500">用逗号分隔各年级名称</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="classCount">每年级班级数 *</Label>
            <input
              id="classCount"
              type="number"
              min={1}
              max={50}
              value={defaultCount}
              onChange={(e) => { setDefaultCount(e.target.value); setCounts(new Map()) }}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-gray-500">修改此数会同步到所有年级，也可在下方单独调整。</p>
          </div>

          <div className="space-y-2">
            {gradeNames.map(grade => <label key={grade} className="flex items-center justify-between gap-3 text-sm">
              {grade}班级数
              <input type="number" min={1} max={50} required className="h-10 w-24 rounded-md border px-3"
                value={counts.get(grade) ?? defaultCount}
                onChange={e => setCounts(new Map(counts).set(grade, e.target.value))} />
            </label>)}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>取消</Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : schoolId ? '保存' : '创建'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
