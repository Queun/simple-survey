import { beforeAll, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { cookieName, lifetime, signSession } from '@/lib/session'
import { POST as login } from '@/app/api/auth/login/route'
import { POST as logout } from '@/app/api/auth/logout/route'
import { GET as schools, POST as createSchool } from '@/app/api/admin/schools/route'
import { PUT as editSchool } from '@/app/api/admin/schools/[schoolId]/route'
import { GET as classes } from '@/app/api/admin/schools/[schoolId]/classes/route'
import { GET as subjects } from '@/app/api/admin/subjects/route'
import { GET as periods } from '@/app/api/admin/periods/route'
import { GET as principalPeriods } from '@/app/api/principal/periods/route'
import { GET as accounts } from '@/app/api/admin/users/route'
import { POST as submit } from '@/app/api/submissions/route'
import { deleteTeacher } from '@/lib/teachers'
import { proxy } from '@/proxy'

import * as subjectList from '@/app/api/admin/subjects/route'
import * as subjectItem from '@/app/api/admin/subjects/[subjectId]/route'
import * as periodList from '@/app/api/admin/periods/route'
import * as periodItem from '@/app/api/admin/periods/[periodId]/route'
import * as questionList from '@/app/api/admin/periods/[periodId]/questions/route'
import * as questionItem from '@/app/api/admin/periods/[periodId]/questions/[questionId]/route'
import { PATCH as reorder } from '@/app/api/admin/periods/[periodId]/questions/reorder/route'
import * as userList from '@/app/api/admin/users/route'
import * as userItem from '@/app/api/admin/users/[userId]/route'

function request(path: string, cookie = '', method = 'GET', payload?: unknown) {
  return new NextRequest(new URL(path, 'http://localhost'), {
    method, headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
}
const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) })

describe('后台会话和学校范围', () => {
  let admin: string, principal: string, schoolId: number, principalId: number
  beforeAll(async () => {
    const school = await prisma.school.create({ data: {
      name: '权限小学', code: 'AUTH', stage: 'PRIMARY', classes: { create: { name: '1班', order: 1, grade: '一年级', gradeOrder: 1 } },
    } })
    schoolId = school.id
    const password = await bcrypt.hash('test-password', 4)
    for (const role of ['ADMIN', 'PRINCIPAL'] as const) {
      const user = await prisma.user.create({ data: { username: role, password, role, schoolId: role === 'ADMIN' ? null : schoolId } })
      const res = await login(request('/api/auth/login', '', 'POST', { username: role, password: 'test-password' }))
      expect(res.status).toBe(200)
      const header = res.headers.get('set-cookie')!
      expect(header).toMatch(/HttpOnly/i)
      expect(header).toMatch(/SameSite=Lax/i)
      expect(header).toContain('Max-Age=' + lifetime)
      expect(await res.json()).toEqual({ user: { id: user.id, role, username: role, schoolId: user.schoolId } })
      if (role === 'ADMIN') admin = header.split(';')[0]
      else { principal = header.split(';')[0]; principalId = user.id }
    }
  })

  it('管理员通过登录 cookie 列出学校、班级、学科和调研期', async () => {
    const response = await schools(request('/api/admin/schools', admin), ctx())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(expect.arrayContaining([expect.objectContaining({ id: schoolId })]))
    const list = await classes(request('/api/admin/schools/' + schoolId + '/classes', admin), ctx({ schoolId: String(schoolId) }))
    expect(await list.json()).toMatchObject([{ grade: '一年级', name: '1班' }])
    for (const route of [subjects, periods]) expect((await route(request('/', admin), ctx())).status).toBe(200)
  })

  it('未登录 401，校长及教师访问管理员接口 403', async () => {
    expect((await schools(request('/api/admin/schools'), ctx())).status).toBe(401)
    expect((await schools(request('/', principal), ctx())).status).toBe(403)
    const teacher = cookieName + '=' + signSession({ id: 1, role: 'TEACHER' })
    expect((await schools(request('/', teacher), ctx())).status).toBe(403)
  })

  it('校长访问本校成功，访问别校 403，解绑后旧 cookie 也无法访问', async () => {
    const read = (id: number) => principalPeriods(request('/api/principal/periods?schoolId=' + id, principal), ctx())
    expect((await read(schoolId)).status).toBe(200)
    expect((await read(schoolId + 1)).status).toBe(403)
    await prisma.user.update({ where: { id: principalId }, data: { schoolId: null } })
    expect((await read(schoolId)).status).toBe(403)
    await prisma.user.update({ where: { id: principalId }, data: { schoolId } })
  })

  it('页面按角色跳转，登出清除 cookie', async () => {
    expect(proxy(request('/admin/schools')).headers.get('location')).toBe('http://localhost/login')
    expect(proxy(request('/admin/schools', principal)).headers.get('location')).toBe('http://localhost/principal')
    expect(proxy(request('/admin/schools', admin)).headers.get('x-middleware-next')).toBe('1')
    // 共用电脑上已有会话时，登录页仍要能打开，换角色登录
    expect(proxy(request('/login', principal)).headers.get('x-middleware-next')).toBe('1')
    const res = await logout(request('/api/auth/logout', admin, 'POST'))
    expect(res.headers.get('set-cookie')).toMatch(/survey_session=;/)
    // 浏览器可能带一个空的请求体，不能当成非法 JSON
    const emptyBodyReq = new NextRequest('http://localhost/api/auth/logout', { method: 'POST', headers: { cookie: admin }, body: '' })
    expect((await logout(emptyBodyReq)).status).toBe(200)
    const junk = new NextRequest('http://localhost/api/auth/logout', { method: 'POST', headers: { cookie: admin }, body: '{"x":1}' })
    expect((await logout(junk)).status).toBe(400)
  })

  it('非法请求体、路径及查询参数返回中文 400', async () => {
    const responses = [
      await login(request('/', '', 'POST', { username: true })),
      await createSchool(request('/', admin, 'POST', {}), ctx()),
      await accounts(request('/?role=student', admin), ctx()),
      await accounts(request('/?role=ADMIN&role=ADMIN', admin), ctx()),
      await periods(request('/?unknown=1', admin), ctx()),
      await classes(request('/', admin), ctx({ schoolId: '1a' })),
      await submit(request('/', '', 'POST', {})),
      await submit(new NextRequest('http://localhost', { method: 'POST', body: '{' })),
    ]
    for (const res of responses) {
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/[\u4e00-\u9fff]/)
    }
  })

  it('学科、调研期、题目配置可保存并读回，修改失败时保留旧选科', async () => {
    const call = (method: string, payload?: unknown) => request('/', admin, method, payload)
    const created = await subjectList.POST(call('POST', { name: '美术', order: 3 }), ctx())
    expect(created.status).toBe(201)
    const subject = await created.json()
    const subjectCtx = ctx({ subjectId: String(subject.id) })
    expect((await subjectItem.PUT(call('PUT', { name: '艺术', order: 2 }), subjectCtx)).status).toBe(200)

    const data = { name: '新调研', subjectIds: [subject.id], startDate: '2026-11-01', endDate: '2026-11-30' }
    const period = await (await periodList.POST(call('POST', data), ctx())).json()
    const periodCtx = ctx({ periodId: String(period.id) })
    expect(period.subjects).toMatchObject([{ name: '艺术' }])
    expect((await periodItem.PUT(call('PUT', { ...data, name: '已修改' }), periodCtx)).status).toBe(200)
    expect((await periodItem.PUT(call('PUT', { ...data, subjectIds: [2147483647] }), periodCtx)).status).toBe(400)
    expect(await (await periodItem.GET(call('GET'), periodCtx)).json()).toMatchObject({
      name: '已修改', subjects: [{ id: subject.id }],
    })
    expect((await (await periodItem.PATCH(call('PATCH', { isActive: false }), periodCtx)).json()).isActive).toBe(false)
    expect((await subjectItem.DELETE(call('DELETE'), subjectCtx)).status).toBe(400)

    const questionData = { content: '讲解清楚', options: [{ label: '同意', score: 5 }, { label: '一般', score: 3 }] }
    const first = await (await questionList.POST(call('POST', questionData), periodCtx)).json()
    const second = await (await questionList.POST(call('POST', { ...questionData, content: '作业反馈及时' }), periodCtx)).json()
    const questionCtx = ctx({ periodId: String(period.id), questionId: String(first.id) })
    expect((await questionItem.PUT(call('PUT', { ...questionData, content: '鼓励提问' }), questionCtx)).status).toBe(200)
    expect((await reorder(call('PATCH', { questionIds: [first.id] }), periodCtx)).status).toBe(400)
    expect((await reorder(call('PATCH', { questionIds: [second.id, first.id] }), periodCtx)).status).toBe(200)
    expect(await (await questionList.GET(call('GET'), periodCtx)).json()).toMatchObject([
      { id: second.id, order: 1 }, { content: '鼓励提问', order: 2, options: questionData.options },
    ])
    expect((await questionItem.DELETE(call('DELETE'), questionCtx)).status).toBe(200)
    expect((await periodItem.DELETE(call('DELETE'), periodCtx)).status).toBe(200)
    expect((await subjectItem.DELETE(call('DELETE'), subjectCtx)).status).toBe(200)
  })

  it('创建、修改和删除校长账号，接口不返回密码，删除后旧会话失效', async () => {
    const created = await userList.POST(request('/', admin, 'POST', {
      role: 'PRINCIPAL', username: '新校长', password: 'temporary', schoolId,
    }), ctx())
    expect(created.status).toBe(201)
    const account = await created.json()
    expect(account).not.toHaveProperty('password')
    const key = ctx({ userId: String(account.id) })
    const edit = await userItem.PUT(request('/', admin, 'PUT', { password: 'updated' }), key)
    expect(edit.status).toBe(200)
    const res = await login(request('/', '', 'POST', { username: account.username, password: 'updated' }))
    expect(res.status).toBe(200)
    const cookie = res.headers.get('set-cookie')!.split(';')[0]
    expect((await userItem.DELETE(request('/', admin, 'DELETE'), key)).status).toBe(200)
    expect((await principalPeriods(request('/', cookie), ctx())).status).toBe(401)
  })

  it('批量调整班级保留原班级 ID，不能移除有任课的班级', async () => {
    const data = { name: '批量小学', code: 'BATCH', grades: ['一年级'], classCount: 2, stage: 'PRIMARY' }
    const school = await (await createSchool(request('/', admin, 'POST', data), ctx())).json()
    const key = ctx({ schoolId: String(school.id) })
    const update = (classCount: number) => editSchool(request('/', admin, 'PUT', { ...data, classCount }), key)
    expect((await (await update(3)).json()).classes[0].id).toBe(school.classes[0].id)
    const teacher = await prisma.teacher.create({ data: { name: '任课', phone: 'batch', schoolId: school.id, source: 'SELF' } })
    const subject = await prisma.subject.create({ data: { name: '批量学科', order: 1 } })
    await prisma.teachingAssignment.create({ data: { classId: school.classes[1].id, teacherId: teacher.id, subjectId: subject.id } })
    expect((await update(1)).status).toBe(409)
    expect(await prisma.schoolClass.count({ where: { schoolId: school.id } })).toBe(3)
  })
})

async function scoredSchool(code: string) {
  const school = await prisma.school.create({ data: { code, name: code, stage: 'MIDDLE',
    principals: { create: { username: code, role: 'PRINCIPAL', password: 'unused' } },
    classes: { create: { grade: '初一', gradeOrder: 1, name: '1班', order: 1 } },
    teachers: { create: { name: code, phone: code, source: 'IMPORT' } },
  }, include: { classes: true, teachers: true, principals: true } })
  const subject = await prisma.subject.create({ data: { name: code, order: 1 } })
  const period = await prisma.period.create({ data: {
    name: code, startDate: new Date(), endDate: new Date(), subjects: { create: { subjectId: subject.id } },
    questions: { create: { content: code, order: 1, options: [{ label: '满意', score: 5 }] } },
  }, include: { questions: true } })
  const teacherId = school.teachers[0].id, classId = school.classes[0].id
  const assignment = { teacherId, classId, subjectId: subject.id }
  await prisma.teachingAssignment.create({ data: assignment })
  const submission = await prisma.submission.create({ data: {
    periodId: period.id, classId, schoolId: school.id, answers: { create: {
      questionId: period.questions[0].id, subjectId: subject.id, teacherId, score: 3, maxScore: 5,
    } },
  } })
  return { school, subject, period, assignment, submission }
}

describe('新模型的约束和历史答卷', () => {
  it('约束学校年级班名、学科名、手机号、每班每科任课及调研期学科', async () => {
    const { school, period, subject, assignment } = await scoredSchool('唯一')
    const schoolId = school.id
    await expect(prisma.schoolClass.create({ data: { schoolId, grade: '初一', gradeOrder: 1, name: '1班', order: 2 } })).rejects.toMatchObject({ code: 'P2002' })
    await expect(prisma.subject.create({ data: { name: subject.name, order: 2 } })).rejects.toMatchObject({ code: 'P2002' })
    await expect(prisma.teacher.create({ data: { schoolId, name: '同号', phone: '唯一', source: 'SELF' } })).rejects.toMatchObject({ code: 'P2002' })
    await expect(prisma.teachingAssignment.create({ data: assignment })).rejects.toMatchObject({ code: 'P2002' })
    await expect(prisma.periodSubject.create({ data: { periodId: period.id, subjectId: subject.id } })).rejects.toMatchObject({ code: 'P2002' })
  })

  it('换任后保留原教师和满分，不能单删有评分的教师', async () => {
    const { school, assignment, submission } = await scoredSchool('换任')
    const teacher = await prisma.teacher.create({ data: { schoolId: school.id, name: '新任', phone: '新任', source: 'SELF' } })
    await prisma.teachingAssignment.updateMany({ where: assignment, data: { teacherId: teacher.id } })
    await expect(deleteTeacher(assignment.teacherId)).rejects.toThrow('该教师已有评价记录')
    expect(await prisma.answer.findFirstOrThrow({ where: { submissionId: submission.id } })).toMatchObject({ teacherId: assignment.teacherId, score: 3, maxScore: 5 })
    await deleteTeacher(teacher.id)
  })

  it('整校级联清理并解绑校长，保留调研期及其题目', async () => {
    const { school, assignment, period, submission } = await scoredSchool('删校')
    await prisma.school.delete({ where: { id: school.id } })
    expect(await prisma.schoolClass.count({ where: { schoolId: school.id } })).toBe(0)
    expect(await prisma.teacher.count({ where: { schoolId: school.id } })).toBe(0)
    expect(await prisma.teachingAssignment.count({ where: assignment })).toBe(0)
    expect(await prisma.submission.count({ where: { schoolId: school.id } })).toBe(0)
    expect(await prisma.answer.count({ where: { submissionId: submission.id } })).toBe(0)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: school.principals[0].id } })).schoolId).toBeNull()
    expect(await prisma.question.count({ where: { periodId: period.id } })).toBe(1)
  })

  it('整期级联清理题目、答卷、答案和选科，保留任课关系', async () => {
    const { period, assignment, submission } = await scoredSchool('删期')
    await prisma.period.delete({ where: { id: period.id } })
    expect(await prisma.question.count({ where: { periodId: period.id } })).toBe(0)
    expect(await prisma.periodSubject.count({ where: { periodId: period.id } })).toBe(0)
    expect(await prisma.submission.count({ where: { periodId: period.id } })).toBe(0)
    expect(await prisma.answer.count({ where: { submissionId: submission.id } })).toBe(0)
    expect(await prisma.teachingAssignment.count({ where: assignment })).toBe(1)
  })
})

describe('调研期日期按北京时间', () => {
  it('开始日从 0 点起，结束日包含整天', async () => {
    const { periodForm } = await import('@/lib/forms')
    const p = periodForm.parse({ name: '期', startDate: '2026-11-25', endDate: '2026-12-31', subjectIds: [1] })
    expect(p.startDate.toISOString()).toBe('2026-11-24T16:00:00.000Z')
    expect(p.endDate.toISOString()).toBe('2026-12-31T15:59:59.999Z')
  })
})
