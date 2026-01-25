import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { successResponse, errorResponse } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/periods/[periodId]/questions
 * 获取某个调研期的所有题目
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  const { periodId } = await params

  return withAuth(async (req: NextRequest, user) => {
    try {
      const id = parseInt(periodId, 10)

      if (isNaN(id)) {
        return errorResponse('无效的期数ID', 400)
      }

      // 验证期数是否存在
      const period = await prisma.period.findUnique({
        where: { id }
      })

      if (!period) {
        return errorResponse('调研期不存在', 404)
      }

      // 获取题目列表
      const questions = await prisma.question.findMany({
        where: { periodId: id },
        orderBy: { order: 'asc' }
      })

      // 解析options JSON字段
      const questionsWithParsedOptions = questions.map(question => ({
        ...question,
        options: JSON.parse(question.options)
      }))

      return successResponse(questionsWithParsedOptions)
    } catch (error) {
      console.error('Error fetching questions:', error)
      return errorResponse('获取题目列表失败', 500)
    }
  }, { requiredRole: 'ADMIN' })(req)
}

/**
 * POST /api/admin/periods/[periodId]/questions
 * 创建新题目
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  const { periodId } = await params

  return withAuth(async (req: NextRequest, user) => {
    try {
      const id = parseInt(periodId, 10)

      if (isNaN(id)) {
        return errorResponse('无效的期数ID', 400)
      }

      const body = await req.json()
      const { content, options } = body

      // 验证必填字段
      if (!content || !options || !Array.isArray(options) || options.length === 0) {
        return errorResponse('缺少必填字段或选项格式错误', 400)
      }

      // 验证选项格式
      for (const option of options) {
        if (!option.label || typeof option.score !== 'number') {
          return errorResponse('选项格式错误，每个选项需要包含label和score', 400)
        }
      }

      // 获取当前最大order值
      const maxOrderQuestion = await prisma.question.findFirst({
        where: { periodId: id },
        orderBy: { order: 'desc' }
      })

      const nextOrder = maxOrderQuestion ? maxOrderQuestion.order + 1 : 1

      // 创建题目
      const question = await prisma.question.create({
        data: {
          periodId: id,
          content,
          options: JSON.stringify(options),
          order: nextOrder
        }
      })

      return successResponse(
        {
          ...question,
          options: JSON.parse(question.options)
        },
        201
      )
    } catch (error) {
      console.error('Error creating question:', error)
      return errorResponse('创建题目失败', 500)
    }
  }, { requiredRole: 'ADMIN' })(req)
}
