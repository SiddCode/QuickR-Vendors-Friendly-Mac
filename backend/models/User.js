import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // e.g. USER-101
    name: { type: String, required: true, trim: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true,
      index: true 
    },
    passwordHash: { type: String, required: true, select: false },
    // shopId is required for owner and staff, optional for admin
    shopId: { type: String, required: false, index: true },
    role: { type: String, enum: ['admin', 'owner', 'staff'], default: 'owner' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' }
  },
  { timestamps: true }
);

// Ensure that owner and staff always have a shopId
userSchema.pre('save', function (next) {
  if (this.role !== 'admin' && (!this.shopId || this.shopId.trim() === '')) {
    return next(new Error('shopId is required for non-admin users'));
  }
  next();
});

export const User = mongoose.model('User', userSchema);
