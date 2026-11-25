'use client'

import { FormEvent, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { jsonOptions, message, readJson, School } from './teacher-data'

export default function TeacherEntry({ schools, schoolCode }: { schools: School[], schoolCode?: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [schoolId, setSchoolId] = useState(schools.find(s => s.code === schoolCode)?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const register = mode === 'register'
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const data = { name: fields.get('name'), phone: fields.get('phone'), ...(register ? { schoolId: Number(schoolId) } : {}) }
      await readJson('/api/teacher/' + mode, jsonOptions('POST', data))
      window.location.replace('/teacher/classes')
    } catch (e) { setError(message(e)); setBusy(false) }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
    <section className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold">教师任课登记</h1>
      <p className="mt-2 text-sm text-slate-600">请用本人姓名和完整手机号登录。首次登记可选择注册。</p>
      <div className="my-6 flex gap-1 rounded-md bg-slate-100 p-1">
        {(['login', 'register'] as const).map(value => <button type="button" key={value} disabled={busy}
          aria-pressed={mode === value} onClick={() => { setMode(value); setError('') }}
          className="flex-1 rounded py-2 text-sm aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:shadow-sm">
          {value === 'login' ? '登录' : '注册'}</button>)}
      </div>
      <form onSubmit={submit} className="grid gap-4">
        {register && <label className="grid gap-1 text-sm">所在学校
          <select required value={schoolId} onChange={e => setSchoolId(e.target.value)} className="rounded-md border p-2">
            <option value="">请选择学校</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>}
        <label className="grid gap-1 text-sm">姓名<Input name="name" required autoComplete="name" /></label>
        <label className="grid gap-1 text-sm">手机号<Input name="phone" type="tel" required pattern="1[3-9][0-9]{9}" maxLength={11}
          title="请输入 11 位大陆手机号" placeholder="11 位手机号" autoComplete="tel-national" /></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button disabled={busy} type="submit">{busy ? '正在提交…' : register ? '注册并登记任课' : '登录'}</Button>
      </form>
    </section>
  </main>
}
