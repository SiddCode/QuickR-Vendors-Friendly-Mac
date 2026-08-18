import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // e.g. ACT-101
    customerId: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    shopId: { type: String, required: true, default: 'demo-shop', index: true }
  },
  { timestamps: true }
);

activitySchema.index({ shopId: 1, customerId: 1, createdAt: -1 });

export const Activity = mongoose.model('Activity', activitySchema);
