import mongoose, { Schema, Document, models } from 'mongoose'

interface SendResult {
  email: string
  status: 'success' | 'error'
  messageId?: string
  error?: string
}

export interface EmailHistoryDoc extends Document {
  userId: string
  timestamp: Date
  total: number
  success: number
  failed: number
  results: SendResult[]
}

const ResultSchema = new Schema<SendResult>({
  email: String,
  status: { type: String, enum: ['success', 'error'] },
  messageId: String,
  error: String,
}, { _id: false })

const EmailHistorySchema = new Schema<EmailHistoryDoc>({
  userId: { type: String, index: true, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  total: Number,
  success: Number,
  failed: Number,
  results: [ResultSchema],
})

export default models.EmailHistory || mongoose.model<EmailHistoryDoc>('EmailHistory', EmailHistorySchema)


