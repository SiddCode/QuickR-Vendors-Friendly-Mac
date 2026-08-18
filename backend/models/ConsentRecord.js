import mongoose from 'mongoose';

const consentRecordSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    shopId: { type: String, required: false, index: true },
    purpose: { 
      type: String, 
      enum: ['service', 'marketing', 'analytics'], 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['active', 'withdrawn'], 
      default: 'active',
      required: true 
    },
    noticeVersion: { type: String, default: '1.0', required: true },
    language: { type: String, enum: ['en', 'ta'], default: 'en' },
    consentedAt: { type: Date, default: Date.now },
    withdrawnAt: { type: Date }
  },
  { timestamps: true }
);

consentRecordSchema.index({ userId: 1, purpose: 1, noticeVersion: 1 });

export const ConsentRecord = mongoose.model('ConsentRecord', consentRecordSchema);
