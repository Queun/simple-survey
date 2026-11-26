import { NextRequest } from 'next/server'
import { noQuery } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/response'
import { classOrder } from '@/lib/schools'

export function GET(req: NextRequest) {
  return respond(async () => {
    noQuery(req)
    return Response.json(await prisma.school.findMany({ orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, classes: {
        select: { id: true, grade: true, name: true }, orderBy: classOrder,
      } },
    }))
  })
}
