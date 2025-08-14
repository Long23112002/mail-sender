import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '../../../../lib/mongodb'
import Template from '../../../../models/Template'

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

// GET - Lấy template theo ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    const user = verifyToken(request)

    const template = await Template.findOne({
      _id: params.id,
      $or: [
        { userId: user.userId },
        { isPublic: true }
      ]
    }).populate('userId', 'username fullName')

    if (!template) {
      return NextResponse.json(
        { message: 'Không tìm thấy template' },
        { status: 404 }
      )
    }

    return NextResponse.json({ template })

  } catch (error) {
    console.error('Get template error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}

// PUT - Cập nhật template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    const user = verifyToken(request)

    const { name, description, subject, content, isPublic, tags } = await request.json()

    const template = await Template.findOne({
      _id: params.id,
      userId: user.userId // Chỉ owner mới được update
    })

    if (!template) {
      return NextResponse.json(
        { message: 'Không tìm thấy template hoặc bạn không có quyền chỉnh sửa' },
        { status: 404 }
      )
    }

    template.name = name || template.name
    template.description = description || template.description
    template.subject = subject || template.subject
    template.content = content || template.content
    template.isPublic = isPublic !== undefined ? isPublic : template.isPublic
    template.tags = tags || template.tags

    await template.save()

    return NextResponse.json({
      message: 'Cập nhật template thành công',
      template
    })

  } catch (error) {
    console.error('Update template error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}

// DELETE - Xóa template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    const user = verifyToken(request)

    const template = await Template.findOneAndDelete({
      _id: params.id,
      userId: user.userId // Chỉ owner mới được xóa
    })

    if (!template) {
      return NextResponse.json(
        { message: 'Không tìm thấy template hoặc bạn không có quyền xóa' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Xóa template thành công'
    })

  } catch (error) {
    console.error('Delete template error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}
