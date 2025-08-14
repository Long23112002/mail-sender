import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/mongodb'
import Template from '@/models/Template'

// Hàm xác thực token
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    throw new Error('Token không được cung cấp')
  }

  const token = authHeader.replace('Bearer ', '')
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
  } catch (error) {
    throw new Error('Token không hợp lệ')
  }
}

// GET - Lấy danh sách templates
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = verifyToken(request)

    // Lấy templates của user và public templates
    const templates = await Template.find({
      $or: [
        { userId: user.userId },
        { isPublic: true }
      ]
    }).populate('userId', 'username fullName').sort({ createdAt: -1 })

    return NextResponse.json({ templates })

  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}

// POST - Tạo template mới
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = verifyToken(request)

    const { name, description, subject, content, isPublic, tags } = await request.json()

    if (!name || !subject || !content) {
      return NextResponse.json(
        { message: 'Vui lòng điền đầy đủ tên, tiêu đề và nội dung' },
        { status: 400 }
      )
    }

    const template = new Template({
      name,
      description,
      subject,
      content,
      isPublic: isPublic || false,
      userId: user.userId,
      tags: tags || []
    })

    await template.save()

    return NextResponse.json({ message: 'Tạo template thành công', template })

  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}
