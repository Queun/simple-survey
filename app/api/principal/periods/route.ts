import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/response'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/principal/periods
 * 获取所有调研期列表（校长只读）
 */
export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      // 校长必须绑定学校
      if (!user.schoolId) {
        return errorResponse('您的账号未绑定学校', 403)
      }

      const periods = await prisma.period.findMany({
        include: {
          _count: {
            select: {
              questions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // 为每个期数查询本校的提交数
      const periodsWithSchoolSubmissions = await Promise.all(
        periods.map(async (period) => {
          const schoolSubmissionCount = await prisma.submission.count({
            where: {
              periodId: period.id,
              schoolId: user.schoolId
            }
          })

          return {
            ...period,
            subjects: JSON.parse(period.subjects),
            _count: {
              questions: period._count.questions,
              submissions: schoolSubmissionCount
            }
          }
        })
      )

      return successResponse(periodsWithSchoolSubmissions)
    } catch (error) {
      console.error('Error fetching periods:', error)
      return errorResponse('获取调研期列表失败', 500)
    }
  },
  { requiredRole: 'PRINCIPAL' }
)
