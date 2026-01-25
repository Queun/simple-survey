import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { successResponse, errorResponse } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/principal/dashboard
 * 获取校长仪表盘统计数据
 */
export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      // 确保用户是校长且有绑定的学校
      if (user.role !== 'PRINCIPAL' || !user.schoolId) {
        return errorResponse('无权限访问', 403)
      }

      // 获取学校信息
      const school = await prisma.school.findUnique({
        where: { id: user.schoolId }
      })

      if (!school) {
        return errorResponse('学校不存在', 404)
      }

      // 获取本校提交总数
      const totalSubmissions = await prisma.submission.count({
        where: { schoolId: user.schoolId }
      })

      // 获取活跃的调研期数量
      const activePeriods = await prisma.period.count({
        where: { isActive: true }
      })

      // 获取最近7天的提交数
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentSubmissions = await prisma.submission.count({
        where: {
          schoolId: user.schoolId,
          createdAt: {
            gte: sevenDaysAgo
          }
        }
      })

      // 计算平均得分
      const answers = await prisma.answer.findMany({
        where: {
          submission: {
            schoolId: user.schoolId
          }
        },
        select: {
          score: true
        }
      })

      const averageScore = answers.length > 0
        ? answers.reduce((sum, a) => sum + a.score, 0) / answers.length
        : 0

      return successResponse({
        schoolName: school.name,
        totalSubmissions,
        activePeriods,
        recentSubmissions,
        averageScore
      })
    } catch (error) {
      console.error('Error fetching principal dashboard:', error)
      return errorResponse('获取仪表盘数据失败', 500)
    }
  },
  { requiredRole: 'PRINCIPAL' }
)
