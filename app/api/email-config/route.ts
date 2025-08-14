import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '../../../lib/mongodb'
import EmailConfig from '../../../models/EmailConfig'

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

// GET - Lấy danh sách email configs của user
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = verifyToken(request)

    const configs = await EmailConfig.find({
      userId: user.userId,
      isActive: true
    }).sort({ isDefault: -1, createdAt: -1 })

    return NextResponse.json({ configs })

  } catch (error) {
    console.error('Get email configs error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}

// POST - Tạo email config mới
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = verifyToken(request)

    const { 
      provider, 
      email, 
      password, 
      displayName, 
      isDefault,
      smtpHost,
      smtpPort 
    } = await request.json()

    if (!provider || !email || !password || !displayName) {
      return NextResponse.json(
        { message: 'Vui lòng điền đầy đủ thông tin' },
        { status: 400 }
      )
    }

    // Bảo trì Outlook: chặn tạo mới cấu hình Outlook
    if (provider === 'outlook') {
      return NextResponse.json(
        { message: 'Tính năng cấu hình Outlook đang bảo trì. Vui lòng sử dụng Gmail.' },
        { status: 503 }
      )
    }

    // Kiểm tra email đã tồn tại chưa
    const existingConfig = await EmailConfig.findOne({
      userId: user.userId,
      email: email.toLowerCase()
    })

    if (existingConfig) {
      return NextResponse.json(
        { message: 'Email này đã được cấu hình' },
        { status: 400 }
      )
    }

    const config = new EmailConfig({
      userId: user.userId,
      provider,
      email: email.toLowerCase(),
      password,
      displayName,
      isDefault: isDefault || false,
      smtpHost,
      smtpPort
    })

    await config.save()

    return NextResponse.json({
      message: 'Tạo cấu hình email thành công',
      config: {
        _id: config._id,
        provider: config.provider,
        email: config.email,
        displayName: config.displayName,
        isDefault: config.isDefault,
        isActive: config.isActive
      }
    })

  } catch (error) {
    console.error('Create email config error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}
