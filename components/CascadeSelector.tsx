import { Label } from '@/components/ui/label'

interface Choice { id: number, name: string }
export interface SurveySchool extends Choice { grades: { name: string, classes: Choice[] }[] }

interface Props {
  schools: SurveySchool[]
  schoolId: string
  grade: string
  classId: string
  onSchoolChange: (id: string) => void
  onGradeChange: (name: string) => void
  onClassChange: (id: string) => void
}

export function CascadeSelector({ schools, schoolId, grade, classId, onSchoolChange, onGradeChange, onClassChange }: Props) {
  const grades = schools.find(s => String(s.id) === schoolId)?.grades ?? []
  const classes = grades.find(g => g.name === grade)?.classes ?? []
  const style = 'mt-2 min-h-12 w-full rounded-lg border bg-white px-3 text-lg disabled:bg-slate-50'
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="school">学校</Label>
        <select id="school" className={style} value={schoolId} onChange={e => onSchoolChange(e.target.value)}>
          <option value="">请选择学校</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <Label htmlFor="grade">年级</Label>
        <select id="grade" className={style} disabled={!grades.length} value={grade} onChange={e => onGradeChange(e.target.value)}>
          <option value="">请选择年级</option>
          {grades.map(g => <option key={g.name}>{g.name}</option>)}
        </select>
      </div>
      <div>
        <Label htmlFor="class">班级</Label>
        <select id="class" className={style} disabled={!classes.length} value={classId} onChange={e => onClassChange(e.target.value)}>
          <option value="">请选择班级</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    </div>
  )
}
