export const stageGrades = {
  PRIMARY: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
  MIDDLE: ['初一', '初二', '初三'],
  HIGH: ['高一', '高二', '高三'],
}

export function makeClasses(grades: string[], classCount: number) {
  return grades.flatMap((grade, index) => Array.from({ length: classCount }, (_, i) => ({
    grade, gradeOrder: index + 1, name: `${i + 1}班`, order: i + 1,
  })))
}
