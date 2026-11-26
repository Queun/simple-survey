import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { newRegistrationCode } from '../lib/registration-code'
import { makeClasses, stageGrades } from '../lib/classes'

const db = new PrismaClient()
const password = 'SchoolDemo2026'

async function seedSubmissions(tx: Prisma.TransactionClient, periodId: number, questions: { id: number }[], scale: number[]) {
  const classes = await tx.schoolClass.findMany({ include: { assignments: true } })
  for (const group of classes) {
    if (!group.assignments.length) continue
    const count = 4 + group.id % 5
    for (let i = 0; i < count; i++) {
      const answers = group.assignments.flatMap(slot => questions.map(q => {
        const center = (slot.teacherId + group.id + q.id) % scale.length
        const variation = Math.floor(Math.random() * 3) - 1
        const index = Math.max(0, Math.min(scale.length - 1, center + variation))
        return { teacherId: slot.teacherId, subjectId: slot.subjectId, questionId: q.id,
          score: scale[index], maxScore: scale[scale.length - 1] }
      }))
      await tx.submission.create({ data: { periodId, schoolId: group.schoolId, classId: group.id,
        answers: { createMany: { data: answers } } } })
    }
  }
}

async function seed() {
  const hash = await bcrypt.hash(password, 10)
  const period = await db.$transaction(async tx => {
    if (await tx.user.count() || await tx.school.count() || await tx.subject.count() || await tx.period.count()) {
      throw new Error('演示数据需要空库，请检查 DATABASE_URL')
    }
    await tx.user.create({ data: { username: 'admin', role: 'ADMIN', password: hash } })
    const subjects = []
    for (const [i, name] of ['语文', '数学', '英语', '科学', '道德与法治'].entries()) {
      subjects.push(await tx.subject.create({ data: { name, order: i + 1 } }))
    }
    for (const [index, stage] of (['PRIMARY', 'MIDDLE'] as const).entries()) {
      const counts = stage === 'PRIMARY' ? [4, 4, 3, 3, 3, 3] : [2, 2, 2]
      const grades = stageGrades[stage].map((name, i) => ({ name, classCount: counts[i] }))
      const school = await tx.school.create({
        data: {
          name: ['晨光小学', '明德初中'][index], code: ['CGXX', 'MDCZ'][index], stage,
          registrationCode: newRegistrationCode(), classes: { create: makeClasses(grades) },
          principals: { create: { username: `principal${index + 1}`, role: 'PRINCIPAL', password: hash } },
        },
        include: { classes: { orderBy: [{ gradeOrder: 'asc' }, { order: 'asc' }] } },
      })
      const teachers = []
      for (let i = 0; i < 12; i++) {
        teachers.push(await tx.teacher.create({ data: {
          schoolId: school.id, name: `示例教师${i + 1}`, phone: `199000${index}${String(i + 1).padStart(4, '0')}`, source: 'IMPORT',
        } }))
      }
      for (const [i, group] of school.classes.entries()) {
        for (const [j, subject] of subjects.entries()) {
          const slot = i * subjects.length + j
          if (slot % 17 === 0) continue
          await tx.teachingAssignment.create({ data: {
            classId: group.id, subjectId: subject.id, teacherId: teachers[slot % teachers.length].id,
          } })
        }
      }
    }
    const now = Date.now()
    const options = ['很少', '偶尔', '有时', '经常', '总是'].map((label, i) => ({ label, score: i + 1 }))
    const created = await tx.period.create({ data: {
      name: '教学反馈调研', startDate: new Date(now - 86400000), endDate: new Date(now + 30 * 86400000),
      subjects: { create: subjects.map(s => ({ subjectId: s.id })) },
      questions: { create: ['老师讲解清楚。', '老师鼓励我提问。', '老师给我练习的机会。', '老师及时反馈作业。', '老师尊重我的想法。']
        .map((content, i) => ({ order: i + 1, content, options })) },
    }, include: { questions: { select: { id: true } } } })
    if (process.env.SEED_SUBMISSIONS === '1') {
      await seedSubmissions(tx, created.id, created.questions, options.map(o => o.score))
    }
    return created
  }, { timeout: 30000 })
  console.log(`管理员 admin；校长 principal1、principal2。演示密码 ${password}`)
  console.log(`学生问卷 http://localhost:3000/survey/${period.id}`)
  const schools = await db.school.findMany({ select: { name: true, registrationCode: true }, orderBy: { id: 'asc' } })
  for (const school of schools) console.log(`${school.name}登记口令：${school.registrationCode}`)
}

seed().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.$disconnect())
