import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">学校匿名评教系统</h1>
        <p className="text-gray-500 mb-8">学生匿名评价本班任课教师</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/teacher"
            className="inline-block min-w-44 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            教师任课登记
          </Link>
          <Link
            href="/login"
            className="inline-block min-w-44 border border-gray-300 bg-white text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            管理员 / 校长登录
          </Link>
        </div>
      </div>
    </div>
  )
}
