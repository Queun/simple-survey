import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { successResponse, errorResponse } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/periods/[periodId]
 * 获取单个调研期详情
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

      const period = await prisma.period.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              questions: true,
              submissions: true
            }
          }
        }
      })

      if (!period) {
        return errorResponse('调研期不存在', 404)
      }

      return successResponse({
        ...period,
        subjects: JSON.parse(period.subjects)
      })
    } catch (error) {
      console.error('Error fetching period:', error)
      return errorResponse('获取调研期失败', 500)
    }
  }, { requiredRole: 'ADMIN' })(req)
}

/**
 * PUT /api/admin/periods/[periodId]
 * 更新调研期信息
 */
export async function PUT(
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
      const { name, startDate, endDate, subjects, isActive } = body

      // 验证必填字段
      if (!name || !startDate || !endDate || !subjects || subjects.length === 0) {
        return errorResponse('缺少必填字段', 400)
      }

      // 更新调研期
      const period = await prisma.period.update({
        where: { id },
        data: {
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          subjects: JSON.stringify(subjects),
          isActive: isActive ?? true
        }
      })

      return successResponse({
        ...period,
        subjects: JSON.parse(period.subjects)
      })
    } catch (error) {
      console.error('Error updating period:', error)
      return errorResponse('更新调研期失败', 500)
    }
  }, { requiredRole: 'ADMIN' })(req)
}

/**
 * PATCH /api/admin/periods/[periodId]
 * 部分更新调研期（主要用于切换状态）
 */
export async function PATCH(
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
      const { isActive } = body

      if (typeof isActive !== 'boolean') {
        return errorResponse('isActive必须是布尔值', 400)
      }

      // 更新状态
      const period = await prisma.period.update({
        where: { id },
        data: { isActive }
      })

      return successResponse({
        ...period,
        subjects: JSON.parse(period.subjects)
      })
    } catch (error) {
      console.error('Error toggling period status:', error)
      return errorResponse('切换状态失败', 500)
    }
  }, { requiredRole: 'ADMIN' })(req)
}

/**
 * DELETE /api/admin/periods/[periodId]
 * 删除调研期
 */
export async function DELETE(
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

      // 检查是否有提交数据
      const submissionCount = await prisma.submission.count({
        where: { periodId: id }
      })

      if (submissionCount > 0) {
        return errorResponse('该调研期已有提交数据，无法删除', 400)
      }

      // 删除调研期（会级联删除题目）
      await prisma.period.delete({
        where: { id }
      })

      return successResponse({ message: '删除成功' })
    } catch (error) {
      console.error('Error deleting period:', error)
      return errorResponse('删除调研期失败', 500)
    }
  }, { requiredRole: 'ADMIN' })(req)
}
