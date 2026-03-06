'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import QuestionForm from '@/components/QuestionForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, GripVertical, ArrowLeft, Copy } from 'lucide-react'

interface QuestionOption {
  label: string
  score: number
}

interface Question {
  id: number
  content: string
  options: QuestionOption[]
  order: number
}

interface Period {
  id: number
  name: string
}

export default function QuestionsPage() {
  const params = useParams()
  const router = useRouter()
  const periodId = parseInt(params.periodId as string, 10)

  const [period, setPeriod] = useState<Period | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [templateQuestion, setTemplateQuestion] = useState<Question | null>(null)

  useEffect(() => {
    fetchPeriod()
    fetchQuestions()
  }, [])

  async function fetchPeriod() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/periods/${periodId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch period')
      }

      const data = await res.json()
      setPeriod(data)
    } catch (err) {
      console.error('Error fetching period:', err)
    }
  }

  async function fetchQuestions() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/periods/${periodId}/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch questions')
      }

      const data = await res.json()
      setQuestions(data)
    } catch (err) {
      console.error('Error fetching questions:', err)
      setError('加载题目列表失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    if (!confirm('确定要删除这个题目吗？删除后无法恢复。')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/periods/${periodId}/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to delete question')
      }

      fetchQuestions()
    } catch (err) {
      console.error('Error deleting question:', err)
      alert('删除失败')
    }
  }

  function handleMoveUp(index: number) {
    if (index === 0) return

    const newQuestions = [...questions]
    const temp = newQuestions[index]
    newQuestions[index] = newQuestions[index - 1]
    newQuestions[index - 1] = temp

    setQuestions(newQuestions)
    updateQuestionsOrder(newQuestions)
  }

  function handleMoveDown(index: number) {
    if (index === questions.length - 1) return

    const newQuestions = [...questions]
    const temp = newQuestions[index]
    newQuestions[index] = newQuestions[index + 1]
    newQuestions[index + 1] = temp

    setQuestions(newQuestions)
    updateQuestionsOrder(newQuestions)
  }

  async function updateQuestionsOrder(newQuestions: Question[]) {
    try {
      const token = localStorage.getItem('token')
      const questionIds = newQuestions.map(q => q.id)

      await fetch(`/api/admin/periods/${periodId}/questions/reorder`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionIds })
      })
    } catch (err) {
      console.error('Error reordering questions:', err)
      alert('排序失败')
      fetchQuestions()
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/periods')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回期数列表</span>
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {period ? period.name : '加载中...'} - 题目配置
              </h2>
              <p className="mt-2 text-gray-600">配置调研问卷的题目和选项</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>创建题目</span>
          </Button>
        </div>

        {/* 题目列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">加载中...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-lg text-red-600">{error}</div>
          </div>
        ) : questions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">暂无题目，点击上方按钮创建第一个题目</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card key={question.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex flex-col space-y-1 mt-1">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === questions.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start space-x-3">
                          <span className="text-lg font-semibold text-blue-600 mt-1">
                            Q{index + 1}
                          </span>
                          <CardTitle className="text-lg leading-relaxed">
                            {question.content}
                          </CardTitle>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTemplateQuestion(question)}
                        className="flex items-center space-x-2 text-green-600 hover:text-green-700"
                      >
                        <Copy className="h-4 w-4" />
                        <span>复制为模板</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingQuestion(question)}
                        className="flex items-center space-x-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>编辑</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>删除</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">选项：</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {question.options.map((option, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-md"
                        >
                          <span className="text-sm text-gray-700">
                            {String.fromCharCode(65 + idx)}. {option.label}
                          </span>
                          <span className="text-sm font-medium text-blue-600">
                            {option.score} 分
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 创建题目模态框 */}
        {showCreateModal && (
          <QuestionForm
            periodId={periodId}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              fetchQuestions()
              setShowCreateModal(false)
            }}
          />
        )}

        {/* 编辑题目模态框 */}
        {editingQuestion && (
          <QuestionForm
            periodId={periodId}
            questionId={editingQuestion.id}
            initialData={{
              content: editingQuestion.content,
              options: editingQuestion.options
            }}
            onClose={() => setEditingQuestion(null)}
            onSuccess={() => {
              fetchQuestions()
              setEditingQuestion(null)
            }}
          />
        )}

        {/* 从模板创建题目模态框 */}
        {templateQuestion && (
          <QuestionForm
            periodId={periodId}
            initialData={{
              content: templateQuestion.content,
              options: templateQuestion.options
            }}
            onClose={() => setTemplateQuestion(null)}
            onSuccess={() => {
              fetchQuestions()
              setTemplateQuestion(null)
            }}
          />
        )}
      </div>
    </AdminLayout>
  )
}
