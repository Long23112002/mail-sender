import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/mongodb'
import Recipient from '@/models/Recipient'

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) throw new Error('Token không được cung cấp')
  const token = authHeader.replace('Bearer ', '')
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = verifyToken(request)
    const { ids } = await request.json()
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ message: 'ids trống' }, { status: 400 })
    await Recipient.deleteMany({ _id: { $in: ids }, userId: user.userId })
    return NextResponse.json({ message: 'Đã xóa', count: ids.length })
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 })
  }
}


