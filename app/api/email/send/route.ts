import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'
import connectDB from '../../../../lib/mongodb'
import EmailConfig from '../../../../models/EmailConfig'
import EmailHistory from '../../../../models/EmailHistory'
import SendJob from '../../../../models/SendJob'

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

// Hàm thay thế biến trong template
function replaceVariables(template: string, variables: any) {
  let result = template || ''
  const safeVars = variables && typeof variables === 'object' ? variables : {}

  const getter = (key: string) => {
    const v = (safeVars as any)[key]
    return v == null ? '' : String(v)
  }

  const patterns = [
    { pattern: /\{(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\}/g, getValue: (k: string) => getter(k) },
    { pattern: /\{(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\}/g, getValue: (k: string) => getter(k.toLowerCase()) },
    { pattern: /\[(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\]/g, getValue: (k: string) => getter(k) },
    { pattern: /\[(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\]/g, getValue: (k: string) => getter(k.toLowerCase()) },
    { pattern: /\((xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\)/g, getValue: (k: string) => getter(k) },
    { pattern: /\((XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\)/g, getValue: (k: string) => getter(k.toLowerCase()) },
    { pattern: /\b(xxx|yyy|mail|ttt|zzz|www|uuu|vvv|rrr)\b/g, getValue: (k: string) => getter(k) },
    { pattern: /\b(XXX|YYY|MAIL|TTT|ZZZ|WWW|UUU|VVV|RRR)\b/g, getValue: (k: string) => getter(k.toLowerCase()) },
  ]

  patterns.forEach(({ pattern, getValue }) => {
    result = result.replace(pattern, (_m, captured) => getValue(captured))
  })

  return result
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    // Xác thực token
    const user = verifyToken(request)
    // Ensure user is JwtPayload
    const userPayload = typeof user === 'string' ? {} : user

    const { 
      emailConfigId, 
      recipients, 
      subject, 
      template, 
      variables 
    } = await request.json()

    // Lấy email config của user
    let emailConfig
    if (emailConfigId) {
      // Sử dụng config được chọn
      emailConfig = await EmailConfig.findOne({
        _id: emailConfigId,
        userId: userPayload.userId,
        isActive: true
      })
    } else {
      // Sử dụng config mặc định
      emailConfig = await EmailConfig.findOne({
        userId: userPayload.userId,
        isDefault: true,
        isActive: true
      })
    }

    if (!emailConfig) {
      return NextResponse.json(
        { message: 'Không tìm thấy cấu hình email. Vui lòng thêm cấu hình email trước.' },
        { status: 400 }
      )
    }

    let transporter

    // Cấu hình transporter dựa trên email config của user
    if (emailConfig.provider === 'gmail') {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailConfig.email,
          pass: emailConfig.password, // App password
        },
      })
    } else if (emailConfig.provider === 'outlook') {
      return NextResponse.json(
        { message: 'Gửi qua Outlook đang bảo trì. Vui lòng chọn cấu hình Gmail.' },
        { status: 503 }
      )
    } else {
      return NextResponse.json(
        { message: 'Provider không được hỗ trợ' },
        { status: 400 }
      )
    }

    const results: any[] = []

    // Gửi email cho từng người nhận
    for (const recipient of recipients) {
      try {
        // Thay thế biến trong template
        const personalizedSubject = replaceVariables(subject, recipient)
        const personalizedContent = replaceVariables(template, recipient)

        const mailOptions = {
          from: `"${emailConfig.displayName}" <${emailConfig.email}>`,
          to: recipient.mail || recipient.yyy, // mail hoặc yyy là email
          subject: personalizedSubject,
          html: personalizedContent,
        }

        const info = await transporter.sendMail(mailOptions)
        results.push({
          email: recipient.mail || recipient.yyy,
          status: 'success',
          messageId: info.messageId,
        })
      } catch (error) {
        results.push({
          email: recipient.mail || recipient.yyy,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Lưu lịch sử
    try {
      await EmailHistory.create({
        userId: userPayload.userId,
        timestamp: new Date(),
        total: results.length,
        success: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length,
        results,
      })
    } catch (e) {
      console.warn('Save email history failed:', e)
    }

    // Tạo/ghi job để hỗ trợ resume/refresh UI
    try {
      await SendJob.create({
        userId: userPayload.userId,
        emailConfigId: (emailConfig as any)._id.toString(),
        subject,
        template,
        recipients,
        status: 'completed',
        total: results.length,
        processed: results.length,
        success: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length,
        results,
      })
    } catch (e) {
      console.warn('Save send job failed:', e)
    }

    return NextResponse.json({ message: 'Gửi email hoàn tất', results })

  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Có lỗi xảy ra' },
      { status: 500 }
    )
  }
}
