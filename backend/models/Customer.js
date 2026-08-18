import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // Preservation of customId e.g. CUST-000124
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    location: { type: String, default: 'Chennai, Tamil Nadu' },
    preferences: {
      interestedIn: { type: String, default: '' },
      preferredSize: { type: String, default: '' },
      preferredColors: [{ type: String }],
      lastPurchase: { type: String, default: '' }
    },
    status: { type: String, enum: ['Active', 'Inactive', 'Lead'], default: 'Active' },
    totalPurchases: { type: Number, default: 0 },
    totalSpending: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    shopId: { type: String, required: true, default: 'demo-shop', index: true }
  },
  { timestamps: true }
);

customerSchema.index({ shopId: 1, phone: 1 });

export const Customer = mongoose.model('Customer', customerSchema);
