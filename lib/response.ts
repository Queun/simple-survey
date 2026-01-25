import { NextResponse } from 'next/server'

export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status })
}

export function errorResponse(error: string, status: number = 400) {
  return NextResponse.json({ error }, { status })
}
