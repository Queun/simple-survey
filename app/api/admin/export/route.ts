import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'
import { errorResponse } from '@/lib/response'
import * as XLSX from 'xlsx'

// GET /api/admin/export - 导出统计数据
export const GET = withAuth(
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url)
      const periodId = searchParams.get('periodId')
      const format = searchParams.get('format') || 'excel' // excel 或 csv

      const whereCondition: any = {}
      if (periodId) {
        whereCondition.periodId = parseInt(periodId, 10)
      }

      // 获取所有提交数据及其答案
      const submissions = await prisma.submission.findMany({
        where: whereCondition,
        include: {
          answers: {
            select: {
              subject: true,
              questionId: true,
              score: true,
              question: {
                select: {
                  content: true
                }
              }
            }
          },
          school: {
            select: {
              name: true,
              code: true
            }
          },
          period: {
            select: {
              name: true
            }
          }
        },
        orderBy: [
          { schoolId: 'asc' },
          { createdAt: 'desc' }
        ]
      })

      if (submissions.length === 0) {
        return errorResponse('暂无数据可导出', 400)
      }

      // 准备导出数据
      const exportData: any[] = []

      for (const submission of submissions) {
        // 按科目分组答案
        const answersBySubject: { [key: string]: any[] } = {}

        for (const answer of submission.answers) {
          if (!answersBySubject[answer.subject]) {
            answersBySubject[answer.subject] = []
          }
          answersBySubject[answer.subject].push(answer)
        }

        // 为每个科目创建一行数据
        for (const [subject, answers] of Object.entries(answersBySubject)) {
          const totalScore = answers.reduce((sum, a) => sum + a.score, 0)
          const avgScore = totalScore / answers.length

          const row: any = {
            '调研期': submission.period.name,
            '学校名称': submission.school.name,
            '学校代码': submission.school.code,
            '年级': submission.grade,
            '班级': submission.className,
            '科目': subject,
            '评价数量': answers.length,
            '总分': totalScore,
            '平均分': parseFloat(avgScore.toFixed(2)),
            '提交时间': new Date(submission.createdAt).toLocaleString('zh-CN')
          }

          // 添加每个问题的详细分数
          answers.forEach((answer, index) => {
            row[`问题${index + 1}`] = answer.question.content
            row[`问题${index + 1}得分`] = answer.score
          })

          exportData.push(row)
        }
      }

      if (format === 'csv') {
        // 生成CSV
        const csv = convertToCSV(exportData)

        return new Response(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="survey-data-${Date.now()}.csv"`,
          },
        })
      } else {
        // 生成Excel
        const workbook = XLSX.utils.book_new()
        const worksheet = XLSX.utils.json_to_sheet(exportData)

        // 设置列宽
        const colWidths = [
          { wch: 20 }, // 调研期
          { wch: 20 }, // 学校名称
          { wch: 15 }, // 学校代码
          { wch: 10 }, // 年级
          { wch: 10 }, // 班级
          { wch: 15 }, // 科目
          { wch: 12 }, // 评价数量
          { wch: 10 }, // 总分
          { wch: 10 }, // 平均分
          { wch: 20 }, // 提交时间
        ]
        worksheet['!cols'] = colWidths

        XLSX.utils.book_append_sheet(workbook, worksheet, '调研数据')

        // 生成Excel文件
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

        return new Response(excelBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="survey-data-${Date.now()}.xlsx"`,
          },
        })
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      return errorResponse('导出数据失败', 500)
    }
  },
  { requiredRole: 'ADMIN' }
)

// 将JSON数据转换为CSV格式
function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  // 获取所有列名
  const headers = Object.keys(data[0])

  // 创建CSV头部
  const csvRows = [headers.join(',')]

  // 添加数据行
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      // 处理包含逗号或换行符的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value ?? ''
    })
    csvRows.push(values.join(','))
  }

  // 添加BOM以支持中文
  return '\uFEFF' + csvRows.join('\n')
}
