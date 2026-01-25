import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { successResponse, errorResponse } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/admin/periods/[periodId]/questions/reorder
 * 批量更新题目顺序
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  const { periodId } = await params

  return withAuth(async (req: NextRequest, user) => {
    try {
      const pid = parseInt(periodId, 10)

      if (isNaN(pid)) {
        return errorResponse('无效的期数ID', 400)
      }

      const body = await req.json()
      const { questionIds } = body

      // 验证参数
      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        return errorResponse('questionIds必须是非空数组', 400)
      }

      // 验证所有题目都属于该期数
      const questions = await prisma.question.findMany({
        where: {
          id: { in: questionIds },
          periodId: pid
        }
      })

      if (questions.length !== questionIds.length) {
        return errorResponse('部分题目不存在或不属于该期数', 400)
      }

      // 批量更新order
      for (let i = 0; i < questionIds.length; i++) {
        await prisma.question.update({
          where: { id: questionIds[i] },
          data: { order: i + 1 }
        })
      }

      return successResponse({ message: '排序成功' })
    } catch (error) {
      console.error('Error reordering questions:', error)
      return errorResponse('排序失败', 500)
    }
  }, { requiredRole: 'ADMIN' })(req)
}
