import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Shop } from '../models/Shop.js';

export const requireAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'quickr_super_secret_jwt_key_987654321_production_grade_security');
    
    // Admin users have no shopId — find by id only
    let user;
    if (decoded.shopId) {
      user = await User.findOne({ id: decoded.id, shopId: decoded.shopId });
    } else {
      user = await User.findOne({ id: decoded.id, role: 'admin' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    // Check if user is disabled
    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'Your account has been disabled. Please contact the QuickR administrator.' });
    }

    // For non-admin users, verify their shop is active
    if (user.role !== 'admin' && user.shopId) {
      const shop = await Shop.findOne({ customId: user.shopId });
      if (shop && shop.status === 'disabled') {
        return res.status(403).json({ error: 'Your shop account is currently disabled. Please contact the QuickR administrator.' });
      }
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      shopId: user.shopId,
      role: user.role
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication token' });
  }
};

// Admin-only middleware — must be used AFTER requireAuth
export const requireAdmin = async (req, res, next) => {
  // requireAuth must have already set req.user
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

