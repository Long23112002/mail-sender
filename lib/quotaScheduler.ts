import connectDB from './mongodb'
import EmailConfig from '@/models/EmailConfig'

// Đảm bảo chỉ khởi tạo một lần trong môi trường Next.js
const GLOBAL_KEY = '__quota_scheduler_started__'

declare const global: typeof globalThis & { [GLOBAL_KEY]?: boolean }

// Lưu trữ interval ID để có thể clear khi cần
let resetInterval: NodeJS.Timeout | null = null
let dailyInterval: NodeJS.Timeout | null = null

async function resetQuota() {
  try {
    await connectDB()
    
    // Reset dailySent về 0 cho tất cả email configs
    const result = await EmailConfig.updateMany({}, { $set: { dailySent: 0 } })
    
    // Log kết quả
    console.log(`[quotaScheduler] ✅ Reset dailySent to 0 for ${result.modifiedCount} email configs at ${new Date().toLocaleString('vi-VN')}`)
    
    // Kiểm tra xem có email config nào không
    const totalConfigs = await EmailConfig.countDocuments()
    if (totalConfigs === 0) {
      console.log('[quotaScheduler] ℹ️ No email configs found')
    }
    
  } catch (error) {
    console.error('[quotaScheduler] ❌ Failed to reset quota:', error)
    
    // Thử kết nối lại database nếu lỗi
    try {
      await connectDB()
      console.log('[quotaScheduler] 🔄 Reconnected to database')
    } catch (reconnectError) {
      console.error('[quotaScheduler] ❌ Failed to reconnect to database:', reconnectError)
    }
  }
}

function calculateNextMidnight(): Date {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0) // 00:00 ngày hôm sau
  return next
}

function scheduleNextReset() {
  const now = new Date()
  const nextMidnight = calculateNextMidnight()
  const delay = Math.max(1000, nextMidnight.getTime() - now.getTime())
  
  console.log(`[quotaScheduler] ⏰ Next reset scheduled at ${nextMidnight.toLocaleString('vi-VN')} (in ${Math.round(delay / 1000 / 60)} minutes)`)
  
  // Clear interval cũ nếu có
  if (resetInterval) {
    clearTimeout(resetInterval)
    resetInterval = null
  }
  
  // Lên lịch reset tiếp theo
  resetInterval = setTimeout(async () => {
    await resetQuota()
    
    // Sau đó cứ 24h chạy lại
    if (dailyInterval) {
      clearInterval(dailyInterval)
    }
    
    dailyInterval = setInterval(async () => {
      await resetQuota()
    }, 24 * 60 * 60 * 1000)
    
    console.log('[quotaScheduler] 🔄 Set up daily interval reset')
    
    // Lên lịch reset tiếp theo
    scheduleNextReset()
  }, delay)
}

function startQuotaScheduler() {
  if (global[GLOBAL_KEY]) {
    console.log('[quotaScheduler] ℹ️ Scheduler already started')
    return
  }
  
  console.log('[quotaScheduler] 🚀 Starting quota scheduler...')
  
  // Khởi tạo scheduler
  scheduleNextReset()
  
  // Kiểm tra và reset ngay lập tức nếu cần (ví dụ: server restart giữa ngày)
  checkAndResetIfNeeded()
  
  global[GLOBAL_KEY] = true
  console.log('[quotaScheduler] ✅ Quota scheduler started successfully')
}

async function checkAndResetIfNeeded() {
  try {
    await connectDB()
    
    // Kiểm tra xem có cần reset không
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Lấy email config đầu tiên để kiểm tra
    const sampleConfig = await EmailConfig.findOne()
    if (sampleConfig) {
      const configDate = sampleConfig.updatedAt
      const configDay = new Date(configDate.getFullYear(), configDate.getMonth(), configDate.getDate())
      
      // Nếu config được update từ hôm qua trở đi và dailySent > 0, có thể cần reset
      if (configDay < today && sampleConfig.dailySent > 0) {
        console.log('[quotaScheduler] 🔍 Detected old dailySent data, performing immediate reset...')
        await resetQuota()
      }
    }
  } catch (error) {
    console.error('[quotaScheduler] ❌ Error checking reset status:', error)
  }
}

// Khởi động scheduler
startQuotaScheduler()

// Export để có thể sử dụng từ bên ngoài nếu cần
export { resetQuota, startQuotaScheduler }


