import { NextRequest, NextResponse } from 'next/server'
import connectDB from '../../../lib/mongodb'
import EmailConfig from '../../../models/EmailConfig'
import { verifyToken, handleAuthError } from '../../../lib/auth'

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
    return handleAuthError(error)
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
    return handleAuthError(error)
  }
}
