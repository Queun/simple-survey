import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">学校匿名问卷调研系统</h1>
        <p className="text-gray-500 mb-8">供学生匿名评价各学科教学情况</p>
        <Link
          href="/login"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          管理员 / 校长登录
        </Link>
      </div>
    </div>
  )
}
