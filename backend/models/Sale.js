import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // Internal ID
    invoiceNumber: { type: String, required: true }, // e.g. INV-000001
    customerId: { type: String }, // Optional for walk-ins
    customerName: { type: String },
    customerPhone: { type: String },
    enquiryId: { type: String },
    followUpId: { type: String },
    items: [
      {
        productId: { type: String },
        productName: { type: String, required: true },
        category: { type: String },
        quantity: { type: Number, required: true },
        rate: { type: Number, required: true },
        total: { type: Number, required: true }
      }
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Card', 'Other'], required: true },
    source: { type: String, default: 'direct' },
    saleSource: { type: String, default: 'normal' },
    campaignId: { type: String, default: '' },
    shopId: { type: String, required: true, default: 'demo-shop', index: true }
  },
  { timestamps: true }
);

saleSchema.index({ shopId: 1, createdAt: -1, source: 1 });
saleSchema.index({ shopId: 1, customerId: 1 });

export const Sale = mongoose.model('Sale', saleSchema);
