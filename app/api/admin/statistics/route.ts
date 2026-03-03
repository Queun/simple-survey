import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/response'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/statistics
 * 获取管理员统计数据（跨学校对比）
 * Query params: periodId (optional) - 筛选特定期数
 */
export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const periodId = searchParams.get('periodId')

      // 构建查询条件
      const whereCondition: any = {}
      if (periodId) {
        whereCondition.periodId = parseInt(periodId, 10)
      }

      // 获取所有学校的基本信息
      const schools = await prisma.school.findMany({
        select: {
          id: true,
          name: true,
          code: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      // 获取提交数据和答案
      const submissions = await prisma.submission.findMany({
        where: whereCondition,
        include: {
          answers: {
            select: {
              subject: true,  // 使用 subject 字段而不是 subjectId
              questionId: true,
              score: true
            }
          },
          school: {
            select: {
              id: true,
              name: true
            }
          },
          period: {
            select: {
              id: true,
              name: true,
              subjects: true
            }
          }
        }
      })

      // 统计各学校各科目的平均分
      const schoolStats: any = {}

      for (const school of schools) {
        schoolStats[school.id] = {
          schoolId: school.id,
          schoolName: school.name,
          schoolCode: school.code,
          submissionCount: 0,
          subjects: {}
        }
      }

      // 处理提交数据
      for (const submission of submissions) {
        const schoolId = submission.schoolId

        if (!schoolStats[schoolId]) continue

        schoolStats[schoolId].submissionCount++

        // 获取该期数的科目列表
        const subjects = JSON.parse(submission.period.subjects)

        // 按科目统计分数
        for (const answer of submission.answers) {
          const subjectName = answer.subject

          if (!schoolStats[schoolId].subjects[subjectName]) {
            schoolStats[schoolId].subjects[subjectName] = {
              subjectId: subjectName,
              subjectName,
              totalScore: 0,
              answerCount: 0
            }
          }

          schoolStats[schoolId].subjects[subjectName].totalScore += answer.score
          schoolStats[schoolId].subjects[subjectName].answerCount++
        }
      }

      // 计算平均分
      for (const schoolId in schoolStats) {
        const school = schoolStats[schoolId]

        for (const subjectId in school.subjects) {
          const subject = school.subjects[subjectId]
          subject.averageScore = subject.answerCount > 0
            ? parseFloat((subject.totalScore / subject.answerCount).toFixed(2))
            : 0
        }

        // 转换为数组格式
        school.subjects = Object.values(school.subjects)
      }

      // 获取所有期数（用于筛选）
      const periods = await prisma.period.findMany({
        select: {
          id: true,
          name: true,
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return successResponse({
        schools: Object.values(schoolStats),
        periods
      })
    } catch (error) {
      console.error('Error fetching admin statistics:', error)
      return errorResponse('获取统计数据失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)
