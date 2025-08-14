import mongoose, { Document, Schema } from 'mongoose'

export interface IEmailConfig extends Document {
  userId: mongoose.Types.ObjectId
  provider: 'gmail' | 'outlook'
  email: string
  password: string
  displayName: string
  isDefault: boolean
  isActive: boolean
  smtpHost?: string
  smtpPort?: number
  createdAt: Date
  updatedAt: Date
}

const EmailConfigSchema = new Schema<IEmailConfig>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: String,
    enum: ['gmail', 'outlook'],
    required: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  smtpHost: {
    type: String,
    trim: true
  },
  smtpPort: {
    type: Number
  }
}, {
  timestamps: true
})

// Indexes
EmailConfigSchema.index({ userId: 1 })
EmailConfigSchema.index({ userId: 1, isDefault: 1 })

// Ensure only one default config per user
EmailConfigSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await mongoose.model('EmailConfig').updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    )
  }
  next()
})

// Tránh lỗi "Schema hasn't been registered" trong Next.js
let EmailConfig: mongoose.Model<IEmailConfig>

try {
  EmailConfig = mongoose.model<IEmailConfig>('EmailConfig')
} catch {
  EmailConfig = mongoose.model<IEmailConfig>('EmailConfig', EmailConfigSchema)
}

export default EmailConfig
