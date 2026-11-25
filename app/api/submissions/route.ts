import { NextRequest } from 'next/server'
import { z } from 'zod'
import { body, noQuery } from '@/lib/api'
import { errorResponse, respond } from '@/lib/response'

export function POST(req: NextRequest) {
  return respond(async () => {
    noQuery(req)
    if (req.body) await body(req, z.record(z.string(), z.unknown()))
    return errorResponse('维护中', 503)
  })
}
