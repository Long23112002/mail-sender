import connectDB from './mongodb'
import EmailConfig from '@/models/EmailConfig'

// Đảm bảo chỉ khởi tạo một lần trong môi trường Next.js
const GLOBAL_KEY = '__quota_scheduler_started__'

declare const global: typeof globalThis & { [GLOBAL_KEY]?: boolean }

async function resetQuota() {
  try {
    await connectDB()
    await EmailConfig.updateMany({}, { $set: { dailySent: 0 } })
    // eslint-disable-next-line no-console
    console.log('[quotaScheduler] Reset dailySent to 0 for all email configs')
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[quotaScheduler] Failed to reset quota:', e)
  }
}

function scheduleMidnightReset() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(24, 0, 0, 0) // 00:00 ngày hôm sau theo giờ hệ thống
  const delay = Math.max(1000, next.getTime() - now.getTime())

  setTimeout(async () => {
    await resetQuota()
    // Sau khi chạy lúc 00:00, cứ 24h chạy lại
    setInterval(resetQuota, 24 * 60 * 60 * 1000)
  }, delay)
}

if (!global[GLOBAL_KEY]) {
  global[GLOBAL_KEY] = true
  scheduleMidnightReset()
}

export {}


