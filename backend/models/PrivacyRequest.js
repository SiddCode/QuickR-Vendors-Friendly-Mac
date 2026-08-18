import mongoose from 'mongoose';

const privacyRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    shopId: { type: String, required: false, index: true },
    requestType: { 
      type: String, 
      enum: ['access', 'correction', 'erasure', 'consent', 'grievance', 'other'], 
      required: true 
    },
    description: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'under_review', 'completed', 'rejected'], 
      default: 'pending',
      required: true 
    },
    adminNotes: { type: String, default: '' },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

privacyRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const PrivacyRequest = mongoose.model('PrivacyRequest', privacyRequestSchema);
