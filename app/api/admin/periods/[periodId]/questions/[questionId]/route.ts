import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/response'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/periods/[periodId]/questions/[questionId]
 * 获取单个题目详情
 */
export const GET = withAuth(
  async (req: NextRequest, user, { params }: { params: Promise<{ periodId: string; questionId: string }> }) => {
    try {
      const { periodId, questionId } = await params
      const pid = parseInt(periodId, 10)
      const qid = parseInt(questionId, 10)

      if (isNaN(pid) || isNaN(qid)) {
        return errorResponse('无效的ID', 400)
      }

      const question = await prisma.question.findFirst({
        where: {
          id: qid,
          periodId: pid
        }
      })

      if (!question) {
        return errorResponse('题目不存在', 404)
      }

      return successResponse({
        ...question,
        options: JSON.parse(question.options)
      })
    } catch (error) {
      console.error('Error fetching question:', error)
      return errorResponse('获取题目失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)

/**
 * PUT /api/admin/periods/[periodId]/questions/[questionId]
 * 更新题目信息
 */
export const PUT = withAuth(
  async (req: NextRequest, user, { params }: { params: Promise<{ periodId: string; questionId: string }> }) => {
    try {
      const { periodId, questionId } = await params
      const pid = parseInt(periodId, 10)
      const qid = parseInt(questionId, 10)

      if (isNaN(pid) || isNaN(qid)) {
        return errorResponse('无效的ID', 400)
      }

      const body = await req.json()
      const { content, options } = body

      if (!content || !options || !Array.isArray(options) || options.length === 0) {
        return errorResponse('缺少必填字段或选项格式错误', 400)
      }

      for (const option of options) {
        if (!option.label || typeof option.score !== 'number') {
          return errorResponse('选项格式错误，每个选项需要包含label和score', 400)
        }
      }

      const existingQuestion = await prisma.question.findFirst({
        where: {
          id: qid,
          periodId: pid
        }
      })

      if (!existingQuestion) {
        return errorResponse('题目不存在', 404)
      }

      const question = await prisma.question.update({
        where: { id: qid },
        data: {
          content,
          options: JSON.stringify(options)
        }
      })

      return successResponse({
        ...question,
        options: JSON.parse(question.options)
      })
    } catch (error) {
      console.error('Error updating question:', error)
      return errorResponse('更新题目失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)

/**
 * DELETE /api/admin/periods/[periodId]/questions/[questionId]
 * 删除题目
 */
export const DELETE = withAuth(
  async (req: NextRequest, user, { params }: { params: Promise<{ periodId: string; questionId: string }> }) => {
    try {
      const { periodId, questionId } = await params
      const pid = parseInt(periodId, 10)
      const qid = parseInt(questionId, 10)

      if (isNaN(pid) || isNaN(qid)) {
        return errorResponse('无效的ID', 400)
      }

      const existingQuestion = await prisma.question.findFirst({
        where: {
          id: qid,
          periodId: pid
        }
      })

      if (!existingQuestion) {
        return errorResponse('题目不存在', 404)
      }

      await prisma.question.delete({
        where: { id: qid }
      })

      // 重新排序剩余题目
      const remainingQuestions = await prisma.question.findMany({
        where: { periodId: pid },
        orderBy: { order: 'asc' }
      })

      for (let i = 0; i < remainingQuestions.length; i++) {
        await prisma.question.update({
          where: { id: remainingQuestions[i].id },
          data: { order: i + 1 }
        })
      }

      return successResponse({ message: '删除成功' })
    } catch (error) {
      console.error('Error deleting question:', error)
      return errorResponse('删除题目失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)
