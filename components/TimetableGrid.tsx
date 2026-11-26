import { ReactNode } from 'react'
import { Timetable } from './teacher-data'

type Group = Timetable['classes'][number]
type Cell = (group: Group, subject: Timetable['subjects'][number], owner?: { id: number, name: string }) => ReactNode

export default function TimetableGrid({ data, cell }: { data: Timetable, cell: Cell }) {
  if (!data.classes.length || !data.subjects.length) return <p className="p-4 text-sm">暂无可登记的班级或学科。</p>
  const grades = new Map<string, Group[]>()
  for (const group of data.classes) {
    const rows = grades.get(group.grade) ?? []
    rows.push(group)
    grades.set(group.grade, rows)
  }
  return <div className="overflow-x-auto rounded-lg border bg-white">
    <table className="w-full border-collapse text-center text-sm">
      <thead className="bg-slate-100"><tr>
        <th scope="col" className="hidden bg-slate-100 p-2 sm:table-cell">年级</th>
        <th scope="col" className="sticky left-0 bg-slate-100 p-2 sm:static">班级</th>
        {data.subjects.map(s => <th key={s.id} scope="col" className="whitespace-nowrap p-2">{s.name}</th>)}
      </tr></thead>
      {[...grades].map(([grade, rows]) => <tbody key={grade} className="border-t-2">
        {rows.map((group, i) => <tr key={group.id} className="border-t">
          {i === 0 && <th scope="rowgroup" rowSpan={rows.length} className="hidden whitespace-nowrap bg-slate-50 px-2 sm:table-cell">{grade}</th>}
          <th scope="row" className="sticky left-0 whitespace-nowrap bg-white px-2 font-medium sm:static"><span className="mr-1 sm:hidden">{grade}</span>{group.name}</th>
          {data.subjects.map(s => <td key={s.id} className="border-l px-2 py-1">
            {cell(group, s, group.assignments.find(a => a.subjectId === s.id)?.teacher)}
          </td>)}
        </tr>)}
      </tbody>)}
    </table>
  </div>
}
