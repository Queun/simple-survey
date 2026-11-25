import { Prisma } from '@prisma/client'

export const periodInclude = {
  subjects: { include: { subject: true }, orderBy: { subject: { order: 'asc' } } },
  _count: { select: { questions: true, submissions: true } },
} satisfies Prisma.PeriodInclude

export function periodView(period: Prisma.PeriodGetPayload<{ include: typeof periodInclude }>) {
  return { ...period, subjects: period.subjects.map(link => link.subject) }
}
