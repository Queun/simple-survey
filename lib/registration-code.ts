import { randomInt } from 'node:crypto'

export function newRegistrationCode(previous?: string) {
  let code: string
  do {
    code = String(randomInt(100000, 1000000))
  } while (code === previous)
  return code
}
