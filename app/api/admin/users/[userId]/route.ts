import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/response'
import bcrypt from 'bcryptjs'

// GET /api/admin/users/[userId] - 获取用户详情
export const GET = withAuth(
  async (req: NextRequest, user, { params }: { params: Promise<{ userId: string }> }) => {
    try {
      const { userId } = await params
      const userIdNum = parseInt(userId, 10)

      if (isNaN(userIdNum)) {
        return errorResponse('无效的用户ID', 400)
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: {
          id: true,
          username: true,
          role: true,
          schoolId: true,
          school: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          createdAt: true
        }
      })

      if (!targetUser) {
        return errorResponse('用户不存在', 404)
      }

      return successResponse(targetUser)
    } catch (error) {
      console.error('Error fetching user:', error)
      return errorResponse('获取用户详情失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)

// PUT /api/admin/users/[userId] - 更新用户
export const PUT = withAuth(
  async (req: NextRequest, user, { params }: { params: Promise<{ userId: string }> }) => {
    try {
      const { userId } = await params
      const userIdNum = parseInt(userId, 10)

      if (isNaN(userIdNum)) {
        return errorResponse('无效的用户ID', 400)
      }

      const body = await req.json()
      const { username, password, role, schoolId } = body

      // 检查用户是否存在
      const existingUser = await prisma.user.findUnique({
        where: { id: userIdNum }
      })

      if (!existingUser) {
        return errorResponse('用户不存在', 404)
      }

      // 如果修改用户名，检查是否与其他用户冲突
      if (username && username !== existingUser.username) {
        const duplicateUser = await prisma.user.findUnique({
          where: { username }
        })

        if (duplicateUser) {
          return errorResponse('用户名已被使用', 400)
        }
      }

      // 验证角色
      if (role && !['ADMIN', 'PRINCIPAL'].includes(role)) {
        return errorResponse('角色必须是 ADMIN 或 PRINCIPAL', 400)
      }

      // 校长必须绑定学校
      if ((role === 'PRINCIPAL' || existingUser.role === 'PRINCIPAL') && schoolId === null) {
        return errorResponse('校长账号必须绑定学校', 400)
      }

      // 如果指定了学校，检查学校是否存在
      if (schoolId) {
        const school = await prisma.school.findUnique({
          where: { id: schoolId }
        })

        if (!school) {
          return errorResponse('指定的学校不存在', 400)
        }
      }

      // 准备更新数据
      const updateData: any = {}
      if (username) updateData.username = username
      if (role) updateData.role = role
      if (schoolId !== undefined) updateData.schoolId = schoolId
      if (password) {
        // 如果提供了新密码，则加密后更新
        updateData.password = await bcrypt.hash(password, 10)
      }

      // 更新用户
      const updatedUser = await prisma.user.update({
        where: { id: userIdNum },
        data: updateData,
        select: {
          id: true,
          username: true,
          role: true,
          schoolId: true,
          school: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          createdAt: true
        }
      })

      return successResponse(updatedUser)
    } catch (error) {
      console.error('Error updating user:', error)
      return errorResponse('更新用户失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)

// DELETE /api/admin/users/[userId] - 删除用户
export const DELETE = withAuth(
  async (req: NextRequest, user, { params }: { params: Promise<{ userId: string }> }) => {
    try {
      const { userId } = await params
      const userIdNum = parseInt(userId, 10)

      if (isNaN(userIdNum)) {
        return errorResponse('无效的用户ID', 400)
      }

      // 不能删除自己
      if (userIdNum === user.id) {
        return errorResponse('不能删除当前登录的账号', 400)
      }

      // 检查用户是否存在
      const existingUser = await prisma.user.findUnique({
        where: { id: userIdNum }
      })

      if (!existingUser) {
        return errorResponse('用户不存在', 404)
      }

      // 删除用户
      await prisma.user.delete({
        where: { id: userIdNum }
      })

      return successResponse({ message: '用户删除成功' })
    } catch (error) {
      console.error('Error deleting user:', error)
      return errorResponse('删除用户失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)
