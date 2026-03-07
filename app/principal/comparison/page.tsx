'use client'

import { useEffect, useState } from 'react'
import PrincipalLayout from '@/components/PrincipalLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Award, Users } from 'lucide-react'

interface SubjectStat {
  subjectId: string
  subjectName: string
  totalScore: number
  answerCount: number
  averageScore: number
}

interface MySchoolStat {
  schoolId: number
  schoolName: string
  submissionCount: number
  subjects: SubjectStat[]
}

interface SchoolComparison {
  schoolId: number
  schoolName: string
  submissionCount: number
  subjects: SubjectStat[]
}

interface Period {
  id: number
  name: string
  isActive: boolean
}

interface StatisticsData {
  mySchool: MySchoolStat
  comparison: SchoolComparison[]
  periods: Period[]
}

export default function PrincipalComparisonPage() {
  const [data, setData] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null)
  const [initialPeriodSet, setInitialPeriodSet] = useState(false)

  useEffect(() => {
    fetchStatistics()
  }, [selectedPeriod])

  async function fetchStatistics() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const url = selectedPeriod
        ? `/api/principal/statistics?periodId=${selectedPeriod}`
        : '/api/principal/statistics'

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Failed to fetch statistics')

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

  // 分组柱状图：每个科目一组，组内每根柱子代表一所学校
  const prepareBarChartData = () => {
    if (!data || !data.comparison || data.comparison.length === 0) return []

    const subjectMap = new Map<string, string>()
    data.comparison.forEach(school => {
      school.subjects.forEach(subject => {
        subjectMap.set(subject.subjectId, subject.subjectName)
      })
    })

    return Array.from(subjectMap.entries()).map(([subjectId, subjectName]) => {
      const item: any = { subject: subjectName }
      data.comparison.forEach(school => {
        const subject = school.subjects.find(s => s.subjectId === subjectId)
        item[school.schoolName] = subject?.averageScore || 0
      })
      return item
    })
  }

  const calculateRanking = () => {
    if (!data || !data.comparison) return '-'

    const schoolAvgs = data.comparison.map(school => {
      let totalScore = 0
      let totalCount = 0
      school.subjects.forEach(subject => {
        totalScore += subject.totalScore
        totalCount += subject.answerCount
      })
      return { schoolId: school.schoolId, avgScore: totalCount > 0 ? totalScore / totalCount : 0 }
    })

    schoolAvgs.sort((a, b) => b.avgScore - a.avgScore)
    const myRank = schoolAvgs.findIndex(s => s.schoolId === data.mySchool.schoolId)
    return myRank >= 0 ? `${myRank + 1} / ${schoolAvgs.length}` : '-'
  }

  const barChartData = prepareBarChartData()
  const myRanking = calculateRanking()
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#a4de6c']
  const subjectNames = data?.mySchool.subjects.map(s => s.subjectName) ?? []
  const selectedPeriodName = selectedPeriod && data
    ? data.periods.find(p => p.id === selectedPeriod)?.name
    : null

  return (
    <PrincipalLayout>
      <div className="space-y-6">
        {/* 页面标题和期数筛选 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">校际对比</h2>
            <div className="flex items-center space-x-2 mt-2">
              <p className="text-gray-600">与其他学校进行横向对比分析</p>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedPeriodName ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {selectedPeriodName || '全部期数'}
              </span>
            </div>
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
        ) : !data || data.comparison.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">暂无跨校对比数据</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 排名卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">全市排名</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myRanking}</div>
                  <p className="text-xs text-muted-foreground mt-1">综合平均分排名</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">参与学校数</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.comparison.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">所有参与对比的学校</p>
                </CardContent>
              </Card>
            </div>

            {/* 分组柱状图 */}
            {barChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>各科目跨校平均分对比</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Legend />
                      {data.comparison.map((school, index) => (
                        <Bar
                          key={school.schoolId}
                          dataKey={school.schoolName}
                          fill={colors[index % colors.length]}
                          opacity={school.schoolId === data.mySchool.schoolId ? 1 : 0.6}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    注：本校数据显示为实色，其他学校半透明
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 对比表格 */}
            <Card>
              <CardHeader>
                <CardTitle>跨校对比数据</CardTitle>
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
                      {data.comparison.map(school => (
                        <tr
                          key={school.schoolId}
                          className={`border-b hover:bg-gray-50 ${
                            school.schoolId === data.mySchool.schoolId ? 'bg-blue-50 font-medium' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            {school.schoolName}
                            {school.schoolId === data.mySchool.schoolId && (
                              <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">本校</span>
                            )}
                          </td>
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
    </PrincipalLayout>
  )
}
