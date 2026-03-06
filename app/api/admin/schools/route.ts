import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/response'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/schools
 * 获取所有学校列表
 */
export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const schools = await prisma.school.findMany({
        include: {
          _count: {
            select: {
              principals: true,
              submissions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return successResponse(schools.map(s => ({ ...s, grades: JSON.parse(s.grades) })))
    } catch (error) {
      console.error('Error fetching schools:', error)
      return errorResponse('获取学校列表失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)

/**
 * POST /api/admin/schools
 * 创建新学校
 */
export const POST = withAuth(
  async (req: NextRequest, user) => {
    try {
      const body = await req.json()
      const { name, code, grades, classCount } = body

      if (!name || !code) {
        return errorResponse('缺少必填字段', 400)
      }

      const existingSchoolByName = await prisma.school.findUnique({ where: { name } })
      if (existingSchoolByName) return errorResponse('学校名称已存在', 400)

      const existingSchoolByCode = await prisma.school.findUnique({ where: { code } })
      if (existingSchoolByCode) return errorResponse('学校代码已存在', 400)

      const school = await prisma.school.create({
        data: {
          name,
          code,
          grades: grades ? JSON.stringify(grades) : undefined,
          classCount: classCount ?? undefined
        },
        include: {
          _count: { select: { principals: true, submissions: true } }
        }
      })

      return successResponse({ ...school, grades: JSON.parse(school.grades) }, 201)
    } catch (error) {
      console.error('Error creating school:', error)
      return errorResponse('创建学校失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)
