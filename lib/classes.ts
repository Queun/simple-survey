export const stageGrades = {
  PRIMARY: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
  MIDDLE: ['初一', '初二', '初三'],
  HIGH: ['高一', '高二', '高三'],
}

export type GradeConfig = { name: string, classCount: number }

export function gradeCounts(classes: { grade: string }[]): GradeConfig[] {
  const counts = new Map<string, number>()
  for (const { grade } of classes) counts.set(grade, (counts.get(grade) ?? 0) + 1)
  return Array.from(counts, ([name, classCount]) => ({ name, classCount }))
}

export function makeClasses(grades: GradeConfig[]) {
  return grades.flatMap(({ name: grade, classCount }, index) => Array.from({ length: classCount }, (_, i) => ({
    grade, gradeOrder: index + 1, name: `${i + 1}班`, order: i + 1,
  })))
}
