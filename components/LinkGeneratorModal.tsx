'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { X, Copy, Check } from 'lucide-react'

interface School {
  id: number
  name: string
  code: string
  grades: string[]
  classCount: number
}

interface LinkGeneratorModalProps {
  periodId: number
  userRole: 'ADMIN' | 'PRINCIPAL'
  userSchoolId?: number
  onClose: () => void
}

export function LinkGeneratorModal({ periodId, userRole, userSchoolId, onClose }: LinkGeneratorModalProps) {
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<number | null>(null)
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSchools()
  }, [])

  // 校长自动选中自己的学校
  useEffect(() => {
    if (userRole === 'PRINCIPAL' && userSchoolId) {
      setSelectedSchool(userSchoolId)
    }
  }, [userRole, userSchoolId])

  // 动态生成URL
  useEffect(() => {
    const baseUrl = `${window.location.origin}/survey/${periodId}`
    const params = new URLSearchParams()

    if (selectedSchool) params.append('school', selectedSchool.toString())
    if (selectedGrade) params.append('grade', selectedGrade)
    if (selectedClass) params.append('class', selectedClass)

    const url = params.toString() ? `${baseUrl}?${params}` : baseUrl
    setGeneratedUrl(url)
  }, [periodId, selectedSchool, selectedGrade, selectedClass])

  async function fetchSchools() {
    try {
      const res = await fetch('/api/schools')
      if (!res.ok) throw new Error('Failed to fetch schools')
      const data = await res.json()
      setSchools(data)
    } catch (err) {
      console.error('Error fetching schools:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!navigator.clipboard) {
      alert('您的浏览器不支持复制功能')
      return
    }
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('复制失败，请手动复制')
    }
  }

  const filteredSchools = userRole === 'PRINCIPAL' && userSchoolId
    ? schools.filter(s => s.id === userSchoolId)
    : schools

  const isPrincipal = userRole === 'PRINCIPAL'

  const currentSchool = schools.find(s => s.id === selectedSchool)
  const grades = currentSchool?.grades ?? []
  const classes = currentSchool
    ? Array.from({ length: currentSchool.classCount }, (_, i) => `${i + 1}班`)
    : []

  function handleSchoolChange(value: string) {
    setSelectedSchool(value ? parseInt(value) : null)
    setSelectedGrade('')
    setSelectedClass('')
  }

  function handleGradeChange(value: string) {
    setSelectedGrade(value)
    setSelectedClass('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>生成调查链接</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            选择学校、年级、班级等参数，生成预填链接
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : (
            <>
              {/* 学校选择 */}
              <div>
                <Label htmlFor="school">学校 {!isPrincipal && '(可选)'}</Label>
                <select
                  id="school"
                  className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2"
                  value={selectedSchool || ''}
                  onChange={(e) => handleSchoolChange(e.target.value)}
                  disabled={isPrincipal}
                >
                  <option value="">-- 不预填学校 --</option>
                  {filteredSchools.map(school => (
                    <option key={school.id} value={school.id}>
                      {school.name} ({school.code})
                    </option>
                  ))}
                </select>
                {isPrincipal && (
                  <p className="text-xs text-gray-500 mt-1">校长只能为自己的学校生成链接</p>
                )}
              </div>

              {/* 年级选择 */}
              <div>
                <Label htmlFor="grade">年级 (可选)</Label>
                <select
                  id="grade"
                  className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2"
                  value={selectedGrade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  disabled={!selectedSchool || grades.length === 0}
                >
                  <option value="">-- 不预填年级 --</option>
                  {grades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>

              {/* 班级选择 */}
              <div>
                <Label htmlFor="class">班级 (可选)</Label>
                <select
                  id="class"
                  className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  disabled={!selectedGrade || classes.length === 0}
                >
                  <option value="">-- 不预填班级 --</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* 生成的URL */}
              <div className="pt-4 border-t">
                <Label htmlFor="url">生成的链接</Label>
                <div className="flex gap-2 mt-1">
                  <Input id="url" value={generatedUrl} readOnly className="flex-1 bg-gray-50" />
                  <Button onClick={handleCopy} className="flex items-center space-x-2 min-w-[100px]">
                    {copied ? (
                      <><Check className="h-4 w-4" /><span>已复制</span></>
                    ) : (
                      <><Copy className="h-4 w-4" /><span>复制</span></>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  点击"复制"按钮将链接复制到剪贴板，然后分享给学生
                </p>
              </div>

              {/* 说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">使用说明</h4>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>选择的参数会自动填入学生的答题表单</li>
                  <li>未选择的参数需要学生手动填写</li>
                  <li>建议至少预填学校，可以减少学生的操作步骤</li>
                  <li>如果整个班级使用同一台电脑，可以预填完整信息</li>
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={onClose}>关闭</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
