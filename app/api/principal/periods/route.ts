import { z } from 'zod'
import { withAuth } from '@/lib/auth'
import { query, urlId } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/response'

export const GET = withAuth('PRINCIPAL', async (req, user) => {
  const { schoolId } = query(req, z.strictObject({ schoolId: urlId.optional() }))
  if (schoolId !== undefined && schoolId !== user.schoolId) return errorResponse('只能访问本校数据', 403)
  const periods = await prisma.period.findMany({ orderBy: { id: 'desc' },
    select: { id: true, name: true, startDate: true, endDate: true, isActive: true },
  })
  return Response.json(periods)
}, { hasQuery: true })
