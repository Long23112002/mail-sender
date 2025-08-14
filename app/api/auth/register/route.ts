import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '../../../../lib/mongodb'
import User from '../../../../models/User'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { username, email, password, fullName } = await request.json()

    // Validate input
    if (!username || !email || !password || !fullName) {
      return NextResponse.json(
        { message: 'Vui lòng điền đầy đủ thông tin' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Tên đăng nhập hoặc email đã tồn tại' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
      role: 'user'
    })

    await user.save()

    return NextResponse.json({
      message: 'Đăng ký thành công',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { message: 'Có lỗi xảy ra khi đăng ký' },
      { status: 500 }
    )
  }
}
