import { z } from 'zod'
import { query } from '@/lib/api'
import { withSchool } from '@/lib/teacher-management'
import { importWorkbook, writeWorkbook } from '@/lib/teacher-workbook'

export const GET = withSchool(async (req, schoolId) => {
  const { mode } = query(req, z.strictObject({ mode: z.enum(['template', 'export']) }))
  const file = await writeWorkbook(schoolId, mode === 'template')
  return new Response(new Uint8Array(file), { headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="teachers-${mode}.xlsx"`,
    'Cache-Control': 'private, no-store',
  } })
}, { hasQuery: true })

export const POST = withSchool(async (req, schoolId) => {
  const result = await importWorkbook(schoolId, await req.arrayBuffer())
  return Response.json(result, { status: 'errors' in result ? 400 : 200 })
})
