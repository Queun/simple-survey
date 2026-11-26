import ExcelJS from 'exceljs'
import type { AdminStatistics, PrincipalStatistics } from './statistics'

function sheet(book: ExcelJS.Workbook, title: string, headers: string[], rows: (string | number | null)[][]) {
  const ws = book.addWorksheet(title, { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = headers.map(header => ({ header, width: header === '学科' ? 36 : 20 }))
  ws.getRow(1).font = { bold: true }
  ws.addRows(rows)
  headers.forEach((header, i) => {
    if (['均分', '中位数', '最高分', '最低分'].includes(header)) ws.getColumn(i + 1).numFmt = '0.0'
  })
}

export function principalWorkbook(data: PrincipalStatistics) {
  const book = new ExcelJS.Workbook()
  sheet(book, '老师汇总', ['姓名', '学科', '份数', '均分', '中位数'], data.teachers.map(t =>
    [t.name, t.subjects.join('、'), t.count, t.mean, t.median]))
  sheet(book, '老师与班级明细', ['姓名', '年级', '班级', '份数', '均分', '中位数', '最高分', '最低分'], data.teachers.flatMap(t =>
    t.classes.map(c => [t.name, c.grade, c.name, c.count, c.mean, c.median, c.highest, c.lowest])))
  sheet(book, '学科与年级汇总', ['学科', '年级', '份数', '均分'], data.gradeSubjects.map(r =>
    [r.subject, r.grade, r.count, r.mean]))
  return book
}

export function adminWorkbook(data: AdminStatistics) {
  const book = new ExcelJS.Workbook()
  sheet(book, '各校概况', ['学校', '份数', '参与班级数', '均分'], data.schools.map(s =>
    [s.name, s.count, s.participating, s.mean]))
  sheet(book, '各校学科', ['学校', '学科', '份数', '均分'], data.schools.flatMap(s =>
    s.subjects.map(sub => [s.name, sub.name, sub.count, sub.mean])))
  return book
}

export async function downloadWorkbook(book: ExcelJS.Workbook, filename: string) {
  return new Response(new Uint8Array(await book.xlsx.writeBuffer()), { headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
    'Cache-Control': 'private, no-store',
  } })
}
