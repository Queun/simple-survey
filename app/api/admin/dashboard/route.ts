import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { successResponse, errorResponse } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/dashboard
 * 获取管理员仪表盘统计数据
 */
export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      // 获取学校总数
      const totalSchools = await prisma.school.count()

      // 获取调研期总数和活跃数
      const totalPeriods = await prisma.period.count()
      const activePeriods = await prisma.period.count({
        where: { isActive: true }
      })

      // 获取提交总数
      const totalSubmissions = await prisma.submission.count()

      // 获取最近7天的提交数
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentSubmissions = await prisma.submission.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo
          }
        }
      })

      return successResponse({
        totalSchools,
        totalPeriods,
        activePeriods,
        totalSubmissions,
        recentSubmissions
      })
    } catch (error) {
      console.error('Error fetching admin dashboard:', error)
      return errorResponse('获取仪表盘数据失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)
