import express from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Shop } from '../models/Shop.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { Enquiry } from '../models/Enquiry.js';
import { FollowUp } from '../models/FollowUp.js';
import { Sale } from '../models/Sale.js';
import { Activity } from '../models/Activity.js';
import { Message } from '../models/Message.js';
import { SubscriptionRequest } from '../models/SubscriptionRequest.js';

const router = express.Router();

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

// ─── Helper: log admin activity ──────────────────────────────────────────────
const logAdminActivity = async (actorId, action, description, shopId = null, metadata = {}) => {
  try {
    await Activity.create({
      id: `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customerId: 'SYSTEM',
      type: action,
      description,
      metadata: { ...metadata, actorUserId: actorId, actorRole: 'admin' },
      shopId: shopId || 'ADMIN'
    });
  } catch (err) {
    console.error('Admin activity log error:', err.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/stats', async (req, res) => {
  try {
    const [
      totalShops,
      activeShops,
      disabledShops,
      totalOwners,
      totalStaff,
      totalCustomers,
      totalEnquiries,
      totalFollowUps,
      totalSales
    ] = await Promise.all([
      Shop.countDocuments(),
      Shop.countDocuments({ status: { $ne: 'disabled' } }),
      Shop.countDocuments({ status: 'disabled' }),
      User.countDocuments({ role: 'owner' }),
      User.countDocuments({ role: 'staff' }),
      Customer.countDocuments(),
      Enquiry.countDocuments(),
      FollowUp.countDocuments(),
      Sale.countDocuments()
    ]);

    res.json({
      totalShops,
      activeShops,
      disabledShops,
      totalOwners,
      totalStaff,
      totalCustomers,
      totalEnquiries,
      totalFollowUps,
      totalSales
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SHOPS
// ═══════════════════════════════════════════════════════════════════════════════

// GET all shops with their owners
router.get('/shops', async (req, res) => {
  try {
    const shops = await Shop.find().sort({ createdAt: -1 });

    // Find owners for each shop
    const shopIds = shops.map(s => s.customId);
    const owners = await User.find({ role: 'owner', shopId: { $in: shopIds } });
    const ownerMap = new Map(owners.map(o => [o.shopId, { id: o.id, name: o.name, email: o.email, status: o.status }]));

    const result = shops.map(s => ({
      customId: s.customId,
      name: s.name,
      status: s.status || 'active',
      phone: s.phone,
      address: s.address,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      owner: ownerMap.get(s.customId) || null
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});

// CREATE a new shop + owner
router.post('/shops', async (req, res) => {
  let createdShop = null;
  let createdUser = null;

  try {
    const { shopName, ownerName, ownerEmail, password } = req.body;

    if (!shopName || !ownerName || !ownerEmail || !password) {
      return res.status(400).json({ error: 'All fields are required: shopName, ownerName, ownerEmail, password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = ownerEmail.toLowerCase().trim();

    // Check email uniqueness
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    // Generate sequential shop ID
    const shopCount = await Shop.countDocuments();
    const shopId = `SHOP-${String(shopCount + 1).padStart(6, '0')}`;

    // Create shop
    createdShop = new Shop({
      customId: shopId,
      name: shopName.trim(),
      phone: '',
      address: '',
      status: 'active'
    });
    await createdShop.save();

    // Create owner
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    createdUser = new User({
      id: `USER-${Date.now()}`,
      name: ownerName.trim(),
      email: normalizedEmail,
      passwordHash,
      shopId: shopId,
      role: 'owner',
      status: 'active'
    });
    await createdUser.save();

    // Log activity
    await logAdminActivity(req.user.id, 'SHOP_CREATED', `Shop "${shopName.trim()}" (${shopId}) created with owner ${ownerName.trim()}`, shopId);

    res.status(201).json({
      shop: {
        id: createdShop.customId,
        customId: createdShop.customId,
        name: createdShop.name,
        status: createdShop.status,
        createdAt: createdShop.createdAt
      },
      owner: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role
      },
      temporaryPassword: password
    });
  } catch (err) {
    // Rollback on failure
    if (createdUser && createdUser._id) await User.deleteOne({ _id: createdUser._id }).catch(() => {});
    if (createdShop && createdShop._id) await Shop.deleteOne({ _id: createdShop._id }).catch(() => {});
    res.status(500).json({ error: `Failed to create shop: ${err.message}` });
  }
});

// PATCH /shops/:shopId/status (Enable/Disable shop status explicitly)
router.patch('/shops/:shopId/status', async (req, res) => {
  try {
    const shop = await Shop.findOne({ customId: req.params.shopId });
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const { status, enabled } = req.body;
    let targetStatus = status;

    if (!targetStatus && typeof enabled === 'boolean') {
      targetStatus = enabled ? 'active' : 'disabled';
    }

    if (!targetStatus || !['active', 'disabled'].includes(targetStatus)) {
      return res.status(400).json({ error: 'Invalid status value. Must be "active" or "disabled", or boolean "enabled".' });
    }

    const oldStatus = shop.status || 'active';
    shop.status = targetStatus;
    await shop.save();

    if (targetStatus !== oldStatus) {
      const action = targetStatus === 'disabled' ? 'SHOP_DISABLED' : 'SHOP_ENABLED';
      await logAdminActivity(req.user.id, action, `Shop "${shop.name}" (${shop.customId}) ${targetStatus === 'disabled' ? 'disabled' : 'enabled'}`, shop.customId);
    }

    res.json({
      success: true,
      shop: {
        customId: shop.customId,
        name: shop.name,
        status: shop.status,
        updatedAt: shop.updatedAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update shop status' });
  }
});

// DELETE /shops/:shopId (Permanently delete shop and all shop-owned records)
router.delete('/shops/:shopId', async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const shop = await Shop.findOne({ customId: shopId });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Cascading deletion across all shop-owned collections
    const [
      usersDel,
      customersDel,
      productsDel,
      enquiriesDel,
      followUpsDel,
      salesDel,
      messagesDel,
      activitiesDel,
      shopDel
    ] = await Promise.all([
      User.deleteMany({ shopId }),
      Customer.deleteMany({ shopId }),
      Product.deleteMany({ shopId }),
      Enquiry.deleteMany({ shopId }),
      FollowUp.deleteMany({ shopId }),
      Sale.deleteMany({ shopId }),
      Message.deleteMany({ shopId }),
      Activity.deleteMany({ shopId, customerId: { $ne: 'SYSTEM' } }),
      Shop.deleteOne({ customId: shopId })
    ]);

    await logAdminActivity(
      req.user.id,
      'SHOP_DELETED',
      `Shop "${shop.name}" (${shopId}) permanently deleted with all shop-owned data`,
      shopId,
      {
        deletedCounts: {
          users: usersDel.deletedCount,
          customers: customersDel.deletedCount,
          products: productsDel.deletedCount,
          enquiries: enquiriesDel.deletedCount,
          followUps: followUpsDel.deletedCount,
          sales: salesDel.deletedCount,
          messages: messagesDel.deletedCount
        }
      }
    );

    res.json({
      success: true,
      message: `Shop "${shop.name}" (${shopId}) and all associated shop data permanently deleted.`,
      deletedCounts: {
        users: usersDel.deletedCount,
        customers: customersDel.deletedCount,
        products: productsDel.deletedCount,
        enquiries: enquiriesDel.deletedCount,
        followUps: followUpsDel.deletedCount,
        sales: salesDel.deletedCount,
        messages: messagesDel.deletedCount
      }
    });

  } catch (err) {
    console.error('Delete shop error:', err);
    res.status(500).json({ error: `Failed to delete shop: ${err.message}` });
  }
});

// GET single shop details + statistics
router.get('/shops/:shopId', async (req, res) => {
  try {
    const shop = await Shop.findOne({ customId: req.params.shopId });
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const owner = await User.findOne({ role: 'owner', shopId: shop.customId });
    const staff = await User.find({ role: 'staff', shopId: shop.customId });

    const [customerCount, productCount, enquiryCount, followUpCount, saleCount] = await Promise.all([
      Customer.countDocuments({ shopId: shop.customId }),
      Product.countDocuments({ shopId: shop.customId }),
      Enquiry.countDocuments({ shopId: shop.customId }),
      FollowUp.countDocuments({ shopId: shop.customId }),
      Sale.countDocuments({ shopId: shop.customId })
    ]);

    res.json({
      shop: {
        customId: shop.customId,
        name: shop.name,
        status: shop.status || 'active',
        subscriptionStatus: shop.subscriptionStatus || 'active',
        phone: shop.phone,
        address: shop.address,
        createdAt: shop.createdAt,
        updatedAt: shop.updatedAt
      },
      owner: owner ? { id: owner.id, name: owner.name, email: owner.email, status: owner.status } : null,
      staff: staff.map(s => ({ id: s.id, name: s.name, email: s.email, role: s.role, status: s.status, createdAt: s.createdAt })),
      statistics: {
        customers: customerCount,
        products: productCount,
        enquiries: enquiryCount,
        followUps: followUpCount,
        sales: saleCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shop details' });
  }
});

// UPDATE shop (name, status)
router.put('/shops/:shopId', async (req, res) => {
  try {
    const shop = await Shop.findOne({ customId: req.params.shopId });
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const { name, status } = req.body;
    const oldStatus = shop.status || 'active';

    if (name) shop.name = name.trim();
    if (status && ['active', 'disabled'].includes(status)) {
      shop.status = status;
    }

    await shop.save();

    // Log status change
    if (status && status !== oldStatus) {
      const action = status === 'disabled' ? 'SHOP_DISABLED' : 'SHOP_ENABLED';
      await logAdminActivity(req.user.id, action, `Shop "${shop.name}" (${shop.customId}) ${status === 'disabled' ? 'disabled' : 'enabled'}`, shop.customId);
    }

    if (name && name.trim() !== shop.name) {
      await logAdminActivity(req.user.id, 'SHOP_UPDATED', `Shop "${shop.customId}" name updated`, shop.customId);
    }

    res.json({
      customId: shop.customId,
      name: shop.name,
      status: shop.status,
      phone: shop.phone,
      address: shop.address,
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update shop' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════

// GET all users (with optional filters)
router.get('/users', async (req, res) => {
  try {
    const filter = {};
    if (req.query.shopId) filter.shopId = req.query.shopId;
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter).sort({ createdAt: -1 });

    // Get shop names for each user
    const shopIds = [...new Set(users.filter(u => u.shopId).map(u => u.shopId))];
    const shops = await Shop.find({ customId: { $in: shopIds } });
    const shopMap = new Map(shops.map(s => [s.customId, s.name]));

    const result = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      shopId: u.shopId,
      shopName: shopMap.get(u.shopId) || null,
      status: u.status || 'active',
      createdAt: u.createdAt
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// CREATE staff for a shop
router.post('/users/staff', async (req, res) => {
  try {
    const { name, email, password, shopId } = req.body;

    if (!name || !email || !password || !shopId) {
      return res.status(400).json({ error: 'All fields are required: name, email, password, shopId' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Verify shop exists
    const shop = await Shop.findOne({ customId: shopId });
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check email uniqueness
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      id: `USER-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      shopId,
      role: 'staff',
      status: 'active'
    });
    await newUser.save();

    // Log activity
    await logAdminActivity(req.user.id, 'STAFF_CREATED', `Staff "${name.trim()}" created for shop ${shopId}`, shopId);

    res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        shopId: newUser.shopId,
        status: newUser.status,
        createdAt: newUser.createdAt
      },
      temporaryPassword: password
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to create staff: ${err.message}` });
  }
});

// UPDATE user (status only — enable/disable)
router.put('/users/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent disabling the admin account from the UI
    if (user.role === 'admin' && req.body.status === 'disabled') {
      return res.status(400).json({ error: 'Cannot disable the admin account.' });
    }

    const { status } = req.body;
    if (status && ['active', 'disabled'].includes(status)) {
      const oldStatus = user.status;
      user.status = status;
      await user.save();

      if (status !== oldStatus) {
        const action = status === 'disabled' ? 'USER_DISABLED' : 'USER_ENABLED';
        await logAdminActivity(req.user.id, action, `User "${user.name}" (${user.email}) ${status === 'disabled' ? 'disabled' : 'enabled'}`, user.shopId);
      }
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
      status: user.status,
      createdAt: user.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// RESET user password
router.post('/users/:userId/reset-password', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.userId }).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Log activity (never store the password)
    await logAdminActivity(req.user.id, 'PASSWORD_RESET', `Password reset for user "${user.name}" (${user.email})`, user.shopId);

    res.json({
      success: true,
      message: 'Password reset successfully.',
      temporaryPassword: newPassword
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD METRICS & OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard-stats', async (req, res) => {
  try {
    const { shopId } = req.query;
    const filter = shopId ? { shopId } : {};
    const shopFilter = shopId ? { customId: shopId } : {};

    const [
      totalShops,
      activeShops,
      disabledShops,
      totalUsers,
      activeUsers,
      totalProducts,
      totalCustomers,
      totalEnquiries,
      totalFollowUps,
      totalSales
    ] = await Promise.all([
      Shop.countDocuments(shopFilter),
      Shop.countDocuments({ ...shopFilter, status: { $ne: 'disabled' } }),
      Shop.countDocuments({ ...shopFilter, status: 'disabled' }),
      User.countDocuments(shopId ? { shopId } : {}),
      User.countDocuments({ ...(shopId ? { shopId } : {}), status: { $ne: 'disabled' } }),
      Product.countDocuments(filter),
      Customer.countDocuments(filter),
      Enquiry.countDocuments(filter),
      FollowUp.countDocuments(filter),
      Sale.countDocuments(filter)
    ]);

    await logAdminActivity(req.user.id, 'ADMIN_VIEWED_DASHBOARD_STATS', 'Admin accessed privacy-first aggregated dashboard stats', shopId || null);

    res.json({
      success: true,
      data: {
        totalShops,
        activeShops,
        disabledShops,
        totalUsers,
        activeUsers,
        totalProducts,
        totalCustomers,
        totalEnquiries,
        totalFollowUps,
        totalSales
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch aggregate dashboard statistics' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const { shopId } = req.query;
    const filter = shopId ? { shopId } : {};
    const shopFilter = shopId ? { customId: shopId } : {};

    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    const startOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0, 0) - istOffsetMs);
    const endOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);

    const [
      totalShops,
      activeShops,
      disabledShops,
      totalUsers,
      activeUsers,
      totalCustomers,
      totalProducts,
      totalEnquiries,
      totalFollowUps,
      totalSales,
      billingAggregate,
      todayFollowUps,
      overdueFollowUps,
      todayEnquiries,
      todaySalesDocs,
      purchasedEnquiriesCount
    ] = await Promise.all([
      Shop.countDocuments(shopFilter),
      Shop.countDocuments({ ...shopFilter, status: { $ne: 'disabled' } }),
      Shop.countDocuments({ ...shopFilter, status: 'disabled' }),
      User.countDocuments(shopId ? { shopId } : {}),
      User.countDocuments({ ...(shopId ? { shopId } : {}), status: { $ne: 'disabled' } }),
      Customer.countDocuments(filter),
      Product.countDocuments(filter),
      Enquiry.countDocuments(filter),
      FollowUp.countDocuments(filter),
      Sale.countDocuments(filter),
      Sale.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      FollowUp.countDocuments({
        ...filter,
        scheduledAt: { $gte: startOfToday, $lte: endOfToday },
        status: { $in: ['ready', 'sent', 'scheduled'] }
      }),
      FollowUp.countDocuments({
        ...filter,
        scheduledAt: { $lt: startOfToday },
        status: { $in: ['ready', 'scheduled'] }
      }),
      Enquiry.countDocuments({
        ...filter,
        createdAt: { $gte: startOfToday, $lte: endOfToday }
      }),
      Sale.aggregate([
        { $match: { ...filter, createdAt: { $gte: startOfToday, $lte: endOfToday } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      Enquiry.countDocuments({ ...filter, purchaseStatus: 'Purchased' })
    ]);

    const totalBillingAmount = billingAggregate[0]?.total || 0;
    const todaySalesAmount = todaySalesDocs[0]?.total || 0;
    const todaySalesCount = todaySalesDocs[0]?.count || 0;
    const conversionRate = totalEnquiries > 0 ? Math.round((purchasedEnquiriesCount / totalEnquiries) * 100) : 0;

    await logAdminActivity(req.user.id, 'ADMIN_VIEWED_DASHBOARD_STATS', 'Admin accessed aggregated dashboard metrics', shopId || null);

    res.json({
      totalShops,
      activeShops,
      disabledShops,
      totalUsers,
      activeUsers,
      totalCustomers,
      totalProducts,
      totalEnquiries,
      totalFollowUps,
      totalSales,
      totalBillingAmount,
      todayFollowUps,
      overdueFollowUps,
      todayEnquiries,
      todaySalesAmount,
      todaySalesCount,
      conversionRate
    });
  } catch (err) {
    console.error('Admin dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CUSTOMERS (AGGREGATED & PRIVACY-PROTECTED)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/customers', async (req, res) => {
  try {
    const { shopId } = req.query;
    const filter = {};
    if (shopId) filter.shopId = shopId;

    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    const custIds = customers.map(c => c.id);
    const shopIds = [...new Set(customers.map(c => c.shopId))];

    const [shops, enquiries, sales, followUps] = await Promise.all([
      Shop.find({ customId: { $in: shopIds } }),
      Enquiry.find({ customerId: { $in: custIds } }),
      Sale.find({ customerId: { $in: custIds } }),
      FollowUp.find({ customerId: { $in: custIds } }).sort({ scheduledAt: -1 })
    ]);

    const shopMap = new Map(shops.map(s => [s.customId, s.name]));
    
    const enqCountMap = new Map();
    enquiries.forEach(e => enqCountMap.set(e.customerId, (enqCountMap.get(e.customerId) || 0) + 1));

    const saleMap = new Map();
    sales.forEach(s => {
      const current = saleMap.get(s.customerId) || { count: 0, amount: 0 };
      saleMap.set(s.customerId, { count: current.count + 1, amount: current.amount + (s.totalAmount || 0) });
    });

    const lastFollowUpMap = new Map();
    followUps.forEach(f => {
      if (!lastFollowUpMap.has(f.customerId)) {
        lastFollowUpMap.set(f.customerId, f.scheduledAt);
      }
    });

    // PRIVACY-FIRST: Mask customer name, phone, and email for global platform admin
    const result = customers.map(c => {
      const saleData = saleMap.get(c.id) || { count: 0, amount: 0 };
      return {
        id: c.id,
        name: `Customer #${c.id.split('-').pop() || c.id}`,
        phone: '••••••••••',
        email: 'protected@privacy.quickr',
        location: c.location ? 'Region Protected' : 'N/A',
        shopId: c.shopId,
        shopName: shopMap.get(c.shopId) || c.shopId,
        status: c.status,
        createdAt: c.createdAt,
        totalEnquiries: enqCountMap.get(c.id) || 0,
        totalPurchases: saleData.count,
        totalSpending: saleData.amount,
        lastFollowUp: lastFollowUpMap.get(c.id) || null
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin customers' });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({ id: req.params.id });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const shop = await Shop.findOne({ customId: customer.shopId });
    const [enquiries, followUps, sales, activities] = await Promise.all([
      Enquiry.find({ customerId: customer.id }).sort({ createdAt: -1 }),
      FollowUp.find({ customerId: customer.id }).sort({ scheduledAt: -1 }),
      Sale.find({ customerId: customer.id }).sort({ createdAt: -1 }),
      Activity.find({ customerId: customer.id }).sort({ createdAt: -1 })
    ]);

    // Mask PII in single customer response as well
    const anonymizedCustomer = {
      ...customer.toObject(),
      name: `Customer #${customer.id.split('-').pop() || customer.id}`,
      phone: '••••••••••',
      email: 'protected@privacy.quickr',
      location: 'Region Protected',
      shopName: shop?.name || customer.shopId
    };

    const anonymizedEnquiries = enquiries.map(e => ({
      ...e.toObject(),
      notes: '[Privacy Protected]'
    }));

    const anonymizedFollowUps = followUps.map(f => ({
      ...f.toObject(),
      message: '[Privacy Protected]'
    }));

    res.json({
      customer: anonymizedCustomer,
      enquiries: anonymizedEnquiries,
      followUps: anonymizedFollowUps,
      sales,
      activities
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/products', async (req, res) => {
  try {
    const { shopId, category } = req.query;
    const filter = {};
    if (shopId) filter.shopId = shopId;
    if (category) filter.category = category;

    const products = await Product.find(filter).sort({ createdAt: -1 });
    const shopIds = [...new Set(products.map(p => p.shopId))];
    const shops = await Shop.find({ customId: { $in: shopIds } });
    const shopMap = new Map(shops.map(s => [s.customId, s.name]));

    const result = products.map(p => ({
      ...p.toObject(),
      shopName: shopMap.get(p.shopId) || p.shopId
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin products' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ENQUIRIES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/enquiries', async (req, res) => {
  try {
    const { shopId, interest, purchaseStatus, startDate, endDate } = req.query;
    const filter = {};
    if (shopId) filter.shopId = shopId;
    if (interest) filter.interest = interest;
    if (purchaseStatus) filter.purchaseStatus = purchaseStatus;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 });
    const shopIds = [...new Set(enquiries.map(e => e.shopId))];
    const custIds = [...new Set(enquiries.map(e => e.customerId))];
    const enqIds = enquiries.map(e => e.id);

    const [shops, customers, followUps] = await Promise.all([
      Shop.find({ customId: { $in: shopIds } }),
      Customer.find({ id: { $in: custIds } }),
      FollowUp.find({ enquiryId: { $in: enqIds } })
    ]);

    const shopMap = new Map(shops.map(s => [s.customId, s.name]));
    const custMap = new Map(customers.map(c => [c.id, c.name]));
    const fwMap = new Map(followUps.map(f => [f.enquiryId, f.scheduledAt]));

    const result = enquiries.map(e => ({
      ...e.toObject(),
      customerName: `Customer #${e.customerId.split('-').pop() || e.customerId}`,
      notes: '[Privacy Protected]',
      shopName: shopMap.get(e.shopId) || e.shopId,
      followUpDate: fwMap.get(e.id) || null
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin enquiries' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN FOLLOW-UPS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/followups', async (req, res) => {
  try {
    const { shopId, filter } = req.query;
    const query = {};
    if (shopId) query.shopId = shopId;

    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    const startOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0, 0) - istOffsetMs);
    const endOfToday = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);
    const startOfTomorrow = new Date(Date.UTC(istYear, istMonth, istDate + 1, 0, 0, 0, 0) - istOffsetMs);
    const endOfTomorrow = new Date(Date.UTC(istYear, istMonth, istDate + 1, 23, 59, 59, 999) - istOffsetMs);

    if (filter === 'today') {
      query.scheduledAt = { $gte: startOfToday, $lte: endOfToday };
      query.status = { $in: ['ready', 'sent', 'scheduled'] };
    } else if (filter === 'tomorrow') {
      query.scheduledAt = { $gte: startOfTomorrow, $lte: endOfTomorrow };
    } else if (filter === 'overdue') {
      query.scheduledAt = { $lt: startOfToday };
      query.status = { $in: ['ready', 'scheduled'] };
    } else if (filter === 'upcoming') {
      query.scheduledAt = { $gt: endOfToday };
    } else if (filter === 'completed') {
      query.status = { $in: ['completed', 'closed'] };
    }

    const followUps = await FollowUp.find(query).sort({ scheduledAt: 1 });
    const shopIds = [...new Set(followUps.map(f => f.shopId))];
    const custIds = [...new Set(followUps.map(f => f.customerId))];
    const enqIds = [...new Set(followUps.map(f => f.enquiryId))];

    const [shops, customers, enquiries] = await Promise.all([
      Shop.find({ customId: { $in: shopIds } }),
      Customer.find({ id: { $in: custIds } }),
      Enquiry.find({ id: { $in: enqIds } })
    ]);

    const shopMap = new Map(shops.map(s => [s.customId, s.name]));
    const enqMap = new Map(enquiries.map(e => [e.id, e.productName || 'Product']));

    const result = followUps.map(f => ({
      ...f.toObject(),
      customerName: `Customer #${f.customerId.split('-').pop() || f.customerId}`,
      message: '[Privacy Protected]',
      productName: enqMap.get(f.enquiryId) || 'Product',
      shopName: shopMap.get(f.shopId) || f.shopId
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin follow-ups' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN SALES & BILLING
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/sales', async (req, res) => {
  try {
    const { shopId, startDate, endDate } = req.query;
    const filter = {};
    if (shopId) filter.shopId = shopId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const sales = await Sale.find(filter).sort({ createdAt: -1 });
    const shopIds = [...new Set(sales.map(s => s.shopId))];
    const shops = await Shop.find({ customId: { $in: shopIds } });
    const shopMap = new Map(shops.map(s => [s.customId, s.name]));

    const totalSalesAmount = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalInvoices = sales.length;
    const averageSaleValue = totalInvoices > 0 ? Math.round(totalSalesAmount / totalInvoices) : 0;

    const resultSales = sales.map(s => ({
      ...s.toObject(),
      customerName: `Customer #${s.customerId ? s.customerId.split('-').pop() : 'Walk-in'}`,
      shopName: shopMap.get(s.shopId) || s.shopId
    }));

    res.json({
      sales: resultSales,
      summary: {
        totalSalesAmount,
        totalInvoices,
        averageSaleValue
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin sales' });
  }
});

router.get('/billing', async (req, res) => {
  try {
    const { shopId } = req.query;
    const filter = shopId ? { shopId } : {};

    const invoices = await Sale.find(filter).sort({ createdAt: -1 });
    const shopIds = [...new Set(invoices.map(s => s.shopId))];
    const shops = await Shop.find({ customId: { $in: shopIds } });
    const shopMap = new Map(shops.map(s => [s.customId, s.name]));

    const result = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      shopId: inv.shopId,
      shopName: shopMap.get(inv.shopId) || inv.shopId,
      customerName: `Customer #${inv.customerId ? inv.customerId.split('-').pop() : 'Walk-in'}`,
      itemsCount: inv.items ? inv.items.length : 0,
      items: inv.items || [],
      subtotal: inv.subtotal,
      discount: inv.discount,
      totalAmount: inv.totalAmount,
      paymentMethod: inv.paymentMethod,
      source: inv.source,
      createdAt: inv.createdAt
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin billing records' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN REPORTS & AGGREGATIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/reports', async (req, res) => {
  try {
    const { shopId, period, startDate, endDate } = req.query;

    const matchFilter = {};
    if (shopId) matchFilter.shopId = shopId;

    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);
    const istYear = istNow.getUTCFullYear();
    const istMonth = istNow.getUTCMonth();
    const istDate = istNow.getUTCDate();

    let rangeStart = null;
    let rangeEnd = null;

    if (period === 'today') {
      rangeStart = new Date(Date.UTC(istYear, istMonth, istDate, 0, 0, 0, 0) - istOffsetMs);
      rangeEnd = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);
    } else if (period === 'this_week') {
      const dayOfWeek = istNow.getUTCDay();
      rangeStart = new Date(Date.UTC(istYear, istMonth, istDate - dayOfWeek, 0, 0, 0, 0) - istOffsetMs);
      rangeEnd = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);
    } else if (period === 'this_month') {
      rangeStart = new Date(Date.UTC(istYear, istMonth, 1, 0, 0, 0, 0) - istOffsetMs);
      rangeEnd = new Date(Date.UTC(istYear, istMonth, istDate, 23, 59, 59, 999) - istOffsetMs);
    } else if (startDate || endDate) {
      if (startDate) rangeStart = new Date(startDate);
      if (endDate) rangeEnd = new Date(endDate);
    }

    if (rangeStart || rangeEnd) {
      matchFilter.createdAt = {};
      if (rangeStart) matchFilter.createdAt.$gte = rangeStart;
      if (rangeEnd) matchFilter.createdAt.$lte = rangeEnd;
    }

    const shops = await Shop.find();
    const shopMap = new Map(shops.map(s => [s.customId, s.name]));

    // 1. Sales by Shop
    const salesByShopRaw = await Sale.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$shopId', totalRevenue: { $sum: '$totalAmount' }, invoiceCount: { $sum: 1 } } }
    ]);
    const salesByShop = salesByShopRaw.map(r => ({
      shopId: r._id,
      shopName: shopMap.get(r._id) || r._id,
      totalRevenue: r.totalRevenue,
      invoiceCount: r.invoiceCount
    }));

    // 2. Enquiries by Shop
    const enquiriesByShopRaw = await Enquiry.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$shopId', count: { $sum: 1 }, purchased: { $sum: { $cond: [{ $eq: ['$purchaseStatus', 'Purchased'] }, 1, 0] } } } }
    ]);
    const enquiriesByShop = enquiriesByShopRaw.map(r => ({
      shopId: r._id,
      shopName: shopMap.get(r._id) || r._id,
      count: r.count,
      purchasedCount: r.purchased,
      conversionRate: r.count > 0 ? Math.round((r.purchased / r.count) * 100) : 0
    }));

    // 3. Followups by Shop
    const followUpsByShopRaw = await FollowUp.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$shopId', count: { $sum: 1 }, completedCount: { $sum: { $cond: [{ $in: ['$status', ['completed', 'closed']] }, 1, 0] } } } }
    ]);
    const followUpsByShop = followUpsByShopRaw.map(r => ({
      shopId: r._id,
      shopName: shopMap.get(r._id) || r._id,
      count: r.count,
      completedCount: r.completedCount
    }));

    // 4. Top Customers
    const topCustomersRaw = await Sale.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$customerId', shopId: { $first: '$shopId' }, name: { $first: '$customerName' }, totalSpent: { $sum: '$totalAmount' }, purchaseCount: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);
    const topCustomers = topCustomersRaw.filter(c => c._id).map(c => ({
      customerId: c._id,
      name: c.name || 'Customer',
      shopId: c.shopId,
      shopName: shopMap.get(c.shopId) || c.shopId,
      totalSpent: c.totalSpent,
      purchaseCount: c.purchaseCount
    }));

    res.json({
      period: period || 'all',
      salesByShop,
      enquiriesByShop,
      followUpsByShop,
      topCustomers,
      revenueByShop: salesByShop
    });
  } catch (err) {
    console.error('Admin reports error:', err);
    res.status(500).json({ error: 'Failed to generate admin reports' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/activities', async (req, res) => {
  try {
    const adminActions = await Activity.find({
      type: { $in: ['ADMIN_VIEWED_DASHBOARD_STATS', 'SHOP_CREATED', 'SHOP_UPDATED', 'SHOP_DISABLED', 'SHOP_ENABLED', 'OWNER_CREATED', 'STAFF_CREATED', 'USER_DISABLED', 'USER_ENABLED', 'PASSWORD_RESET', 'SUBSCRIPTION_APPROVED', 'SUBSCRIPTION_REJECTED'] }
    }).sort({ createdAt: -1 }).limit(100);

    res.json(adminActions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin activities' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION REQUESTS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/subscription-requests', async (req, res) => {
  try {
    const requests = await SubscriptionRequest.find().sort({ createdAt: -1 }).lean();
    res.json(requests);
  } catch (err) {
    console.error('Fetch subscription requests error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription requests' });
  }
});

router.patch('/subscription-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes, initialPassword } = req.body || {};

    const subReq = await SubscriptionRequest.findOne({ id });
    if (!subReq) {
      return res.status(404).json({ success: false, error: 'Subscription request not found.' });
    }

    if (subReq.status === 'approved') {
      return res.status(400).json({ success: false, error: 'This request has already been approved.' });
    }

    // Check if user email already exists
    const existingUser = await User.findOne({ email: subReq.email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A user account with this applicant email already exists.' });
    }

    // Generate Shop & Owner User
    const shopCount = await Shop.countDocuments();
    const shopCustomId = `SHOP-${String(shopCount + 1).padStart(6, '0')}`;
    const userCustomId = `USER-${Date.now()}`;
    const tempPassword = initialPassword || `QuickR@${Math.floor(1000 + Math.random() * 9000)}`;

    const newShop = new Shop({
      customId: shopCustomId,
      name: subReq.shopName,
      phone: subReq.phone,
      address: 'Tamil Nadu, India',
      status: 'active',
      subscriptionStatus: 'active'
    });
    await newShop.save();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    const newUser = new User({
      id: userCustomId,
      name: subReq.name,
      email: subReq.email,
      passwordHash,
      shopId: shopCustomId,
      role: 'owner',
      status: 'active'
    });
    await newUser.save();

    // Mark subscription request approved
    subReq.status = 'approved';
    subReq.reviewedAt = new Date();
    subReq.reviewedBy = req.user.id;
    subReq.createdShopId = shopCustomId;
    if (adminNotes) subReq.adminNotes = adminNotes;
    await subReq.save();

    await logAdminActivity(
      req.user.id,
      'SUBSCRIPTION_APPROVED',
      `Approved QuickR subscription request for ${subReq.shopName} (${subReq.email})`,
      shopCustomId,
      { requestId: subReq.id, email: subReq.email }
    );

    res.json({
      success: true,
      message: 'Subscription request approved successfully.',
      shop: { customId: newShop.customId, name: newShop.name },
      owner: { id: newUser.id, name: newUser.name, email: newUser.email },
      temporaryPassword: tempPassword
    });
  } catch (err) {
    console.error('Approve subscription request error:', err);
    res.status(500).json({ success: false, error: 'Failed to approve subscription request' });
  }
});

router.patch('/subscription-requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body || {};

    const subReq = await SubscriptionRequest.findOne({ id });
    if (!subReq) {
      return res.status(404).json({ success: false, error: 'Subscription request not found.' });
    }

    if (subReq.status === 'approved') {
      return res.status(400).json({ success: false, error: 'An approved request cannot be rejected.' });
    }

    subReq.status = 'rejected';
    subReq.reviewedAt = new Date();
    subReq.reviewedBy = req.user.id;
    if (adminNotes) subReq.adminNotes = adminNotes;
    await subReq.save();

    await logAdminActivity(
      req.user.id,
      'SUBSCRIPTION_REJECTED',
      `Rejected QuickR subscription request for ${subReq.shopName} (${subReq.email})`,
      null,
      { requestId: subReq.id, email: subReq.email }
    );

    res.json({
      success: true,
      message: 'Subscription request rejected.'
    });
  } catch (err) {
    console.error('Reject subscription request error:', err);
    res.status(500).json({ success: false, error: 'Failed to reject subscription request' });
  }
});

router.delete('/subscription-requests', async (req, res) => {
  try {
    const { ids } = req.body || {};

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of subscription request IDs is required.' });
    }

    const deleteResult = await SubscriptionRequest.deleteMany({ id: { $in: ids } });

    await logAdminActivity(
      req.user.id,
      'SUBSCRIPTION_REQUESTS_DELETED',
      `Bulk deleted ${deleteResult.deletedCount} subscription request(s)`,
      null,
      { requestedIds: ids, deletedCount: deleteResult.deletedCount }
    );

    res.json({
      success: true,
      message: `${deleteResult.deletedCount} subscription request(s) deleted successfully.`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (err) {
    console.error('Bulk delete subscription requests error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete subscription requests' });
  }
});

export { router as adminRouter };
