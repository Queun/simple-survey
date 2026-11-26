import { execFileSync } from 'node:child_process'
import ExcelJS from 'exceljs'
import { NextRequest } from 'next/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { POST as backendLogin } from '@/app/api/auth/login/route'
import { POST as login } from '@/app/api/teacher/login/route'
import { POST as register } from '@/app/api/teacher/register/route'
import * as own from '@/app/api/teacher/classes/route'
import { GET as adminSchools } from '@/app/api/admin/schools/route'
import { GET as principalPeriods } from '@/app/api/principal/periods/route'
import * as management from '@/app/api/management/schools/[schoolId]/teachers/route'
import * as teacherItem from '@/app/api/management/schools/[schoolId]/teachers/[teacherId]/route'
import { PUT as assign } from '@/app/api/management/schools/[schoolId]/teachers/assignments/route'
import * as workbook from '@/app/api/management/schools/[schoolId]/teachers/workbook/route'
import type { ManagementData } from '@/components/teacher-data'
import { prisma } from '@/lib/prisma'
import { proxy } from '@/proxy'

function req(method = 'GET', payload?: unknown, cookie = '', ip = 'test-local', path = '/') {
  return new NextRequest('http://localhost' + path, { method, headers: { cookie, 'x-forwarded-for': ip }, body: JSON.stringify(payload) })
}
const ctx = (schoolId: number | 'mine' = 'mine', teacherId = 1) => ({
  params: Promise.resolve({ schoolId: String(schoolId), teacherId: String(teacherId) }),
})
function cookie(res: Response) {
  expect(res.ok).toBe(true)
  expect(res.headers.get('set-cookie')).toMatch(/HttpOnly/i)
  return res.headers.get('set-cookie')!.split(';')[0]
}

describe('S3 种子学校教师采集', () => {
  let principal: string, admin: string, schoolId: number, otherSchool: number
  const account = { name: '自助登记', phone: '13800000001' }
  const seedTeacher = { name: '示例教师1', phone: '19900000001' }
  const list = async () => {
    const res = await management.GET(req('GET', undefined, principal), ctx())
    expect(res.status).toBe(200)
    return await res.json() as ManagementData
  }
  beforeAll(async () => {
    execFileSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], { stdio: 'pipe' })
    schoolId = (await prisma.school.findUniqueOrThrow({ where: { code: 'CGXX' } })).id
    otherSchool = (await prisma.school.findUniqueOrThrow({ where: { code: 'MDCZ' } })).id
    const signIn = (username: string) => backendLogin(req('POST', { username, password: 'SchoolDemo2026' }))
    principal = cookie(await signIn('principal1'))
    admin = cookie(await signIn('admin'))
  })

  it('注册、重复手机号、登录、取消、并发登记冲突、跨角色访问和失效会话', async () => {
    const registration = await register(req('POST', { ...account, schoolId }))
    expect(registration.status).toBe(201)
    cookie(registration)
    const duplicate = await register(req('POST', { ...account, schoolId: otherSchool }))
    expect(duplicate.status).toBe(409)
    expect(await duplicate.json()).toEqual({ error: '该手机号已登记，请直接登录' })
    expect((await register(req('POST', { ...account, phone: '123', schoolId }))).status).toBe(400)
    const teacher = await prisma.teacher.findUniqueOrThrow({ where: { phone: account.phone } })
    expect(teacher).toMatchObject({ schoolId, source: 'SELF' })
    const token = cookie(await login(req('POST', account)))
    const self = await own.GET(req('GET', undefined, token), ctx())
    expect(await self.json()).toMatchObject({ teacher: { name: account.name, school: { name: '晨光小学' } } })
    for (const route of [adminSchools, principalPeriods, management.GET]) {
      expect((await route(req('GET', undefined, token), ctx())).status).toBe(403)
    }
    expect(proxy(req('GET', undefined, token, '', '/teacher?school=CGXX')).headers.get('location')).toBe('http://localhost/teacher/classes')
    expect(proxy(req('GET', undefined, '', '', '/teacher/classes')).headers.get('location')).toBe('http://localhost/teacher')
    const data = await list()
    const [group] = data.classes
    const slot = { classId: group.id, subjectId: data.subjects[0].id }
    const occupied = { classId: group.id, subjectId: group.assignments[0].subjectId }
    const save = (who: string, add: typeof slot[], remove: typeof slot[]) =>
      own.PUT(req('PUT', { add, remove }, who), ctx())
    const second = cookie(await login(req('POST', seedTeacher)))
    const results = await Promise.all([save(token, [slot], []), save(second, [slot], [])])
    expect(results.map(r => r.status).sort()).toEqual([200, 409])
    expect((await results.find(r => r.status === 409)!.json()).error).toMatch(/已由.+登记/)
    const winner = results[0].ok ? token : second
    const conflict = await save(winner, [occupied], [slot])
    expect(conflict.status).toBe(409)
    expect(await prisma.teachingAssignment.count({ where: slot })).toBe(1)
    expect((await save(winner, [], [slot])).status).toBe(200)
    expect(await prisma.teachingAssignment.count({ where: slot })).toBe(0)
    const foreign = await prisma.schoolClass.findFirstOrThrow({ where: { schoolId: otherSchool } })
    expect((await save(token, [{ ...slot, classId: foreign.id }], [])).status).toBe(403)
    await prisma.teacher.delete({ where: { id: teacher.id } })
    expect((await own.GET(req('GET', undefined, token), ctx())).status).toBe(401)
  })

  it('未知手机号和姓名不符的提示相同；按手机号或 IP 独立锁定 15 分钟', async () => {
    const failed = (phone: string, ip: string) => login(req('POST', { name: '错误姓名', phone }, '', ip))
    const unknown = await failed('13800000999', 'unknown-ip')
    expect(unknown.status).toBe(401)
    const wrong = await failed(seedTeacher.phone, 'wrong-name')
    expect(wrong.status).toBe(401)
    expect(await wrong.json()).toEqual(await unknown.json())
    const start = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(start)
    try {
      for (let i = 0; i < 4; i++) {
        const res = await failed(seedTeacher.phone, 'separate-ip-' + i)
        expect(res.status).toBe(i === 3 ? 429 : 401)
      }
      clock.mockReturnValue(start + 15 * 60_000 - 1)
      expect((await login(req('POST', seedTeacher, '', 'fresh-ip'))).status).toBe(429)
      clock.mockReturnValue(start + 15 * 60_000 + 1)
      expect((await login(req('POST', seedTeacher, '', 'fresh-ip'))).status).toBe(200)
      for (let i = 0; i < 30; i++) expect((await failed('13811' + String(i).padStart(6, '0'), 'shared-ip')).status).toBe(i === 29 ? 429 : 401)
      expect((await login(req('POST', seedTeacher, '', 'shared-ip'))).status).toBe(429)
      expect((await login(req('POST', seedTeacher, '', 'another-ip'))).status).toBe(200)
    } finally { clock.mockRestore() }
  })

  it('校长按校维护名单、指定改派清空；管理员可管理两校', async () => {
    const local = await list()
    const foreign = await prisma.teacher.findFirstOrThrow({ where: { schoolId: otherSchool } })
    const input = { name: '后台新增', phone: '13800000003' }
    const create = await management.POST(req('POST', input, principal), ctx())
    expect(create.status).toBe(201)
    const { id } = await create.json()
    expect((await teacherItem.PUT(req('PUT', { ...input, name: '修改姓名' }, principal), ctx(schoolId, id))).status).toBe(200)
    expect((await list()).teachers.find(t => t.id === id)).toMatchObject({ name: '修改姓名', source: 'IMPORT' })
    for (const result of [
      await management.GET(req('GET', undefined, principal), ctx(otherSchool)),
      await management.POST(req('POST', input, principal), ctx(otherSchool)),
      await teacherItem.PUT(req('PUT', input, principal), ctx(schoolId, foreign.id)),
      await teacherItem.DELETE(req('DELETE', undefined, principal), ctx(schoolId, foreign.id)),
      await workbook.GET(req('GET', undefined, principal, '', '/?mode=export'), ctx(otherSchool)),
    ]) expect(result.status).toBe(403)
    for (const school of [schoolId, otherSchool]) expect((await management.GET(req('GET', undefined, admin), ctx(school))).status).toBe(200)
    const slot = { classId: local.classes[0].id, subjectId: local.subjects[0].id }
    const set = (teacherId: number | null) => assign(req('PUT', { ...slot, teacherId }, principal), ctx())
    expect((await set(foreign.id)).status).toBe(403)
    for (const teacherId of [id, local.teachers[0].id, null]) {
      expect((await set(teacherId)).status).toBe(200)
      const row = await prisma.teachingAssignment.findUnique({ where: { classId_subjectId: slot } })
      expect(row?.teacherId ?? null).toBe(teacherId)
    }
    expect((await teacherItem.DELETE(req('DELETE', undefined, principal), ctx(schoolId, id))).status).toBe(200)
  })

  async function download(mode: 'template' | 'export') {
    const res = await workbook.GET(req('GET', undefined, principal, '', '/?mode=' + mode), ctx())
    expect(res.status).toBe(200)
    const book = new ExcelJS.Workbook()
    await book.xlsx.load(await res.arrayBuffer())
    return book
  }
  async function upload(book: ExcelJS.Workbook) {
    const buffer = await book.xlsx.writeBuffer()
    return workbook.POST(new NextRequest('http://localhost', {
      method: 'POST', headers: { cookie: principal }, body: new Uint8Array(buffer),
    }), ctx())
  }
  const snapshot = async () => ({
    teachers: await prisma.teacher.findMany({ where: { schoolId }, orderBy: { id: 'asc' } }),
    assignments: await prisma.teachingAssignment.findMany({ where: { class: { schoolId } }, orderBy: { id: 'asc' } }),
  })

  it('按模板导入，逐行列全错误且整体不写；修正后覆盖数从 84/90 到 86/90，复用已有教师', async () => {
    const before = await snapshot()
    const base = await list()
    expect(base.classes.length * base.subjects.length).toBe(90)
    expect(before.assignments.length).toBe(84)
    const book = await download('template')
    const sheet = book.worksheets[0]
    expect(sheet.getRow(1).values).toEqual([, '姓名', '手机号', '年级', '班级', '学科'])
    const good = ['导入老师', '13800000005', '一年级', '1班', '语文']
    sheet.addRows([
      good,
      ['同号甲', '13800000006', '七年级', '9班', '不存在'],
      ['同号乙', '13800000006'],
      ['坏号码', '12345'],
      ['示例教师1', '19900010001'],
      ['新老师', '13800000007', '一年级', '1班', '数学'],
      ['文件重复', '13800000008', '二年级', '1班', '英语'],
      ['文件重复', '13800000008', '二年级', '1班', '英语'],
      ['不同名', seedTeacher.phone],
      ['缺列', '13800000998', '一年级'],
    ])
    const bad = await upload(book)
    expect(bad.status).toBe(400)
    const { errors } = await bad.json() as { errors: {row: number, reason: string}[] }
    expect(errors.map(e => e.row)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11])
    const reasons = errors.map(e => e.reason)
    for (const cause of ['不同姓名', '年级不存在', '班级不存在', '学科不存在']) expect(reasons[0]).toContain(cause)
    for (const [i, cause] of ['不同姓名', '手机号格式', '其他学校', '其他教师', '文件内班级学科重复', '文件内班级学科重复', '已登记姓名不同', '学科不存在'].entries()) {
      expect(reasons[i + 1]).toContain(cause)
    }
    expect(await snapshot()).toEqual(before)
    const fixed = await download('template')
    fixed.worksheets[0].addRows([good, [seedTeacher.name, Number(seedTeacher.phone), '二年级', '1班', '英语'], ['待分配', '13800000009']])
    const res = await upload(fixed)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ rows: 3, createdTeachers: 2, addedAssignments: 2 })
    const after = await list()
    expect(after.classes.reduce((n, c) => n + c.assignments.length, 0)).toBe(86)
    expect(after.teachers.find(t => t.phone === seedTeacher.phone)?.id).toBe(base.teachers.find(t => t.phone === seedTeacher.phone)?.id)
    const exported = await download('export')
    const state = await snapshot()
    expect(exported.worksheets[0].rowCount).toBe(1 + 86 + 1)
    expect((await upload(exported)).status).toBe(200)
    expect(await snapshot()).toEqual(state)
    // Reconstruct an empty timetable from the exported workbook as well.
    await prisma.teachingAssignment.deleteMany({ where: { class: { schoolId } } })
    expect((await upload(exported)).status).toBe(200)
    const rows = (book: ExcelJS.Workbook) => book.worksheets[0].getSheetValues()
    expect(rows(await download('export'))).toEqual(rows(exported))
  })

  it('有历史评价的教师通过管理接口删除时返回 409，任课和答卷仍保留', async () => {
    const [assignment] = await prisma.teachingAssignment.findMany({ where: { class: { schoolId } }, take: 1 })
    const question = await prisma.question.findFirstOrThrow()
    const submission = await prisma.submission.create({ data: {
      periodId: question.periodId, schoolId, classId: assignment.classId, answers: { create: {
        teacherId: assignment.teacherId, subjectId: assignment.subjectId, questionId: question.id, score: 4, maxScore: 5,
      } },
    } })
    const res = await teacherItem.DELETE(req('DELETE', undefined, principal), ctx(schoolId, assignment.teacherId))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('已有评价记录')
    expect(await prisma.teachingAssignment.count({ where: { id: assignment.id } })).toBe(1)
    expect(await prisma.answer.count({ where: { submissionId: submission.id, teacherId: assignment.teacherId } })).toBe(1)
  })

  it('覆盖表按进行中的调研期选科，关闭后列全部学科', async () => {
    const extra = await prisma.subject.create({ data: { name: '音乐', order: 6 } })
    expect((await list()).subjects.some(s => s.id === extra.id)).toBe(false)
    await prisma.period.updateMany({ data: { isActive: false } })
    expect((await list()).subjects.some(s => s.id === extra.id)).toBe(true)
  })
})
