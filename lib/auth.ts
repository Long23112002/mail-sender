import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

// Hàm xác thực token
export function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    throw new Error('Token không được cung cấp')
  }

  const token = authHeader.replace('Bearer ', '')
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token đã hết hạn')
    }
    throw new Error('Token không hợp lệ')
  }
}

// Hàm xử lý authentication errors và trả về đúng status code
export function handleAuthError(error: unknown) {
  console.error('Authentication error:', error)
  
  if (error instanceof Error && (
    error.message === 'Token không được cung cấp' ||
    error.message === 'Token không hợp lệ' ||
    error.message === 'Token đã hết hạn'
  )) {
    return NextResponse.json(
      { message: error.message },
      { status: 401 }
    )
  }
  
  return NextResponse.json(
    { message: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
    { status: 500 }
  )
}
