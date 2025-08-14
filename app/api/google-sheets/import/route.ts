import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

// Hàm xác thực token
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    throw new Error('Token không được cung cấp')
  }

  const token = authHeader.replace('Bearer ', '')
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')
  } catch (error) {
    throw new Error('Token không hợp lệ')
  }
}

export async function POST(request: NextRequest) {
  try {
    // Xác thực user
    verifyToken(request)
    
    const { csvUrl } = await request.json()
    
    if (!csvUrl) {
      return NextResponse.json(
        { message: 'URL CSV không được cung cấp' },
        { status: 400 }
      )
    }

    // Validate URL để đảm bảo an toàn
    if (!csvUrl.includes('docs.google.com/spreadsheets')) {
      return NextResponse.json(
        { message: 'URL không hợp lệ. Chỉ chấp nhận URL Google Sheets' },
        { status: 400 }
      )
    }

    console.log('Fetching CSV from:', csvUrl)

    // Fetch CSV data từ Google Sheets
    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch CSV:', response.status, response.statusText)
      return NextResponse.json(
        { 
          message: `Không thể tải dữ liệu từ Google Sheets. Mã lỗi: ${response.status}. Vui lòng kiểm tra quyền truy cập của Sheet.` 
        },
        { status: 400 }
      )
    }

    const csvData = await response.text()
    
    if (!csvData || csvData.trim().length === 0) {
      return NextResponse.json(
        { message: 'Google Sheets trống hoặc không có dữ liệu' },
        { status: 400 }
      )
    }

    console.log('CSV data length:', csvData.length)
    console.log('First 200 chars:', csvData.substring(0, 200))

    return NextResponse.json({
      message: 'Tải dữ liệu thành công',
      csvData: csvData,
    })

  } catch (error) {
    console.error('Google Sheets import error:', error)
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải dữ liệu từ Google Sheets' 
      },
      { status: 500 }
    )
  }
}
