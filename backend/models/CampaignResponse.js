import mongoose from 'mongoose';

const campaignResponseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    shopId: { type: String, required: true, index: true },
    campaignId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    campaignRecipientId: { type: String, default: '' },
    responseType: {
      type: String,
      enum: ['INTERESTED', 'MORE_INFORMATION', 'VISIT_SHOP', 'NOT_INTERESTED', 'PURCHASED', 'NO_RESPONSE'],
      required: true
    },
    notes: { type: String, default: '' },
    enquiryId: { type: String, default: '' },
    followUpId: { type: String, default: '' },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

campaignResponseSchema.index({ shopId: 1, campaignId: 1, customerId: 1 }, { unique: true });

export const CampaignResponse = mongoose.model('CampaignResponse', campaignResponseSchema);
