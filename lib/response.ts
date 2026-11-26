import { Prisma } from '@prisma/client'
import { z } from 'zod'

export class RequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message) }
}

export function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function respond(action: () => Promise<Response>) {
  try {
    return await action()
  } catch (error) {
    if (error instanceof RequestError) return errorResponse(error.message, error.status)
    if (error instanceof z.ZodError) {
      const issue = error.issues[0]
      const field = issue.path.join('.')
      return errorResponse(`请求参数有误${field ? '（' + field + '）' : ''}，请检查输入`)
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return errorResponse('记录重复，请检查名称、代码或编号', 409)
      if (error.code === 'P2003') return errorResponse('关联记录不存在或仍在使用，请检查后重试', 400)
      if (error.code === 'P2025') return errorResponse('记录不存在', 404)
    }
    console.error(error)
    return errorResponse('服务暂时不可用', 500)
  }
}
