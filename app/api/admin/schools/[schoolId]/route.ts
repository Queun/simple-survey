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
 * 一键删除学校：解绑校长、删除所有提交数据（级联删除答案）、删除学校
 * 使用事务保证原子性
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

      await prisma.$transaction([
        prisma.user.updateMany({
          where: { schoolId: id },
          data: { schoolId: null }
        }),
        prisma.submission.deleteMany({
          where: { schoolId: id }
        }),
        prisma.school.delete({
          where: { id }
        })
      ])

      return successResponse({ message: '学校已删除，相关校长已解绑，提交数据已清除' })
    } catch (error) {
      console.error('Error deleting school:', error)
      return errorResponse('删除学校失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)
