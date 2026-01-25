import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, checkPermission, checkSchoolPermission, JWTPayload } from './auth'

/**
 * API路由认证中间件
 * 在API路由中使用来保护需要登录的端点
 */
export function withAuth(
  handler: (req: NextRequest, user: JWTPayload) => Promise<Response>,
  options?: {
    requiredRole?: 'ADMIN' | 'PRINCIPAL'
  }
) {
  return async (req: NextRequest) => {
    const user = getAuthUser(req)

    if (!user) {
      return NextResponse.json(
        { error: '未授权，请先登录' },
        { status: 401 }
      )
    }

    // 检查角色权限
    if (options?.requiredRole && !checkPermission(user, options.requiredRole)) {
      return NextResponse.json(
        { error: '无权限访问' },
        { status: 403 }
      )
    }

    return handler(req, user)
  }
}

/**
 * 检查学校权限的中间件装饰器
 */
export function withSchoolPermission(
  handler: (req: NextRequest, user: JWTPayload, schoolId: number) => Promise<Response>
) {
  return async (req: NextRequest, user: JWTPayload) => {
    // 从URL或请求体中获取schoolId
    const url = new URL(req.url)
    const schoolIdStr = url.searchParams.get('schoolId')

    if (!schoolIdStr) {
      return NextResponse.json(
        { error: '缺少学校ID参数' },
        { status: 400 }
      )
    }

    const schoolId = parseInt(schoolIdStr, 10)
    if (isNaN(schoolId)) {
      return NextResponse.json(
        { error: '无效的学校ID' },
        { status: 400 }
      )
    }

    // 检查学校权限
    if (!checkSchoolPermission(user, schoolId)) {
      return NextResponse.json(
        { error: '无权限访问该学校数据' },
        { status: 403 }
      )
    }

    return handler(req, user, schoolId)
  }
}

/**
 * 简单的错误响应帮助函数
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * 简单的成功响应帮助函数
 */
export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status })
}
