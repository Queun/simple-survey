import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { POST } from '@/app/api/submissions/route'
import { GET as survey } from '@/app/api/surveys/[periodId]/route'
import { GET as classSurvey } from '@/app/api/surveys/[periodId]/classes/[classId]/route'
import { allowSubmission } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'

const request = new NextRequest('http://localhost/api/surveys/1')
const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) })
type Answer = { subjectId: number, questionId: number, score: number }
type Payload = { periodId: number, classId: number, answers: Answer[] }

function post(payload: Payload, attemptId: string = randomUUID(), ip = '192.0.2.1') {
  return POST(new NextRequest('http://localhost/api/submissions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attemptId, 'x-forwarded-for': ip },
    body: JSON.stringify(payload),
  }))
}

describe('学生匿名填报（演示种子库）', () => {
  let form: Payload, schoolId: number, otherSubject: number, unassigned: number
  let emptyClassId: number
  beforeAll(async () => {
    execFileSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], { stdio: 'pipe' })
    const period = await prisma.period.findFirstOrThrow()
    const response = await survey(request, ctx({ periodId: String(period.id) }))
    expect(response.status).toBe(200)
    const info = await response.json()
    expect(JSON.stringify(info)).not.toMatch(/teacher|phone|示例教师/i)
    const school = info.schools.find((s: { name: string }) => s.name === '晨光小学')
    schoolId = school.id
    const classId = school.grades[0].classes[0].id
    const assigned = await classSurvey(request, ctx({ periodId: String(period.id), classId: String(classId) }))
    expect(assigned.status).toBe(200)
    const { subjects } = await assigned.json() as { subjects: { id: number, name: string, teacherName: string }[] }
    expect(subjects).toHaveLength(4)
    for (const subject of subjects) {
      expect(Object.keys(subject).sort()).toEqual(['id', 'name', 'teacherName'])
      expect(subject.teacherName).toMatch(/^示例教师/)
    }
    const answers = subjects.flatMap(s => info.questions.map((q: { id: number, options: { score: number }[] }) =>
      ({ subjectId: s.id, questionId: q.id, score: q.options[0].score })))
    form = { periodId: period.id, classId, answers }
    unassigned = info.subjects.find((s: { id: number }) => !subjects.some(a => a.id === s.id)).id
    const empty = await prisma.schoolClass.create({ data: { schoolId, grade: '测试年级', gradeOrder: 9, name: '测试班', order: 1 } })
    emptyClassId = empty.id
    const excluded = await prisma.subject.create({ data: { name: '非本期学科', order: 100 } })
    otherSubject = excluded.id
    const teacher = await prisma.teacher.findFirstOrThrow({ where: { schoolId } })
    await prisma.teachingAssignment.create({ data: { classId, subjectId: otherSubject, teacherId: teacher.id } })
  })

  it('两级公开接口 → 完整提交 → 查库逐条核对；教师、学校和满分取自提交时的配置', async () => {
    const { periodId, classId, answers } = form
    const classCtx = ctx({ periodId: String(periodId), classId: String(classId) })
    expect((await (await classSurvey(request, classCtx)).json()).subjects).toHaveLength(4)
    const subjectId = answers[0].subjectId
    const assignment = await prisma.teachingAssignment.findUniqueOrThrow({ where: { classId_subjectId: { classId, subjectId } } })
    const substitute = await prisma.teacher.findFirstOrThrow({ where: { schoolId, id: { not: assignment.teacherId } } })
    await prisma.teachingAssignment.update({ where: { id: assignment.id }, data: { teacherId: substitute.id } })
    const questionId = answers[0].questionId
    const options = [{ label: '偶尔', score: 1 }, { label: '经常', score: 8 }]
    await prisma.question.update({ where: { id: questionId }, data: { options } })
    const attemptId = randomUUID()
    const forged = { ...form, schoolId: -1, teacherId: -1, maxScore: 999,
      answers: answers.map(a => ({ ...a, teacherId: -1, schoolId: -1, maxScore: 999 })) }
    const res = await post(forged, attemptId)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    const saved = await prisma.submission.findUniqueOrThrow({ where: { attemptId }, include: { answers: true } })
    expect(saved).toMatchObject({ periodId, classId, schoolId })
    const assignments = await prisma.teachingAssignment.findMany({ where: { classId } })
    const expected = answers.map(a => ({ ...a, teacherId: assignments.find(row => row.subjectId === a.subjectId)!.teacherId,
      maxScore: a.questionId === questionId ? 8 : 5 }))
    expect(saved.answers).toHaveLength(20)
    expect(saved.answers)
      .toEqual(expect.arrayContaining(expected.map(a => expect.objectContaining(a))))
    await prisma.teachingAssignment.update({ where: { id: assignment.id }, data: { teacherId: assignment.teacherId } })
    const historical = await prisma.answer.findMany({ where: { submissionId: saved.id, subjectId } })
    expect(historical.every(a => a.teacherId === substitute.id)).toBe(true)
  })

  it.each([
    ['漏答', (a: Answer[]) => a.slice(1)],
    ['多答', (a: Answer[]) => [...a, a[0]]],
    ['等量重复', (a: Answer[]) => [a[1], ...a.slice(1)]],
    ['无此分值', (a: Answer[]) => [{ ...a[0], score: 42 }, ...a.slice(1)]],
    ['非本期学科', (a: Answer[]) => [{ ...a[0], subjectId: otherSubject }, ...a.slice(1)]],
    ['本班此科无任课老师', (a: Answer[]) => [{ ...a[0], subjectId: unassigned }, ...a.slice(1)]],
    ['非本期题目', (a: Answer[]) => [{ ...a[0], questionId: 2147483647 }, ...a.slice(1)]],
  ] as const)('拒绝%s，整份不落库', async (_, change) => {
    const count = await prisma.answer.count()
    const attemptId = randomUUID()
    expect((await post({ ...form, answers: change(form.answers) }, attemptId)).status).toBe(400)
    expect(await prisma.submission.findUnique({ where: { attemptId } })).toBeNull()
    expect(await prisma.answer.count()).toBe(count)
  })

  it('拒绝空班、无效班级与不存在的调研期', async () => {
    const res = await classSurvey(request, ctx({ periodId: String(form.periodId), classId: String(emptyClassId) }))
    expect(await res.json()).toEqual({ subjects: [] })
    expect((await post({ ...form, classId: emptyClassId })).status).toBe(400)
    expect((await post({ ...form, classId: 2147483647 })).status).toBe(404)
    expect((await post({ ...form, periodId: 2147483647 })).status).toBe(404)
  })

  it.each(['关闭', '过期', '未开始'])('%s的调研期不允许读取或提交', async state => {
    const offset = state === '过期' ? -3 : state === '未开始' ? 2 : -1
    const startDate = new Date(Date.now() + offset * 86400000)
    const period = await prisma.period.create({ data: { name: state, isActive: state !== '关闭', startDate,
      endDate: new Date(+startDate + 2 * 86400000) } })
    const context = ctx({ periodId: String(period.id), classId: String(form.classId) })
    expect((await survey(request, context)).status).toBe(403)
    expect((await classSurvey(request, context)).status).toBe(403)
    expect((await post({ ...form, periodId: period.id })).status).toBe(403)
  })

  it('同一 attemptId 并发和关闭后重试幂等，同一出口下一位同学可提交', async () => {
    const attemptId = randomUUID()
    const before = await prisma.submission.count()
    const calls = await Promise.all([post(form, attemptId), post(form, attemptId)])
    for (const res of calls) {
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ success: true })
    }
    expect(await prisma.submission.count()).toBe(before + 1)
    await prisma.period.update({ where: { id: form.periodId }, data: { isActive: false } })
    expect((await post(form, attemptId)).status).toBe(200)
    await prisma.period.update({ where: { id: form.periodId }, data: { isActive: true } })
    expect((await post(form)).status).toBe(200)
    expect(await prisma.submission.count()).toBe(before + 2)
  })

  it('提交接口共享出口第 121 次返回 429，其他出口仍可提交', async () => {
    const attemptId = randomUUID()
    for (let i = 0; i < 120; i++) expect((await post(form, attemptId, '192.0.2.2')).status).toBe(200)
    expect((await post(form, randomUUID(), '192.0.2.2')).status).toBe(429)
    expect((await post(form, randomUUID(), '192.0.2.3')).status).toBe(200)
  })

  it('滑动窗口按一分钟前的请求逐次释放', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.0.2.4' })
    const now = Date.now()
    expect(allowSubmission(headers, now)).toBe(true)
    for (let i = 1; i < 120; i++) expect(allowSubmission(headers, now + 1000)).toBe(true)
    expect(allowSubmission(headers, now + 59_999)).toBe(false)
    expect(allowSubmission(headers, now + 60_000)).toBe(true)
    expect(allowSubmission(headers, now + 60_000)).toBe(false)
  })
})
