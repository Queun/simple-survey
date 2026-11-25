import { body, param } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { teacherForm } from '@/lib/teacher-forms'
import { requireTeacher, withSchool } from '@/lib/teacher-management'
import { deleteTeacher } from '@/lib/teachers'

export const PUT = withSchool(async (req, schoolId, ctx) => {
  const id = await param(ctx, 'teacherId')
  await requireTeacher(prisma, schoolId, id)
  const data = await body(req, teacherForm)
  await prisma.teacher.update({ where: { id, schoolId }, data })
  return Response.json({ ok: true })
})

export const DELETE = withSchool(async (_, schoolId, ctx) => {
  const id = await param(ctx, 'teacherId')
  await requireTeacher(prisma, schoolId, id)
  await deleteTeacher(id)
  return Response.json({ ok: true })
})
