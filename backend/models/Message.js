import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // e.g. MSG-101
    customerId: { type: String, required: true },
    enquiryId: { type: String, default: '' },
    followUpId: { type: String, default: '' },
    channel: { type: String, default: 'whatsapp' },
    content: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'mock'], 
      default: 'sent' 
    },
    provider: { type: String, enum: ['whatsapp_cloud_api', 'mock'], default: 'mock' },
    providerMessageId: { type: String, default: '', index: true },
    error: { type: String, default: '' },
    sentAt: { type: Date, default: Date.now },
    responseStatus: { type: String, enum: ['No Response', 'Replied', 'Awaiting'], default: 'Awaiting' },
    shopId: { type: String, required: true, default: 'demo-shop', index: true }
  },
  { timestamps: true }
);

messageSchema.index({ shopId: 1, customerId: 1, createdAt: -1 });
messageSchema.index({ providerMessageId: 1 });

export const Message = mongoose.model('Message', messageSchema);
