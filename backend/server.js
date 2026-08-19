import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { connectDB } from './config/database.js';
import { requireAuth } from './middleware/auth.js';
import { calculatePriorityAndReason } from './services/priorityService.js';
import { sendWhatsAppCloudMessage } from './services/whatsapp.js';
import { normalizeIndianMobileNumber } from './utils/phone.js';
import { adminRouter } from './routes/admin.js';
import { aiRouter } from './routes/ai.js';
import { whatsappRouter } from './routes/whatsapp.js';
import { privacyRouter } from './routes/privacy.js';
import { campaignRouter } from './routes/campaigns.js';
import { reengagementRouter } from './routes/reengagement.js';
import { seedAdmin } from './scripts/seedAdmin.js';

import { User } from './models/User.js';
import { Shop } from './models/Shop.js';
import { Customer } from './models/Customer.js';
import { Product } from './models/Product.js';
import { Enquiry } from './models/Enquiry.js';
import { FollowUp } from './models/FollowUp.js';
import { Message } from './models/Message.js';
import { Sale } from './models/Sale.js';
import { Activity } from './models/Activity.js';
import { SubscriptionRequest } from './models/SubscriptionRequest.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 53211;
const JWT_SECRET = process.env.JWT_SECRET || 'quickr_super_secret_jwt_key_987654321_production_grade_security';

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or matching allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS origin policy'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

connectDB();

// Dev seed helper for testing & Phase 4 realistic clothing shop data
const seedDatabaseIfNeeded = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Seeding Phase 4 realistic clothing-shop demo dataset...');
      
      await Shop.create({ 
        customId: 'demo-shop', 
        name: 'QuickR Fashion Hub', 
        phone: '+91 98765 43210', 
        address: 'T. Nagar, Chennai, Tamil Nadu' 
      });

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);

      await User.create({
        id: 'USER-100',
        name: 'Admin User',
        email: 'admin@quickr.com',
        passwordHash,
        shopId: 'demo-shop',
        role: 'owner'
      });

      // 10+ Diverse Clothing Customers
      const seedCustomers = [
        { id: 'CUST-000124', name: 'Rahul', phone: '+91 98765 43210', email: 'rahul@gmail.com', location: 'Chennai, Tamil Nadu', preferences: { interestedIn: 'Shirts', preferredSize: 'XL', preferredColors: ['Black', 'Navy'], lastPurchase: '12 days ago' }, status: 'Active', totalPurchases: 1, totalSpending: 1399, conversionRate: 33, shopId: 'demo-shop' },
        { id: 'CUST-000125', name: 'Priya R.', phone: '+91 91234 56780', email: 'priya.r@gmail.com', location: 'Mumbai, Maharashtra', preferences: { interestedIn: 'Sarees & Kurtis', preferredSize: 'L', preferredColors: ['Pink', 'Gold'], lastPurchase: '30 days ago' }, status: 'Active', totalPurchases: 2, totalSpending: 4500, conversionRate: 66, shopId: 'demo-shop' },
        { id: 'CUST-000126', name: 'Karthik A.', phone: '+91 99887 76655', email: 'karthik.a@gmail.com', location: 'Bangalore, Karnataka', preferences: { interestedIn: 'Jeans & T-Shirts', preferredSize: 'M', preferredColors: ['Blue', 'Grey'], lastPurchase: '5 days ago' }, status: 'Active', totalPurchases: 1, totalSpending: 2199, conversionRate: 50, shopId: 'demo-shop' },
        { id: 'CUST-000127', name: 'Suresh V.', phone: '+91 90123 45678', email: 'suresh.v@gmail.com', location: 'Hyderabad, Telangana', preferences: { interestedIn: 'Formal Trousers', preferredSize: '34', preferredColors: ['Black', 'Dark Grey'], lastPurchase: '20 days ago' }, status: 'Active', totalPurchases: 0, totalSpending: 0, conversionRate: 0, shopId: 'demo-shop' },
        { id: 'CUST-000128', name: 'Meena K.', phone: '+91 90909 09090', email: 'meena.k@gmail.com', location: 'Delhi, NCR', preferences: { interestedIn: 'Dresses', preferredSize: 'M', preferredColors: ['Red', 'Black'], lastPurchase: '45 days ago' }, status: 'Active', totalPurchases: 0, totalSpending: 0, conversionRate: 0, shopId: 'demo-shop' },
        { id: 'CUST-000129', name: 'Ramesh A.', phone: '+91 98765 11111', email: 'ramesh.a@gmail.com', location: 'Kolkata, West Bengal', preferences: { interestedIn: 'Shirts', preferredSize: 'XL', preferredColors: ['Blue'], lastPurchase: '18 days ago' }, status: 'Active', totalPurchases: 0, totalSpending: 0, conversionRate: 0, shopId: 'demo-shop' },
        { id: 'CUST-000130', name: 'Anitha S.', phone: '+91 98400 22334', email: 'anitha.s@gmail.com', location: 'Coimbatore, Tamil Nadu', preferences: { interestedIn: 'Kids Wear', preferredSize: '4-5Y', preferredColors: ['Yellow', 'Bright Blue'], lastPurchase: '8 days ago' }, status: 'Active', totalPurchases: 1, totalSpending: 1299, conversionRate: 50, shopId: 'demo-shop' },
        { id: 'CUST-000131', name: 'Vikram Seth', phone: '+91 97111 88990', email: 'vikram@gmail.com', location: 'Jaipur, Rajasthan', preferences: { interestedIn: 'Ethnic Jackets', preferredSize: 'L', preferredColors: ['Maroon', 'Beige'], lastPurchase: '2 days ago' }, status: 'Active', totalPurchases: 3, totalSpending: 8900, conversionRate: 75, shopId: 'demo-shop' },
        { id: 'CUST-000132', name: 'Deepika M.', phone: '+91 96500 44556', email: 'deepika.m@gmail.com', location: 'Pune, Maharashtra', preferences: { interestedIn: 'Designer Sarees', preferredSize: 'Free Size', preferredColors: ['Green', 'Gold'], lastPurchase: '60 days ago' }, status: 'Active', totalPurchases: 0, totalSpending: 0, conversionRate: 0, shopId: 'demo-shop' },
        { id: 'CUST-000133', name: 'Arun Kumar', phone: '+91 99444 55667', email: 'arun.k@gmail.com', location: 'Chennai, Tamil Nadu', preferences: { interestedIn: 'Denim Jeans', preferredSize: '32', preferredColors: ['Dark Blue'], lastPurchase: '14 days ago' }, status: 'Active', totalPurchases: 1, totalSpending: 1999, conversionRate: 50, shopId: 'demo-shop' }
      ];
      await Customer.insertMany(seedCustomers);

      // 15+ Products across categories (Shirts, Jeans, T-Shirts, Dresses, Sarees, Kids Wear)
      const seedProducts = [
        { id: 'PROD-1', name: 'Black Casual Shirt', category: 'Shirts', price: 1499, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Black'], availableQuantity: 12, shopId: 'demo-shop' },
        { id: 'PROD-2', name: 'White Linen Shirt', category: 'Shirts', price: 1299, sizes: ['S', 'M', 'L', 'XL'], colors: ['White'], availableQuantity: 20, shopId: 'demo-shop' },
        { id: 'PROD-3', name: 'Slim Fit Denim Jeans', category: 'Jeans', price: 1999, sizes: ['30', '32', '34', '36'], colors: ['Dark Blue', 'Black'], availableQuantity: 15, shopId: 'demo-shop' },
        { id: 'PROD-4', name: 'Cotton Graphic T-Shirt', category: 'T-Shirts', price: 799, sizes: ['S', 'M', 'L', 'XL'], colors: ['Black', 'White', 'Olive'], availableQuantity: 30, shopId: 'demo-shop' },
        { id: 'PROD-5', name: 'Silk Cotton Saree', category: 'Sarees', price: 3499, sizes: ['Free Size'], colors: ['Red', 'Royal Blue', 'Gold'], availableQuantity: 8, shopId: 'demo-shop' },
        { id: 'PROD-6', name: 'Printed Anarkali Kurti', category: 'Kurtis', price: 1899, sizes: ['S', 'M', 'L', 'XL'], colors: ['Yellow', 'Pink'], availableQuantity: 10, shopId: 'demo-shop' },
        { id: 'PROD-7', name: 'Kids Party Wear Set', category: 'Kids Wear', price: 1299, sizes: ['2-3Y', '4-5Y', '6-7Y'], colors: ['Bright Blue', 'Red'], availableQuantity: 14, shopId: 'demo-shop' },
        { id: 'PROD-8', name: 'Floral Summer Dress', category: 'Dresses', price: 2299, sizes: ['S', 'M', 'L'], colors: ['Yellow', 'Mint Green'], availableQuantity: 6, shopId: 'demo-shop' },
        { id: 'PROD-9', name: 'Nehru Bandhgala Jacket', category: 'Jackets', price: 2999, sizes: ['M', 'L', 'XL'], colors: ['Maroon', 'Black', 'Beige'], availableQuantity: 7, shopId: 'demo-shop' },
        { id: 'PROD-10', name: 'Formal Chino Trousers', category: 'Trousers', price: 1599, sizes: ['30', '32', '34', '36'], colors: ['Navy', 'Khaki', 'Grey'], availableQuantity: 18, shopId: 'demo-shop' }
      ];
      await Product.insertMany(seedProducts);

      // 15+ Enquiries
      const seedEnquiries = [
        { id: 'ENQ-101', customerId: 'CUST-000124', productId: 'PROD-1', size: 'XL', color: 'Black', quantity: 1, interest: 'Very Interested', purchaseStatus: "Didn't Purchase", notes: 'Customer asked about XL availability.', shopId: 'demo-shop' },
        { id: 'ENQ-102', customerId: 'CUST-000125', productId: 'PROD-5', size: 'Free Size', color: 'Gold', quantity: 1, interest: 'Very Interested', purchaseStatus: "Didn't Purchase", notes: 'Looking for festival saree.', shopId: 'demo-shop' },
        { id: 'ENQ-103', customerId: 'CUST-000126', productId: 'PROD-3', size: '32', color: 'Dark Blue', quantity: 1, interest: 'Interested', purchaseStatus: "Didn't Purchase", notes: 'Checking stretch comfort.', shopId: 'demo-shop' },
        { id: 'ENQ-104', customerId: 'CUST-000127', productId: 'PROD-10', size: '34', color: 'Navy', quantity: 1, interest: 'Interested', purchaseStatus: "Didn't Purchase", shopId: 'demo-shop' },
        { id: 'ENQ-105', customerId: 'CUST-000128', productId: 'PROD-8', size: 'M', color: 'Yellow', quantity: 1, interest: 'Interested', purchaseStatus: "Didn't Purchase", shopId: 'demo-shop' },
        { id: 'ENQ-106', customerId: 'CUST-000129', productId: 'PROD-1', size: 'XL', color: 'Black', quantity: 1, interest: 'Interested', purchaseStatus: "Didn't Purchase", shopId: 'demo-shop' },
        { id: 'ENQ-107', customerId: 'CUST-000130', productId: 'PROD-7', size: '4-5Y', color: 'Bright Blue', quantity: 1, interest: 'Very Interested', purchaseStatus: "Didn't Purchase", shopId: 'demo-shop' },
        { id: 'ENQ-108', customerId: 'CUST-000131', productId: 'PROD-9', size: 'L', color: 'Maroon', quantity: 1, interest: 'Very Interested', purchaseStatus: "Didn't Purchase", shopId: 'demo-shop' },
        { id: 'ENQ-109', customerId: 'CUST-000132', productId: 'PROD-5', size: 'Free Size', color: 'Red', quantity: 1, interest: 'Just Enquiring', purchaseStatus: "Didn't Purchase", shopId: 'demo-shop' },
        { id: 'ENQ-110', customerId: 'CUST-000133', productId: 'PROD-3', size: '32', color: 'Dark Blue', quantity: 1, interest: 'Interested', purchaseStatus: "Didn't Purchase", shopId: 'demo-shop' }
      ];
      await Enquiry.insertMany(seedEnquiries);

      // Follow-ups with Overdue, Due Today, and Scheduled states
      const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const today = new Date();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const seedFollowUps = [
        { id: 'FW-101', customerId: 'CUST-000124', enquiryId: 'ENQ-101', reason: 'Rahul showed interest in Black Casual Shirt (XL) 2 days ago.', scheduledAt: yesterday, status: 'ready', message: 'Hi Rahul,\n\nYour size XL Black Casual Shirt is available! Shall we reserve it for you?\n\n— QuickR Fashion Hub', priority: 'High', shopId: 'demo-shop' },
        { id: 'FW-102', customerId: 'CUST-000125', enquiryId: 'ENQ-102', reason: 'Priya requested Gold Silk Saree follow-up 3 days ago.', scheduledAt: threeDaysAgo, status: 'ready', message: 'Hi Priya,\n\nThe Gold Silk Saree you liked is in high demand! Would you like us to hold it?\n\n— QuickR Fashion Hub', priority: 'High', shopId: 'demo-shop' },
        { id: 'FW-103', customerId: 'CUST-000126', enquiryId: 'ENQ-103', reason: 'Karthik enquired about Slim Fit Jeans (size 32).', scheduledAt: today, status: 'ready', message: 'Hi Karthik,\n\nWe have your size 32 Slim Fit Denim Jeans ready.\n\n— QuickR Fashion Hub', priority: 'High', shopId: 'demo-shop' },
        { id: 'FW-104', customerId: 'CUST-000127', enquiryId: 'ENQ-104', reason: 'Formal Chino Trousers enquiry follow-up.', scheduledAt: today, status: 'ready', message: 'Hi Suresh,\n\nRegarding the Navy Formal Chinos you asked about...\n\n— QuickR Fashion Hub', priority: 'Medium', shopId: 'demo-shop' },
        { id: 'FW-105', customerId: 'CUST-000128', enquiryId: 'ENQ-105', reason: 'Floral Summer Dress enquiry.', scheduledAt: today, status: 'ready', message: 'Hi Meena,\n\nYellow Summer Dress is fast selling out!\n\n— QuickR Fashion Hub', priority: 'Medium', shopId: 'demo-shop' },
        { id: 'FW-106', customerId: 'CUST-000130', enquiryId: 'ENQ-107', reason: 'Anitha enquired for Kids Party Wear Set.', scheduledAt: today, status: 'ready', message: 'Hi Anitha,\n\nKids Party Wear Set (4-5Y) is ready for pickup.\n\n— QuickR Fashion Hub', priority: 'High', shopId: 'demo-shop' },
        { id: 'FW-107', customerId: 'CUST-000131', enquiryId: 'ENQ-108', reason: 'Vikram requested Nehru Bandhgala Jacket.', scheduledAt: today, status: 'ready', message: 'Hi Vikram,\n\nMaroon Bandhgala Jacket in L is available for you.\n\n— QuickR Fashion Hub', priority: 'High', shopId: 'demo-shop' },
        { id: 'FW-108', customerId: 'CUST-000133', enquiryId: 'ENQ-110', reason: 'Scheduled follow-up for tomorrow.', scheduledAt: tomorrow, status: 'scheduled', message: 'Hi Arun,\n\nFollow-up regarding Denim Jeans.\n\n— QuickR Fashion Hub', priority: 'Low', shopId: 'demo-shop' }
      ];
      await FollowUp.insertMany(seedFollowUps);

      const seedSales = [
        { id: 'SALE-1', customerId: 'CUST-000124', enquiryId: 'ENQ-101', productId: 'PROD-1', quantity: 1, amount: 1399, source: 'quickr_followup', shopId: 'demo-shop' },
        { id: 'SALE-2', customerId: 'CUST-000125', enquiryId: 'ENQ-102', productId: 'PROD-5', quantity: 1, amount: 3499, source: 'quickr_followup', shopId: 'demo-shop' },
        { id: 'SALE-3', customerId: 'CUST-000131', enquiryId: 'ENQ-108', productId: 'PROD-9', quantity: 1, amount: 2999, source: 'quickr_followup', shopId: 'demo-shop' }
      ];
      await Sale.insertMany(seedSales);

      await Activity.create({ id: 'ACT-1', customerId: 'CUST-000124', type: 'enquiry_created', description: 'Enquiry added for Black Casual Shirt (XL)', shopId: 'demo-shop' });

      console.log('✅ Phase 4 realistic dataset seeded successfully!');
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

setTimeout(seedDatabaseIfNeeded, 1500);

// Seed admin account (idempotent — only creates if not exists)
setTimeout(async () => { await seedAdmin(); }, 2000);

const setAuthCookie = (res, token) => {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
};

app.post('/api/subscription-requests', async (req, res) => {
  try {
    const { name, shopName, phone, email, requestedPlan, message } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Your name is required.' });
    }
    if (!shopName || !String(shopName).trim()) {
      return res.status(400).json({ success: false, error: 'Shop name is required.' });
    }

    const normalizedPhone = normalizeIndianMobileNumber(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, error: 'Enter a valid 10-digit Indian mobile number.' });
    }

    const cleanEmail = String(email || '').toLowerCase().trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Enter a valid email address.' });
    }

    // Input length protection
    if (name.length > 100 || shopName.length > 100 || cleanEmail.length > 100) {
      return res.status(400).json({ success: false, error: 'Input fields exceed maximum allowed character length.' });
    }

    // Check for duplicate pending requests
    const existingPending = await SubscriptionRequest.findOne({
      $or: [{ phone: normalizedPhone }, { email: cleanEmail }],
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        error: 'A subscription request for this mobile number or email is already pending review. Our team will contact you shortly.'
      });
    }

    const newRequest = new SubscriptionRequest({
      id: `SUBREQ-${Date.now()}`,
      name: name.trim(),
      shopName: shopName.trim(),
      phone: normalizedPhone,
      email: cleanEmail,
      requestedPlan: requestedPlan ? String(requestedPlan).trim() : 'Standard',
      message: message ? String(message).trim().substring(0, 500) : '',
      status: 'pending'
    });

    await newRequest.save();

    res.status(201).json({
      success: true,
      message: 'Your QuickR access request has been submitted. Our team will contact you.'
    });
  } catch (err) {
    console.error('Subscription request submission error:', err);
    res.status(500).json({ success: false, error: 'Unable to submit request. Please try again.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  // Public direct registration is disabled; require admin approval via subscription requests
  const allowReg = process.env.ALLOW_PUBLIC_REGISTRATION;
  if (!allowReg || allowReg === 'false') {
    return res.status(403).json({ error: 'Direct public shop registration is disabled. Please request QuickR access for admin approval.' });
  }

  let createdShop = null;
  let createdUser = null;

  try {
    const { ownerName, shopName, email, password } = req.body;

    if (!ownerName || !shopName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const shopCustomId = `SHOP-${Date.now()}`;
    const userCustomId = `USER-${Date.now()}`;

    createdShop = new Shop({
      customId: shopCustomId,
      name: shopName.trim(),
      phone: '',
      address: ''
    });
    await createdShop.save();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    createdUser = new User({
      id: userCustomId,
      name: ownerName.trim(),
      email: normalizedEmail,
      passwordHash,
      shopId: shopCustomId,
      role: 'owner'
    });
    await createdUser.save();

    const token = jwt.sign(
      { id: createdUser.id, shopId: createdShop.customId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    setAuthCookie(res, token);

    return res.status(201).json({
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        shopId: createdShop.customId,
        role: createdUser.role,
        shopName: createdShop.name
      },
      token
    });
  } catch (err) {
    if (createdUser && createdUser._id) await User.deleteOne({ _id: createdUser._id }).catch(() => {});
    if (createdShop && createdShop._id) await Shop.deleteOne({ _id: createdShop._id }).catch(() => {});
    return res.status(500).json({ error: `Registration failed: ${err.message}` });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check if user account is disabled
    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'Your account has been disabled. Please contact the QuickR administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Log failed login attempt
      try {
        const ipAddress = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
        const userAgent = req.headers['user-agent'] || 'QuickR-Client';
        await PrivacyAuditLog.create({
          id: `PAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: user.id,
          shopId: user.shopId || (user.role === 'admin' ? 'ADMIN' : 'SYSTEM'),
          action: 'LOGIN_FAILED',
          resourceType: 'User',
          resourceId: user.id,
          ipAddress,
          userAgent,
          metadata: { email: user.email, reason: 'Invalid password' }
        });
      } catch (e) {}

      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // For non-admin users, check if their shop is disabled
    let shop = null;
    if (user.role !== 'admin' && user.shopId) {
      shop = await Shop.findOne({ customId: user.shopId });
      if (shop && shop.status === 'disabled') {
        return res.status(403).json({ error: 'Your shop account is currently disabled. Please contact the QuickR administrator.' });
      }
    } else if (user.shopId) {
      shop = await Shop.findOne({ customId: user.shopId });
    }

    const token = jwt.sign(
      { id: user.id, shopId: user.shopId || null, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    setAuthCookie(res, token);

    // Log successful login activity
    try {
      const ipAddress = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
      const userAgent = req.headers['user-agent'] || 'QuickR-Client';
      await PrivacyAuditLog.create({
        id: `PAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        shopId: user.shopId || (user.role === 'admin' ? 'ADMIN' : 'SYSTEM'),
        action: 'LOGIN',
        resourceType: 'User',
        resourceId: user.id,
        ipAddress,
        userAgent,
        metadata: { role: user.role }
      });
    } catch (e) {}

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        shopId: user.shopId || null,
        role: user.role,
        shopName: shop?.name || (user.role === 'admin' ? 'QuickR Admin' : 'Shop Name')
      },
      token
    });
  } catch (err) {
    return res.status(500).json({ error: `Login failed: ${err.message}` });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    let shopName = 'Shop Name';
    if (req.user.role === 'admin') {
      shopName = 'QuickR Admin';
    } else if (req.user.shopId) {
      const shop = await Shop.findOne({ customId: req.user.shopId });
      shopName = shop?.name || 'Shop Name';
    }
    return res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        shopId: req.user.shopId || null,
        role: req.user.role,
        shopName
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user session' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully' });
});

// ===================================
// SHOP PROFILE ENDPOINTS (AUTHENTICATED)
// ===================================

app.get('/api/shop/profile', requireAuth, async (req, res) => {
  try {
    if (!req.user.shopId) {
      return res.status(400).json({ error: 'User does not belong to a shop account.' });
    }
    const shop = await Shop.findOne({ customId: req.user.shopId });
    if (!shop) {
      return res.status(404).json({ error: 'Shop profile not found.' });
    }
    res.json({
      customId: shop.customId,
      name: shop.name,
      phone: shop.phone || '',
      address: shop.address || '',
      status: shop.status || 'active',
      subscriptionStatus: shop.subscriptionStatus || 'active',
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt
    });
  } catch (err) {
    console.error('Fetch shop profile error:', err);
    res.status(500).json({ error: 'Failed to fetch shop profile.' });
  }
});

app.patch('/api/shop/profile', requireAuth, async (req, res) => {
  try {
    if (!req.user.shopId) {
      return res.status(400).json({ error: 'User does not belong to a shop account.' });
    }

    const { name, phone } = req.body || {};

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) {
        return res.status(400).json({ error: 'Shop name cannot be empty.' });
      }
      if (cleanName.length > 100) {
        return res.status(400).json({ error: 'Shop name exceeds maximum character limit of 100.' });
      }
    }

    let normalizedPhone = undefined;
    if (phone !== undefined) {
      const cleanPhone = String(phone).trim();
      if (!cleanPhone) {
        return res.status(400).json({ error: 'Contact phone number is required.' });
      }
      normalizedPhone = normalizeIndianMobileNumber(cleanPhone);
      if (!normalizedPhone) {
        return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
      }
    }

    const shop = await Shop.findOne({ customId: req.user.shopId });
    if (!shop) {
      return res.status(404).json({ error: 'Shop profile not found.' });
    }

    if (name !== undefined) shop.name = String(name).trim();
    if (normalizedPhone !== undefined) shop.phone = normalizedPhone;

    await shop.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      shop: {
        customId: shop.customId,
        name: shop.name,
        phone: shop.phone,
        address: shop.address,
        status: shop.status,
        subscriptionStatus: shop.subscriptionStatus,
        updatedAt: shop.updatedAt
      }
    });
  } catch (err) {
    console.error('Update shop profile error:', err);
    res.status(500).json({ error: 'Failed to update shop profile.' });
  }
});

// ===================================
// PHASE 4: TODAY'S WORK QUEUE ENDPOINT
// ===================================

app.get('/api/work/today', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const now = new Date();
    
    // Indian Standard Time (IST = UTC + 5:30) date boundaries calculation
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    const startOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0, 0) - istOffsetMs);
    const endOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);

    const rawFollowUps = await FollowUp.find({
      shopId,
      status: { $in: ['ready', 'sent', 'scheduled'] }
    }).sort({ createdAt: -1 });

    const custIds = [...new Set(rawFollowUps.map(f => f.customerId))];
    const enqIds = [...new Set(rawFollowUps.map(f => f.enquiryId))];

    const customers = await Customer.find({ id: { $in: custIds }, shopId });
    const enquiries = await Enquiry.find({ id: { $in: enqIds }, shopId });
    
    const prodIds = [...new Set(enquiries.map(e => e.productId))];
    const products = await Product.find({ id: { $in: prodIds }, shopId });

    const custMap = new Map(customers.map(c => [c.id, c]));
    const enqMap = new Map(enquiries.map(e => [e.id, e]));
    const prodMap = new Map(products.map(p => [p.id, p]));

    const enrichedTasks = rawFollowUps.map(fw => {
      const customer = custMap.get(fw.customerId) || null;
      const enquiry = enqMap.get(fw.enquiryId) || null;
      const product = enquiry ? prodMap.get(enquiry.productId) || null : null;

      const priorityInfo = calculatePriorityAndReason(fw, enquiry, customer, product);

      const scheduledDate = new Date(fw.scheduledAt);
      const isOverdue = scheduledDate < startOfToday && (fw.status === 'ready' || fw.status === 'scheduled');
      const isDueToday = scheduledDate >= startOfToday && scheduledDate <= endOfToday && (fw.status === 'ready' || fw.status === 'sent' || fw.status === 'scheduled');
      const isUpcoming = scheduledDate > endOfToday || (fw.status === 'scheduled' && !isDueToday && !isOverdue);

      return {
        ...fw.toObject(),
        priority: priorityInfo.priority,
        priorityScore: priorityInfo.score,
        daysOverdue: priorityInfo.daysOverdue,
        reason: priorityInfo.reason,
        isOverdue,
        isDueToday,
        isUpcoming,
        customer,
        enquiry,
        product
      };
    });

    // Categorize cleanly without duplicating overdue items into dueToday
    const overdue = enrichedTasks.filter(t => t.isOverdue);
    const dueToday = enrichedTasks.filter(t => t.isDueToday);
    const upcoming = enrichedTasks.filter(t => t.isUpcoming && !t.isOverdue);
    const highPriority = enrichedTasks.filter(t => t.priority === 'High' || t.priority === 'HIGH');

    // Stats
    const salesDocs = await Sale.find({ shopId, source: 'quickr_followup' });
    const recoveredSalesAmount = salesDocs.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const enquiriesCount = await Enquiry.countDocuments({ shopId });

    // Calculate unique customer count ready for engagement today
    const uniqueCustomerCountToday = new Set(dueToday.map(t => t.customerId)).size;

    console.log(`[WORK/TODAY] shopId=${shopId} | rawFollowUps=${rawFollowUps.length} | dueToday=${dueToday.length} | uniqueCustomersToday=${uniqueCustomerCountToday} | overdue=${overdue.length} | IST Date=${istYear}-${istMonth+1}-${istDate}`);
    console.log('TODAY FOLLOWUPS:', rawFollowUps.map(f => ({
      id: f.id, customerId: f.customerId, scheduledAt: f.scheduledAt, status: f.status
    })));
    console.log('DUE TODAY:', dueToday.map(t => ({
      id: t.id, customerId: t.customerId, customerName: t.customer?.name
    })));


    res.json({
      totalTasks: dueToday.length,
      dueToday,
      overdue,
      upcoming,
      highPriority,
      summary: {
        todayWorkCount: uniqueCustomerCountToday,
        overdueCount: overdue.length,
        enquiriesCount,
        recoveredSalesAmount,
        convertedCount: salesDocs.length
      }
    });
  } catch (err) {
    console.error('Work Today error:', err);
    res.status(500).json({ error: 'Failed to fetch today work queue' });
  }
});

app.get('/api/followups/today', requireAuth, async (req, res) => {
  try {
    const list = await FollowUp.find({ 
      shopId: req.user.shopId, 
      status: { $in: ['ready', 'sent'] } 
    }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch today follow-ups' });
  }
});

// ===================================
// PROTECTED BUSINESS APIs
// ===================================

app.get('/api/customers', requireAuth, async (req, res) => {
  try {
    const list = await Customer.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.get('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    const cust = await Customer.findOne({ id: req.params.id, shopId: req.user.shopId });
    if (!cust) return res.status(404).json({ error: 'Customer not found' });
    res.json(cust);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

app.post('/api/customers', requireAuth, async (req, res) => {
  try {
    const { name, phone, email, location, preferences } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: 'Customer name and mobile number are required' });
    }

    const normalizedPhone = normalizeIndianMobileNumber(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, error: 'Enter a valid 10-digit mobile number.' });
    }

    // Check if customer already exists for this shop
    const existing = await Customer.findOne({ shopId: req.user.shopId, phone: normalizedPhone });
    if (existing) {
      if (req.body.allowWhatsAppOffers !== undefined) {
        const ConsentModel = (await import('./models/ConsentRecord.js')).ConsentRecord;
        const consentStatus = req.body.allowWhatsAppOffers === true || req.body.allowWhatsAppOffers === 'true' ? 'active' : 'withdrawn';
        await ConsentModel.findOneAndUpdate(
          { userId: existing.id, shopId: req.user.shopId, purpose: 'marketing' },
          { id: `CNS-${Date.now()}`, userId: existing.id, shopId: req.user.shopId, purpose: 'marketing', status: consentStatus, consentedAt: consentStatus === 'active' ? new Date() : null, withdrawnAt: consentStatus === 'withdrawn' ? new Date() : null, noticeVersion: '1.0' },
          { upsert: true, new: true }
        );
      }
      return res.status(200).json(existing);
    }

    const id = `CUST-${Date.now()}`;

    const newCustomer = new Customer({
      id,
      name: name.trim(),
      phone: normalizedPhone,
      email: email ? email.trim() : '',
      location: location || 'Chennai, Tamil Nadu',
      preferences: preferences || {},
      status: 'Active',
      shopId: req.user.shopId
    });

    await newCustomer.save();

    // Store marketing consent record if allowWhatsAppOffers is passed
    const { allowWhatsAppOffers } = req.body;
    const ConsentModel = (await import('./models/ConsentRecord.js')).ConsentRecord;
    const consentStatus = allowWhatsAppOffers === true || allowWhatsAppOffers === 'true' ? 'active' : 'withdrawn';
    await ConsentModel.findOneAndUpdate(
      { userId: id, shopId: req.user.shopId, purpose: 'marketing' },
      { id: `CNS-${Date.now()}`, userId: id, shopId: req.user.shopId, purpose: 'marketing', status: consentStatus, consentedAt: consentStatus === 'active' ? new Date() : null, withdrawnAt: consentStatus === 'withdrawn' ? new Date() : null, noticeVersion: '1.0' },
      { upsert: true, new: true }
    );

    await Activity.create({
      id: `ACT-${Date.now()}`,
      customerId: id,
      type: 'customer_added',
      description: `Added new customer: ${name.trim()}`,
      shopId: req.user.shopId
    });

    res.status(201).json(newCustomer);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Unable to save customer' });
  }
});

app.put('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    delete req.body.shopId;
    
    if (req.body.phone !== undefined) {
      const normalized = normalizeIndianMobileNumber(req.body.phone);
      if (!normalized) {
        return res.status(400).json({ success: false, error: 'Enter a valid 10-digit mobile number.' });
      }
      req.body.phone = normalized;
    }

    const updated = await Customer.findOneAndUpdate(
      { id: req.params.id, shopId: req.user.shopId },
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user?.shopId;

    if (!shopId) {
      return res.status(403).json({ success: false, error: 'Shop authorization required' });
    }

    // Verify customer exists under authenticated shop
    const customer = await Customer.findOne({ id, shopId });
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // Remove operational CRM records (Enquiries, FollowUps, Messages, Activities)
    await Promise.all([
      Enquiry.deleteMany({ customerId: id, shopId }),
      FollowUp.deleteMany({ customerId: id, shopId }),
      Message.deleteMany({ customerId: id, shopId }),
      Activity.deleteMany({ customerId: id, shopId }),
    ]);

    // Note: Historical Sales records are preserved for accounting/reports
    // Remove the customer record itself
    await Customer.deleteOne({ id, shopId });

    res.json({
      success: true,
      message: 'Customer deleted successfully.'
    });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete customer' });
  }
});

app.get('/api/products', requireAuth, async (req, res) => {
  try {
    const list = await Product.find({ shopId: req.user.shopId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const prod = await Product.findOne({ id: req.params.id, shopId: req.user.shopId });
    if (!prod) return res.status(404).json({ error: 'Product not found' });
    res.json(prod);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/products', requireAuth, async (req, res) => {
  try {
    const { name, category, subcategory, sellingPrice, originalPrice, sizes, colors, availability, description, isActive } = req.body;
    if (!name || sellingPrice === undefined) {
      return res.status(400).json({ error: 'Product name and selling price are required' });
    }

    const id = `PROD-${Date.now()}`;
    const newProd = new Product({
      id,
      name,
      category: category || 'Shirts',
      subcategory: subcategory || '',
      sellingPrice,
      originalPrice,
      sizes: sizes || [],
      colors: colors || [],
      availability: availability !== undefined ? availability : 10,
      description: description || '',
      isActive: isActive !== undefined ? isActive : true,
      shopId: req.user.shopId
    });

    await newProd.save();
    res.status(201).json(newProd);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const { name, category, subcategory, sellingPrice, originalPrice, sizes, colors, availability, description, isActive } = req.body;
    const prod = await Product.findOne({ id: req.params.id, shopId: req.user.shopId });
    if (!prod) return res.status(404).json({ error: 'Product not found' });
    
    if (name) prod.name = name;
    if (category) prod.category = category;
    if (subcategory !== undefined) prod.subcategory = subcategory;
    if (sellingPrice !== undefined) prod.sellingPrice = sellingPrice;
    if (originalPrice !== undefined) prod.originalPrice = originalPrice;
    if (sizes) prod.sizes = sizes;
    if (colors) prod.colors = colors;
    if (availability !== undefined) prod.availability = availability;
    if (description !== undefined) prod.description = description;
    if (isActive !== undefined) prod.isActive = isActive;
    
    await prod.save();
    res.json(prod);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const prod = await Product.findOne({ id: req.params.id, shopId: req.user.shopId });
    if (!prod) return res.status(404).json({ error: 'Product not found' });
    prod.isActive = false; // Soft delete
    await prod.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.get('/api/enquiries', requireAuth, async (req, res) => {
  try {
    const list = await Enquiry.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
});

const calculateScheduledDateBackend = (followUpOptionOrDate, baseDate = new Date()) => {
  const now = new Date(baseDate);
  if (!followUpOptionOrDate) return now;
  if (followUpOptionOrDate instanceof Date) return followUpOptionOrDate;

  const str = String(followUpOptionOrDate).trim().toLowerCase();

  if (str === 'today') {
    return now;
  }
  if (str === 'tomorrow') {
    return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  }
  if (str === '3 days' || str === '3days' || str === '3_days') {
    return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  }
  if (str === 'next week' || str === 'nextweek' || str === 'next_week') {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const parsed = new Date(followUpOptionOrDate);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return now;
};

app.post('/api/enquiries', requireAuth, async (req, res) => {
  try {
    const { customerId, productId, size, color, quantity, interest, purchaseStatus, notes, scheduledAt, followUpDate } = req.body;
    if (!customerId || !productId) {
      return res.status(400).json({ error: 'customerId and productId are required' });
    }

    let customer = await Customer.findOne({ id: customerId, shopId: req.user.shopId });
    if (!customer) customer = await Customer.findOne({ id: customerId });
    let product = await Product.findOne({ id: productId, shopId: req.user.shopId });
    if (!product) product = await Product.findOne({ id: productId });

    if (!customer || !product) {
      return res.status(404).json({ error: 'Referenced customer or product not found for your shop' });
    }

    const enqId = `ENQ-${Date.now()}`;
    const newEnquiry = new Enquiry({
      id: enqId,
      customerId,
      productId,
      productName: product.name,
      productCategory: product.category,
      priceAtEnquiry: product.sellingPrice,
      size: size || 'Free Size',
      color: color || 'Standard',
      quantity: quantity || 1,
      interest: interest || 'Interested',
      purchaseStatus: purchaseStatus || 'Pending',
      notes: notes || '',
      shopId: req.user.shopId
    });

    await newEnquiry.save();

    let createdFollowUp = null;

    await Activity.create({
      id: `ACT-${Date.now()}`,
      customerId,
      type: 'enquiry_created',
      description: `Enquiry added for ${product.name} (${size})`,
      shopId: req.user.shopId
    });

    if (purchaseStatus === "Didn't Purchase" && interest !== 'Not Interested') {
      const fwId = `FW-${Date.now()}`;
      const prodLabel = product && product.name && product.name !== 'N/A' ? product.name : 'item';
      const sizeLabel = size && size !== 'N/A' && size !== 'Free Size' ? ` (${size})` : '';
      const msgText = `Good to see your interest in our ${prodLabel}${sizeLabel}. It is currently available and ready for you. Would you like to place an order or need help with anything?`;

      let targetScheduledAt = new Date();
      if (scheduledAt) {
        const parsed = new Date(scheduledAt);
        if (!isNaN(parsed.getTime())) {
          targetScheduledAt = parsed;
        }
      } else if (followUpDate) {
        targetScheduledAt = calculateScheduledDateBackend(followUpDate);
      }

      // Check if targetScheduledAt is past end of today in IST
      const now = new Date();
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffsetMs);
      const istYear = istNow.getUTCFullYear();
      const istMonth = istNow.getUTCMonth();
      const istDate = istNow.getUTCDate();

      const endOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);

      const initialStatus = targetScheduledAt > endOfToday ? 'scheduled' : 'ready';

      const priorityResult = calculatePriorityAndReason({ scheduledAt: targetScheduledAt }, newEnquiry, customer, product);

      createdFollowUp = new FollowUp({
        id: fwId,
        customerId,
        enquiryId: enqId,
        reason: priorityResult.reason,
        scheduledAt: targetScheduledAt,
        status: initialStatus,
        message: msgText,
        priority: priorityResult.priority,
        shopId: req.user.shopId
      });

      await createdFollowUp.save();

      await Activity.create({
        id: `ACT-${Date.now() + 1}`,
        customerId,
        type: 'followup_created',
        description: `Follow-up automatically recommended for ${product.name}`,
        shopId: req.user.shopId
      });
    }

    res.status(201).json({ enquiry: newEnquiry, followUp: createdFollowUp });
  } catch (err) {
    console.error('Create enquiry error:', err);
    res.status(500).json({ error: `Failed to create enquiry: ${err.message}` });
  }
});

app.get('/api/followups', requireAuth, async (req, res) => {
  try {
    const list = await FollowUp.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch follow-ups' });
  }
});

app.get('/api/followups/:id', requireAuth, async (req, res) => {
  try {
    const fw = await FollowUp.findOne({ id: req.params.id, shopId: req.user.shopId });
    if (!fw) return res.status(404).json({ error: 'Follow-up not found' });
    res.json(fw);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch follow-up' });
  }
});

app.post('/api/followups/:id/send', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const fw = await FollowUp.findOne({ id, shopId: req.user.shopId });
    if (!fw) return res.status(404).json({ error: 'Follow-up not found' });

    const customer = await Customer.findOne({ id: fw.customerId, shopId: req.user.shopId });
    const targetMessage = content || fw.message;

    // Use centralized WhatsApp Cloud API service (falls back to mock automatically)
    const result = await sendWhatsAppCloudMessage(customer?.phone || '', targetMessage);

    const msgId = `MSG-${Date.now()}`;
    const newMsg = new Message({
      id: msgId,
      customerId: fw.customerId,
      enquiryId: fw.enquiryId,
      followUpId: fw.id,
      channel: 'whatsapp',
      content: targetMessage,
      status: result.status,
      provider: result.provider,
      providerMessageId: result.providerMessageId || '',
      error: result.error || '',
      sentAt: new Date(),
      shopId: req.user.shopId
    });
    await newMsg.save();

    fw.status = 'sent';
    fw.message = targetMessage;
    fw.messageId = msgId;
    await fw.save();

    await Activity.create({
      id: `ACT-${Date.now()}`,
      customerId: fw.customerId,
      type: 'message_sent',
      description: `WhatsApp message (${result.provider}): "${targetMessage.substring(0, 30)}..."`,
      metadata: { channel: 'whatsapp', messageId: msgId, provider: result.provider, status: result.status },
      shopId: req.user.shopId
    });

    res.json({ success: true, followUp: fw, message: newMsg, provider: result.provider, status: result.status });
  } catch (err) {
    console.error('Send followUp error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.post('/api/followups/:id/outcome', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome, nextDateStr, scheduleNext } = req.body;

    const fw = await FollowUp.findOne({ id, shopId: req.user.shopId });
    if (!fw) return res.status(404).json({ error: 'Follow-up not found' });

    fw.outcome = outcome;
    fw.status = 'closed';
    fw.completedAt = new Date();
    await fw.save();

    if (outcome === 'Still Interested' && nextDateStr) {
      const newFw = new FollowUp({
        id: `FW-${Date.now()}`,
        customerId: fw.customerId,
        enquiryId: fw.enquiryId,
        reason: 'Customer is still interested but has not purchased.',
        scheduledAt: new Date(nextDateStr),
        status: 'ready',
        message: fw.message,
        priority: 'Medium',
        shopId: req.user.shopId
      });
      await newFw.save();

      await Activity.create({
        id: `ACT-${Date.now()}`,
        customerId: fw.customerId,
        type: 'followup_created',
        description: `Follow-up rescheduled for ${nextDateStr}`,
        shopId: req.user.shopId
      });
    } else if (outcome === 'Not Interested') {
      await Enquiry.findOneAndUpdate({ id: fw.enquiryId, shopId: req.user.shopId }, { purchaseStatus: "Didn't Purchase" });
      await Activity.create({
        id: `ACT-${Date.now()}`,
        customerId: fw.customerId,
        type: 'customer_marked_not_interested',
        description: `Customer marked as not interested`,
        shopId: req.user.shopId
      });
    } else if (outcome === 'No Response' && scheduleNext) {
      const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const newFw = new FollowUp({
        id: `FW-${Date.now()}`,
        customerId: fw.customerId,
        enquiryId: fw.enquiryId,
        reason: 'Follow up again after no response.',
        scheduledAt: threeDaysLater,
        status: 'ready',
        message: fw.message,
        priority: 'Low',
        shopId: req.user.shopId
      });
      await newFw.save();

      await Activity.create({
        id: `ACT-${Date.now()}`,
        customerId: fw.customerId,
        type: 'followup_created',
        description: `Follow-up automatically scheduled in 3 days (No Response)`,
        shopId: req.user.shopId
      });
    }

    res.json({ success: true, followUp: fw });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record outcome' });
  }
});

app.get('/api/messages', requireAuth, async (req, res) => {
  try {
    const list = await Message.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.get('/api/messages/:customerId', requireAuth, async (req, res) => {
  try {
    const list = await Message.find({ customerId: req.params.customerId, shopId: req.user.shopId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer messages' });
  }
});

// GET /api/sales/export (Phase 3B: Dynamic Excel Sales Report Generation in IST)
app.get('/api/sales/export', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { period = 'month', startDate, endDate } = req.query;

    if (!shopId) {
      return res.status(403).json({ error: 'Shop context required for sales export' });
    }

    const shop = await Shop.findOne({ customId: shopId }).lean();
    const shopName = shop ? shop.name : shopId;

    // Helper: IST date bounds calculation (Asia/Kolkata = UTC + 5:30)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istNow = new Date(now.getTime() + istOffsetMs);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    let queryStart, queryEnd, periodLabel, filenamePeriod;

    if (period === 'today') {
      queryStart = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0, 0) - istOffsetMs);
      queryEnd = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);
      const dateStr = `${istYear}-${String(istMonth + 1).padStart(2, '0')}-${String(istDate).padStart(2, '0')}`;
      periodLabel = `Today (${dateStr})`;
      filenamePeriod = `Today_${dateStr}`;

    } else if (period === 'week') {
      // Monday -> Sunday IST
      const dayOfWeek = istNow.getUTCDay(); // 0 is Sun, 1 is Mon...
      const diffToMon = (dayOfWeek + 6) % 7;
      const mondayDate = istDate - diffToMon;

      queryStart = new Date(Date.UTC(istYear, istMonth, mondayDate, 0, 0, 0, 0) - istOffsetMs);
      queryEnd = new Date(Date.UTC(istYear, istMonth, mondayDate + 6, 23, 59, 59, 999) - istOffsetMs);

      const monStr = `${queryStart.getUTCFullYear()}-${String(queryStart.getUTCMonth() + 1).padStart(2, '0')}-${String(queryStart.getUTCDate()).padStart(2, '0')}`;
      const sunStr = `${queryEnd.getUTCFullYear()}-${String(queryEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(queryEnd.getUTCDate()).padStart(2, '0')}`;
      periodLabel = `This Week (${monStr} to ${sunStr})`;
      filenamePeriod = `Week_${monStr}_to_${sunStr}`;

    } else if (period === 'month') {
      queryStart = new Date(Date.UTC(istYear, istMonth, 1, 0, 0, 0, 0) - istOffsetMs);
      queryEnd = new Date(Date.UTC(istYear, istMonth + 1, 0, 23, 59, 59, 999) - istOffsetMs);
      const monthStr = `${istYear}-${String(istMonth + 1).padStart(2, '0')}`;
      periodLabel = `This Month (${monthStr})`;
      filenamePeriod = `Month_${monthStr}`;

    } else if (period === 'custom') {
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate parameters are required for custom range' });
      }

      const sParts = startDate.split('-').map(Number);
      const eParts = endDate.split('-').map(Number);

      if (sParts.length !== 3 || eParts.length !== 3 || sParts.some(isNaN) || eParts.some(isNaN)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }

      queryStart = new Date(Date.UTC(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0, 0) - istOffsetMs);
      queryEnd = new Date(Date.UTC(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59, 999) - istOffsetMs);

      if (isNaN(queryStart.getTime()) || isNaN(queryEnd.getTime())) {
        return res.status(400).json({ error: 'Invalid date values provided.' });
      }

      if (queryStart > queryEnd) {
        return res.status(400).json({ error: 'startDate cannot be after endDate.' });
      }

      periodLabel = `Custom (${startDate} to ${endDate})`;
      filenamePeriod = `Custom_${startDate}_to_${endDate}`;

    } else {
      return res.status(400).json({ error: 'Invalid period parameter. Supported: today, week, month, custom.' });
    }

    // Fetch sales records within IST date range
    const salesDocs = await Sale.find({
      shopId,
      createdAt: { $gte: queryStart, $lte: queryEnd }
    }).sort({ createdAt: -1 }).lean();

    // Dynamically build Excel workbook using ExcelJS
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'QuickR System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Sales Report');

    // Title & Metadata Header Rows
    worksheet.addRow(['QuickR Sales Report']);
    worksheet.addRow(['Shop Name:', shopName]);
    worksheet.addRow(['Report Period:', periodLabel]);
    worksheet.addRow(['Generated At:', new Date(now.getTime() + istOffsetMs).toISOString().replace('T', ' ').substring(0, 19) + ' IST']);
    worksheet.addRow([]);

    // Calculate Summary Totals
    const totalSalesCount = salesDocs.length;
    let totalItemsSold = 0;
    let totalRevenue = 0;

    salesDocs.forEach(s => {
      totalRevenue += (s.totalAmount || 0);
      if (Array.isArray(s.items)) {
        s.items.forEach(item => {
          totalItemsSold += (item.quantity || 0);
        });
      }
    });

    worksheet.addRow(['Summary Totals']);
    worksheet.addRow(['Total Orders / Bills:', totalSalesCount]);
    worksheet.addRow(['Total Items Sold:', totalItemsSold]);
    worksheet.addRow(['Total Revenue:', totalRevenue]);
    worksheet.addRow([]);

    // Format Title & Header styling
    worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF1E293B' } };
    worksheet.getCell('A6').font = { size: 13, bold: true, color: { argb: 'FF475569' } };

    // Currency formatting for total revenue summary
    worksheet.getCell('B8').numberFormat = '₹#,##0.00';

    // Sales Data Table Header
    const tableHeaderRow = worksheet.addRow([
      'Invoice #',
      'Sale Date (IST)',
      'Customer Name',
      'Customer Phone',
      'Product Name',
      'Category',
      'Quantity',
      'Unit Price',
      'Line Total',
      'Bill Subtotal',
      'Discount',
      'Bill Total',
      'Payment Method',
      'Source'
    ]);

    tableHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' } // Indigo header fill
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Populate Product Line Rows
    salesDocs.forEach(sale => {
      const saleDateIST = new Date(new Date(sale.createdAt).getTime() + istOffsetMs)
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19);

      const items = Array.isArray(sale.items) && sale.items.length > 0 ? sale.items : [{
        productName: 'N/A',
        category: 'General',
        quantity: 1,
        rate: sale.totalAmount || 0,
        total: sale.totalAmount || 0
      }];

      items.forEach(item => {
        const row = worksheet.addRow([
          sale.invoiceNumber || sale.id,
          saleDateIST,
          sale.customerName || 'Walk-in Customer',
          sale.customerPhone || 'N/A',
          item.productName || 'General Item',
          item.category || 'General',
          item.quantity || 1,
          item.rate || 0,
          item.total || 0,
          sale.subtotal || sale.totalAmount,
          sale.discount || 0,
          sale.totalAmount || 0,
          sale.paymentMethod || 'Cash',
          sale.source === 'quickr_followup' ? 'Follow-Up Recovery' : 'Direct Sale'
        ]);

        // Currency formatting
        row.getCell(8).numberFormat = '₹#,##0.00';
        row.getCell(9).numberFormat = '₹#,##0.00';
        row.getCell(10).numberFormat = '₹#,##0.00';
        row.getCell(11).numberFormat = '₹#,##0.00';
        row.getCell(12).numberFormat = '₹#,##0.00';
      });
    });

    // Auto-fit Column Widths
    worksheet.columns.forEach(column => {
      let maxLen = 12;
      column.eachCell({ includeEmpty: false }, cell => {
        const valStr = cell.value ? String(cell.value) : '';
        if (valStr.length > maxLen && valStr.length < 50) {
          maxLen = valStr.length;
        }
      });
      column.width = maxLen + 3;
    });

    // Set Response Headers for binary .xlsx download
    const filename = `QuickR_Sales_${filenamePeriod}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Export sales error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Unable to generate sales report.' });
    }
  }
});

// GET /api/reports/export (Phase 3C: Dynamic Excel Business Reports Generation in IST)
app.get('/api/reports/export', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { type = 'summary', period = 'month', startDate, endDate } = req.query;

    if (!shopId) {
      return res.status(403).json({ error: 'Shop context required for reports export' });
    }

    const validTypes = ['customers', 'enquiries', 'followups', 'products', 'summary', 'sales'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid report type. Supported: ${validTypes.join(', ')}` });
    }

    const shop = await Shop.findOne({ customId: shopId }).lean();
    const shopName = shop ? shop.name : shopId;

    // Helper: IST date bounds calculation (Asia/Kolkata = UTC + 5:30)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istNow = new Date(now.getTime() + istOffsetMs);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    let queryStart, queryEnd, periodLabel, filenamePeriod;

    if (period === 'today') {
      queryStart = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0, 0) - istOffsetMs);
      queryEnd = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);
      const dateStr = `${istYear}-${String(istMonth + 1).padStart(2, '0')}-${String(istDate).padStart(2, '0')}`;
      periodLabel = `Today (${dateStr})`;
      filenamePeriod = `Today_${dateStr}`;

    } else if (period === 'week') {
      const dayOfWeek = istNow.getUTCDay(); // 0 is Sun, 1 is Mon...
      const diffToMon = (dayOfWeek + 6) % 7;
      const mondayDate = istDate - diffToMon;

      queryStart = new Date(Date.UTC(istYear, istMonth, mondayDate, 0, 0, 0, 0) - istOffsetMs);
      queryEnd = new Date(Date.UTC(istYear, istMonth, mondayDate + 6, 23, 59, 59, 999) - istOffsetMs);

      const monStr = `${queryStart.getUTCFullYear()}-${String(queryStart.getUTCMonth() + 1).padStart(2, '0')}-${String(queryStart.getUTCDate()).padStart(2, '0')}`;
      const sunStr = `${queryEnd.getUTCFullYear()}-${String(queryEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(queryEnd.getUTCDate()).padStart(2, '0')}`;
      periodLabel = `This Week (${monStr} to ${sunStr})`;
      filenamePeriod = `Week_${monStr}_to_${sunStr}`;

    } else if (period === 'month') {
      queryStart = new Date(Date.UTC(istYear, istMonth, 1, 0, 0, 0, 0) - istOffsetMs);
      queryEnd = new Date(Date.UTC(istYear, istMonth + 1, 0, 23, 59, 59, 999) - istOffsetMs);
      const monthStr = `${istYear}-${String(istMonth + 1).padStart(2, '0')}`;
      periodLabel = `This Month (${monthStr})`;
      filenamePeriod = `Month_${monthStr}`;

    } else if (period === 'custom') {
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate parameters are required for custom range' });
      }

      const sParts = startDate.split('-').map(Number);
      const eParts = endDate.split('-').map(Number);

      if (sParts.length !== 3 || eParts.length !== 3 || sParts.some(isNaN) || eParts.some(isNaN)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }

      queryStart = new Date(Date.UTC(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0, 0) - istOffsetMs);
      queryEnd = new Date(Date.UTC(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59, 999) - istOffsetMs);

      if (isNaN(queryStart.getTime()) || isNaN(queryEnd.getTime())) {
        return res.status(400).json({ error: 'Invalid date values provided.' });
      }

      if (queryStart > queryEnd) {
        return res.status(400).json({ error: 'startDate cannot be after endDate.' });
      }

      periodLabel = `Custom (${startDate} to ${endDate})`;
      filenamePeriod = `Custom_${startDate}_to_${endDate}`;

    } else {
      return res.status(400).json({ error: 'Invalid period parameter. Supported: today, week, month, custom.' });
    }

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'QuickR System';
    workbook.created = new Date();

    const reportTitles = {
      customers: 'Customer Performance Report',
      enquiries: 'Enquiry & Lead Tracking Report',
      followups: 'Follow-Up Status & Priority Report',
      products: 'Product Performance & Conversion Report',
      summary: 'Executive Business Summary Report',
      sales: 'QuickR Sales Report'
    };

    const sheetTitle = reportTitles[type] || 'Business Report';
    const worksheet = workbook.addWorksheet(type.toUpperCase());

    // Title & Metadata Header Rows
    worksheet.addRow(['QuickR Business Intelligence']);
    worksheet.addRow(['Report Name:', sheetTitle]);
    worksheet.addRow(['Shop Name:', shopName]);
    worksheet.addRow(['Report Period:', periodLabel]);
    worksheet.addRow(['Generated At:', new Date(now.getTime() + istOffsetMs).toISOString().replace('T', ' ').substring(0, 19) + ' IST']);
    worksheet.addRow([]);

    worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF1E293B' } };
    worksheet.getCell('A2').font = { size: 13, bold: true, color: { argb: 'FF4F46E5' } };

    // ──────────────────────────────────────────────────────────────────────────
    // REPORT TYPE A: CUSTOMER REPORT
    // Date semantics: Scoped by customer creation / activity date
    // ──────────────────────────────────────────────────────────────────────────
    if (type === 'customers') {
      const customers = await Customer.find({
        shopId,
        createdAt: { $gte: queryStart, $lte: queryEnd }
      }).sort({ createdAt: -1 }).lean();

      const custIds = customers.map(c => c.id);
      const [allEnquiries, allSales, allActivities] = await Promise.all([
        Enquiry.find({ shopId, customerId: { $in: custIds } }).lean(),
        Sale.find({ shopId, customerId: { $in: custIds } }).lean(),
        Activity.find({ shopId, customerId: { $in: custIds } }).sort({ createdAt: -1 }).lean()
      ]);

      const totalSpentAll = allSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

      worksheet.addRow(['Summary Totals']);
      worksheet.addRow(['Total Customers:', customers.length]);
      worksheet.addRow(['Total Purchases:', allSales.length]);
      worksheet.addRow(['Total Amount Spent:', totalSpentAll]);
      worksheet.addRow([]);

      worksheet.getCell('B8').numberFormat = '₹#,##0.00';

      const headerRow = worksheet.addRow([
        'Customer ID', 'Customer Name', 'Phone', 'Email',
        'Total Enquiries', 'Purchased Enquiries', 'Not Purchased Enquiries',
        'Total Purchases', 'Total Amount Spent',
        'Last Enquiry Date (IST)', 'Last Purchase Date (IST)', 'Last Activity Date (IST)'
      ]);

      headerRow.eachCell(c => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      });

      customers.forEach(c => {
        const cEnquiries = allEnquiries.filter(e => e.customerId === c.id);
        const cSales = allSales.filter(s => s.customerId === c.id);
        const cActivities = allActivities.filter(a => a.customerId === c.id);

        const purchasedCount = cEnquiries.filter(e => e.purchaseStatus === 'Purchased').length;
        const notPurchasedCount = cEnquiries.filter(e => e.purchaseStatus !== 'Purchased').length;
        const totalSpent = cSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

        const lastEnquiry = cEnquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const lastSale = cSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const lastAct = cActivities[0];

        const fmtDate = (d) => d ? new Date(new Date(d).getTime() + istOffsetMs).toISOString().replace('T', ' ').substring(0, 19) : 'N/A';

        const r = worksheet.addRow([
          c.id, c.name, c.phone || 'N/A', c.email || 'N/A',
          cEnquiries.length, purchasedCount, notPurchasedCount,
          cSales.length, totalSpent,
          fmtDate(lastEnquiry?.createdAt), fmtDate(lastSale?.createdAt), fmtDate(lastAct?.createdAt || c.updatedAt)
        ]);

        r.getCell(9).numberFormat = '₹#,##0.00';
      });

    // ──────────────────────────────────────────────────────────────────────────
    // REPORT TYPE B: ENQUIRY REPORT
    // Date semantics: Scoped by enquiry creation date (createdAt)
    // ──────────────────────────────────────────────────────────────────────────
    } else if (type === 'enquiries') {
      const enquiries = await Enquiry.find({
        shopId,
        createdAt: { $gte: queryStart, $lte: queryEnd }
      }).sort({ createdAt: -1 }).lean();

      const custIds = [...new Set(enquiries.map(e => e.customerId))];
      const prodIds = [...new Set(enquiries.map(e => e.productId))];
      const enqIds = enquiries.map(e => e.id);

      const [customers, products, followUps] = await Promise.all([
        Customer.find({ shopId, id: { $in: custIds } }).lean(),
        Product.find({ shopId, id: { $in: prodIds } }).lean(),
        FollowUp.find({ shopId, enquiryId: { $in: enqIds } }).lean()
      ]);

      const custMap = new Map(customers.map(c => [c.id, c]));
      const prodMap = new Map(products.map(p => [p.id, p]));
      const fwMap = new Map(followUps.map(f => [f.enquiryId, f]));

      const purchasedCount = enquiries.filter(e => e.purchaseStatus === 'Purchased').length;

      worksheet.addRow(['Summary Totals']);
      worksheet.addRow(['Total Enquiries:', enquiries.length]);
      worksheet.addRow(['Purchased Enquiries:', purchasedCount]);
      worksheet.addRow(['Not Purchased Enquiries:', enquiries.length - purchasedCount]);
      worksheet.addRow([]);

      const headerRow = worksheet.addRow([
        'Enquiry ID', 'Enquiry Date (IST)', 'Customer Name', 'Customer Phone',
        'Product Name', 'Interest Level', 'Purchase Status',
        'Follow-up Date (IST)', 'Follow-up Status', 'Notes'
      ]);

      headerRow.eachCell(c => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      });

      enquiries.forEach(e => {
        const cust = custMap.get(e.customerId);
        const prod = prodMap.get(e.productId);
        const fw = fwMap.get(e.id);

        const enqDateIST = new Date(new Date(e.createdAt).getTime() + istOffsetMs).toISOString().replace('T', ' ').substring(0, 19);
        const fwDateIST = fw && fw.scheduledAt ? new Date(new Date(fw.scheduledAt).getTime() + istOffsetMs).toISOString().replace('T', ' ').substring(0, 19) : 'N/A';

        worksheet.addRow([
          e.id, enqDateIST, cust ? cust.name : 'Walk-in', cust ? cust.phone : 'N/A',
          prod ? prod.name : 'General Enquiry', e.interest || 'Interested', e.purchaseStatus || 'Not Purchased',
          fwDateIST, fw ? fw.status : 'No Follow-up', e.notes || ''
        ]);
      });

    // ──────────────────────────────────────────────────────────────────────────
    // REPORT TYPE C: FOLLOW-UP REPORT
    // Date semantics: Scoped by follow-up scheduled date (scheduledAt)
    // ──────────────────────────────────────────────────────────────────────────
    } else if (type === 'followups') {
      const followUps = await FollowUp.find({
        shopId,
        scheduledAt: { $gte: queryStart, $lte: queryEnd }
      }).sort({ scheduledAt: 1 }).lean();

      const custIds = [...new Set(followUps.map(f => f.customerId))];
      const enqIds = [...new Set(followUps.map(f => f.enquiryId).filter(Boolean))];

      const [customers, enquiries] = await Promise.all([
        Customer.find({ shopId, id: { $in: custIds } }).lean(),
        Enquiry.find({ shopId, id: { $in: enqIds } }).lean()
      ]);

      const custMap = new Map(customers.map(c => [c.id, c]));
      const enqMap = new Map(enquiries.map(e => [e.id, e]));

      const startOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0, 0) - istOffsetMs);
      const endOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);

      let overdueCount = 0, dueTodayCount = 0, upcomingCount = 0;

      followUps.forEach(f => {
        const sTime = new Date(f.scheduledAt).getTime();
        if (f.status !== 'completed' && f.status !== 'closed') {
          if (sTime < startOfToday.getTime()) overdueCount++;
          else if (sTime >= startOfToday.getTime() && sTime <= endOfToday.getTime()) dueTodayCount++;
          else if (sTime > endOfToday.getTime()) upcomingCount++;
        }
      });

      worksheet.addRow(['Summary Totals']);
      worksheet.addRow(['Total Follow-ups:', followUps.length]);
      worksheet.addRow(['Overdue:', overdueCount]);
      worksheet.addRow(['Due Today:', dueTodayCount]);
      worksheet.addRow(['Upcoming:', upcomingCount]);
      worksheet.addRow([]);

      const headerRow = worksheet.addRow([
        'Follow-up ID', 'Customer Name', 'Customer Phone', 'Product Name',
        'Follow-up Reason', 'Scheduled Date (IST)', 'Status', 'Classification',
        'Created Date (IST)', 'Completed Date (IST)'
      ]);

      headerRow.eachCell(c => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      });

      followUps.forEach(f => {
        const cust = custMap.get(f.customerId);
        const enq = enqMap.get(f.enquiryId);

        const sTime = new Date(f.scheduledAt).getTime();
        let classification = 'OTHER';
        if (f.status === 'completed' || f.status === 'closed') {
          classification = 'COMPLETED';
        } else if (sTime < startOfToday.getTime()) {
          classification = 'OVERDUE';
        } else if (sTime >= startOfToday.getTime() && sTime <= endOfToday.getTime()) {
          classification = 'DUE TODAY';
        } else if (sTime > endOfToday.getTime()) {
          classification = 'UPCOMING';
        }

        const fmtDate = (d) => d ? new Date(new Date(d).getTime() + istOffsetMs).toISOString().replace('T', ' ').substring(0, 19) : 'N/A';

        worksheet.addRow([
          f.id, cust ? cust.name : 'N/A', cust ? cust.phone : 'N/A',
          enq ? enq.productName || 'General' : 'General', f.reason || 'Sales Follow-up',
          fmtDate(f.scheduledAt), f.status, classification,
          fmtDate(f.createdAt), fmtDate(f.completedAt)
        ]);
      });

    // ──────────────────────────────────────────────────────────────────────────
    // REPORT TYPE D: PRODUCT PERFORMANCE REPORT
    // Date semantics: Scoped by sales & enquiry activity dates
    // ──────────────────────────────────────────────────────────────────────────
    } else if (type === 'products') {
      const products = await Product.find({ shopId }).sort({ name: 1 }).lean();
      const enquiries = await Enquiry.find({
        shopId,
        createdAt: { $gte: queryStart, $lte: queryEnd }
      }).lean();
      const sales = await Sale.find({
        shopId,
        createdAt: { $gte: queryStart, $lte: queryEnd }
      }).lean();

      let grandRevenue = 0;
      let grandQty = 0;

      const productStats = products.map(p => {
        const pEnquiries = enquiries.filter(e => e.productId === p.id);
        const purchasedEnquiries = pEnquiries.filter(e => e.purchaseStatus === 'Purchased').length;
        const notPurchasedEnquiries = pEnquiries.length - purchasedEnquiries;

        let qtySold = 0;
        let revenue = 0;

        sales.forEach(s => {
          if (Array.isArray(s.items)) {
            s.items.forEach(item => {
              if (item.productId === p.id || item.productName === p.name) {
                qtySold += (item.quantity || 0);
                revenue += (item.total || 0);
              }
            });
          }
        });

        grandRevenue += revenue;
        grandQty += qtySold;

        const conversionRate = pEnquiries.length > 0
          ? Number(((purchasedEnquiries / pEnquiries.length) * 100).toFixed(1))
          : 0;

        return {
          id: p.id,
          name: p.name,
          category: p.category || 'General',
          enquiries: pEnquiries.length,
          purchasedEnquiries,
          notPurchasedEnquiries,
          qtySold,
          revenue,
          conversionRate
        };
      });

      worksheet.addRow(['Summary Totals']);
      worksheet.addRow(['Total Products Cataloged:', products.length]);
      worksheet.addRow(['Total Quantity Sold:', grandQty]);
      worksheet.addRow(['Total Product Revenue:', grandRevenue]);
      worksheet.addRow([]);

      worksheet.getCell('B8').numberFormat = '₹#,##0.00';

      const headerRow = worksheet.addRow([
        'Product ID', 'Product Name', 'Category', 'Total Enquiries',
        'Purchased Enquiries', 'Not Purchased Enquiries', 'Quantity Sold',
        'Total Revenue', 'Conversion Rate (%)'
      ]);

      headerRow.eachCell(c => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      });

      productStats.forEach(ps => {
        const r = worksheet.addRow([
          ps.id, ps.name, ps.category, ps.enquiries,
          ps.purchasedEnquiries, ps.notPurchasedEnquiries, ps.qtySold,
          ps.revenue, `${ps.conversionRate}%`
        ]);

        r.getCell(8).numberFormat = '₹#,##0.00';
      });

    // ──────────────────────────────────────────────────────────────────────────
    // REPORT TYPE E: BUSINESS SUMMARY REPORT
    // Date semantics: Scoped by creation/transaction dates within IST period
    // ──────────────────────────────────────────────────────────────────────────
    } else if (type === 'summary') {
      const [customersCount, enquiries, followUps, sales] = await Promise.all([
        Customer.countDocuments({ shopId, createdAt: { $gte: queryStart, $lte: queryEnd } }),
        Enquiry.find({ shopId, createdAt: { $gte: queryStart, $lte: queryEnd } }).lean(),
        FollowUp.find({ shopId, createdAt: { $gte: queryStart, $lte: queryEnd } }).lean(),
        Sale.find({ shopId, createdAt: { $gte: queryStart, $lte: queryEnd } }).lean()
      ]);

      const totalEnquiries = enquiries.length;
      const purchasedEnquiries = enquiries.filter(e => e.purchaseStatus === 'Purchased').length;
      const notPurchasedEnquiries = totalEnquiries - purchasedEnquiries;
      const conversionRate = totalEnquiries > 0 ? Number(((purchasedEnquiries / totalEnquiries) * 100).toFixed(1)) : 0;

      const totalFollowUps = followUps.length;
      const pendingFollowUps = followUps.filter(f => f.status === 'scheduled' || f.status === 'ready' || f.status === 'snoozed').length;
      const completedFollowUps = followUps.filter(f => f.status === 'completed' || f.status === 'closed').length;

      const totalSales = sales.length;
      let totalItemsSold = 0;
      let totalRevenue = 0;

      sales.forEach(s => {
        totalRevenue += (s.totalAmount || 0);
        if (Array.isArray(s.items)) {
          s.items.forEach(i => { totalItemsSold += (i.quantity || 0); });
        }
      });

      worksheet.addRow(['Executive Key Metrics Summary']);
      worksheet.addRow([]);

      const metricsTable = [
        ['Metric Description', 'Authoritative Value'],
        ['Total New Customers', customersCount],
        ['Total Enquiries', totalEnquiries],
        ['Purchased Enquiries', purchasedEnquiries],
        ['Not Purchased Enquiries', notPurchasedEnquiries],
        ['Enquiry Conversion Rate', `${conversionRate}%`],
        ['Total Follow-ups', totalFollowUps],
        ['Pending Follow-ups', pendingFollowUps],
        ['Completed Follow-ups', completedFollowUps],
        ['Total Sales / Orders', totalSales],
        ['Total Items Sold', totalItemsSold],
        ['Total Revenue', totalRevenue]
      ];

      metricsTable.forEach((row, idx) => {
        const r = worksheet.addRow(row);
        if (idx === 0) {
          r.eachCell(c => {
            c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
          });
        } else if (idx === 11) {
          r.getCell(2).numberFormat = '₹#,##0.00';
          r.getCell(1).font = { bold: true };
          r.getCell(2).font = { bold: true };
        }
      });
    }

    // Auto-fit Column Widths
    worksheet.columns.forEach(column => {
      let maxLen = 14;
      column.eachCell({ includeEmpty: false }, cell => {
        const valStr = cell.value ? String(cell.value) : '';
        if (valStr.length > maxLen && valStr.length < 55) {
          maxLen = valStr.length;
        }
      });
      column.width = maxLen + 3;
    });

    const filename = `QuickR_${type.toUpperCase()}_Report_${filenamePeriod}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Export business report error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Unable to generate business report.' });
    }
  }
});

app.get('/api/sales', requireAuth, async (req, res) => {
  try {
    const list = await Sale.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

app.post('/api/sales', requireAuth, async (req, res) => {
  try {
    let { customerId, customerName, customerPhone, enquiryId, followUpId, items, subtotal, discount, totalAmount, paymentMethod, source, saleSource, campaignId } = req.body;
    
    if (!items || !items.length || totalAmount === undefined || !paymentMethod) {
      return res.status(400).json({ error: 'Items, totalAmount, and paymentMethod are required' });
    }

    const numericSubtotal = Number(subtotal) || 0;
    const numericDiscount = Number(discount) || 0;
    const numericTotal = Number(totalAmount) || 0;

    if (numericDiscount < 0) {
      return res.status(400).json({ error: 'Discount cannot be negative' });
    }

    if (numericDiscount > numericSubtotal) {
      return res.status(400).json({ error: 'Discount amount cannot exceed subtotal' });
    }

    if (numericTotal < 0) {
      return res.status(400).json({ error: 'Total amount cannot be negative' });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // WALK-IN CUSTOMER AUTO-SAVE WORKFLOW
    // Cases 1 - 5 Implementation:
    // Case 1 & 2: Phone provided -> Normalize, find or create Customer in shop, link sale
    // Case 3: Name provided, Phone empty -> Do NOT create Customer, keep name on Sale
    // Case 4: Name & Phone empty -> Do NOT create Customer, set customerName = 'Walk-in Customer'
    // Case 5: Existing phone in same shop -> Reuse existing Customer, do NOT duplicate
    // ──────────────────────────────────────────────────────────────────────────
    let finalCustomerId = customerId || '';
    let finalCustomerName = customerName ? customerName.trim() : '';

    if (customerId && customerId.trim()) {
      let existingById = await Customer.findOne({ shopId: req.user.shopId, id: customerId.trim() });
      if (existingById) {
        finalCustomerId = existingById.id;
        if (!finalCustomerName) finalCustomerName = existingById.name;
      }
    }

    if (customerPhone && customerPhone.trim()) {
      const normalizedPhone = normalizeIndianMobileNumber(customerPhone);
      if (normalizedPhone) {
        // Search for existing customer in the authenticated shop (Case 5)
        let existingCust = await Customer.findOne({ shopId: req.user.shopId, phone: normalizedPhone });
        
        if (existingCust) {
          finalCustomerId = existingCust.id;
          if (!finalCustomerName) finalCustomerName = existingCust.name;
        } else {
          // Create new Customer automatically (Case 1 & Case 2)
          const newCustId = `CUST-${Date.now()}`;
          const displayName = finalCustomerName || normalizedPhone; // Use phone if name is empty
          
          const newCust = new Customer({
            id: newCustId,
            name: displayName,
            phone: normalizedPhone,
            email: '', // NO email required
            location: 'Chennai, Tamil Nadu',
            status: 'Active',
            shopId: req.user.shopId
          });
          await newCust.save();

          // Save marketing consent record if offer permission specified
          const { allowWhatsAppOffers } = req.body;
          const ConsentModel = (await import('./models/ConsentRecord.js')).ConsentRecord;
          const consentStatus = allowWhatsAppOffers === true || allowWhatsAppOffers === 'true' ? 'active' : 'withdrawn';
          await ConsentModel.findOneAndUpdate(
            { userId: newCustId, shopId: req.user.shopId, purpose: 'marketing' },
            { id: `CNS-${Date.now()}`, userId: newCustId, shopId: req.user.shopId, purpose: 'marketing', status: consentStatus, consentedAt: consentStatus === 'active' ? new Date() : null, withdrawnAt: consentStatus === 'withdrawn' ? new Date() : null, noticeVersion: '1.0' },
            { upsert: true, new: true }
          );

          await Activity.create({
            id: `ACT-${Date.now()}`,
            customerId: newCustId,
            type: 'customer_added',
            description: `Auto-saved walk-in customer: ${displayName}`,
            shopId: req.user.shopId
          });

          finalCustomerId = newCustId;
          finalCustomerName = displayName;
        }
      }
    }

    if (!finalCustomerName) {
      finalCustomerName = 'Walk-in Customer'; // Case 4
    }

    // Validate Product Stock Availability
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (item.productId) {
          const qty = Number(item.quantity) || 1;
          const prod = await Product.findOne({ id: item.productId, shopId: req.user.shopId });
          if (!prod) {
            return res.status(404).json({ error: `Product ${item.productName || item.productId} not found` });
          }
          if ((prod.availability || 0) < qty) {
            return res.status(400).json({
              error: `Insufficient stock for ${prod.name}. Available: ${prod.availability || 0}, Requested: ${qty}`
            });
          }
        }
      }
    }

    // Generate Invoice Number
    const existingSalesCount = await Sale.countDocuments({ shopId: req.user.shopId });
    const invoiceNumber = `INV-${String(existingSalesCount + 1).padStart(6, '0')}`;
    const saleId = `SALE-${Date.now()}`;

    const newSale = new Sale({
      id: saleId,
      invoiceNumber,
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      enquiryId: enquiryId || '',
      followUpId: followUpId || '',
      items,
      subtotal: numericSubtotal,
      discount: numericDiscount,
      totalAmount: Math.max(0, Number((numericSubtotal - numericDiscount).toFixed(2))),
      paymentMethod,
      source: source || 'direct',
      saleSource: saleSource || (campaignId ? 'campaign' : 'normal'),
      campaignId: campaignId || '',
      shopId: req.user.shopId
    });
    
    await newSale.save();

    // Automatic Inventory Stock Decrement
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (item.productId) {
          const qty = Number(item.quantity) || 1;
          const prod = await Product.findOne({ id: item.productId, shopId: req.user.shopId });
          if (prod) {
            prod.availability = Math.max(0, (prod.availability || 0) - qty);
            await prod.save();
          }
        }
      }
    }

    if (enquiryId) {
      await Enquiry.findOneAndUpdate({ id: enquiryId, shopId: req.user.shopId }, { purchaseStatus: 'Purchased' });
    }

    if (followUpId) {
      await FollowUp.findOneAndUpdate({ id: followUpId, shopId: req.user.shopId }, { status: 'closed', outcome: 'Purchased', completedAt: new Date() });
    }

    await Activity.create({
      id: `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customerId: customerId || 'walk-in',
      type: 'sale_completed',
      description: `Bill generated: ${invoiceNumber} for ₹${totalAmount}`,
      shopId: req.user.shopId
    });

    res.status(201).json(newSale);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create bill/sale' });
  }
});

app.delete('/api/sales', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'A non-empty array of sale IDs is required.' });
    }

    // Find all sales belonging to authenticated shop matching provided IDs
    const salesToDelete = await Sale.find({ id: { $in: ids }, shopId: req.user.shopId });
    if (salesToDelete.length === 0) {
      return res.status(404).json({ success: false, error: 'No matching sales found for your shop.' });
    }

    // Restore Product Stock for each deleted sale using bulk increment
    for (const sale of salesToDelete) {
      if (Array.isArray(sale.items) && sale.items.length > 0) {
        for (const item of sale.items) {
          if (item.productId) {
            const qty = Number(item.quantity) || 1;
            await Product.updateOne(
              { id: item.productId, shopId: req.user.shopId },
              { $inc: { availability: qty } }
            );
          }
        }
      }
    }

    // Permanently remove matching sale records
    const deletedIds = salesToDelete.map(s => s.id);
    await Sale.deleteMany({ id: { $in: deletedIds }, shopId: req.user.shopId });

    res.json({
      success: true,
      message: `Successfully deleted ${deletedIds.length} sale(s).`,
      deletedIds
    });
  } catch (err) {
    console.error('Delete sales error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete sales' });
  }
});

app.get('/api/activities', requireAuth, async (req, res) => {
  try {
    const list = await Activity.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});
// Delete Enquiry endpoint with safe cascade
app.delete('/api/enquiries/:id', requireAuth, async (req, res) => {
  try {
    const enquiryId = req.params.id;
    // Find and delete the enquiry belonging to the shop
    const enquiry = await Enquiry.findOneAndDelete({ id: enquiryId, shopId: req.user.shopId });
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    // Delete any active follow-ups related to this enquiry
    await FollowUp.deleteMany({
      enquiryId,
      shopId: req.user.shopId,
      status: { $in: ['ready', 'sent', 'scheduled'] }
    });

    // NOTE: Do NOT delete related sales, messages, or activities to preserve business history

    res.json({ success: true, deletedEnquiryId: enquiryId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete enquiry' });
  }
});

app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    if (!shopId) {
      return res.status(403).json({ error: 'Shop context required for dashboard metrics' });
    }

    // Authoritative IST Today Date Boundaries
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const now = new Date();
    const istNow = new Date(now.getTime() + istOffsetMs);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    const startOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0, 0) - istOffsetMs);
    const endOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);

    const [
      activeFollowUpsCount,
      overdueFollowUpsCount,
      todayFollowUpsCount,
      upcomingFollowUpsCount,
      totalEnquiriesCount,
      todayEnquiriesCount,
      todayPurchasedEnquiriesCount,
      todaySalesDocs,
      totalCustomersCount,
      totalProductsCount,
      recoveredSalesDocs,
      completedFwCount,
      totalMsgs
    ] = await Promise.all([
      FollowUp.countDocuments({ shopId, status: { $in: ['ready', 'sent', 'scheduled', 'snoozed'] } }),
      FollowUp.countDocuments({ shopId, status: { $in: ['ready', 'scheduled', 'snoozed'] }, scheduledAt: { $lt: startOfToday } }),
      FollowUp.countDocuments({ shopId, status: { $in: ['ready', 'scheduled', 'snoozed'] }, scheduledAt: { $gte: startOfToday, $lte: endOfToday } }),
      FollowUp.countDocuments({ shopId, status: { $in: ['ready', 'scheduled', 'snoozed'] }, scheduledAt: { $gt: endOfToday } }),
      Enquiry.countDocuments({ shopId }),
      Enquiry.countDocuments({ shopId, createdAt: { $gte: startOfToday, $lte: endOfToday } }),
      Enquiry.countDocuments({ shopId, createdAt: { $gte: startOfToday, $lte: endOfToday }, purchaseStatus: 'Purchased' }),
      Sale.find({ shopId, createdAt: { $gte: startOfToday, $lte: endOfToday } }).lean(),
      Customer.countDocuments({ shopId }),
      Product.countDocuments({ shopId }),
      Sale.find({ shopId, source: 'quickr_followup' }).lean(),
      FollowUp.countDocuments({ shopId, status: { $in: ['completed', 'closed'] } }),
      Message.countDocuments({ shopId })
    ]);

    const todaySalesCount = todaySalesDocs.length;
    const todayRevenue = todaySalesDocs.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const recoveredSalesAmount = recoveredSalesDocs.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const conversionsCount = recoveredSalesDocs.length;
    const conversionRate = completedFwCount > 0 ? Math.round((conversionsCount / completedFwCount) * 100) : 0;

    res.json({
      // Today Specific Metrics (IST)
      todaySalesCount,
      todayRevenue,
      todayEnquiriesCount,
      todayPurchasesCount: todayPurchasedEnquiriesCount,
      todayFollowUpsCount,
      
      // Follow-up Breakdown
      activeFollowUps: activeFollowUpsCount,
      overdueFollowUps: overdueFollowUpsCount,
      upcomingFollowUps: upcomingFollowUpsCount,
      pendingFollowUps: activeFollowUpsCount,

      // Total Shop Catalog & CRM Metrics
      totalCustomers: totalCustomersCount,
      totalProducts: totalProductsCount,
      totalEnquiries: totalEnquiriesCount,

      // Historical Conversions & Messages
      recoveredSales: recoveredSalesAmount,
      conversions: conversionsCount,
      conversionRate,
      responseRate: totalMsgs > 0 ? 85 : 0
    });
  } catch (err) {
    console.error('Dashboard metrics error:', err);
    res.status(500).json({ error: 'Failed to calculate dashboard analytics' });
  }
});

// ===================================
// ADMIN & INTEGRATION ROUTES
// ===================================
app.use('/api/admin', adminRouter);
app.use('/api/ai', aiRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/privacy', privacyRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/reengagement', reengagementRouter);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'QuickR Phase 6 Admin API Operational', 
    mongoConnected: mongoose.connection.readyState === 1 
  });
});

// Centralized Global Express Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[GLOBAL SERVER ERROR]:', err.message || err);

  if (res.headersSent) {
    return next(err);
  }

  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS origin policy') {
    return res.status(403).json({ success: false, error: 'Access denied: Origin not allowed by CORS policy' });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    success: false,
    error: isProduction ? 'Something went wrong. Please try again.' : (err.message || 'Internal Server Error')
  });
});

app.listen(PORT, () => {
  console.log(`🚀 QuickR API Server running on port ${PORT}`);
});
