import { PrismaClient } from '../lib/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始创建测试数据...')

  // 清空现有数据（开发环境）
  await prisma.answer.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.question.deleteMany()
  await prisma.period.deleteMany()
  await prisma.user.deleteMany()
  await prisma.school.deleteMany()

  // 创建3所测试学校
  console.log('创建学校...')
  const schools = await Promise.all([
    prisma.school.create({ data: { name: '第一中学', code: 'S001' } }),
    prisma.school.create({ data: { name: '实验中学', code: 'S002' } }),
    prisma.school.create({ data: { name: '育才中学', code: 'S003' } }),
  ])
  console.log(`✓ 创建了 ${schools.length} 所学校`)

  // 创建管理员
  console.log('创建管理员...')
  await prisma.user.create({
    data: {
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
    },
  })
  console.log('✓ 管理员账号: admin / admin123')

  // 创建3个校长
  console.log('创建校长账号...')
  for (let i = 0; i < 3; i++) {
    await prisma.user.create({
      data: {
        username: `principal${i + 1}`,
        password: await bcrypt.hash('principal123', 10),
        role: 'PRINCIPAL',
        schoolId: schools[i].id,
      },
    })
  }
  console.log('✓ 校长账号: principal1/principal2/principal3 / principal123')

  // 创建测试调研期
  console.log('创建调研期...')
  const period = await prisma.period.create({
    data: {
      name: '2024秋季测评',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-31'),
      isActive: true,
      subjects: JSON.stringify(['数学', '英语', '物理', '化学']),
    },
  })
  console.log(`✓ 创建调研期: ${period.name}`)

  // 创建测试题目
  console.log('创建问卷题目...')
  const questions = [
    {
      content: '教师教学态度认真负责',
      options: [
        { label: '非常同意', score: 5 },
        { label: '同意', score: 4 },
        { label: '一般', score: 3 },
        { label: '不同意', score: 2 },
        { label: '非常不同意', score: 1 },
      ]
    },
    {
      content: '教学内容清晰易懂',
      options: [
        { label: '非常同意', score: 5 },
        { label: '同意', score: 4 },
        { label: '一般', score: 3 },
        { label: '不同意', score: 2 },
        { label: '非常不同意', score: 1 },
      ]
    },
    {
      content: '课堂氛围活跃',
      options: [
        { label: '非常同意', score: 5 },
        { label: '同意', score: 4 },
        { label: '一般', score: 3 },
        { label: '不同意', score: 2 },
        { label: '非常不同意', score: 1 },
      ]
    },
  ]

  for (let i = 0; i < questions.length; i++) {
    await prisma.question.create({
      data: {
        periodId: period.id,
        order: i + 1,
        content: questions[i].content,
        options: JSON.stringify(questions[i].options),
      },
    })
  }
  console.log(`✓ 创建了 ${questions.length} 道题目`)

  console.log('\n========================================')
  console.log('✓ 测试数据创建成功！')
  console.log('========================================')
  console.log('管理员登录: admin / admin123')
  console.log('校长登录: principal1 / principal123')
  console.log('         principal2 / principal123')
  console.log('         principal3 / principal123')
  console.log(`调研期ID: ${period.id}`)
  console.log(`学生访问: /survey/${period.id}`)
  console.log('========================================\n')
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
