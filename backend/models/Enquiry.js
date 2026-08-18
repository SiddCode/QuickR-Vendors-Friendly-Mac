import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // e.g. ENQ-101
    customerId: { type: String, required: true },
    productId: { type: String, required: true },
    productName: { type: String },
    productCategory: { type: String },
    priceAtEnquiry: { type: Number },
    size: { type: String, required: true },
    color: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    interest: { 
      type: String, 
      enum: ['Just Enquiring', 'Interested', 'Very Interested'], 
      default: 'Interested' 
    },
    purchaseStatus: { 
      type: String, 
      enum: ['Pending', 'Purchased', "Didn't Purchase"], 
      default: 'Pending' 
    },
    notes: { type: String, default: '' },
    campaignId: { type: String, default: '' },
    source: { type: String, default: 'direct' },
    shopId: { type: String, required: true, default: 'demo-shop', index: true }
  },
  { timestamps: true }
);

enquirySchema.index({ shopId: 1, customerId: 1, createdAt: -1 });

export const Enquiry = mongoose.model('Enquiry', enquirySchema);
