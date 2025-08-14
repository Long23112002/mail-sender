import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/mongodb'
import EmailHistory from '@/models/EmailHistory'

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
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // yyyy-mm-dd (local date from client)
    const tzParam = searchParams.get('tz') // minutes offset: result of new Date().getTimezoneOffset()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50')))

    // If client didn't send, default to VN (getTimezoneOffset ~ -420)
    const tzOffsetMin = Number.isFinite(Number(tzParam)) ? Number(tzParam) : -420

    const toOffsetString = (offsetMin: number) => {
      // getTimezoneOffset returns minutes behind UTC (UTC - local). Convert to RFC offset string.
      // Example: VN: -420 -> +07:00
      const sign = offsetMin <= 0 ? '+' : '-'
      const abs = Math.abs(offsetMin)
      const hh = String(Math.floor(abs / 60)).padStart(2, '0')
      const mm = String(abs % 60).padStart(2, '0')
      return `${sign}${hh}:${mm}`
    }

    const offsetStr = toOffsetString(tzOffsetMin)

    // Build start/end as the client's local day boundaries using the provided offset
    const targetDate = date || new Date().toISOString().slice(0, 10)
    const start = new Date(`${targetDate}T00:00:00.000${offsetStr}`)
    const end = new Date(`${targetDate}T23:59:59.999${offsetStr}`)

    const query: any = { userId: user.userId, timestamp: { $gte: start, $lte: end } }

    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      EmailHistory.find(query).sort({ timestamp: -1 }).skip(skip).limit(pageSize),
      EmailHistory.countDocuments(query)
    ])

    return NextResponse.json({ items, total, page, pageSize })
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 })
  }
}


