import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { RequestError } from './response'
import { classOrder } from './schools'

export const MIN_SUBMISSIONS = 3
type Db = Prisma.TransactionClient
type Scope = { periodId: number | null, schoolId?: number, grade?: string }
const columns = {
  all: Prisma.sql`0 + 0`, school: Prisma.sql`s.schoolId`, grade: Prisma.sql`c.grade`,
  subject: Prisma.sql`a.subjectId`, teacher: Prisma.sql`a.teacherId`,
  group: Prisma.sql`s.classId`, question: Prisma.sql`a.questionId`,
}
type Dimension = keyof typeof columns
type Score = { count: number, mean: number | null }
type Distribution = Score & { median: number | null, highest: number | null, lowest: number | null }
const noScore: Score = { count: 0, mean: null }
const noDistribution: Distribution = { ...noScore, median: null, highest: null, lowest: null }
type Key = number | bigint | string
type Bucket<T> = Omit<T, 'count'> & { k1: Key, k2: Key, count: bigint }

function lookup<Row extends { k1: Key, k2: Key }, Value>(rows: Row[], empty: Value, read: (row: Row) => Value) {
  const key = (first: Key, second: Key) => JSON.stringify([String(first), String(second)])
  const index = new Map(rows.map(row => [key(row.k1, row.k2), read(row)]))
  return (first: Key = 0, second: Key = 0) => index.get(key(first, second)) ?? empty
}

function readScore(row: Bucket<Score>): Score {
  return { count: Number(row.count), mean: row.mean }
}

function source(scope: Scope) {
  return Prisma.sql`FROM Submission s
    JOIN SchoolClass c ON c.id = s.classId
    LEFT JOIN Answer a ON a.submissionId = s.id
    WHERE s.periodId = ${scope.periodId}
    ${scope.schoolId === undefined ? Prisma.empty : Prisma.sql`AND s.schoolId = ${scope.schoolId}`}
    ${scope.grade === undefined ? Prisma.empty : Prisma.sql`AND c.grade = ${scope.grade}`}`
}
const percent = Prisma.sql`100.0 * a.score / a.maxScore`

async function scores(db: Db, scope: Scope, first: Dimension, second: Dimension = 'all', admin = false) {
  const rows = await db.$queryRaw<Bucket<Score>[]>(Prisma.sql`
    SELECT ${columns[first]} AS k1, ${columns[second]} AS k2, COUNT(DISTINCT s.id) AS count,
      CASE WHEN COUNT(DISTINCT s.id) >= ${MIN_SUBMISSIONS}
        ${admin ? Prisma.sql`AND COUNT(DISTINCT a.teacherId) > 1` : Prisma.empty}
        THEN ROUND(AVG(${percent}), 1) END AS mean
    ${source(scope)} GROUP BY k1, k2`)
  return lookup(rows, noScore, readScore)
}

// The mean weights individual answers. The percentile and extremes weight each questionnaire once.
async function distributions(db: Db, scope: Scope, second: Dimension = 'all') {
  const rows = await db.$queryRaw<Bucket<Distribution>[]>(Prisma.sql`
    WITH papers AS (
      SELECT a.teacherId AS k1, ${columns[second]} AS k2, s.id,
        SUM(${percent}) AS total, COUNT(a.id) AS answers, AVG(${percent}) AS value
      ${source(scope)} AND a.id IS NOT NULL GROUP BY k1, k2, s.id
    ), ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY k1,k2 ORDER BY value,id) AS position,
        COUNT(*) OVER (PARTITION BY k1,k2) AS n FROM papers
    )
    SELECT k1,k2, COUNT(*) AS count,
      CASE WHEN COUNT(*) >= ${MIN_SUBMISSIONS} THEN ROUND(SUM(total)/SUM(answers),1) END AS mean,
      CASE WHEN COUNT(*) >= ${MIN_SUBMISSIONS} THEN ROUND(AVG(CASE WHEN position IN ((n+1)/2,(n+2)/2) THEN value END),1) END AS median,
      CASE WHEN COUNT(*) >= ${MIN_SUBMISSIONS} THEN ROUND(MAX(value),1) END AS highest,
      CASE WHEN COUNT(*) >= ${MIN_SUBMISSIONS} THEN ROUND(MIN(value),1) END AS lowest
    FROM ranked GROUP BY k1,k2`)
  return lookup(rows, noDistribution, row => ({
    ...readScore(row), median: row.median, highest: row.highest, lowest: row.lowest,
  }))
}

export async function reportingPeriods(requested?: number) {
  const now = new Date()
  const rows = await prisma.period.findMany({ select: { id: true, name: true, isActive: true, startDate: true, endDate: true },
    orderBy: [{ startDate: 'desc' }, { id: 'desc' }] })
  const periods = rows.map(p => ({ id: p.id, name: p.name, current: p.isActive && p.startDate <= now && now <= p.endDate }))
  const period = requested === undefined ? periods.find(p => p.current) : periods.find(p => p.id === requested)
  if (requested !== undefined && !period) throw new RequestError('调研期不存在', 404)
  return { periods, period: period ?? null }
}

async function periodSubjects(db: Db, scope: Scope) {
  if (scope.periodId === null) return []
  return db.subject.findMany({ where: { OR: [
    { periods: { some: { periodId: scope.periodId } } },
    { answers: { some: { submission: { periodId: scope.periodId, schoolId: scope.schoolId } } } },
  ] }, select: { id: true, name: true }, orderBy: [{ order: 'asc' }, { id: 'asc' }] })
}

async function overview(db: Db, schoolId: number, periodId: number | null) {
  const school = await db.school.findUniqueOrThrow({ where: { id: schoolId }, select: {
    name: true, _count: { select: { teachers: true, classes: true } },
  } })
  const participation = periodId === null ? [] : await db.submission.groupBy({
    by: ['classId'], where: { schoolId, periodId },
  })
  const schoolScore = await scores(db, { schoolId, periodId }, 'all')
  return { name: school.name, ...schoolScore(), participating: participation.length,
    classes: school._count.classes, teachers: school._count.teachers }
}

export function principalOverview(schoolId: number, periodId: number | null) {
  return prisma.$transaction(tx => overview(tx, schoolId, periodId))
}

export function principalStatistics(schoolId: number, periodId: number, grade?: string) {
  return prisma.$transaction(async db => {
    const scope = { schoolId, periodId, grade }
    const school = await overview(db, schoolId, periodId)
    const allClasses = await db.schoolClass.findMany({ where: { schoolId }, orderBy: classOrder,
      select: { id: true, grade: true, name: true } })
    const gradeNames = [...new Set(allClasses.map(c => c.grade))]
    const groups = allClasses.filter(c => grade === undefined || grade === c.grade)
    const subjects = await periodSubjects(db, scope)
    const teachers = await db.teacher.findMany({ where: { schoolId }, select: { id: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }] })
    const questions = await db.question.findMany({ where: { periodId }, orderBy: { order: 'asc' },
      select: { id: true, content: true, order: true } })

    // Include both today's timetable and the teachers recorded before reassignment.
    const slots = await db.$queryRaw<{ teacherId: bigint, classId: bigint, subjectId: bigint }[]>(Prisma.sql`
      SELECT t.teacherId, t.classId, t.subjectId FROM TeachingAssignment t
      JOIN SchoolClass c ON c.id = t.classId JOIN PeriodSubject ps ON ps.subjectId = t.subjectId
      WHERE c.schoolId = ${schoolId} AND ps.periodId = ${periodId}
      ${grade === undefined ? Prisma.empty : Prisma.sql`AND c.grade = ${grade}`}
      UNION SELECT a.teacherId, s.classId, a.subjectId ${source(scope)} AND a.id IS NOT NULL`)
    const assignments = new Map<number, { groups: Set<number>, subjects: Set<number> }>()
    for (const row of slots) {
      const id = Number(row.teacherId)
      const entry = assignments.get(id) ?? { groups: new Set<number>(), subjects: new Set<number>() }
      entry.groups.add(Number(row.classId))
      entry.subjects.add(Number(row.subjectId))
      assignments.set(id, entry)
    }

    const byGrade = await scores(db, { schoolId, periodId }, 'grade')
    const bySubject = await scores(db, scope, 'subject')
    const byGradeSubject = await scores(db, scope, 'grade', 'subject')
    const byTeacher = await distributions(db, scope)
    const byTeacherSubject = await distributions(db, scope, 'subject')
    const byTeacherClass = await distributions(db, scope, 'group')
    const byTeacherQuestion = await scores(db, scope, 'teacher', 'question')
    const visibleTeachers = teachers.filter(t => grade === undefined || assignments.has(t.id))
    const teacherRows = visibleTeachers.map(t => {
      const assigned = assignments.get(t.id)
      return { ...t, ...byTeacher(t.id), subjects: subjects.filter(s => assigned?.subjects.has(s.id)).map(s => s.name),
        classes: groups.filter(c => assigned?.groups.has(c.id)).map(c => ({ ...c, ...byTeacherClass(t.id, c.id) })),
        questions: questions.map(q => ({ ...q, ...byTeacherQuestion(t.id, q.id) })),
      }
    }).sort(byMean)
    return { school, grades: gradeNames.map(name => ({ name, ...byGrade(name) })),
      subjects: subjects.map(s => ({ ...s, ...bySubject(s.id),
        teachers: visibleTeachers.filter(t => assignments.get(t.id)?.subjects.has(s.id))
          .map(t => ({ ...t, ...byTeacherSubject(t.id, s.id) })).sort(byMean),
      })), teachers: teacherRows,
      gradeSubjects: gradeNames.filter(name => grade === undefined || name === grade)
        .flatMap(name => subjects.map(s => ({ grade: name, subject: s.name, ...byGradeSubject(name, s.id) }))),
    }
  })
}

function byMean(a: Score, b: Score) { return (b.mean ?? -1) - (a.mean ?? -1) }

async function platformOverview(db: Db, periodId: number | null) {
  const schools = await db.school.count()
  if (periodId === null) return { schools, count: 0, filled: 0, slots: 0 }
  const count = await db.submission.count({ where: { periodId } })
  const classes = await db.schoolClass.count()
  const subjects = await db.periodSubject.count({ where: { periodId } })
  const filled = await db.teachingAssignment.count({ where: { subject: { periods: { some: { periodId } } } } })
  return { schools, count, filled, slots: classes * subjects }
}

export function adminOverview(periodId: number | null) {
  return prisma.$transaction(tx => platformOverview(tx, periodId))
}

export function adminStatistics(periodId: number) {
  return prisma.$transaction(async db => {
    const scope = { periodId }
    const schools = await db.school.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
    const subjects = await periodSubjects(db, scope)
    const bySchool = await scores(db, scope, 'school', 'all', true)
    const bySubject = await scores(db, scope, 'school', 'subject', true)
    const participation = await db.$queryRaw<{ schoolId: bigint, count: bigint }[]>`
      SELECT schoolId, COUNT(DISTINCT classId) AS count FROM Submission WHERE periodId = ${periodId} GROUP BY schoolId`
    const classCounts = new Map(participation.map(r => [Number(r.schoolId), Number(r.count)]))
    return { schools: schools.map(s => ({ ...s, ...bySchool(s.id), participating: classCounts.get(s.id) ?? 0,
      subjects: subjects.map(sub => ({ ...sub, ...bySubject(s.id, sub.id) })),
    })), subjects }
  })
}

export type PrincipalStatistics = Awaited<ReturnType<typeof principalStatistics>>
export type AdminStatistics = Awaited<ReturnType<typeof adminStatistics>>
export type ReportingPeriods = Awaited<ReturnType<typeof reportingPeriods>>
