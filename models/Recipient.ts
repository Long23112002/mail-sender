import mongoose, { Schema, Document, models } from 'mongoose'

export interface RecipientDoc extends Document {
  userId: string
  xxx?: string
  yyy?: string
  mail?: string
  ttt?: string
  zzz?: string
  www?: string
  uuu?: string
  vvv?: string
  rrr?: string
  createdAt: Date
}

const RecipientSchema = new Schema<RecipientDoc>({
  userId: { type: String, required: true, index: true },
  xxx: String,
  yyy: String,
  mail: String,
  ttt: String,
  zzz: String,
  www: String,
  uuu: String,
  vvv: String,
  rrr: String,
}, { timestamps: { createdAt: true, updatedAt: false } })

export default models.Recipient || mongoose.model<RecipientDoc>('Recipient', RecipientSchema)


