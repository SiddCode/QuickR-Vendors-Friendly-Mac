import mongoose from 'mongoose';

const campaignRecipientSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    campaignId: { type: String, required: true, index: true },
    shopId: { type: String, required: true, index: true },
    customerId: { type: String, required: true },
    phone: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['PENDING', 'OPENED', 'MANUAL_SENT', 'SENT', 'FAILED', 'SKIPPED'], 
      default: 'PENDING' 
    },
    sendingMethod: {
      type: String,
      enum: ['OFFICIAL_API', 'MANUAL_WHATSAPP'],
      default: 'OFFICIAL_API'
    },
    providerMessageId: { type: String, default: '' },
    errorCode: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    sentAt: { type: Date }
  },
  { timestamps: true }
);

campaignRecipientSchema.index({ campaignId: 1, shopId: 1, customerId: 1 });

export const CampaignRecipient = mongoose.model('CampaignRecipient', campaignRecipientSchema);
