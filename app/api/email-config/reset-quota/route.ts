import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '../../../../lib/mongodb'
import EmailConfig from '../../../../models/EmailConfig'

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    throw new Error('Token không được cung cấp')
  }
  const token = authHeader.replace('Bearer ', '')
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    verifyToken(request)

    const { configId } = await request.json().catch(() => ({}))

    const filter = configId ? { _id: configId } : {}
    const res = await EmailConfig.updateMany(filter, { $set: { dailySent: 0 } })

    return NextResponse.json({ message: 'Đã reset quota', modified: res.modifiedCount })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}


