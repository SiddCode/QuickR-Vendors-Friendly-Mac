import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema(
  {
    customId: { type: String, default: 'SHOP-1' },
    name: { type: String, required: true, default: 'Shop Name' },
    phone: { type: String, default: '+91 98765 43210' },
    address: { type: String, default: 'Chennai, Tamil Nadu' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    subscriptionStatus: { type: String, enum: ['pending', 'active', 'suspended', 'expired'], default: 'active' }
  },
  { timestamps: true }
);

export const Shop = mongoose.model('Shop', shopSchema);
