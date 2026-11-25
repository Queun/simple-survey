'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, RotateCcw } from 'lucide-react'

function SuccessContent() {
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

    const params = new URLSearchParams()
    if (school) params.append('school', school)
    if (grade) params.append('grade', grade)
    if (className) params.append('class', className)

    const returnUrl = params.toString()
      ? `/survey/${periodId}?${params}`
      : `/survey/${periodId}`

    router.replace(returnUrl)
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
          <p className="text-gray-600">
            感谢您的参与，您的反馈对我们非常重要。
          </p>

          {periodId && (
            <div className="pt-4">
              <Button
                onClick={handleReturn}
                variant="outline"
                className="w-full flex items-center justify-center space-x-2"
                size="lg"
              >
                <RotateCcw className="h-4 w-4" />
                <span>下一位同学填写</span>
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                学校、年级和班级已保留
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

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
