import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { afterAll } from 'vitest'

const directory = mkdtempSync(join(tmpdir(), 'simple-survey-test-'))
process.env.DATABASE_URL = 'file:' + join(directory, 'test.db')
process.env.JWT_SECRET = randomBytes(32).toString('hex')
execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { stdio: 'pipe' })

afterAll(async () => {
  const { prisma } = await import('../lib/prisma')
  await prisma.$disconnect()
  rmSync(directory, { recursive: true, force: true })
})
