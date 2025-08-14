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
    const { rows } = await request.json()
    if (!Array.isArray(rows)) return NextResponse.json({ message: 'rows phải là mảng' }, { status: 400 })
    const docs = rows.map((r: any) => ({ ...r, userId: user.userId }))
    await Recipient.insertMany(docs)
    return NextResponse.json({ message: 'Đã lưu recipients', count: docs.length })
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = verifyToken(request)
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 10)
    const xxx = searchParams.get('xxx') || undefined
    const mail = searchParams.get('mail') || undefined
    const q = searchParams.get('q') || undefined
    const query: any = { userId: user.userId }
    if (q) {
      const regex = new RegExp(q, 'i')
      query.$or = [{ xxx: regex }, { mail: regex }]
    }
    if (xxx) query.xxx = new RegExp(xxx, 'i')
    if (mail) query.mail = new RegExp(mail, 'i')
    const [items, total] = await Promise.all([
      Recipient.find(query).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize),
      Recipient.countDocuments(query)
    ])
    return NextResponse.json({ items, total })
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 })
  }
}


