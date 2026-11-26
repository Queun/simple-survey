import { NextRequest } from 'next/server'
import { z } from 'zod'
import { RequestError } from './response'

export type Context = { params: Promise<Record<string, string>> }
export const id = z.number().int().positive().max(2147483647)
export const urlId = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(id)
export const name = z.string().trim().min(1)
const empty = z.strictObject({})

export function query<S extends z.ZodType>(req: NextRequest, schema: S) {
  const params = req.nextUrl.searchParams
  if (new Set(params.keys()).size !== params.size) throw new RequestError('查询参数不能重复')
  return schema.parse(Object.fromEntries(params)) as z.output<S>
}

export async function body<S extends z.ZodType>(req: NextRequest, schema: S) {
  let value: unknown
  try { value = await req.json() } catch { throw new RequestError('请求体必须是有效的 JSON') }
  return schema.parse(value) as z.output<S>
}

// 浏览器发 POST/DELETE 时即使没有内容也可能带一个空的请求体流，空白内容视为没有请求体
export async function emptyBody(req: NextRequest) {
  const text = await req.text()
  if (!text.trim()) return
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new RequestError('请求体必须是有效的 JSON') }
  empty.parse(value)
}

export function noQuery(req: NextRequest) { query(req, empty) }

export async function param(context: Context, key: string) {
  return urlId.parse((await context.params)[key])
}
