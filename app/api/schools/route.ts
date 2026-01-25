import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(schools)
  } catch (error) {
    console.error('Get schools error:', error)
    return NextResponse.json(
      { error: '获取学校列表失败' },
      { status: 500 }
    )
  }
}
