import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production'

export interface JWTPayload {
  id: number
  username: string
  role: 'ADMIN' | 'PRINCIPAL'
  schoolId?: number | null
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * 从请求头中提取并验证token
 */
export function getAuthUser(request: NextRequest): JWTPayload | null {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    return verifyToken(token)
  } catch (error) {
    console.error('Auth extraction failed:', error)
    return null
  }
}

/**
 * 检查用户是否有权限访问
 */
export function checkPermission(
  user: JWTPayload | null,
  requiredRole?: 'ADMIN' | 'PRINCIPAL'
): boolean {
  if (!user) return false
  if (!requiredRole) return true

  // Admin可以访问所有资源
  if (user.role === 'ADMIN') return true

  // 检查角色匹配
  return user.role === requiredRole
}

/**
 * 检查用户是否有权限访问特定学校的数据
 */
export function checkSchoolPermission(
  user: JWTPayload | null,
  schoolId: number
): boolean {
  if (!user) return false

  // Admin可以访问所有学校
  if (user.role === 'ADMIN') return true

  // Principal只能访问自己的学校
  if (user.role === 'PRINCIPAL') {
    return user.schoolId === schoolId
  }

  return false
}

/**
 * 高阶函数：为API路由添加认证和权限检查
 */
export function withAuth(
  handler: (req: NextRequest, user: JWTPayload, context?: any) => Promise<Response>,
  options?: { requiredRole?: 'ADMIN' | 'PRINCIPAL' }
) {
  return async (req: NextRequest, context?: any) => {
    const user = getAuthUser(req)

    if (!user) {
      return Response.json({ error: '未授权访问' }, { status: 401 })
    }

    if (options?.requiredRole && !checkPermission(user, options.requiredRole)) {
      return Response.json({ error: '权限不足' }, { status: 403 })
    }

    return handler(req, user, context)
  }
}
