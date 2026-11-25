import { NextRequest } from 'next/server'
import { z } from 'zod'
import { body, id, noQuery } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { allowSubmission } from '@/lib/rate-limit'
import { errorResponse, RequestError, respond } from '@/lib/response'
import { assignedInPeriod, assertOpen, surveyOptions } from '@/lib/survey'

const submission = z.object({
  periodId: id, classId: id,
  answers: z.array(z.object({ subjectId: id, questionId: id, score: z.int32() })).min(1),
})

export function POST(req: NextRequest) {
  return respond(async () => {
    if (!allowSubmission(req.headers)) return errorResponse('提交过于频繁，请稍后再试', 429)
    noQuery(req)
    const { periodId, classId, answers } = await body(req, submission)
    const attemptId = z.uuid().parse(req.headers.get('Idempotency-Key')).toLowerCase()

    await prisma.$transaction(async tx => {
      if (await tx.submission.findUnique({ where: { attemptId }, select: { id: true } })) return
      const period = await tx.period.findUniqueOrThrow({ where: { id: periodId }, select: {
        isActive: true, startDate: true, endDate: true, questions: { select: { id: true, options: true } },
      } })
      assertOpen(period)
      const group = await tx.schoolClass.findUniqueOrThrow({ where: { id: classId }, select: { schoolId: true } })
      const assignments = await tx.teachingAssignment.findMany({ where: assignedInPeriod(periodId, classId),
        select: { subjectId: true, teacherId: true } })
      if (!assignments.length) throw new RequestError('本班暂未登记任课老师，请联系老师')
      if (!period.questions.length || answers.length !== assignments.length * period.questions.length) {
        throw new RequestError('请完成本班全部学科的所有题目，如问卷已更新请重新进入填写')
      }
      const teachers = new Map(assignments.map(a => [a.subjectId, a.teacherId]))
      const questions = new Map(period.questions.map(q => {
        const scores = surveyOptions.parse(q.options).map(o => o.score)
        return [q.id, { scores: new Set(scores), maxScore: Math.max(...scores) }]
      }))
      const seen = new Set<string>()
      const rows = answers.map(({ subjectId, questionId, score }) => {
        const teacherId = teachers.get(subjectId)
        const question = questions.get(questionId)
        if (!teacherId || !question) throw new RequestError('学科、任课或题目已变更，请重新进入填写')
        const key = subjectId + '/' + questionId
        if (seen.has(key)) throw new RequestError('同一学科的题目不能重复作答')
        seen.add(key)
        if (!question.scores.has(score)) throw new RequestError('分值不属于该题的选项')
        return { subjectId, questionId, score, teacherId, maxScore: question.maxScore }
      })
      await tx.submission.create({ data: { periodId, classId, schoolId: group.schoolId, attemptId,
        answers: { createMany: { data: rows } } }, select: { id: true } })
    })
    return Response.json({ success: true })
  })
}
