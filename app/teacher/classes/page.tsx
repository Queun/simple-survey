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
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form action={signOut} className="w-full max-w-sm rounded-xl border bg-white p-6 text-center">
        <p className="text-slate-700">登录状态已失效，请重新登录。</p>
        <button className="mt-4 min-h-11 w-full rounded-lg bg-slate-900 px-4 text-white">重新登录</button>
      </form>
    </main>
  }
  return <TeacherClasses initial={data} />
}
