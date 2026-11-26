import jwt from 'jsonwebtoken'
import { z } from 'zod'

export const cookieName = 'survey_session'
export const lifetime = 12 * 60 * 60
const identity = z.object({
  id: z.number().int().positive(),
  role: z.enum(['ADMIN', 'PRINCIPAL', 'TEACHER']),
})
export type Identity = z.infer<typeof identity>

function secret() {
  const key = process.env.JWT_SECRET
  if (!key?.trim() || key === 'replace-with-a-random-secret') {
    throw new Error('请设置 JWT_SECRET 环境变量')
  }
  return key
}

export function signSession(user: Identity) {
  return jwt.sign(identity.parse(user), secret(), { algorithm: 'HS256', expiresIn: lifetime })
}

export function readSession(token?: string) {
  const key = secret()
  if (!token) return null
  try {
    return identity.parse(jwt.verify(token, key, { algorithms: ['HS256'] }))
  } catch {
    return null
  }
}
