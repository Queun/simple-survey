import TeacherManagement from '@/components/TeacherManagement'

export default async function Page({ params }: { params: Promise<{ schoolId: string }> }) {
  return <TeacherManagement scope={(await params).schoolId} />
}
