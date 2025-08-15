import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '../../../../lib/mongodb'
import User from '../../../../models/User'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { refreshToken } = await request.json()

    if (!refreshToken) {
      return NextResponse.json(
        { message: 'Refresh token không được cung cấp' },
        { status: 400 }
      )
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret') as any
    
    // Tìm user trong database
    const user = await User.findById(decoded.userId).select('-password')

    if (!user) {
      return NextResponse.json(
        { message: 'User không tồn tại' },
        { status: 401 }
      )
    }

    // Kiểm tra user có active không
    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Tài khoản đã bị vô hiệu hóa' },
        { status: 401 }
      )
    }

    // Tạo JWT token mới
    const newToken = jwt.sign(
      { 
        userId: user._id.toString(), 
        username: user.username,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' } // token sẽ hết hạn sau 24 giờ
    )

    // Tạo refresh token mới
    const newRefreshToken = jwt.sign(
      { 
        userId: user._id.toString(),
        type: 'refresh'
      },
      process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      message: 'Refresh token thành công',
      token: newToken,
      refreshToken: newRefreshToken,
      user: { 
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Refresh token error:', error)
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { message: 'Refresh token không hợp lệ' },
        { status: 401 }
      )
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json(
        { message: 'Refresh token đã hết hạn' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { message: 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}
