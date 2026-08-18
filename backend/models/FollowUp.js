import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // e.g. FW-101
    customerId: { type: String, required: true },
    enquiryId: { type: String, required: true },
    reason: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['ready', 'scheduled', 'sent', 'waiting', 'completed', 'snoozed', 'closed'], 
      default: 'ready' 
    },
    message: { type: String, required: true },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    messageId: { type: String, default: '' },
    completedAt: { type: Date },
    outcome: { 
      type: String, 
      enum: ['Purchased', 'Still Interested', 'Not Interested', 'No Response'],
      default: undefined
    },
    campaignId: { type: String, default: '' },
    shopId: { type: String, required: true, default: 'demo-shop', index: true }
  },
  { timestamps: true }
);

followUpSchema.index({ shopId: 1, scheduledAt: 1, status: 1 });
followUpSchema.index({ shopId: 1, status: 1 });
followUpSchema.index({ shopId: 1, customerId: 1 });

export const FollowUp = mongoose.model('FollowUp', followUpSchema);
