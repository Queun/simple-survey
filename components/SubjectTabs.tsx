'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2 } from 'lucide-react'

interface SubjectTabsProps {
  subjects: string[]
  currentSubject: string
  completedSubjects: Set<string>
  onSubjectChange: (subject: string) => void
  children: React.ReactNode
}

export function SubjectTabs({
  subjects,
  currentSubject,
  completedSubjects,
  onSubjectChange,
  children,
}: SubjectTabsProps) {
  return (
    <Tabs value={currentSubject} onValueChange={onSubjectChange}>
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${subjects.length}, 1fr)` }}>
        {subjects.map((subject) => (
          <TabsTrigger
            key={subject}
            value={subject}
            className="relative"
          >
            {subject}
            {completedSubjects.has(subject) && (
              <CheckCircle2 className="ml-1 h-4 w-4 text-green-600" />
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {subjects.map((subject) => (
        <TabsContent key={subject} value={subject} className="mt-4">
          {children}
        </TabsContent>
      ))}
    </Tabs>
  )
}
