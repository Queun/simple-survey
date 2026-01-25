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
  onSchoolChange: (schoolId: number) => void
  onGradeChange: (grade: string) => void
  onClassChange: (className: string) => void
}

const GRADES = ['高一', '高二', '高三']
const CLASSES = ['1班', '2班', '3班', '4班', '5班', '6班', '7班', '8班', '9班', '10班']

export function CascadeSelector({
  schools,
  selectedSchool,
  selectedGrade,
  selectedClass,
  onSchoolChange,
  onGradeChange,
  onClassChange,
}: CascadeSelectorProps) {
  return (
    <div className="space-y-4">
      {/* 学校选择 */}
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

      {/* 年级选择 */}
      <div className="space-y-2">
        <Label htmlFor="grade">年级 *</Label>
        <Select
          value={selectedGrade}
          onValueChange={onGradeChange}
          disabled={!selectedSchool}
        >
          <SelectTrigger id="grade">
            <SelectValue placeholder="请选择年级" />
          </SelectTrigger>
          <SelectContent>
            {GRADES.map((grade) => (
              <SelectItem key={grade} value={grade}>
                {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 班级选择 */}
      <div className="space-y-2">
        <Label htmlFor="class">班级 *</Label>
        <Select
          value={selectedClass}
          onValueChange={onClassChange}
          disabled={!selectedGrade}
        >
          <SelectTrigger id="class">
            <SelectValue placeholder="请选择班级" />
          </SelectTrigger>
          <SelectContent>
            {CLASSES.map((cls) => (
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
