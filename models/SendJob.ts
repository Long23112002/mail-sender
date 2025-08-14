import mongoose, { Schema, Document, models } from 'mongoose'

interface JobRecipient {
  xxx?: string
  yyy?: string
  mail?: string
  ttt?: string
  zzz?: string
  www?: string
  uuu?: string
  vvv?: string
  rrr?: string
}

export interface SendJobDoc extends Document {
  userId: string
  emailConfigId: string
  subject: string
  template: string
  recipients: JobRecipient[]
  status: 'queued' | 'running' | 'completed' | 'canceled' | 'failed'
  total: number
  processed: number
  success: number
  failed: number
  results: Array<{ email: string; status: 'success' | 'error'; messageId?: string; error?: string }>
  createdAt: Date
  updatedAt: Date
}

// Sub-schema for recipients to satisfy TS typing (avoid Mixed)
const RecipientSchema = new Schema<JobRecipient>({
  xxx: String,
  yyy: String,
  mail: String,
  ttt: String,
  zzz: String,
  www: String,
  uuu: String,
  vvv: String,
  rrr: String,
}, { _id: false })

interface SendResult {
  email: string
  status: 'success' | 'error'
  messageId?: string
  error?: string
}

const ResultSchema = new Schema<SendResult>({
  email: String,
  status: { type: String, enum: ['success', 'error'] },
  messageId: String,
  error: String,
}, { _id: false })

const SendJobSchema = new Schema<SendJobDoc>({
  userId: { type: String, required: true, index: true },
  emailConfigId: { type: String, required: true },
  subject: String,
  template: String,
  recipients: { type: [RecipientSchema], default: [] },
  status: { type: String, default: 'queued', index: true },
  total: { type: Number, default: 0 },
  processed: { type: Number, default: 0 },
  success: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  results: { type: [ResultSchema], default: [] },
}, { timestamps: true })

export default models.SendJob || mongoose.model<SendJobDoc>('SendJob', SendJobSchema)


