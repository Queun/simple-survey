'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, School, FileText, Award } from 'lucide-react'

interface SubjectStat {
  subjectId: string
  subjectName: string
  totalScore: number
  answerCount: number
  averageScore: number
}

interface SchoolStat {
  schoolId: number
  schoolName: string
  schoolCode: string
  submissionCount: number
  subjects: SubjectStat[]
}

interface Period {
  id: number
  name: string
  isActive: boolean
}

interface StatisticsData {
  schools: SchoolStat[]
  periods: Period[]
}

export default function AdminStatisticsPage() {
  const [data, setData] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null)
  const [initialPeriodSet, setInitialPeriodSet] = useState(false)

  useEffect(() => {
    fetchStatistics()
  }, [selectedPeriod])

  async function fetchStatistics() {
    try {
      const token = localStorage.getItem('token')
      const url = selectedPeriod
        ? `/api/admin/statistics?periodId=${selectedPeriod}`
        : '/api/admin/statistics'

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch statistics')
      }

      const result = await res.json()
      setData(result)

      // 首次加载时默认选最新一期
      if (!initialPeriodSet && result.periods && result.periods.length > 0) {
        setInitialPeriodSet(true)
        setSelectedPeriod(result.periods[0].id)
      }
    } catch (err) {
      console.error('Error fetching statistics:', err)
      setError('加载统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 准备分组柱状图数据（以科目为X轴，各学校为柱）
  const prepareGroupedBarChartData = () => {
    if (!data || data.schools.length === 0) return []

    const subjectMap = new Map<string, string>()
    data.schools.forEach(school => {
      school.subjects.forEach(subject => {
        subjectMap.set(subject.subjectId, subject.subjectName)
      })
    })

    return Array.from(subjectMap.entries()).map(([subjectId, subjectName]) => {
      const item: any = { subject: subjectName }
      data.schools.forEach(school => {
        const subject = school.subjects.find(s => s.subjectId === subjectId)
        item[school.schoolName] = subject?.averageScore || 0
      })
      return item
    })
  }

  // 计算整体统计数据
  const calculateOverallStats = () => {
    if (!data) return { totalSubmissions: 0, avgScore: 0, topSchool: '', topScore: 0 }

    const totalSubmissions = data.schools.reduce((sum, school) => sum + school.submissionCount, 0)

    // 计算所有学校的平均分
    let totalScoreSum = 0
    let totalAnswerCount = 0

    data.schools.forEach(school => {
      school.subjects.forEach(subject => {
        totalScoreSum += subject.totalScore
        totalAnswerCount += subject.answerCount
      })
    })

    const avgScore = totalAnswerCount > 0 ? (totalScoreSum / totalAnswerCount).toFixed(2) : '0.00'

    // 找出平均分最高的学校
    let topSchool = ''
    let topScore = 0

    data.schools.forEach(school => {
      let schoolTotalScore = 0
      let schoolAnswerCount = 0

      school.subjects.forEach(subject => {
        schoolTotalScore += subject.totalScore
        schoolAnswerCount += subject.answerCount
      })

      const schoolAvg = schoolAnswerCount > 0 ? schoolTotalScore / schoolAnswerCount : 0

      if (schoolAvg > topScore) {
        topScore = schoolAvg
        topSchool = school.schoolName
      }
    })

    return {
      totalSubmissions,
      avgScore: parseFloat(avgScore),
      topSchool,
      topScore: parseFloat(topScore.toFixed(2))
    }
  }

  const groupedBarChartData = prepareGroupedBarChartData()
  const overallStats = calculateOverallStats()

  // 获取所有学校名称（用于分组柱状图图例）
  const schoolNames = data?.schools.map(s => s.schoolName) ?? []

  // 获取所有科目名称（用于详细表格）
  const getAllSubjectNames = () => {
    if (!data || data.schools.length === 0) return []
    const names = new Set<string>()
    data.schools.forEach(school => {
      school.subjects.forEach(subject => names.add(subject.subjectName))
    })
    return Array.from(names)
  }

  const subjectNames = getAllSubjectNames()

  // 颜色数组
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#a4de6c']

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题和期数筛选 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">数据统计</h2>
            <p className="mt-2 text-gray-600">查看各学校问卷调研数据对比</p>
          </div>

          {data && data.periods.length > 0 && (
            <div className="w-64">
              <Label htmlFor="period">筛选期数</Label>
              <select
                id="period"
                value={selectedPeriod || ''}
                onChange={(e) => setSelectedPeriod(e.target.value ? parseInt(e.target.value) : null)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">全部期数</option>
                {data.periods.map(period => (
                  <option key={period.id} value={period.id}>
                    {period.name} {period.isActive && '(进行中)'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">加载中...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-lg text-red-600">{error}</div>
          </div>
        ) : !data || data.schools.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">暂无统计数据</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">参与学校数</CardTitle>
                  <School className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.schools.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总提交数</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallStats.totalSubmissions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">整体平均分</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallStats.avgScore}</div>
                  <p className="text-xs text-muted-foreground mt-1">满分 5.0</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">最高分学校</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold truncate">{overallStats.topSchool || '-'}</div>
                  <p className="text-xs text-muted-foreground mt-1">平均分 {overallStats.topScore}</p>
                </CardContent>
              </Card>
            </div>

            {/* 分组柱状图 - 各科目跨校平均分对比 */}
            <Card>
              <CardHeader>
                <CardTitle>各科目跨校平均分对比</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={groupedBarChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    {schoolNames.map((name, index) => (
                      <Bar key={name} dataKey={name} fill={colors[index % colors.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 详细数据表格 */}
            <Card>
              <CardHeader>
                <CardTitle>详细数据</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">学校</th>
                        <th className="text-center py-3 px-4">提交数</th>
                        {subjectNames.map(name => (
                          <th key={name} className="text-center py-3 px-4">{name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.schools.map(school => (
                        <tr key={school.schoolId} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{school.schoolName}</td>
                          <td className="py-3 px-4 text-center">{school.submissionCount}</td>
                          {subjectNames.map(name => {
                            const subject = school.subjects.find(s => s.subjectName === name)
                            return (
                              <td key={name} className="py-3 px-4 text-center">
                                {subject ? subject.averageScore.toFixed(2) : '-'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
