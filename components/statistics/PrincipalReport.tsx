'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PrincipalStatistics } from '@/lib/statistics'
import { cell, numCell, numberText, panel, linkStyle, selectStyle, Table } from './shared'

type Teacher = PrincipalStatistics['teachers'][number]
type Ranked = PrincipalStatistics['subjects'][number]['teachers'][number]

function TeacherTable({ rows, select }: { rows: (Ranked | Teacher)[], select: (id: number) => void }) {
  if (!rows.length) return <p className="text-sm text-slate-600">没有符合条件的老师。</p>
  return <Table headers={['老师', '份数', '均分', '中位数']} numeric={[1, 2, 3]}>
    {rows.map(t => <tr key={t.id}>
      <td className={cell}><a href="#teacher-detail" onClick={() => select(t.id)} className={linkStyle}>{t.name}</a>
        {'subjects' in t && <span className="ml-2 text-xs text-slate-500">{t.subjects.join('、')}</span>}</td>
      <td className={numCell}>{t.count}</td><td className={numCell}>{numberText(t.mean)}</td><td className={numCell}>{numberText(t.median)}</td>
    </tr>)}
  </Table>
}

function TeacherDetail({ teacher }: { teacher: Teacher }) {
  const visible = teacher.classes.flatMap(c => c.mean === null ? [] : [c.mean])
  const highest = Math.max(...visible), lowest = Math.min(...visible)
  return <section id="teacher-detail" tabIndex={-1} className={panel}>
    <h2 className="text-lg font-semibold">{teacher.name} · 评价详情</h2>
    <p className="text-sm tabular-nums">总体均分 <strong>{numberText(teacher.mean)}</strong>　共 {teacher.count} 份　中位数 {numberText(teacher.median)}　最高分 {numberText(teacher.highest)}　最低分 {numberText(teacher.lowest)}</p>
    <h3 className="font-semibold">任教班级对比</h3>
    {teacher.classes.length ? <Table headers={['班级', '份数', '均分']} numeric={[1, 2]}>
      {teacher.classes.map(c => <tr key={c.id}><td className={cell}>{c.grade} · {c.name}
        {visible.length > 1 && c.mean !== null && (c.mean === highest || c.mean === lowest) &&
          <span className="ml-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">{highest === lowest ? '并列最高、最低' : c.mean === highest ? '最高' : '最低'}</span>}
      </td><td className={numCell}>{c.count}</td><td className={numCell}>{numberText(c.mean)}</td></tr>)}
    </Table> : <p>暂无任教班级。</p>}
    <h3 className="font-semibold">各题得分</h3>
    <Table headers={['题目', '份数', '均分']} numeric={[1, 2]}>{teacher.questions.map(q => <tr key={q.id}>
      <td className={cell}>{q.order}. {q.content}</td><td className={numCell}>{q.count}</td><td className={numCell}>{numberText(q.mean)}</td></tr>)}</Table>
  </section>
}

export default function PrincipalReport({ data, grade, periodId }: { data: PrincipalStatistics, grade?: string, periodId: number }) {
  const [search, setSearch] = useState('')
  const [order, setOrder] = useState('desc')
  const [selected, setSelected] = useState<number | null>(null)
  const teacher = data.teachers.find(t => t.id === selected)
  const teachers = data.teachers.filter(t => t.name.includes(search.trim()))
  if (order === 'asc') teachers.sort((a, b) => (a.mean ?? Infinity) - (b.mean ?? Infinity))
  const base = `/principal/statistics?periodId=${periodId}`
  return <>
    <section className={panel}>
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">按年级查看</h2>
        <Link className={linkStyle} href={base} aria-current={!grade ? 'true' : undefined}>全部年级</Link></div>
      <Table headers={['年级', '份数', '均分']} numeric={[1, 2]}>{data.grades.map(g => <tr key={g.name} className={grade === g.name ? 'bg-blue-50' : undefined}>
        <td className={cell}><Link href={base + '&grade=' + encodeURIComponent(g.name)} className={linkStyle} aria-current={grade === g.name ? 'true' : undefined}>{g.name}</Link></td>
        <td className={numCell}>{g.count}</td><td className={numCell}>{numberText(g.mean)}</td></tr>)}</Table>
    </section>
    <section className={panel}>
      <h2 className="text-lg font-semibold">学科评价 <span className="ml-2 text-sm font-normal text-slate-600">{grade ?? '全部年级'}</span></h2>
      {data.subjects.some(s => s.mean !== null) && <div className="h-44" aria-hidden="true"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 176 }}>
        <BarChart data={data.subjects} margin={{ top: 10, left: -16, right: 12 }}><CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip /><Bar dataKey="mean" name="均分" fill="#2563eb" maxBarSize={48} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart></ResponsiveContainer></div>}
      {data.subjects.map(s => <details key={s.id} className="border-b pb-2">
        <summary className="cursor-pointer rounded py-2"><strong>{s.name}</strong>
          <span className="float-right text-sm text-slate-600 tabular-nums">{s.count} 份　均分 {numberText(s.mean)}</span></summary>
        <TeacherTable rows={s.teachers} select={setSelected} />
      </details>)}
    </section>
    <section className={panel}><h2 className="text-lg font-semibold">老师列表 <span className="ml-2 text-sm font-normal text-slate-600">{grade ?? '全部年级'}</span></h2>
      <div className="flex flex-wrap gap-3"><input aria-label="搜索老师姓名" placeholder="搜索老师姓名" className={selectStyle}
        value={search} onChange={e => setSearch(e.target.value)} />
        <select aria-label="按均分排序" className={selectStyle} value={order} onChange={e => setOrder(e.target.value)}>
          <option value="desc">均分从高到低</option><option value="asc">均分从低到高</option>
        </select></div>
      <TeacherTable rows={teachers} select={setSelected} />
    </section>
    {teacher && <TeacherDetail teacher={teacher} />}
  </>
}
