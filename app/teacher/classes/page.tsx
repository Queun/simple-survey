import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TeacherClasses from '@/components/TeacherClasses'
import { cookieName, readSession } from '@/lib/session'
import { registrationData } from '@/lib/teacher-management'

export default async function Page() {
  const session = readSession((await cookies()).get(cookieName)?.value)
  if (session?.role !== 'TEACHER') redirect('/teacher')
  const data = await registrationData(session.id)
  if (!data) {
    async function signOut() {
      'use server'
      const jar = await cookies()
      jar.delete(cookieName)
      redirect('/teacher')
    }
    return <form action={signOut} className="p-6">
      登录状态已失效。<button className="underline">重新登录</button></form>
  }
  return <TeacherClasses initial={data} />
}
