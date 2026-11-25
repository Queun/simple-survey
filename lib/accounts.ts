export const accountSelect = {
  id: true, username: true, role: true, schoolId: true, createdAt: true,
  school: { select: { id: true, name: true, code: true } },
} as const
