import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { successResponse, errorResponse } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/periods
 * 获取所有调研期列表
 */
export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const periods = await prisma.period.findMany({
        include: {
          _count: {
            select: {
              questions: true,
              submissions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // 解析subjects JSON字段
      const periodsWithParsedSubjects = periods.map(period => ({
        ...period,
        subjects: JSON.parse(period.subjects)
      }))

      return successResponse(periodsWithParsedSubjects)
    } catch (error) {
      console.error('Error fetching periods:', error)
      return errorResponse('获取调研期列表失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)

/**
 * POST /api/admin/periods
 * 创建新的调研期
 */
export const POST = withAuth(
  async (req: NextRequest, user) => {
    try {
      const body = await req.json()
      const { name, startDate, endDate, subjects, isActive } = body

      // 验证必填字段
      if (!name || !startDate || !endDate || !subjects || subjects.length === 0) {
        return errorResponse('缺少必填字段', 400)
      }

      // 创建调研期
      const period = await prisma.period.create({
        data: {
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          subjects: JSON.stringify(subjects),
          isActive: isActive ?? true
        }
      })

      return successResponse(
        {
          ...period,
          subjects: JSON.parse(period.subjects)
        },
        201
      )
    } catch (error) {
      console.error('Error creating period:', error)
      return errorResponse('创建调研期失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)
