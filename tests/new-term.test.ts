import { execFileSync } from 'node:child_process'
import { NextRequest } from 'next/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { GET as checkPeriod, POST as clear } from '@/app/api/management/schools/[schoolId]/teachers/assignments/clear/route'
import { PUT as saveAssignments } from '@/app/api/teacher/classes/route'
import { prisma } from '@/lib/prisma'
import { cookieName, signSession, type Identity } from '@/lib/session'
import { principalOverview, principalStatistics } from '@/lib/statistics'

const session = (user: Identity) => cookieName + '=' + signSession(user)
const ctx = (schoolId: number | 'mine') => ({ params: Promise.resolve({ schoolId: String(schoolId) }) })
const request = (cookie: string, method: string, body?: unknown) => new NextRequest('http://localhost', {
  method, headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body),
})
const assignments = (schoolId: number) => prisma.teachingAssignment.findMany({ where: { class: { schoolId } }, orderBy: { id: 'asc' } })
const reset = (cookie: string, schoolId: number | 'mine', confirmName?: string) =>
  clear(request(cookie, 'POST', { confirmName }), ctx(schoolId))

describe('S16 新学期清空任课', () => {
  let local: { id: number, name: string }, other: typeof local
  let principal: string, admin: string, teacher: string

  beforeAll(async () => {
    execFileSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], {
      env: { ...process.env, SEED_SUBMISSIONS: '1' }, stdio: 'pipe',
    })
    local = await prisma.school.findUniqueOrThrow({ where: { code: 'CGXX' } })
    other = await prisma.school.findUniqueOrThrow({ where: { code: 'MDCZ' } })
    principal = session(await prisma.user.findUniqueOrThrow({ where: { username: 'principal1' } }))
    admin = session(await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } }))
    const row = await prisma.teacher.findFirstOrThrow({ where: { schoolId: local.id } })
    teacher = session({ id: row.id, role: 'TEACHER' })
  })

  it('学校全称必填且须完全一致；拒绝跨校和教师操作', async () => {
    const before = await assignments(local.id)
    const foreign = await assignments(other.id)
    for (const name of [undefined, other.name, ' ' + local.name]) {
      expect((await reset(principal, 'mine', name)).status).toBe(400)
    }
    expect((await reset(principal, other.id, other.name)).status).toBe(403)
    expect((await reset(teacher, local.id, local.name)).status).toBe(403)
    expect(await assignments(local.id)).toEqual(before)
    expect(await assignments(other.id)).toEqual(foreign)
  })

  it('只提示本校在进行中调研期有答卷的情况', async () => {
    const status = async (id: number) => {
      const response = await checkPeriod(request(admin, 'GET'), ctx(id))
      expect(response.status).toBe(200)
      return response.json()
    }
    expect(await status(local.id)).toEqual({ hasActiveSubmissions: true })
    const empty = await prisma.school.create({ data: { name: '无卷小学', code: 'EMPTY', stage: 'PRIMARY', registrationCode: '123456' } })
    expect(await status(empty.id)).toEqual({ hasActiveSubmissions: false })
    const { id, isActive, startDate, endDate } = await prisma.period.findFirstOrThrow()
    try {
      const now = Date.now()
      for (const change of [
        { isActive: false, startDate, endDate },
        { isActive: true, startDate, endDate: new Date(now - 1000) },
        { isActive: true, startDate: new Date(now + 86400000), endDate },
      ]) {
        await prisma.period.update({ where: { id }, data: change })
        expect(await status(local.id)).toEqual({ hasActiveSubmissions: false })
      }
    } finally {
      await prisma.period.update({ where: { id }, data: { isActive, startDate, endDate } })
    }
  })

  it('清空本校全部任课后看板和教师详情一致，教师可登记原任课；管理员可清空另一校', async () => {
    const before = await assignments(local.id)
    const foreign = await assignments(other.id)
    expect(before.length).toBeGreaterThan(0)
    expect(foreign.length).toBeGreaterThan(0)
    const { teacherId, classId, subjectId } = before[0]
    // 覆盖表按进行期选科，清空还要包含表外的任课。
    const extra = await prisma.subject.create({ data: { name: '表外学科', order: 6 } })
    await prisma.teachingAssignment.create({ data: { teacherId, classId, subjectId: extra.id } })
    const { id: periodId } = await prisma.period.findFirstOrThrow()
    const overview = await principalOverview(local.id, periodId)
    const report = await principalStatistics(local.id, periodId)
    expect(overview.mean).toEqual(expect.any(Number))
    expect(report.teachers.find(t => t.id === teacherId)).toMatchObject({
      mean: expect.any(Number), classes: expect.arrayContaining([expect.objectContaining({ id: classId, mean: expect.any(Number) })]),
    })

    const response = await reset(principal, 'mine', local.name)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ count: before.length + 1 })
    expect(await assignments(local.id)).toEqual([])
    expect(await assignments(other.id)).toEqual(foreign)
    expect(await principalOverview(local.id, periodId)).toEqual(overview)
    expect(await principalStatistics(local.id, periodId)).toEqual(report)
    expect(await (await reset(principal, 'mine', local.name)).json()).toEqual({ count: 0 })

    const owner = session({ id: teacherId, role: 'TEACHER' })
    const save = await saveAssignments(request(owner, 'PUT', { add: [{ classId, subjectId }], remove: [] }), ctx('mine'))
    expect(save.status).toBe(200)
    expect(await assignments(local.id)).toMatchObject([{ teacherId, classId, subjectId }])

    const otherResponse = await reset(admin, other.id, other.name)
    expect(otherResponse.status).toBe(200)
    expect(await otherResponse.json()).toEqual({ count: foreign.length })
    expect(await assignments(other.id)).toEqual([])
    expect(await assignments(local.id)).toHaveLength(1)
  })
})
