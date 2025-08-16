import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import EmailConfig from '@/models/EmailConfig'
import { verifyToken, handleAuthError } from '@/lib/auth'

// POST - Reset quota thủ công
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const user = verifyToken(request)

    // Reset dailySent về 0 cho tất cả email configs của user
    const result = await EmailConfig.updateMany(
      { userId: user.userId },
      { $set: { dailySent: 0 } }
    )

    if (result.modifiedCount > 0) {
      return NextResponse.json({
        message: `Đã reset quota cho ${result.modifiedCount} email config(s)`,
        resetCount: result.modifiedCount,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        message: 'Không có email config nào cần reset',
        resetCount: 0,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    return handleAuthError(error)
  }
}

// GET - Kiểm tra trạng thái quota
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = verifyToken(request)

    // Lấy thông tin quota của user
    const emailConfigs = await EmailConfig.find(
      { userId: user.userId },
      'email displayName dailyLimit dailySent isActive'
    ).sort({ isDefault: -1, createdAt: -1 })

    // Tính toán thông tin tổng quan
    const totalConfigs = emailConfigs.length
    const activeConfigs = emailConfigs.filter(config => config.isActive)
    const totalDailyLimit = activeConfigs.reduce((sum, config) => sum + config.dailyLimit, 0)
    const totalDailySent = activeConfigs.reduce((sum, config) => sum + config.dailySent, 0)
    const remainingQuota = totalDailyLimit - totalDailySent

    // Kiểm tra xem có cần reset không
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const needsReset = emailConfigs.some(config => {
      if (config.dailySent > 0) {
        const configDate = config.updatedAt
        const configDay = new Date(configDate.getFullYear(), configDate.getMonth(), configDate.getDate())
        return configDay < today
      }
      return false
    })

    return NextResponse.json({
      user: {
        userId: user.userId,
        username: user.username
      },
      quota: {
        totalConfigs,
        activeConfigs: activeConfigs.length,
        totalDailyLimit,
        totalDailySent,
        remainingQuota,
        usagePercentage: totalDailyLimit > 0 ? Math.round((totalDailySent / totalDailyLimit) * 100) : 0
      },
      status: {
        needsReset,
        lastChecked: new Date().toISOString(),
        nextReset: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
      },
      configs: emailConfigs.map(config => ({
        email: config.email,
        displayName: config.displayName,
        dailyLimit: config.dailyLimit,
        dailySent: config.dailySent,
        isActive: config.isActive,
        remaining: config.dailyLimit - config.dailySent,
        usagePercentage: config.dailyLimit > 0 ? Math.round((config.dailySent / config.dailyLimit) * 100) : 0
      }))
    })

  } catch (error) {
    return handleAuthError(error)
  }
}


