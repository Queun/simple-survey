'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import TimetableGrid from './TimetableGrid'
import ClearAssignmentsDialog from './ClearAssignmentsDialog'
import { jsonOptions, ManagementData, message, readJson, Teacher } from './teacher-data'

export default function TeacherManagement({ scope }: { scope: string }) {
  const url = '/api/management/schools/' + encodeURIComponent(scope) + '/teachers'
  const [data, setData] = useState<ManagementData>()
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    readJson<ManagementData>(url).then(value => { if (active) setData(value) })
      .catch(e => { if (active) setError(message(e)) })
    return () => { active = false }
  }, [url])
  if (!data) return <p role="status">{error || '正在读取教师名单…'}</p>
  return <ManagementPanel url={url} data={data} reload={async () => setData(await readJson<ManagementData>(url))} />
}

export function ManagementPanel({ url, data, reload }: { url: string, data: ManagementData, reload: () => Promise<void> }) {
  const [tab, setTab] = useState<'coverage' | 'roster'>('coverage')
  const [search, setSearch] = useState('')
  const [assignedOnly, setAssignedOnly] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [editor, setEditor] = useState<Teacher | 'new' | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [errors, setErrors] = useState<{ row: number, reason: string }[]>([])
  const [manualNotice, setManualNotice] = useState('')
  const [editingCell, setEditingCell] = useState('')
  const filled = data.classes.reduce((sum, c) => sum + c.assignments.length, 0)
  const total = data.classes.length * data.subjects.length
  const registerPath = '/teacher?school=' + encodeURIComponent(data.school.code)
  const matches = data.teachers.filter(t => (!assignedOnly || t._count.assignments > 0)
    && (t.name.includes(search.trim()) || t.phone.includes(search.trim())))

  async function onCleared(count: number) {
    const result = `已清空 ${count} 条任课`
    setErrors([])
    try {
      await reload()
      setNotice(result)
    } catch {
      setNotice(result + '。覆盖表刷新失败，请刷新页面查看。')
    }
    setShowClearDialog(false)
  }

  async function change(action: () => Promise<string>) {
    setBusy(true)
    setNotice('')
    setErrors([])
    try {
      const result = await action()
      await reload()
      setNotice(result)
    } catch (e) { setNotice(message(e)) } finally { setBusy(false) }
  }
  async function copyNotice() {
    const link = new URL(registerPath, window.location.origin).href
    const text = [
      `各位老师好！${data.school.name}本学期开展学生匿名评教，请先登记您任教的班级和学科。`,
      `登记链接：${link}`,
      `本校登记口令：${data.school.registrationCode}`,
      '首次使用请点“注册”，填写本人姓名、手机号和登记口令。已登记的老师可直接用姓名和手机号登录。',
      '登录后勾选您任教的班级和学科，点“保存任课”。如发现任课已被占用或登记有误，请联系教务处。',
    ].join('\n')
    try { await navigator.clipboard.writeText(text); setManualNotice(''); setNotice('登记通知已复制') }
    catch { setManualNotice(text); setNotice('请选择下方通知，手动复制') }
  }
  function rotateCode() {
    if (!window.confirm('更换后旧口令立即失效，已登记的老师仍可登录。确定更换？')) return
    setManualNotice('')
    void change(async () => {
      await readJson(url + '/registration-code', { method: 'POST' })
      return '口令已更换，请将新通知发给本校老师。'
    })
  }
  function saveTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void change(async () => {
      const edit = editor && editor !== 'new'
      await readJson(edit ? url + '/' + editor.id : url, jsonOptions(edit ? 'PUT' : 'POST', Object.fromEntries(form)))
      setEditor(null)
      return '教师资料已保存'
    })
  }
  async function upload(file: File) {
    await change(async () => {
      const res = await fetch(url + '/workbook', { method: 'POST', body: file })
      const result = await res.json()
      if (!res.ok) {
        setErrors(result.errors ?? [])
        throw new Error(result.error || '整份文件未导入，请修正以下行后重新选择文件。')
      }
      return `已导入 ${result.rows} 行，新增 ${result.createdTeachers} 位教师、${result.addedAssignments} 条任课。`
    })
  }
  return <div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-1 text-sm text-slate-600">{data.school.name}</p><h1 className="text-2xl font-semibold">教师管理</h1></div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">登记口令 <strong className="font-mono">{data.school.registrationCode}</strong></span>
        <Button variant="outline" disabled={busy} onClick={rotateCode}>更换口令</Button>
        <Button variant="outline" disabled={busy} onClick={copyNotice}>复制登记通知</Button>
      </div>
    </header>
    {manualNotice && <textarea aria-label="教师登记通知" rows={5} className="w-full rounded border p-2 text-sm" readOnly value={manualNotice} onFocus={e => e.target.select()} />}
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3">
      <Button variant="outline" size="sm" asChild><a href={url + '/workbook?mode=template'} download>下载导入模板</a></Button>
      <label className="relative inline-flex h-8 items-center rounded-md bg-slate-900 px-3 text-sm text-white focus-within:ring-2">
        导入 Excel<input type="file" aria-label="导入 Excel" accept=".xlsx" disabled={busy}
          className="absolute inset-0 w-full cursor-pointer opacity-0" onChange={e => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void upload(file)
          }} /></label>
      <Button size="sm" variant="outline" asChild><a href={url + '/workbook?mode=export'} download>导出名单和任课</a></Button>
    </div>
    {(busy || notice) && <p role="status" className="rounded-md bg-blue-50 px-3 py-2 text-sm">{busy ? '正在保存…' : notice}</p>}
    {errors.length > 0 && <ul role="alert" className="list-inside list-disc rounded-md bg-red-50 p-3 text-sm text-red-800">
      {errors.map(e => <li key={e.row}>第 {e.row} 行　{e.reason}</li>)}
    </ul>}
    <div className="flex gap-2 border-b pb-2">
      <Button variant={tab === 'coverage' ? 'default' : 'ghost'} onClick={() => setTab('coverage')}>任课覆盖表</Button>
      <Button variant={tab === 'roster' ? 'default' : 'ghost'} onClick={() => setTab('roster')}>教师名单（{data.teachers.length}）</Button>
    </div>
    {tab === 'coverage' ? <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">覆盖率 {total ? Math.round(100 * filled / total) : 0}% <span className="text-sm font-normal">（已登记 {filled} / {total}）</span></h2>
        <Button variant="ghost" size="sm" className="text-slate-600" disabled={busy} onClick={() => setShowClearDialog(true)}>新学期清空任课</Button>
      </div>
      {showClearDialog && <ClearAssignmentsDialog url={url} schoolName={data.school.name}
        onCancel={() => setShowClearDialog(false)} onCleared={onCleared} />}
      <p className="text-sm text-slate-600">点击任课教师或空缺，可指定、改派或清空该项任课。</p>
      <TimetableGrid data={data} cell={(group, subject, owner) => {
        const key = group.id + '/' + subject.id
        const label = group.grade + group.name + subject.name
        if (editingCell === key) return <select autoFocus aria-label={label + '任课教师'} value={owner?.id ?? ''}
          className="max-w-40 border p-1" disabled={busy} onBlur={() => setEditingCell('')} onChange={e => {
            const teacherId = e.target.value ? Number(e.target.value) : null
            setEditingCell('')
            void change(async () => {
              await readJson(url + '/assignments', jsonOptions('PUT', { classId: group.id, subjectId: subject.id, teacherId }))
              return label + '任课已更新'
            })
          }}>
          <option value="">空缺（清空任课）</option>
          {data.teachers.map(t => <option key={t.id} value={t.id}>{t.name}（{t.phone.slice(-4)}）</option>)}
        </select>
        return <button aria-label={label + '：' + (owner?.name ?? '空缺')} disabled={busy} onClick={() => setEditingCell(key)}
          className={'min-h-7 w-full whitespace-nowrap rounded px-1 hover:bg-blue-50 ' + (owner ? '' : 'text-red-700')}>{owner?.name ?? '空缺'}</button>
      }} />
    </section> : <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input aria-label="搜索教师" placeholder="按姓名或手机号搜索" className="max-w-xs" value={search} onChange={e => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={assignedOnly} onChange={e => setAssignedOnly(e.target.checked)} />只看本学期有任课的老师
        </label>
        <Button disabled={busy} onClick={() => setEditor('new')}>新增教师</Button>
      </div>
      {editor && <form key={editor === 'new' ? 'new' : editor.id} onSubmit={saveTeacher} className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
        <h3 className="w-full font-semibold">{editor === 'new' ? '新增教师' : '编辑教师'}</h3>
        <label className="text-sm">姓名<Input required name="name" defaultValue={editor === 'new' ? '' : editor.name} /></label>
        <label className="text-sm">手机号<Input required name="phone" type="tel" pattern="1[3-9][0-9]{9}" maxLength={11} defaultValue={editor === 'new' ? '' : editor.phone} /></label>
        <Button disabled={busy}>保存</Button><Button type="button" variant="outline" onClick={() => setEditor(null)}>取消</Button>
      </form>}
      <div className="overflow-auto rounded-lg border bg-white"><table className="w-full whitespace-nowrap text-left text-sm">
        <thead className="bg-slate-100"><tr>{['姓名', '手机号', '来源', '任课数', '操作'].map(h => <th className="p-2" key={h}>{h}</th>)}</tr></thead>
        <tbody>{matches.map(t => <tr key={t.id} className="border-t">
          <td className="p-2">{t.name}</td><td className="p-2">{t.phone}</td><td className="p-2">{t.source === 'SELF' ? '自主注册' : '后台登记'}</td><td className="p-2">{t._count.assignments}</td>
          <td><Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditor(t)}>编辑</Button>
            <Button variant="ghost" size="sm" disabled={busy} className="text-red-700" onClick={() => {
              if (window.confirm('删除' + t.name + '老师并清空其任课？')) void change(async () => {
                await readJson(url + '/' + t.id, { method: 'DELETE' })
                setEditor(null)
                return '教师已删除'
              })
            }}>删除</Button></td>
        </tr>)}</tbody>
      </table>{!matches.length && <p className="p-4 text-sm">没有匹配的教师。</p>}</div>
    </section>}
  </div>
}
