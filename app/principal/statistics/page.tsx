'use client'

import { useEffect, useState } from 'react'
import PrincipalLayout from '@/components/PrincipalLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts'
import { TrendingUp, Users, FileText, Award, BookOpen } from 'lucide-react'

interface SubjectStat {
  subjectId: string
  subjectName: string
  totalScore: number
  answerCount: number
  averageScore: number
  questions?: QuestionStat[]
}

interface QuestionStat {
  questionId: number
  totalScore: number
  answerCount: number
  averageScore: number
}

interface GradeStat {
  grade: string
  submissionCount: number
  subjects: SubjectStat[]
}

interface MySchoolStat {
  schoolId: number
  schoolName: string
  schoolCode: string
  submissionCount: number
  subjects: SubjectStat[]
  byGrade: GradeStat[]
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

export default function PrincipalStatisticsPage() {
  const [data, setData] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null)

  useEffect(() => {
    fetchStatistics()
  }, [selectedPeriod])

  async function fetchStatistics() {
    try {
      const token = localStorage.getItem('token')
      const url = selectedPeriod
        ? `/api/principal/statistics?periodId=${selectedPeriod}`
        : '/api/principal/statistics'

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
    } catch (err) {
      console.error('Error fetching statistics:', err)
      setError('加载统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 准备年级对比柱状图数据
  const prepareGradeBarChartData = () => {
    if (!data || !data.mySchool.byGrade || data.mySchool.byGrade.length === 0) return []

    return data.mySchool.byGrade.map(grade => {
      const item: any = {
        name: `${grade.grade}年级`
      }

      grade.subjects.forEach(subject => {
        item[subject.subjectName] = subject.averageScore
      })

      return item
    })
  }

  // 准备跨校对比雷达图数据
  const prepareSchoolRadarChartData = () => {
    if (!data || !data.comparison || data.comparison.length === 0) return []

    // 获取所有科目
    const subjectMap = new Map<string, string>()
    data.comparison.forEach(school => {
      school.subjects.forEach(subject => {
        subjectMap.set(subject.subjectId, subject.subjectName)
      })
    })

    const subjects = Array.from(subjectMap.entries())

    return subjects.map(([subjectId, subjectName]) => {
      const item: any = {
        subject: subjectName
      }

      data.comparison.forEach(school => {
        const subject = school.subjects.find(s => s.subjectId === subjectId)
        item[school.schoolName] = subject?.averageScore || 0
      })

      return item
    })
  }

  // 计算本校排名
  const calculateRanking = () => {
    if (!data || !data.comparison) return '-'

    // 计算每个学校的整体平均分
    const schoolAvgs = data.comparison.map(school => {
      let totalScore = 0
      let totalCount = 0

      school.subjects.forEach(subject => {
        totalScore += subject.totalScore
        totalCount += subject.answerCount
      })

      return {
        schoolId: school.schoolId,
        avgScore: totalCount > 0 ? totalScore / totalCount : 0
      }
    })

    // 排序
    schoolAvgs.sort((a, b) => b.avgScore - a.avgScore)

    // 找出本校排名
    const myRank = schoolAvgs.findIndex(s => s.schoolId === data.mySchool.schoolId)

    return myRank >= 0 ? `${myRank + 1} / ${schoolAvgs.length}` : '-'
  }

  // 计算本校平均分
  const calculateMySchoolAvg = () => {
    if (!data || !data.mySchool) return 0

    let totalScore = 0
    let totalCount = 0

    data.mySchool.subjects.forEach(subject => {
      totalScore += subject.totalScore
      totalCount += subject.answerCount
    })

    return totalCount > 0 ? parseFloat((totalScore / totalCount).toFixed(2)) : 0
  }

  const gradeBarChartData = prepareGradeBarChartData()
  const schoolRadarChartData = prepareSchoolRadarChartData()
  const mySchoolAvg = calculateMySchoolAvg()
  const myRanking = calculateRanking()

  // 获取所有科目名称
  const getAllSubjectNames = () => {
    if (!data || !data.mySchool.subjects) return []
    return data.mySchool.subjects.map(s => s.subjectName)
  }

  const subjectNames = getAllSubjectNames()

  // 颜色数组
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#a4de6c']

  return (
    <PrincipalLayout>
      <div className="space-y-6">
        {/* 页面标题和期数筛选 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">数据统计</h2>
            <p className="mt-2 text-gray-600">查看本校问卷调研数据及跨校对比</p>
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
        ) : !data ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">暂无统计数据</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 本校统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">本校提交数</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.mySchool.submissionCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">本校平均分</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mySchoolAvg}</div>
                  <p className="text-xs text-muted-foreground mt-1">满分 5.0</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">全市排名</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{myRanking}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">评价科目数</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.mySchool.subjects.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* 本校各年级对比 */}
            {gradeBarChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>本校各年级科目平均分</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={gradeBarChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Legend />
                      {subjectNames.map((name, index) => (
                        <Bar key={name} dataKey={name} fill={colors[index % colors.length]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* 本校科目详情 */}
            <Card>
              <CardHeader>
                <CardTitle>本校各科目平均分</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.mySchool.subjects.map((subject, index) => (
                    <div key={subject.subjectId} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-lg">{subject.subjectName}</h4>
                        <span className="text-2xl font-bold" style={{ color: colors[index % colors.length] }}>
                          {subject.averageScore.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        共 {subject.answerCount} 次评价
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 跨校对比雷达图 */}
            {data.comparison.length > 0 && schoolRadarChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>跨校对比（雷达图）</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={schoolRadarChartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis domain={[0, 5]} />
                      <Tooltip />
                      <Legend />
                      {data.comparison.slice(0, 5).map((school, index) => (
                        <Radar
                          key={school.schoolId}
                          name={school.schoolName}
                          dataKey={school.schoolName}
                          stroke={colors[index % colors.length]}
                          fill={colors[index % colors.length]}
                          fillOpacity={school.schoolId === data.mySchool.schoolId ? 0.6 : 0.2}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    注：本校数据显示为深色高亮
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 跨校对比表格 */}
            {data.comparison.length > 0 && (
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
            )}
          </>
        )}
      </div>
    </PrincipalLayout>
  )
}
