import { SurveyForm } from './survey-form'
import { urlId } from '@/lib/api'
import { RequestError } from '@/lib/response'
import { readSurvey } from '@/lib/survey'

interface Props {
  params: Promise<{ periodId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SurveyPage({ params, searchParams }: Props) {
  const periodId = urlId.safeParse((await params).periodId)
  if (!periodId.success) return <main className="p-8">调研期不存在</main>
  const query = await searchParams
  try {
    const { id, name, questions, schools } = await readSurvey(periodId.data)
    const school = schools.find(s => String(s.id) === query.school)
    const grade = school?.grades.find(g => g.name === query.grade)
    const group = grade?.classes.find(c => String(c.id) === query.class) ?? grade?.classes.find(c => c.name === query.class)
    return <SurveyForm key={[id, school?.id, grade?.name, group?.id].join('/')}
      periodId={id} name={name} questions={questions} schools={schools}
      initialSchool={String(school?.id ?? '')} initialGrade={grade?.name ?? ''} initialClass={String(group?.id ?? '')} />
  } catch (error) {
    if (!(error instanceof RequestError)) throw error
    return <main className="mx-auto max-w-xl p-8 text-xl">{error.message}</main>
  }
}
