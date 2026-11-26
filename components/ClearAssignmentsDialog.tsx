'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { jsonOptions, message, readJson } from './teacher-data'
import { Button } from './ui/button'
import { Input } from './ui/input'

type Props = {
  url: string
  schoolName: string
  onCancel: () => void
  onCleared: (count: number) => Promise<void>
}

export default function ClearAssignmentsDialog({ url, schoolName, onCancel, onCleared }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [confirmName, setConfirmName] = useState('')
  const [hasActiveSubmissions, setHasActiveSubmissions] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const endpoint = url + '/assignments/clear'

  useEffect(() => {
    const modal = dialog.current!
    modal.showModal()
    const controller = new AbortController()
    readJson<{ hasActiveSubmissions: boolean }>(endpoint, { signal: controller.signal, cache: 'no-store' })
      .then(result => setHasActiveSubmissions(result.hasActiveSubmissions))
      .catch(e => { if (!controller.signal.aborted) setError('读取调研状态失败，请重新打开确认框。' + message(e)) })
    return () => { controller.abort(); modal.close() }
  }, [endpoint])

  const canClear = !saving && hasActiveSubmissions !== null && confirmName === schoolName
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canClear) return
    setSaving(true)
    setError('')
    try {
      const result = await readJson<{ count: number }>(endpoint, jsonOptions('POST', { confirmName }))
      await onCleared(result.count)
    } catch (e) {
      setError(message(e))
      setSaving(false)
    }
  }

  return <dialog ref={dialog} aria-labelledby="clear-assignments-title"
    className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border bg-white p-5 shadow-lg backdrop:bg-black/40"
    onCancel={e => { e.preventDefault(); if (!saving) onCancel() }}>
    <form onSubmit={submit} className="space-y-4">
      <h2 id="clear-assignments-title" className="text-lg font-semibold">新学期清空任课</h2>
      <p className="text-sm">清空后，本校任课覆盖率将归零，老师需要重新登记任课。教师名单、账号和历史评价结果都会保留。</p>
      <a href={url + '/workbook?mode=export'} download className="text-sm text-blue-700 underline">先导出当前名单和任课</a>
      {hasActiveSubmissions && <p role="alert" className="rounded-md bg-amber-100 p-3 text-sm font-semibold text-amber-950">
        本期调研还在进行中，清空后学生将看不到老师，无法继续填写
      </p>}
      <label className="block text-sm">请输入学校全称「{schoolName}」以确认清空全部任课
        <Input className="mt-2" value={confirmName} autoComplete="off" disabled={saving} onChange={e => setConfirmName(e.target.value)} />
      </label>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p>
        : hasActiveSubmissions === null && <p role="status" className="text-sm">正在核对本校调研状态…</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>取消</Button>
        <Button type="submit" variant="destructive" disabled={!canClear}>{saving ? '正在清空…' : '确认清空'}</Button>
      </div>
    </form>
  </dialog>
}
