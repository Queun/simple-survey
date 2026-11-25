'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { CascadeSelector, type SurveySchool } from '@/components/CascadeSelector'
import { QuestionList } from '@/components/QuestionList'
import { SubjectTabs } from '@/components/SubjectTabs'
import type { ClassSubject, SurveyQuestion } from '@/lib/survey'

const savedDraft = z.object({
  attemptId: z.uuid(),
  answers: z.record(z.string(), z.record(z.string(), z.int32())),
})
type Draft = z.infer<typeof savedDraft>

function loadDraft(key: string): Draft {
  const raw = localStorage.getItem(key)
  if (raw) {
    try {
      const saved = savedDraft.safeParse(JSON.parse(raw))
      if (saved.success) return saved.data
    } catch { /* A damaged draft can be replaced on this device. */ }
  }
  // getRandomValues also works on classroom computers using a local HTTP address.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  const attemptId = [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
  return { attemptId, answers: {} }
}

interface Props {
  periodId: number
  name: string
  questions: SurveyQuestion[]
  schools: SurveySchool[]
  initialSchool: string
  initialGrade: string
  initialClass: string
}

export function SurveyForm({ periodId, name, questions, schools, initialSchool, initialGrade, initialClass }: Props) {
  const [schoolId, setSchool] = useState(initialSchool)
  const [grade, setGrade] = useState(initialGrade)
  const [classId, setClass] = useState(initialClass)
  const [subjects, setSubjects] = useState<ClassSubject[]>([])
  const [current, setCurrent] = useState(0)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const storageKey = 'survey_' + periodId + '_' + classId
  const selection = new URLSearchParams({ school: schoolId, grade, class: classId })
  const school = schools.find(s => s.id === Number(schoolId))
  const group = school?.grades.find(g => g.name === grade)?.classes.find(c => c.id === Number(classId))
  const completed = new Set(subjects.filter(s => questions.every(q =>
    q.options.some(o => o.score === draft?.answers[s.id]?.[q.id]))).map(s => s.id))
  const nextSubject = subjects.find(s => !completed.has(s.id) && s.id !== current)
  const actionStyle = 'min-h-12 px-6 text-lg'

  async function start() {
    if (!group || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/surveys/' + periodId + '/classes/' + classId, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (!data.subjects.length) throw new Error('本班暂未登记任课老师，请联系老师')
      if (!questions.length) throw new Error('本期暂未设置题目，请联系老师')
      const restored = loadDraft(storageKey)
      localStorage.setItem(storageKey, JSON.stringify(restored))
      window.history.replaceState(window.history.state, '', '?' + selection)
      setSubjects(data.subjects)
      setCurrent(data.subjects[0].id)
      setDraft(restored)
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法开始填写，请重试')
    } finally { setBusy(false) }
  }

  function answer(questionId: number, score: number) {
    if (!draft || busy) return
    const next = { ...draft, answers: { ...draft.answers,
      [current]: { ...draft.answers[current], [questionId]: score },
    } }
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setDraft(next)
      setError('')
    } catch { setError('草稿无法保存，请检查浏览器存储后重试') }
  }

  async function submit() {
    if (!draft || busy || completed.size !== subjects.length) return
    setBusy(true)
    setError('')
    try {
      const answers = subjects.flatMap(s => questions.map(q => ({
        subjectId: s.id, questionId: q.id, score: draft.answers[s.id][q.id],
      })))
      const res = await fetch('/api/submissions', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': draft.attemptId },
        body: JSON.stringify({ periodId, classId: Number(classId), answers }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      localStorage.removeItem(storageKey)
      window.location.replace('/survey/success?periodId=' + periodId + '&' + selection)
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试')
      setBusy(false)
    }
  }

  function changeClass() {
    setDraft(null)
    setSubjects([])
    setError('')
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-5">
        <header>
          <h1 className="text-3xl font-bold">{name}</h1>
          <p className="mt-2 text-lg text-teal-800">匿名填写，老师看不到是谁填的</p>
        </header>
        {draft ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{school?.name} · {grade} · {group?.name}</p>
              <Button variant="outline" disabled={busy} onClick={changeClass}>返回选班</Button>
            </div>
            <fieldset disabled={busy}>
              <SubjectTabs subjects={subjects} completed={completed} current={current} onChange={setCurrent}>
                <QuestionList questions={questions} answers={draft.answers[current] ?? {}} onAnswerChange={answer} />
              </SubjectTabs>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p aria-live="polite">已完成 {completed.size} / {subjects.length} 个学科</p>
              {nextSubject && <Button variant="outline" className={actionStyle} disabled={busy}
                onClick={() => { setCurrent(nextSubject.id); window.scrollTo(0, 0) }}>下一学科</Button>}
              <Button className={actionStyle} disabled={busy || completed.size !== subjects.length} onClick={submit}>
                {busy ? '正在提交…' : '提交全部评价'}
              </Button>
            </div>
          </>
        ) : (
          <fieldset disabled={busy} className="space-y-6 rounded-xl border bg-white p-6">
            <h2 className="text-xl font-semibold">选择你的班级</h2>
            <CascadeSelector schools={schools} schoolId={schoolId} grade={grade} classId={classId}
              onSchoolChange={id => { setSchool(id); setGrade(''); setClass(''); setError('') }}
              onGradeChange={value => { setGrade(value); setClass(''); setError('') }}
              onClassChange={id => { setClass(id); setError('') }} />
            <Button className={actionStyle} disabled={!group || busy} onClick={start}>{busy ? '正在加载…' : '开始填写'}</Button>
          </fieldset>
        )}
        {error && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-lg">{error}</p>}
      </div>
    </main>
  )
}
