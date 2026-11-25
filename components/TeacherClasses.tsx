'use client'

import type { Slot } from '@/lib/teacher-forms'
import { useState } from 'react'
import { Button } from './ui/button'
import TimetableGrid from './TimetableGrid'
import { jsonOptions, message, readJson, RegistrationData } from './teacher-data'

export default function TeacherClasses({ initial }: { initial: RegistrationData }) {
  const [data, setData] = useState(initial)
  const [changes, setChanges] = useState(new Map<string, { classId: number, subjectId: number, checked: boolean }>())
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
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
  return <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-6">
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">我的任课登记</h1>
          <p className="mt-1 text-slate-700">{data.teacher.school.name} · {data.teacher.name}</p></div>
        <Button variant="outline" onClick={logout} disabled={busy}>退出登录</Button>
      </header>
      <p className="text-sm text-slate-600">请勾选自己任教的班级和学科，取消勾选可撤销登记。登记有误或被别人占用，请联系学校教务处理。</p>
      <TimetableGrid data={data} cell={(group, subject, owner) => {
        const key = group.id + '/' + subject.id
        const mine = owner?.id === data.teacher.id
        const taken = !!owner && !mine
        const label = group.grade + group.name + subject.name
        return <label className="inline-flex min-h-7 items-center gap-1 whitespace-nowrap">
          <input type="checkbox" className="h-4 w-4 accent-blue-700" aria-label={label} disabled={busy || taken}
            checked={changes.get(key)?.checked ?? mine} onChange={e => {
              const next = new Map(changes)
              if (e.target.checked === mine) next.delete(key)
              else next.set(key, { classId: group.id, subjectId: subject.id, checked: e.target.checked })
              setChanges(next)
              setNotice('')
            }} />
          {taken && <span className="text-xs text-slate-500">已由{owner.name}老师登记</span>}
        </label>
      }} />
      <footer className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t bg-white p-3">
        <span role="status" className="text-sm">{notice || (changes.size ? `已修改 ${changes.size} 项` : '')}</span>
        <Button disabled={busy || !changes.size} onClick={save}>{busy ? '正在保存…' : '保存任课'}</Button>
      </footer>
    </div>
  </main>
}
