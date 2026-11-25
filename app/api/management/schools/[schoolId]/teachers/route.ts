import { body } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { teacherForm } from '@/lib/teacher-forms'
import { timetable, withSchool } from '@/lib/teacher-management'

export const GET = withSchool(async (_, schoolId) => {
  const data = await prisma.$transaction(async tx => {
    const school = await tx.school.findUniqueOrThrow({ where: { id: schoolId }, select: { id: true, name: true, code: true } })
    const teachers = await tx.teacher.findMany({ where: { schoolId }, orderBy: [{ name: 'asc' }, { id: 'asc' }], select: {
      id: true, name: true, phone: true, source: true, _count: { select: { assignments: true } },
    } })
    return { school, teachers, ...await timetable(tx, schoolId, true) }
  })
  return Response.json(data)
})

export const POST = withSchool(async (req, schoolId) => {
  const data = await body(req, teacherForm)
  const teacher = await prisma.teacher.create({ data: { ...data, schoolId, source: 'IMPORT' }, select: { id: true } })
  return Response.json(teacher, { status: 201 })
})
