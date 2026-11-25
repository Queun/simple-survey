import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { RequestError } from './response'

export async function deleteTeacher(id: number) {
  try {
    await prisma.teacher.delete({ where: { id } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new RequestError('该教师已有评价记录，无法删除', 409)
    }
    throw error
  }
}
