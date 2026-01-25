'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, RotateCcw } from 'lucide-react'

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const periodId = searchParams.get('periodId')
  const school = searchParams.get('school')
  const grade = searchParams.get('grade')
  const className = searchParams.get('class')

  const handleReturn = () => {
    if (!periodId) {
      alert('缺少必要参数，无法返回')
      return
    }

    // 清空答案，保留基础信息
    const storageKey = `survey_${periodId}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        // 保留学校、年级、班级，清空答案和已完成标记
        const cleanData = {
          schoolId: data.schoolId,
          grade: data.grade,
          className: data.className,
          answers: {},
          completedSubjects: []
        }
        localStorage.setItem(storageKey, JSON.stringify(cleanData))
      } catch (e) {
        console.error('清理数据失败:', e)
        // 如果清理失败，直接移除
        localStorage.removeItem(storageKey)
      }
    }

    // 构建返回URL
    const params = new URLSearchParams()
    if (school) params.append('school', school)
    if (grade) params.append('grade', grade)
    if (className) params.append('class', className)

    const returnUrl = params.toString()
      ? `/survey/${periodId}?${params}`
      : `/survey/${periodId}`

    router.push(returnUrl)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">提交成功！</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 显示提交的班级信息 */}
          {grade && className && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                您已完成 <span className="font-semibold">{grade} {className}</span> 的问卷调查
              </p>
            </div>
          )}

          <p className="text-gray-600">
            感谢您的参与，您的反馈对我们非常重要。
          </p>

          {/* 老师验收提示 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              请让老师确认您已完成问卷填写
            </p>
          </div>

          {/* 返回重新填写按钮 */}
          {periodId && (
            <div className="pt-4">
              <Button
                onClick={handleReturn}
                variant="outline"
                className="w-full flex items-center justify-center space-x-2"
                size="lg"
              >
                <RotateCcw className="h-4 w-4" />
                <span>返回重新填写</span>
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                点击后将保留班级信息，清空所有答案
              </p>
            </div>
          )}

          {!periodId && (
            <p className="text-sm text-gray-500 mt-4">
              您可以关闭此页面了
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
