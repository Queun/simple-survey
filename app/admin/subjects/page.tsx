'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Subject = { id: number, name: string, order: number }

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [editing, setEditing] = useState<Subject | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function load() {
    const res = await fetch('/api/admin/subjects')
    if (!res.ok) throw new Error('加载学科失败')
    setSubjects(await res.json())
  }
  useEffect(() => { load().catch(() => setError('加载学科失败')) }, [])

  async function save(subject: Subject, method: 'PUT' | 'POST' | 'DELETE') {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/subjects' + (method === 'POST' ? '' : '/' + subject.id), {
        method, headers: { 'Content-Type': 'application/json' },
        body: method === 'DELETE' ? undefined : JSON.stringify({ name: subject.name, order: subject.order }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setEditing(null)
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : '操作失败') }
    finally { setBusy(false) }
  }
  return (
    <section className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">学科管理</h1>
        <Button onClick={() => setEditing({ id: 0, name: '', order: (subjects.at(-1)?.order ?? 0) + 1 })}>添加学科</Button>
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {editing && <form className="space-y-4 rounded-lg border bg-white p-5" onSubmit={e => {
        e.preventDefault()
        void save(editing, editing.id ? 'PUT' : 'POST')
      }}>
        <label className="block">学科名称<Input required value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></label>
        <label className="block">顺序<Input type="number" min="0" required value={editing.order} onChange={e => setEditing({ ...editing, order: Number(e.target.value) })} /></label>
        <div className="flex gap-2"><Button disabled={busy}>保存</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>取消</Button></div>
      </form>}
      <ul className="divide-y rounded-lg border bg-white">{subjects.map(subject => (
        <li key={subject.id} className="flex items-center gap-3 p-4">
          <span className="text-gray-500">{subject.order}</span><strong className="flex-1">{subject.name}</strong>
          <Button variant="outline" disabled={busy} onClick={() => setEditing(subject)}>编辑</Button>
          <Button variant="outline" disabled={busy} onClick={() => {
            if (confirm(`删除学科“${subject.name}”？`)) void save(subject, 'DELETE')
          }}>删除</Button>
        </li>
      ))}</ul>
    </section>
  )
}
