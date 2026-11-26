'use client'

import type { Slot } from '@/lib/teacher-forms'
import { useState } from 'react'
import { Button } from './ui/button'
import TimetableGrid from './TimetableGrid'
import { jsonOptions, message, readJson, RegistrationData } from './teacher-data'

type ClassRow = RegistrationData['classes'][number]
type Subject = RegistrationData['subjects'][number]
type Owner = ClassRow['assignments'][number]['teacher']

export default function TeacherClasses({ initial }: { initial: RegistrationData }) {
  const [data, setData] = useState(initial)
  const [changes, setChanges] = useState(new Map<string, { classId: number, subjectId: number, checked: boolean }>())
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [initialOpenGrades] = useState(() => {
    const grades = new Set(initial.classes.filter(group =>
      group.assignments.some(a => a.teacher.id === initial.teacher.id)).map(group => group.grade))
    if (!grades.size && initial.classes.length) grades.add(initial.classes[0].grade)
    return grades
  })
  const grades = new Map<string, ClassRow[]>()
  const selected = new Map<number, Set<number>>()
  for (const group of data.classes) {
    if (!grades.has(group.grade)) grades.set(group.grade, [])
    grades.get(group.grade)!.push(group)
    selected.set(group.id, new Set(group.assignments.filter(a => a.teacher.id === data.teacher.id).map(a => a.subjectId)))
  }
  for (const { classId, subjectId, checked } of changes.values()) {
    if (checked) selected.get(classId)?.add(subjectId)
    else selected.get(classId)?.delete(subjectId)
  }

  function choice(group: ClassRow, subject: Subject, owner?: Owner, mobile = false) {
    const mine = owner?.id === data.teacher.id
    const taken = !!owner && !mine
    const checked = selected.get(group.id)!.has(subject.id)
    const occupied = taken && `已由${owner.name}老师登记`
    const style = mobile
      ? 'flex min-h-11 min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm ' +
        (taken ? 'border-dashed bg-slate-100 text-slate-600' : checked ? 'cursor-pointer border-blue-700 bg-blue-50 font-semibold text-blue-900' : 'cursor-pointer bg-white')
      : 'inline-flex min-h-7 items-center gap-1 whitespace-nowrap'
    return <label key={subject.id} className={style}>
      <input type="checkbox" className="h-4 w-4 shrink-0 accent-blue-700"
        aria-label={[group.grade, group.name, subject.name, occupied].filter(Boolean).join(' ')}
        disabled={busy || taken} checked={checked} onChange={event => {
          const next = new Map(changes)
          const key = group.id + '/' + subject.id
          if (event.target.checked === mine) next.delete(key)
          else next.set(key, { classId: group.id, subjectId: subject.id, checked: event.target.checked })
          setChanges(next)
          setNotice('')
        }} />
      {mobile ? <span className="min-w-0 wrap-anywhere">{subject.name}
        {occupied && <span className="block text-xs">{occupied}</span>}</span>
        : occupied && <span className="text-xs text-slate-500">{occupied}</span>}
    </label>
  }

  async function save() {
    setBusy(true)
    setNotice('')
    const add: Slot[] = [], remove: Slot[] = []
    for (const { checked, ...slot } of changes.values()) (checked ? add : remove).push(slot)
    try {
      await readJson('/api/teacher/classes', jsonOptions('PUT', { add, remove }))
      setData(await readJson<RegistrationData>('/api/teacher/classes'))
      setChanges(new Map())
      setNotice('任课已保存')
    } catch (e) { setNotice(message(e)) } finally { setBusy(false) }
  }
  async function logout() {
    try { await readJson('/api/teacher/logout', { method: 'POST' }); window.location.replace('/teacher') }
    catch (e) { setNotice(message(e)) }
  }
  return <main className="min-h-screen bg-slate-50 px-3 py-5 max-md:pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6">
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 wrap-anywhere"><h1 className="text-2xl font-semibold">我的任课登记</h1>
          <p className="mt-1 text-slate-700">{data.teacher.school.name} · {data.teacher.name}</p></div>
        <Button variant="outline" onClick={logout} disabled={busy}>退出登录</Button>
      </header>
      <p className="text-sm text-slate-600">请勾选自己任教的班级和学科，取消勾选可撤销登记。登记有误或被别人占用，请联系学校教务处理。</p>
      <div className="space-y-3 md:hidden">
        {!grades.size || !data.subjects.length ? <p className="p-4 text-sm">暂无可登记的班级或学科。</p>
          : [...grades].map(([grade, rows]) => <details key={grade} open={initialOpenGrades.has(grade)}
            className="rounded-lg border bg-white">
            <summary className="min-h-11 cursor-pointer px-4 py-3 font-semibold">
              {grade}<span className="ml-3 text-sm font-normal text-slate-600">
                已选 {rows.reduce((count, row) => count + selected.get(row.id)!.size, 0)} 项
              </span>
            </summary>
            {rows.map(group => <section key={group.id} className="border-t p-3">
              <h2 className="mb-2 font-medium">{group.name}</h2>
              <div className="grid grid-cols-2 gap-2">
                {data.subjects.map(subject => choice(group, subject,
                  group.assignments.find(a => a.subjectId === subject.id)?.teacher, true))}
              </div>
            </section>)}
          </details>)}
      </div>
      <div className="hidden md:block"><TimetableGrid data={data} cell={choice} /></div>
      <footer className="fixed inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:sticky md:justify-end md:pb-3">
        <div role="status" className="text-sm">
          <span className="md:hidden">已改动 {changes.size} 项</span>
          {notice ? <span className="block">{notice}</span>
            : changes.size > 0 && <span className="hidden md:inline">已修改 {changes.size} 项</span>}
        </div>
        <Button className="max-md:min-h-11" disabled={busy || !changes.size} onClick={save}>{busy ? '正在保存…' : '保存任课'}</Button>
      </footer>
    </div>
  </main>
}
