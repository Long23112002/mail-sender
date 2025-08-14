import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '../../../../lib/mongodb'
import EmailConfig from '../../../../models/EmailConfig'

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

// PUT - Cập nhật email config
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const config = await EmailConfig.findOne({
      _id: params.id,
      userId: user.userId
    })

    if (!config) {
      return NextResponse.json(
        { message: 'Không tìm thấy cấu hình email' },
        { status: 404 }
      )
    }

    // Bảo trì Outlook: không cho đổi sang Outlook
    if (provider === 'outlook') {
      return NextResponse.json(
        { message: 'Tính năng cấu hình Outlook đang bảo trì. Vui lòng sử dụng Gmail.' },
        { status: 503 }
      )
    }

    config.provider = provider || config.provider
    config.email = email || config.email
    config.password = password || config.password
    config.displayName = displayName || config.displayName
    config.isDefault = isDefault !== undefined ? isDefault : config.isDefault
    config.smtpHost = smtpHost || config.smtpHost
    config.smtpPort = smtpPort || config.smtpPort

    await config.save()

    return NextResponse.json({
      message: 'Cập nhật cấu hình email thành công',
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
    console.error('Update email config error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}

// DELETE - Xóa email config
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    const user = verifyToken(request)

    const config = await EmailConfig.findOneAndDelete({
      _id: params.id,
      userId: user.userId
    })

    if (!config) {
      return NextResponse.json(
        { message: 'Không tìm thấy cấu hình email' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Xóa cấu hình email thành công'
    })

  } catch (error) {
    console.error('Delete email config error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}
