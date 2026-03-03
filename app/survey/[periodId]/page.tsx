'use client'

import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CascadeSelector } from '@/components/CascadeSelector'
import { SubjectTabs } from '@/components/SubjectTabs'
import { QuestionList } from '@/components/QuestionList'
import { Loader2 } from 'lucide-react'

interface School {
  id: number
  name: string
  code: string
}

interface QuestionOption {
  label: string
  score: number
}

interface Question {
  id: number
  order: number
  content: string
  options: QuestionOption[]
}

interface Period {
  id: number
  name: string
  startDate: string
  endDate: string
  subjects: string[]
  questions: Question[]
}

export default function SurveyPage({ params }: { params: Promise<{ periodId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [period, setPeriod] = useState<Period | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 基础信息
  const [selectedSchool, setSelectedSchool] = useState<number | null>(null)
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedClass, setSelectedClass] = useState('')

  // 当前学科
  const [currentSubject, setCurrentSubject] = useState('')

  // 所有答案: { subject: { questionId: score } }
  const [allAnswers, setAllAnswers] = useState<Record<string, Record<number, number>>>({})

  // 已完成的学科
  const [completedSubjects, setCompletedSubjects] = useState<Set<string>>(new Set())

  const storageKey = `survey_${resolvedParams.periodId}`

  // 加载数据
  useEffect(() => {
    async function loadData() {
      try {
        const [periodRes, schoolsRes] = await Promise.all([
          fetch(`/api/surveys/${resolvedParams.periodId}`),
          fetch('/api/schools')
        ])

        if (!periodRes.ok) {
          const error = await periodRes.json()
          throw new Error(error.error || '加载调研期信息失败')
        }

        if (!schoolsRes.ok) {
          throw new Error('加载学校列表失败')
        }

        const periodData = await periodRes.json()
        const schoolsData = await schoolsRes.json()

        setPeriod(periodData)
        setSchools(schoolsData)
        setCurrentSubject(periodData.subjects[0])

        // 先从 localStorage 恢复数据
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          try {
            const data = JSON.parse(saved)
            if (data.schoolId) setSelectedSchool(data.schoolId)
            if (data.grade) setSelectedGrade(data.grade)
            if (data.className) setSelectedClass(data.className)
            if (data.answers) setAllAnswers(data.answers)
            if (data.completedSubjects) setCompletedSubjects(new Set(data.completedSubjects))
          } catch (e) {
            console.error('恢复数据失败:', e)
          }
        }

        // URL 参数优先级最高，覆盖 localStorage 中的学校、年级、班级
        const schoolParam = searchParams.get('school')
        const gradeParam = searchParams.get('grade')
        const classParam = searchParams.get('class')

        if (schoolParam) setSelectedSchool(parseInt(schoolParam))
        if (gradeParam) setSelectedGrade(gradeParam)
        if (classParam) setSelectedClass(classParam)

        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败')
        setLoading(false)
      }
    }

    loadData()
  }, [resolvedParams.periodId, searchParams, storageKey])

  // 自动保存到 localStorage
  useEffect(() => {
    if (!period) return

    const data = {
      schoolId: selectedSchool,
      grade: selectedGrade,
      className: selectedClass,
      answers: allAnswers,
      completedSubjects: Array.from(completedSubjects)
    }
    localStorage.setItem(storageKey, JSON.stringify(data))
  }, [selectedSchool, selectedGrade, selectedClass, allAnswers, completedSubjects, storageKey, period])

  // 检查当前学科是否完成
  useEffect(() => {
    if (!period || !currentSubject) return

    const subjectAnswers = allAnswers[currentSubject] || {}
    const allQuestionsAnswered = period.questions.every(q => subjectAnswers[q.id] !== undefined)

    if (allQuestionsAnswered && !completedSubjects.has(currentSubject)) {
      setCompletedSubjects(new Set([...completedSubjects, currentSubject]))
    } else if (!allQuestionsAnswered && completedSubjects.has(currentSubject)) {
      const newSet = new Set(completedSubjects)
      newSet.delete(currentSubject)
      setCompletedSubjects(newSet)
    }
  }, [allAnswers, currentSubject, period, completedSubjects])

  const handleAnswerChange = (questionId: number, score: number) => {
    setAllAnswers(prev => ({
      ...prev,
      [currentSubject]: {
        ...(prev[currentSubject] || {}),
        [questionId]: score
      }
    }))
  }

  const handleSubmit = async () => {
    if (!period || !selectedSchool || !selectedGrade || !selectedClass) {
      alert('请填写完整信息')
      return
    }

    if (completedSubjects.size !== period.subjects.length) {
      alert('请完成所有学科的评价')
      return
    }

    setSubmitting(true)

    try {
      // 转换答案格式
      const answers: Array<{ questionId: number; subject: string; score: number }> = []

      Object.entries(allAnswers).forEach(([subject, subjectAnswers]) => {
        Object.entries(subjectAnswers).forEach(([questionId, score]) => {
          answers.push({
            questionId: parseInt(questionId),
            subject,
            score
          })
        })
      })

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodId: period.id,
          schoolId: selectedSchool,
          grade: selectedGrade,
          className: selectedClass,
          answers
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '提交失败')
      }

      // 不清除 localStorage，而是标记为已提交
      const savedData = localStorage.getItem(storageKey)
      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          data.submitted = true
          localStorage.setItem(storageKey, JSON.stringify(data))
        } catch (e) {
          console.error('标记提交状态失败:', e)
        }
      }

      // 跳转到成功页面，携带期数ID和学校信息
      router.push(`/survey/success?periodId=${period.id}&school=${selectedSchool}&grade=${selectedGrade}&class=${selectedClass}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = selectedSchool && selectedGrade && selectedClass &&
    period && completedSubjects.size === period.subjects.length

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !period) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>错误</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error || '加载失败'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const showQuestions = selectedSchool && selectedGrade && selectedClass

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{period.name}</CardTitle>
            <CardDescription>
              请选择您的学校、年级、班级，然后对每个学科进行评价
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 基础信息选择 */}
            <CascadeSelector
              schools={schools}
              selectedSchool={selectedSchool}
              selectedGrade={selectedGrade}
              selectedClass={selectedClass}
              onSchoolChange={setSelectedSchool}
              onGradeChange={setSelectedGrade}
              onClassChange={setSelectedClass}
            />

            {/* 学科切换和题目 */}
            {showQuestions && (
              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">请对以下学科进行评价</h3>
                <SubjectTabs
                  subjects={period.subjects}
                  currentSubject={currentSubject}
                  completedSubjects={completedSubjects}
                  onSubjectChange={setCurrentSubject}
                >
                  <QuestionList
                    questions={period.questions}
                    answers={allAnswers[currentSubject] || {}}
                    onAnswerChange={handleAnswerChange}
                  />
                </SubjectTabs>

                {/* 提交按钮 */}
                <div className="mt-6 flex flex-col items-center gap-3">
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                    className="w-full max-w-xs"
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {canSubmit ? '提交问卷' : `已完成 ${completedSubjects.size}/${period.subjects.length} 个学科`}
                  </Button>
                  <p className="text-sm text-gray-500">
                    请完成所有学科后提交
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
