import { NextRequest } from 'next/server'
import { Context, noQuery, param } from '@/lib/api'
import { respond } from '@/lib/response'
import { readSurvey } from '@/lib/survey'

export function GET(req: NextRequest, ctx: Context) {
  return respond(async () => {
    noQuery(req)
    return Response.json(await readSurvey(await param(ctx, 'periodId')))
  })
}
