import mongoose, { Document, Schema } from 'mongoose'
import '@/models/User'

export interface ITemplate extends Document {
  name: string
  description: string
  subject: string
  content: string
  userId: mongoose.Types.ObjectId
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

const TemplateSchema = new Schema<ITemplate>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
})

// Indexes
TemplateSchema.index({ userId: 1 })
TemplateSchema.index({ tags: 1 })

// Tránh lỗi "Schema hasn't been registered" trong Next.js
let Template: mongoose.Model<ITemplate>

try {
  Template = mongoose.model<ITemplate>('Template')
} catch {
  Template = mongoose.model<ITemplate>('Template', TemplateSchema)
}

export default Template
