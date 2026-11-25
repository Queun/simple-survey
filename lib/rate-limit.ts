import { createHmac, randomBytes } from 'node:crypto'
import { isIP } from 'node:net'

const windowMs = 60_000
const buckets = new Map<string, number[]>()
const salt = randomBytes(32)
let nextSweep = 0

// Only the last forwarding hop is used. A local request without an IP shares one bucket.
export function allowSubmission(headers: Headers, now = Date.now()) {
  const forwarded = headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
  const address = forwarded || headers.get('x-real-ip') || ''
  const key = createHmac('sha256', salt).update(isIP(address) ? address : 'local').digest('hex')
  const cutoff = now - windowMs
  if (now >= nextSweep) {
    for (const [key, times] of buckets) {
      if (times[times.length - 1] <= cutoff) buckets.delete(key)
    }
    nextSweep = now + windowMs
  }
  const times = (buckets.get(key) ?? []).filter(t => t > cutoff)
  if (times.length >= 120) return false
  times.push(now)
  buckets.set(key, times)
  return true
}
