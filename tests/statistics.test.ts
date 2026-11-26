import ExcelJS from 'exceljs'
import { NextRequest } from 'next/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { GET as principalStats } from '@/app/api/principal/statistics/route'
import { GET as principalExport } from '@/app/api/principal/export/route'
import { GET as adminStats } from '@/app/api/admin/statistics/route'
import { GET as adminExport } from '@/app/api/admin/export/route'
import { GET as principalPeriods } from '@/app/api/principal/periods/route'
import { adminOverview, principalStatistics, reportingPeriods } from '@/lib/statistics'
import { prisma } from '@/lib/prisma'
import { cookieName, signSession } from '@/lib/session'

const ctx = { params: Promise.resolve({}) }
const req = (cookie: string, query = '') => new NextRequest('http://localhost/' + query, { headers: { cookie } })

describe('S10 统计与导出', () => {
  let schoolId: number, otherId: number, periodId: number, inactiveId: number
  let principal: string, admin: string, teacher: string
  beforeAll(async () => {
    const school = await prisma.school.create({ data: { name: '甲校', code: 'A', registrationCode: '123456', stage: 'PRIMARY' } })
    const other = await prisma.school.create({ data: { name: '乙校', code: 'B', registrationCode: '123456', stage: 'PRIMARY' } })
    schoolId = school.id
    otherId = other.id
    const makeClass = (schoolId: number, grade: string, order: number) => prisma.schoolClass.create({ data: {
      schoolId, grade, gradeOrder: order, name: '一班', order: 1,
    } })
    const first = await makeClass(schoolId, '一年级', 1)
    const second = await makeClass(schoolId, '二年级', 2)
    const empty = await makeClass(schoolId, '三年级', 3)
    const foreignClass = await makeClass(otherId, '七年级', 7)
    const math = await prisma.subject.create({ data: { name: '数学', order: 1 } })
    const chinese = await prisma.subject.create({ data: { name: '语文', order: 2 } })
    const makePeriod = (isActive: boolean) => prisma.period.create({ data: {
      name: isActive ? '本期' : '另一期', isActive, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000),
      subjects: { create: [math, chinese].map(s => ({ subjectId: s.id })) },
      questions: { create: [5, 4].map((max, i) => ({ order: i + 1, content: '题目' + i,
        options: Array.from({ length: max + 1 }, (_, score) => ({ score, label: String(score) })) })) },
    }, include: { questions: { orderBy: { order: 'asc' } } } })
    const period = await makePeriod(true)
    const inactive = await makePeriod(false)
    periodId = period.id
    inactiveId = inactive.id
    const makeTeacher = (id: number, name: string, phone: string) => prisma.teacher.create({
      data: { schoolId: id, name, phone, source: 'IMPORT' },
    })
    const a = await makeTeacher(schoolId, '甲老师', '13100000001')
    const b = await makeTeacher(schoolId, '乙老师', '13100000002')
    const foreign = await makeTeacher(otherId, '外校老师', '13100000003')
    // First-grade maths has since been reassigned from A to B. The third grade has no papers.
    await prisma.teachingAssignment.createMany({ data: [first, empty].map(c => ({
      teacherId: b.id, classId: c.id, subjectId: math.id,
    })) })
    const pair = (teacherId: number, subjectId: number, values: number[], p = period) => values.map((score, i) => ({
      teacherId, subjectId, score, questionId: p.questions[i].id, maxScore: [5, 4][i],
    }))
    for (const values of [[5, 2], [1, 2], [3, 0]]) {
      await prisma.submission.create({ data: { periodId, schoolId, classId: first.id,
        answers: { create: [...pair(a.id, math.id, values), ...pair(b.id, chinese.id, [5, 4])] } } })
    }
    await prisma.submission.create({ data: { periodId, schoolId, classId: second.id,
      answers: { create: [...pair(a.id, math.id, [5, 4]), ...pair(a.id, chinese.id, [5, 4])] } } })
    await prisma.submission.create({ data: { periodId, schoolId: otherId, classId: foreignClass.id,
      answers: { create: pair(foreign.id, math.id, [0, 0]) } } })
    await prisma.submission.create({ data: { periodId: inactiveId, schoolId, classId: first.id,
      answers: { create: pair(b.id, math.id, [1, 0], inactive) } } })
    const user = await prisma.user.create({ data: { username: 'principal', password: '', role: 'PRINCIPAL', schoolId } })
    const root = await prisma.user.create({ data: { username: 'admin', password: '', role: 'ADMIN' } })
    principal = cookieName + '=' + signSession(user)
    admin = cookieName + '=' + signSession(root)
    teacher = cookieName + '=' + signSession({ id: a.id, role: 'TEACHER' })
  })

  it('百分制按答案平均、份数去重；每份卷的个人得分用于中位数和极值', async () => {
    const data = await principalStatistics(schoolId, periodId)
    expect(data.school).toEqual({ name: '甲校', count: 4, mean: 80, participating: 2, classes: 3, teachers: 2 })
    const a = data.teachers.find(t => t.name === '甲老师')!
    expect(a).toMatchObject({ count: 4, mean: 68, median: 55, highest: 100, lowest: 30 })
    expect(a.classes[0]).toMatchObject({ count: 3, mean: 46.7, median: 35, highest: 75, lowest: 30 })
    expect(a.questions.map(q => [q.count, q.mean])).toEqual([[4, 76], [4, 60]])
    expect(data.subjects[0].teachers[0]).toMatchObject({ name: '甲老师', count: 4, mean: 60, median: 55 })
    expect(data.subjects[0].teachers[1]).toMatchObject({ name: '乙老师', count: 0, mean: null })
    expect(data.teachers.map(t => t.name)).toEqual(['乙老师', '甲老师'])
    expect(await adminOverview(periodId)).toEqual({ schools: 2, count: 5, filled: 2, slots: 8 })
  })

  it('年级过滤覆盖下钻、各题和全部得分，小样本以及零份任课仍显示份数', async () => {
    const data = await principalStatistics(schoolId, periodId, '二年级')
    expect(data.school.count).toBe(4)
    expect(data.grades.map(g => [g.count, g.mean])).toEqual([[3, 73.3], [1, null], [0, null]])
    expect(data.teachers).toHaveLength(1)
    const a = data.teachers[0]
    const hidden = { count: 1, mean: null, median: null, highest: null, lowest: null }
    expect(a).toMatchObject(hidden)
    expect(a.classes).toHaveLength(1)
    expect(a.classes[0]).toMatchObject({ ...hidden, grade: '二年级' })
    for (const row of [...a.questions, ...data.subjects, ...data.gradeSubjects]) expect(row).toMatchObject({ count: 1, mean: null })
    for (const s of data.subjects) expect(s.teachers[0]).toMatchObject(hidden)
    const empty = await principalStatistics(schoolId, periodId, '三年级')
    expect(empty.teachers[0].classes[0]).toMatchObject({ count: 0, mean: null })
  })

  it('默认进行期、显式选择、跨校请求及教师访问限制', async () => {
    const response = await principalStats(req(principal), ctx)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.period.id).toBe(periodId)
    expect(JSON.stringify(json)).not.toMatch(/外校老师|七年级|乙校|submissionId|attemptId|phone/)
    for (const route of [principalStats, principalExport]) {
      expect((await route(req(principal, '?schoolId=' + otherId), ctx)).status).toBe(400)
      expect((await route(req(admin), ctx)).status).toBe(403)
    }
    for (const route of [adminStats, adminExport]) expect((await route(req(principal), ctx)).status).toBe(403)
    for (const route of [principalStats, principalPeriods, principalExport, adminStats, adminExport]) {
      expect((await route(req(teacher), ctx)).status).toBe(403)
      expect((await route(req(''), ctx)).status).toBe(401)
    }
    const another = await (await principalStats(req(principal, '?periodId=' + inactiveId), ctx)).json()
    expect(another.data.school).toMatchObject({ count: 1, mean: null })
    expect((await adminStats(req(admin, '?periodId=9999'), ctx)).status).toBe(404)
  })

  it('正好两份时学校、教师、学科、班级和题目均隐藏分数', async () => {
    const original = await prisma.submission.findFirstOrThrow({ where: { periodId: inactiveId }, include: { answers: true } })
    const added = await prisma.submission.create({ data: {
      periodId: inactiveId, schoolId, classId: original.classId,
      answers: { create: original.answers.map(({ teacherId, subjectId, questionId, score, maxScore }) =>
        ({ teacherId, subjectId, questionId, score, maxScore })) },
    } })
    try {
      const data = await principalStatistics(schoolId, inactiveId)
      const b = data.teachers.find(t => t.name === '乙老师')!
      const hidden = { count: 2, mean: null, median: null, highest: null, lowest: null }
      expect(data.school).toMatchObject({ count: 2, mean: null })
      expect(b).toMatchObject(hidden)
      expect(b.classes[0]).toMatchObject(hidden)
      expect(data.subjects[0].teachers[0]).toMatchObject(hidden)
      expect(b.questions.every(q => q.count === 2 && q.mean === null)).toBe(true)
    } finally { await prisma.submission.delete({ where: { id: added.id } }) }
  })

  it('平台数据只含学校和学科，单一教师学科及不足三份的学校隐藏分数', async () => {
    const { data } = await (await adminStats(req(admin), ctx)).json()
    expect(data).toEqual({ subjects: [{ id: 1, name: '数学' }, { id: 2, name: '语文' }], schools: expect.arrayContaining([
      { id: schoolId, name: '甲校', count: 4, mean: 80, participating: 2, subjects: [
        { id: 1, name: '数学', count: 4, mean: null }, { id: 2, name: '语文', count: 4, mean: 100 },
      ] }, { id: otherId, name: '乙校', count: 1, participating: 1, mean: null, subjects: [
        { id: 1, name: '数学', count: 1, mean: null }, { id: 2, name: '语文', count: 0, mean: null },
      ] },
    ]) })
    expect(JSON.stringify(data)).not.toMatch(/teacher|老师|submissionId|attemptId|phone/i)
  })

  it('两份 Excel 都能读回，核对全表与 API 的数值、小样本空格和学校边界', async () => {
    for (const scope of ['principal', 'admin']) {
      const principalRole = scope === 'principal'
      const request = req(principalRole ? principal : admin)
      const response = await (principalRole ? principalExport : adminExport)(request, ctx)
      expect(response.status).toBe(200)
      const book = new ExcelJS.Workbook()
      await book.xlsx.load(await response.arrayBuffer())
      const { data } = await (await (principalRole ? principalStats : adminStats)(request, ctx)).json()
      const sheets: (string | number | null)[][][] = []
      if (principalRole) {
        const stats: Awaited<ReturnType<typeof principalStatistics>> = data
        sheets.push(stats.teachers.map(t => [t.name, t.subjects.join('、'), t.count, t.mean, t.median]),
          stats.teachers.flatMap(t => t.classes.map(c => [t.name, c.grade, c.name, c.count, c.mean, c.median, c.highest, c.lowest])),
          stats.gradeSubjects.map(s => [s.subject, s.grade, s.count, s.mean]))
      } else {
        const stats: Awaited<ReturnType<typeof import('@/lib/statistics').adminStatistics>> = data
        sheets.push(stats.schools.map(s => [s.name, s.count, s.participating, s.mean]),
          stats.schools.flatMap(s => s.subjects.map(sub => [s.name, sub.name, sub.count, sub.mean])))
      }
      expect(book.worksheets).toHaveLength(sheets.length)
      for (const [index, rows] of sheets.entries()) {
        const sheet = book.worksheets[index]
        expect(sheet.rowCount).toBe(1 + rows.length)
        rows.forEach((row, i) => row.forEach((value, j) => expect(sheet.getCell(i + 2, j + 1).value).toBe(value)))
      }
    }
  })

  it('无进行中调研期可手选，默认页面和接口不会误用已结束期', async () => {
    await prisma.period.update({ where: { id: periodId }, data: { isActive: false } })
    try {
      expect((await reportingPeriods()).period).toBe(null)
      expect(await (await principalStats(req(principal), ctx)).json()).toEqual({ period: null, data: null })
      expect((await principalExport(req(principal), ctx)).status).toBe(400)
    } finally { await prisma.period.update({ where: { id: periodId }, data: { isActive: true } }) }
  })
})
