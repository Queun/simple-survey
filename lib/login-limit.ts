// One process owns both counters. An upstream proxy must supply the actual client IP.
const windowMs = 15 * 60_000
// 同一机房或办公室的老师共用出口 IP，按 IP 的阈值放宽，按手机号的阈值保持严格
const limitFor = (key: string) => key.startsWith('ip:') ? 30 : 5
const failures = new Map<string, { times: number[], expires: number, locked: boolean }>()
let nextSweep = 0

export function loginKeys(phone: string, headers: Headers) {
  const ip = headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || headers.get('x-real-ip') || 'local'
  return ['phone:' + phone, 'ip:' + ip]
}

export function locked(keys: string[], now = Date.now()) {
  if (now >= nextSweep) {
    for (const [key, value] of failures) if (value.expires <= now) failures.delete(key)
    nextSweep = now + windowMs
  }
  return keys.some(key => {
    const record = failures.get(key)
    return record && record.locked && record.expires > now
  })
}

export function recordFailure(keys: string[], now = Date.now()) {
  for (const key of keys) {
    const entry = failures.get(key)
    const times = entry && entry.expires > now ? entry.times.filter(time => time > now - windowMs) : []
    times.push(now)
    failures.set(key, { times, expires: now + windowMs, locked: times.length >= limitFor(key) })
  }
}
