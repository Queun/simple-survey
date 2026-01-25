import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/response'
import bcrypt from 'bcryptjs'

// GET /api/admin/users - 获取用户列表
export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const role = searchParams.get('role') // 可选：按角色筛选

      const whereCondition: any = {}
      if (role) {
        whereCondition.role = role
      }

      const users = await prisma.user.findMany({
        where: whereCondition,
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return successResponse(users)
    } catch (error) {
      console.error('Error fetching users:', error)
      return errorResponse('获取用户列表失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)

// POST /api/admin/users - 创建新用户
export const POST = withAuth(
  async (req: NextRequest, user) => {
    try {
      const body = await req.json()
      const { username, password, role, schoolId } = body

      // 验证必填字段
      if (!username || !password || !role) {
        return errorResponse('用户名、密码和角色为必填项', 400)
      }

      // 验证角色
      if (!['ADMIN', 'PRINCIPAL'].includes(role)) {
        return errorResponse('角色必须是 ADMIN 或 PRINCIPAL', 400)
      }

      // 校长必须绑定学校
      if (role === 'PRINCIPAL' && !schoolId) {
        return errorResponse('校长账号必须绑定学校', 400)
      }

      // 检查用户名是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { username }
      })

      if (existingUser) {
        return errorResponse('用户名已存在', 400)
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

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10)

      // 创建用户
      const newUser = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          role,
          schoolId: schoolId || null
        },
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

      return successResponse(newUser)
    } catch (error) {
      console.error('Error creating user:', error)
      return errorResponse('创建用户失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)
