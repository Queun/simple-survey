import ExcelJS from 'exceljs'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { RequestError } from './response'
import { phone as phoneFormat, slotKey, Slot } from './teacher-forms'

const headers = ['姓名', '手机号', '年级', '班级', '学科']
type Row = { number: number, name: string, phone: string, grade: string, group: string, subject: string }
type RowError = { row: number, reason: string }

export async function writeWorkbook(schoolId: number, template: boolean) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('教师任课')
  sheet.columns = headers.map((header, i) => ({ header, width: [20, 20, 16, 16, 18][i] }))
  sheet.getRow(1).font = { bold: true }
  sheet.getColumn(2).numFmt = '@'
  if (!template) {
    const teachers = await prisma.teacher.findMany({ where: { schoolId }, orderBy: [{ name: 'asc' }, { id: 'asc' }],
      include: { assignments: { include: { class: true, subject: true },
        orderBy: [{ class: { gradeOrder: 'asc' } }, { class: { order: 'asc' } }, { subject: { order: 'asc' } }],
      } },
    })
    for (const teacher of teachers) {
      const identity = [teacher.name, teacher.phone]
      if (!teacher.assignments.length) sheet.addRow(identity)
      for (const a of teacher.assignments) sheet.addRow([...identity, a.class.grade, a.class.name, a.subject.name])
    }
  }
  return workbook.xlsx.writeBuffer()
}

async function readRows(buffer: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook()
  try { await workbook.xlsx.load(buffer) } catch { throw new RequestError('无法读取文件，请选择 .xlsx 工作簿') }
  const sheet = workbook.worksheets[0]
  if (!sheet || headers.some((value, i) => sheet.getRow(1).getCell(i + 1).text.trim() !== value)) {
    throw new RequestError('第 1 行表头有误，请使用教师导入模板')
  }
  const rows: Row[] = []
  sheet.eachRow((row, number) => {
    if (number === 1) return
    const values = headers.map((_, i) => row.getCell(i + 1).text.trim())
    if (values.every(v => !v)) return
    const [name, phone, grade, group, subject] = values
    rows.push({ number, name, phone, grade, group, subject })
  })
  if (!rows.length) throw new RequestError('文件没有教师数据')
  return rows
}

async function applyRows(tx: Prisma.TransactionClient, schoolId: number, rows: Row[]) {
  const namesByPhone = new Map<string, Set<string>>()
  const slotRows = new Map<string, number[]>()
  const names = (r: Row) => JSON.stringify([r.grade, r.group, r.subject])
  for (const r of rows) {
    const set = namesByPhone.get(r.phone) ?? new Set<string>()
    set.add(r.name)
    namesByPhone.set(r.phone, set)
    if (r.grade && r.group && r.subject) {
      const key = names(r)
      const numbers = slotRows.get(key) ?? []
      numbers.push(r.number)
      slotRows.set(key, numbers)
    }
  }
  const teachers = await tx.teacher.findMany({ where: { phone: { in: [...namesByPhone.keys()] } } })
  const classes = await tx.schoolClass.findMany({ where: { schoolId }, include: {
    assignments: { select: { subjectId: true, teacherId: true } },
  } })
  const subjects = await tx.subject.findMany()
  const known = new Map(teachers.map(t => [t.phone, t]))
  const grades = new Set(classes.map(c => c.grade))
  const classIds = new Map(classes.map(c => [JSON.stringify([c.grade, c.name]), c.id]))
  const subjectIds = new Map(subjects.map(s => [s.name, s.id]))
  const owners = new Map(classes.flatMap(c => c.assignments.map(a => [slotKey({ classId: c.id, subjectId: a.subjectId }), a.teacherId] as const)))
  const errors: RowError[] = []
  const additions: (Slot & { phone: string })[] = []
  for (const r of rows) {
    const reasons = []
    const teacher = known.get(r.phone)
    if (!r.name) reasons.push('姓名不能为空')
    if (!phoneFormat.safeParse(r.phone).success) reasons.push('手机号格式不正确')
    if (namesByPhone.get(r.phone)!.size > 1) reasons.push('文件内同一手机号对应不同姓名')
    if (teacher && teacher.schoolId !== schoolId) reasons.push('手机号已属于其他学校')
    else if (teacher && teacher.name !== r.name) reasons.push('手机号对应的已登记姓名不同')
    if (r.grade || r.group || r.subject) {
      const classId = classIds.get(JSON.stringify([r.grade, r.group]))
      const subjectId = subjectIds.get(r.subject)
      if (!grades.has(r.grade)) reasons.push('年级不存在')
      if (!classId) reasons.push('班级不存在')
      if (!subjectId) reasons.push('学科不存在')
      const duplicates = slotRows.get(names(r))
      if (duplicates && duplicates.length > 1) reasons.push('文件内班级学科重复')
      if (classId && subjectId) {
        const slot = { classId, subjectId }
        const owner = owners.get(slotKey(slot))
        if (owner && owner !== teacher?.id) reasons.push('班级学科已被其他教师登记')
        if (!owner) additions.push({ ...slot, phone: r.phone })
      }
    }
    if (reasons.length) errors.push({ row: r.number, reason: reasons.join('；') })
  }
  if (errors.length) return { errors }
  const newTeachers = [...namesByPhone].filter(([phone]) => !known.has(phone)).map(([phone, values]) => ({
    schoolId, name: [...values][0], phone, source: 'IMPORT' as const,
  }))
  if (newTeachers.length) {
    for (const t of await tx.teacher.createManyAndReturn({ data: newTeachers })) known.set(t.phone, t)
  }
  if (additions.length) await tx.teachingAssignment.createMany({
    data: additions.map(({ phone, ...slot }) => ({ ...slot, teacherId: known.get(phone)!.id })),
  })
  return { rows: rows.length, createdTeachers: newTeachers.length, addedAssignments: additions.length }
}

export async function importWorkbook(schoolId: number, buffer: ArrayBuffer) {
  const rows = await readRows(buffer)
  return prisma.$transaction(tx => applyRows(tx, schoolId, rows))
}
