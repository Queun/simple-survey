'use client'

import { useState } from 'react'
import { LinkGeneratorModal } from '@/components/LinkGeneratorModal'
import { linkStyle } from '@/components/statistics/shared'

export function PrincipalSurveyLink({ periodId, schoolId }: { periodId: number, schoolId: number }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className={linkStyle} onClick={() => setOpen(true)}>生成学生填报链接</button>
    {open && <LinkGeneratorModal periodId={periodId} schoolId={schoolId} onClose={() => setOpen(false)} />}
  </>
}
