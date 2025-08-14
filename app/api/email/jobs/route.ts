import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/mongodb'
import SendJob from '@/models/SendJob'

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) throw new Error('Token không được cung cấp')
  const token = authHeader.replace('Bearer ', '')
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = verifyToken(request)
    const jobs = await SendJob.find({ userId: user.userId }).sort({ createdAt: -1 }).limit(20)
    return NextResponse.json({ jobs })
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 })
  }
}


