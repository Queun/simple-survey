import TeacherEntry from '@/components/TeacherEntry'
import { prisma } from '@/lib/prisma'

export default async function Page({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const { school } = await searchParams
  const schools = await prisma.school.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } })
  return <TeacherEntry schools={schools} schoolCode={school} />
}
