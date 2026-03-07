import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/response'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/principal/statistics
 * 获取校长统计数据（本校详细数据 + 跨校对比）
 * Query params: periodId (optional) - 筛选特定期数
 */
export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      // 校长必须绑定学校
      if (!user.schoolId) {
        return errorResponse('您的账号未绑定学校', 403)
      }
      const schoolId = user.schoolId

      const { searchParams } = new URL(req.url)
      const periodId = searchParams.get('periodId')

      // 构建查询条件
      const whereCondition: any = {}
      if (periodId) {
        whereCondition.periodId = parseInt(periodId, 10)
      }

      // 获取本校信息
      const mySchool = await prisma.school.findUnique({
        where: { id: schoolId },
        select: {
          id: true,
          name: true,
          code: true
        }
      })

      if (!mySchool) {
        return errorResponse('学校不存在', 404)
      }

      // 获取本校提交数据
      const mySubmissions = await prisma.submission.findMany({
        where: {
          ...whereCondition,
          schoolId
        },
        include: {
          answers: {
            select: {
              subject: true,  // 使用 subject 字段而不是 subjectId
              questionId: true,
              score: true
            }
          },
          period: {
            select: {
              id: true,
              name: true,
              subjects: true,
              questions: {
                select: {
                  id: true,
                  content: true,
                  options: true
                }
              }
            }
          }
        }
      })

      // 统计本校各科目、各问题的详细数据
      const mySchoolStats: any = {
        schoolId: mySchool.id,
        schoolName: mySchool.name,
        schoolCode: mySchool.code,
        submissionCount: mySubmissions.length,
        subjects: {},
        byGrade: {}
      }

      // 处理本校数据
      for (const submission of mySubmissions) {
        const subjects = JSON.parse(submission.period.subjects)
        const grade = submission.grade

        // 按年级统计
        if (!mySchoolStats.byGrade[grade]) {
          mySchoolStats.byGrade[grade] = {
            grade,
            submissionCount: 0,
            subjects: {}
          }
        }
        mySchoolStats.byGrade[grade].submissionCount++

        // 按科目统计
        for (const answer of submission.answers) {
          const subjectName = answer.subject

          // 全校科目统计
          if (!mySchoolStats.subjects[subjectName]) {
            mySchoolStats.subjects[subjectName] = {
              subjectId: subjectName,
              subjectName,
              totalScore: 0,
              answerCount: 0,
              questions: {}
            }
          }

          mySchoolStats.subjects[subjectName].totalScore += answer.score
          mySchoolStats.subjects[subjectName].answerCount++

          // 按问题统计
          if (!mySchoolStats.subjects[subjectName].questions[answer.questionId]) {
            mySchoolStats.subjects[subjectName].questions[answer.questionId] = {
              questionId: answer.questionId,
              totalScore: 0,
              answerCount: 0
            }
          }

          mySchoolStats.subjects[subjectName].questions[answer.questionId].totalScore += answer.score
          mySchoolStats.subjects[subjectName].questions[answer.questionId].answerCount++

          // 年级科目统计
          if (!mySchoolStats.byGrade[grade].subjects[subjectName]) {
            mySchoolStats.byGrade[grade].subjects[subjectName] = {
              subjectId: subjectName,
              subjectName,
              totalScore: 0,
              answerCount: 0
            }
          }

          mySchoolStats.byGrade[grade].subjects[subjectName].totalScore += answer.score
          mySchoolStats.byGrade[grade].subjects[subjectName].answerCount++
        }
      }

      // 计算平均分
      for (const subjectId in mySchoolStats.subjects) {
        const subject = mySchoolStats.subjects[subjectId]
        subject.averageScore = subject.answerCount > 0
          ? parseFloat((subject.totalScore / subject.answerCount).toFixed(2))
          : 0

        // 问题平均分
        for (const questionId in subject.questions) {
          const question = subject.questions[questionId]
          question.averageScore = question.answerCount > 0
            ? parseFloat((question.totalScore / question.answerCount).toFixed(2))
            : 0
        }

        subject.questions = Object.values(subject.questions)
      }

      // 年级平均分
      for (const grade in mySchoolStats.byGrade) {
        const gradeData = mySchoolStats.byGrade[grade]

        for (const subjectId in gradeData.subjects) {
          const subject = gradeData.subjects[subjectId]
          subject.averageScore = subject.answerCount > 0
            ? parseFloat((subject.totalScore / subject.answerCount).toFixed(2))
            : 0
        }

        gradeData.subjects = Object.values(gradeData.subjects)
      }

      mySchoolStats.subjects = Object.values(mySchoolStats.subjects)
      mySchoolStats.byGrade = Object.values(mySchoolStats.byGrade)

      // 获取跨校对比数据（所有学校的平均分）
      const allSubmissions = await prisma.submission.findMany({
        where: whereCondition,
        include: {
          answers: {
            select: {
              subject: true,  // 使用 subject 字段而不是 subjectId
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
              subjects: true
            }
          }
        }
      })

      // 统计各学校平均分（用于排名对比）
      const schoolComparison: any = {}

      for (const submission of allSubmissions) {
        const schoolId = submission.schoolId

        if (!schoolComparison[schoolId]) {
          schoolComparison[schoolId] = {
            schoolId,
            schoolName: submission.school.name,
            submissionCount: 0,
            subjects: {}
          }
        }

        schoolComparison[schoolId].submissionCount++

        const subjects = JSON.parse(submission.period.subjects)

        for (const answer of submission.answers) {
          const subjectName = answer.subject

          if (!schoolComparison[schoolId].subjects[subjectName]) {
            schoolComparison[schoolId].subjects[subjectName] = {
              subjectId: subjectName,
              subjectName,
              totalScore: 0,
              answerCount: 0
            }
          }

          schoolComparison[schoolId].subjects[subjectName].totalScore += answer.score
          schoolComparison[schoolId].subjects[subjectName].answerCount++
        }
      }

      // 计算平均分并转换为数组
      for (const schoolId in schoolComparison) {
        const school = schoolComparison[schoolId]

        for (const subjectId in school.subjects) {
          const subject = school.subjects[subjectId]
          subject.averageScore = subject.answerCount > 0
            ? parseFloat((subject.totalScore / subject.answerCount).toFixed(2))
            : 0
        }

        school.subjects = Object.values(school.subjects)
      }

      // 获取所有期数
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
        mySchool: mySchoolStats,
        comparison: Object.values(schoolComparison),
        periods
      })
    } catch (error) {
      console.error('Error fetching principal statistics:', error)
      return errorResponse('获取统计数据失败', 500)
    }
  },
  { requiredRole: 'PRINCIPAL' }
)
