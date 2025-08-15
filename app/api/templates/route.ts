import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Template from '@/models/Template'
import { verifyToken, handleAuthError } from '@/lib/auth'

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
    return handleAuthError(error)
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
    return handleAuthError(error)
  }
}
