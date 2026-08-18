import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

/**
 * Seeds the default admin account for development/testing.
 * Credentials: admin@quickr.com / admin123
 * This function is idempotent — it will NOT recreate the admin if one already exists.
 * If admin@quickr.com exists but is not role='admin', it will be upgraded.
 */
export const seedAdmin = async () => {
  try {
    const adminEmail = 'siddharthank45@gmail.com';
    const targetPassword = 'whiskey';

    const existingUser = await User.findOne({ email: adminEmail });
    
    if (existingUser) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(targetPassword, salt);
      existingUser.role = 'admin';
      existingUser.shopId = null;
      existingUser.status = 'active';
      existingUser.passwordHash = passwordHash;
      await existingUser.save();
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(targetPassword, salt);

    await User.create({
      id: `USER-ADMIN-${Date.now()}`,
      name: 'QuickR Admin',
      email: adminEmail,
      passwordHash,
      shopId: null,
      role: 'admin',
      status: 'active'
    });
  } catch (err) {
    if (err.code === 11000) return;
    console.error('Admin seed error:', err.message);
  }
};
