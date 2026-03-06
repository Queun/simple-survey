'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface School {
  id: number
  name: string
  code: string
}

interface CascadeSelectorProps {
  schools: School[]
  selectedSchool: number | null
  selectedGrade: string
  selectedClass: string
  grades: string[]
  classCount: number
  onSchoolChange: (schoolId: number) => void
  onGradeChange: (grade: string) => void
  onClassChange: (className: string) => void
}

export function CascadeSelector({
  schools,
  selectedSchool,
  selectedGrade,
  selectedClass,
  grades,
  classCount,
  onSchoolChange,
  onGradeChange,
  onClassChange,
}: CascadeSelectorProps) {
  const classes = Array.from({ length: classCount }, (_, i) => `${i + 1}班`)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="school">学校 *</Label>
        <Select
          value={selectedSchool?.toString() || ''}
          onValueChange={(value) => onSchoolChange(parseInt(value))}
        >
          <SelectTrigger id="school">
            <SelectValue placeholder="请选择学校" />
          </SelectTrigger>
          <SelectContent>
            {schools.map((school) => (
              <SelectItem key={school.id} value={school.id.toString()}>
                {school.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="grade">年级 *</Label>
        <Select
          value={selectedGrade}
          onValueChange={onGradeChange}
          disabled={!selectedSchool || grades.length === 0}
        >
          <SelectTrigger id="grade">
            <SelectValue placeholder="请选择年级" />
          </SelectTrigger>
          <SelectContent>
            {grades.map((grade) => (
              <SelectItem key={grade} value={grade}>
                {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="class">班级 *</Label>
        <Select
          value={selectedClass}
          onValueChange={onClassChange}
          disabled={!selectedGrade || classes.length === 0}
        >
          <SelectTrigger id="class">
            <SelectValue placeholder="请选择班级" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
