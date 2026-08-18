import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // e.g. CMP-1724001122
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    discountType: { 
      type: String, 
      enum: ['Percentage', 'Fixed Amount'], 
      required: true 
    },
    discountValue: { type: Number, required: true, min: 0.01 },
    productIds: [{ type: String }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    mediaType: { 
      type: String, 
      enum: ['image', 'video', 'none'], 
      default: 'none' 
    },
    temporaryMediaReference: { type: String, default: '' },
    mediaOriginalName: { type: String, default: '' },
    mediaMimeType: { type: String, default: '' },
    selectedCustomerIds: [{ type: String }],
    targetAudienceType: { 
      type: String, 
      enum: ['all_eligible', 'product_buyers', 'enquiry_customers', 'followup_customers', 'custom_selected'], 
      default: 'all_eligible' 
    },
    eligibleCustomerCount: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['DRAFT', 'READY', 'SCHEDULED', 'SENDING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELLED'], 
      default: 'DRAFT' 
    },
    createdBy: { type: String, required: true },
    campaignCost: { type: Number, default: 0, min: 0 },
    shopId: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

campaignSchema.index({ shopId: 1, createdAt: -1 });

export const Campaign = mongoose.model('Campaign', campaignSchema);
