import { body, id } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { slotForm } from '@/lib/teacher-forms'
import { requireTeacher, validateSlots, withSchool } from '@/lib/teacher-management'

export const PUT = withSchool(async (req, schoolId) => {
  const { teacherId, ...slot } = await body(req, slotForm.extend({ teacherId: id.nullable() }))
  await prisma.$transaction(async tx => {
    await validateSlots(tx, schoolId, [slot])
    if (teacherId === null) {
      await tx.teachingAssignment.deleteMany({ where: slot })
    } else {
      await requireTeacher(tx, schoolId, teacherId)
      await tx.teachingAssignment.upsert({
        where: { classId_subjectId: slot }, create: { ...slot, teacherId }, update: { teacherId },
      })
    }
  })
  return Response.json({ ok: true })
})
