import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface AnswerData {
  questionId: number
  subject: string
  score: number
}

interface SubmissionData {
  periodId: number
  schoolId: number
  grade: string
  className: string
  answers: AnswerData[]
}

export async function POST(req: NextRequest) {
  try {
    const data: SubmissionData = await req.json()

    // 基础验证
    if (!data.periodId || !data.schoolId || !data.grade || !data.className || !data.answers?.length) {
      return NextResponse.json(
        { error: '缺少必填信息' },
        { status: 400 }
      )
    }

    // 验证调研期是否存在且开放
    const period = await prisma.period.findUnique({
      where: { id: data.periodId }
    })

    if (!period) {
      return NextResponse.json(
        { error: '调研期不存在' },
        { status: 404 }
      )
    }

    if (!period.isActive) {
      return NextResponse.json(
        { error: '该调研期已关闭' },
        { status: 403 }
      )
    }

    // 验证学校是否存在
    const school = await prisma.school.findUnique({
      where: { id: data.schoolId }
    })

    if (!school) {
      return NextResponse.json(
        { error: '学校不存在' },
        { status: 404 }
      )
    }

    // 创建提交记录和答案（使用事务）
    const submission = await prisma.submission.create({
      data: {
        periodId: data.periodId,
        schoolId: data.schoolId,
        grade: data.grade,
        className: data.className,
        answers: {
          create: data.answers.map(answer => ({
            questionId: answer.questionId,
            subject: answer.subject,
            score: answer.score
          }))
        }
      },
      include: {
        answers: true
      }
    })

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      message: '提交成功！感谢您的参与。'
    })
  } catch (error) {
    console.error('Submit survey error:', error)
    return NextResponse.json(
      { error: '提交失败，请稍后重试' },
      { status: 500 }
    )
  }
}
