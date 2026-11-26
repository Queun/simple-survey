export type School = { id: number, name: string, code: string }
export type Teacher = { id: number, name: string, phone: string, source: 'SELF' | 'IMPORT', _count: { assignments: number } }
export type Timetable = {
  subjects: { id: number, name: string }[]
  classes: { id: number, grade: string, name: string, assignments: { subjectId: number, teacher: { id: number, name: string } }[] }[]
}
export type ManagementData = Timetable & { school: School & { registrationCode: string }, teachers: Teacher[] }
export type RegistrationData = Timetable & { teacher: { id: number, name: string, school: { name: string } } }

export async function readJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '操作失败，请重试')
  return data
}

export function jsonOptions(method: string, data: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
}
export function message(error: unknown) {
  return error instanceof Error ? error.message : '网络异常，请重试'
}
