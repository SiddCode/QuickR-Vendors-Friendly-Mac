import mongoose from 'mongoose';

const subscriptionRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    shopName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    requestedPlan: { type: String, default: 'Standard' },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: null },
    adminNotes: { type: String, default: '' },
    createdShopId: { type: String, default: null }
  },
  { timestamps: true }
);

subscriptionRequestSchema.index({ phone: 1, email: 1, status: 1 });

export const SubscriptionRequest = mongoose.model('SubscriptionRequest', subscriptionRequestSchema);
