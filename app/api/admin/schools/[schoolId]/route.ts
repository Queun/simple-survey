import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/response'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/schools/[schoolId]
 * 获取单个学校详情
 */
export const GET = withAuth(
  async (req: NextRequest, user, { params }: { params: Promise<{ schoolId: string }> }) => {
    try {
      const { schoolId } = await params
      const id = parseInt(schoolId, 10)

      if (isNaN(id)) {
        return errorResponse('无效的学校ID', 400)
      }

      const school = await prisma.school.findUnique({
        where: { id },
        include: {
          principals: {
            select: {
              id: true,
              username: true
            }
          },
          _count: {
            select: {
              principals: true,
              submissions: true
            }
          }
        }
      })

      if (!school) {
        return errorResponse('学校不存在', 404)
      }

      return successResponse({ ...school, grades: JSON.parse(school.grades) })
    } catch (error) {
      console.error('Error fetching school:', error)
      return errorResponse('获取学校信息失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)

/**
 * PUT /api/admin/schools/[schoolId]
 * 更新学校信息
 */
export const PUT = withAuth(
  async (req: NextRequest, user, { params }: { params: Promise<{ schoolId: string }> }) => {
    try {
      const { schoolId } = await params
      const id = parseInt(schoolId, 10)

      if (isNaN(id)) {
        return errorResponse('无效的学校ID', 400)
      }

      const body = await req.json()
      const { name, code, grades, classCount } = body

      if (!name || !code) {
        return errorResponse('缺少必填字段', 400)
      }

      const existingSchool = await prisma.school.findUnique({ where: { id } })
      if (!existingSchool) return errorResponse('学校不存在', 404)

      const schoolWithSameName = await prisma.school.findUnique({ where: { name } })
      if (schoolWithSameName && schoolWithSameName.id !== id) return errorResponse('学校名称已存在', 400)

      const schoolWithSameCode = await prisma.school.findUnique({ where: { code } })
      if (schoolWithSameCode && schoolWithSameCode.id !== id) return errorResponse('学校代码已存在', 400)

      const school = await prisma.school.update({
        where: { id },
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

      return successResponse({ ...school, grades: JSON.parse(school.grades) })
    } catch (error) {
      console.error('Error updating school:', error)
      return errorResponse('更新学校信息失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)

/**
 * DELETE /api/admin/schools/[schoolId]
 * 删除学校
 */
export const DELETE = withAuth(
  async (req: NextRequest, user, { params }: { params: Promise<{ schoolId: string }> }) => {
    try {
      const { schoolId } = await params
      const id = parseInt(schoolId, 10)

      if (isNaN(id)) {
        return errorResponse('无效的学校ID', 400)
      }

      const existingSchool = await prisma.school.findUnique({
        where: { id }
      })

      if (!existingSchool) {
        return errorResponse('学校不存在', 404)
      }

      const submissionCount = await prisma.submission.count({
        where: { schoolId: id }
      })

      if (submissionCount > 0) {
        return errorResponse('该学校已有提交数据，无法删除', 400)
      }

      const principalCount = await prisma.user.count({
        where: { schoolId: id, role: 'PRINCIPAL' }
      })

      if (principalCount > 0) {
        return errorResponse('该学校已有绑定的校长账号，无法删除', 400)
      }

      await prisma.school.delete({
        where: { id }
      })

      return successResponse({ message: '删除成功' })
    } catch (error) {
      console.error('Error deleting school:', error)
      return errorResponse('删除学校失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)
