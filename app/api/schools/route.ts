import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { name: 'asc' }
    })

    const schoolsWithParsedGrades = schools.map(school => ({
      ...school,
      grades: JSON.parse(school.grades)
    }))

    return NextResponse.json(schoolsWithParsedGrades)
  } catch (error) {
    console.error('Get schools error:', error)
    return NextResponse.json(
      { error: '获取学校列表失败' },
      { status: 500 }
    )
  }
}
