import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const { periodId } = await params
    const id = parseInt(periodId)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的期数ID' },
        { status: 400 }
      )
    }

    const period = await prisma.period.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
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

    // 解析 JSON 字段
    const subjects = JSON.parse(period.subjects)
    const questions = period.questions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }))

    return NextResponse.json({
      id: period.id,
      name: period.name,
      startDate: period.startDate,
      endDate: period.endDate,
      subjects,
      questions
    })
  } catch (error) {
    console.error('Get period error:', error)
    return NextResponse.json(
      { error: '获取调研期信息失败' },
      { status: 500 }
    )
  }
}
