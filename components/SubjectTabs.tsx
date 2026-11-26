'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ClassSubject } from '@/lib/survey'

interface Props {
  subjects: ClassSubject[]
  completed: Set<number>
  current: number
  onChange: (id: number) => void
  children: React.ReactNode
}

export function SubjectTabs({ subjects, completed, current, onChange, children }: Props) {
  return (
    <Tabs value={String(current)} onValueChange={value => onChange(Number(value))}>
      <TabsList aria-label="选择评价学科" className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 sm:flex sm:flex-wrap sm:justify-start">
        {subjects.map(s => (
          <TabsTrigger key={s.id} value={String(s.id)}
            className="h-auto min-h-12 max-w-full flex-none flex-col items-start justify-start gap-0.5 whitespace-normal rounded-lg border border-slate-300 bg-white px-4 py-2 text-base data-[state=active]:border-teal-700 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-900">
            <span className="max-w-full wrap-anywhere text-left">{s.name}<span className="hidden sm:inline"> · </span><br className="sm:hidden" />{s.teacherName}老师</span>
            <span className="text-sm">{completed.has(s.id) ? '✓ 已完成' : '待完成'}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {subjects.map(s => <TabsContent key={s.id} value={String(s.id)}>{children}</TabsContent>)}
    </Tabs>
  )
}
