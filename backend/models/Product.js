import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // e.g. PROD-1
    name: { type: String, required: true },
    category: { type: String, required: true },
    subcategory: { type: String, default: '' },
    sellingPrice: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    sizes: [{ type: String }],
    colors: [{ type: String }],
    availability: { type: Number, default: 10 },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    shopId: { type: String, required: true, default: 'demo-shop', index: true }
  },
  { timestamps: true }
);

productSchema.index({ shopId: 1, createdAt: -1, isActive: 1 });

export const Product = mongoose.model('Product', productSchema);
