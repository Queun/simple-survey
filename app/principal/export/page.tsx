'use client'

import { useEffect, useState } from 'react'
import PrincipalLayout from '@/components/PrincipalLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'

interface Period {
  id: number
  name: string
  isActive: boolean
}

export default function PrincipalExportPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')

  useEffect(() => {
    fetchPeriods()
  }, [])

  async function fetchPeriods() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/principal/periods', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Failed to fetch periods')

      const data = await res.json()
      setPeriods(data)
    } catch (err) {
      console.error('Error fetching periods:', err)
      setError('加载调研期列表失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(format: 'excel' | 'csv') {
    setExporting(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const url = selectedPeriod
        ? `/api/principal/export?format=${format}&periodId=${selectedPeriod}`
        : `/api/principal/export?format=${format}`

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || '导出失败')
      }

      const contentDisposition = res.headers.get('Content-Disposition')
      let filename = `school-survey-data-${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
        if (filenameMatch) filename = filenameMatch[1]
      }

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err: any) {
      console.error('Error exporting data:', err)
      setError(err.message || '导出失败')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <PrincipalLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">加载中...</p>
        </div>
      </PrincipalLayout>
    )
  }

  return (
    <PrincipalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">数据导出</h1>
          <p className="text-gray-600 mt-1">导出本校调研数据为 Excel 或 CSV 格式</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>导出设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="period">选择调研期（可选）</Label>
                <select
                  id="period"
                  className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="">-- 所有调研期 --</option>
                  {periods.map(period => (
                    <option key={period.id} value={String(period.id)}>
                      {period.name} {period.isActive ? '(进行中)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">不选择则导出所有调研期的数据</p>
              </div>

              <div className="pt-4">
                <Label className="text-base font-semibold">选择导出格式</Label>
                <div className="space-y-3 mt-3">
                  <Button
                    onClick={() => handleExport('excel')}
                    disabled={exporting}
                    className="w-full justify-start"
                    size="lg"
                  >
                    <FileSpreadsheet className="mr-2 h-5 w-5" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold">导出为 Excel (.xlsx)</div>
                      <div className="text-xs font-normal opacity-80">包含格式化的表格数据，适合数据分析</div>
                    </div>
                    <Download className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    onClick={() => handleExport('csv')}
                    disabled={exporting}
                    variant="outline"
                    className="w-full justify-start"
                    size="lg"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold">导出为 CSV (.csv)</div>
                      <div className="text-xs font-normal opacity-60">纯文本格式，兼容性更好</div>
                    </div>
                    <Download className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              {exporting && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-center">
                  正在导出数据，请稍候...
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>导出说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">导出的数据包含：</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>调研期名称</li>
                  <li>年级和班级</li>
                  <li>科目评价详情</li>
                  <li>每个问题的得分</li>
                  <li>平均分统计</li>
                  <li>提交时间</li>
                </ul>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-xs">
                <strong>注意：</strong>仅包含本校数据，请妥善保管导出的文件。
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>当前数据概览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">调研期数量</div>
                <div className="text-2xl font-bold text-blue-600">{periods.length}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">进行中的调研</div>
                <div className="text-2xl font-bold text-green-600">
                  {periods.filter(p => p.isActive).length}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">已选择调研期</div>
                <div className="text-2xl font-bold text-purple-600">
                  {selectedPeriod ? '1' : '全部'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PrincipalLayout>
  )
}
