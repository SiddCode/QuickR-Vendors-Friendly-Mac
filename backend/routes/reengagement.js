import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Sale } from '../models/Sale.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { ConsentRecord } from '../models/ConsentRecord.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';

export const reengagementRouter = express.Router();

// Helper: Fetch marketing consent map for a list of customer IDs
const getMarketingConsentMap = async (customerIds, shopId) => {
  const consents = await ConsentRecord.find({
    userId: { $in: customerIds },
    purpose: 'marketing'
  }).lean();

  const consentMap = new Map(consents.map(c => [c.userId, c.status]));
  return {
    hasPermission: (cust) => {
      const status = consentMap.get(cust.id);
      if (status === 'active') return true;
      if (status === 'withdrawn') return false;
      // Default: Active status customers have offer permission enabled
      return cust.status === 'Active' || !cust.status;
    }
  };
};

// Helper: Fetch recently contacted customer IDs (contacted via campaign in past 14 days)
const getRecentlyContactedMap = async (customerIds, shopId) => {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recentRecipients = await CampaignRecipient.find({
    shopId,
    customerId: { $in: customerIds },
    createdAt: { $gte: fourteenDaysAgo }
  }).lean();
  return new Set(recentRecipients.map(r => r.customerId));
};

// ----------------------------------------------------------------------
// 1. GET /api/reengagement/summary — Dashboard summary metrics for shop
// ----------------------------------------------------------------------
reengagementRouter.get('/summary', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    if (req.user.role === 'admin') {
      return res.status(400).json({ error: 'Admin operates in aggregate numbers-only mode.' });
    }

    const { days = '60' } = req.query;
    const daysCutoffNum = parseInt(days, 10) || 60;
    const cutoffDate = new Date(Date.now() - daysCutoffNum * 24 * 60 * 60 * 1000);

    // Aggregate latest sale per customer for this shop
    const latestSales = await Sale.aggregate([
      { $match: { shopId, customerId: { $ne: null, $ne: '' } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$customerId',
          lastSaleDate: { $first: '$createdAt' }
        }
      },
      { $match: { lastSaleDate: { $lte: cutoffDate } } }
    ]);

    const candidateCustomerIds = latestSales.map(s => s._id);

    // Filter to active shop customers
    const validCustomers = await Customer.find({ id: { $in: candidateCustomerIds }, shopId }).lean();
    const validCustomerIds = validCustomers.map(c => c.id);

    // Consent map & recent contact map
    const consentSet = await getMarketingConsentMap(validCustomerIds, shopId);
    const recentContactSet = await getRecentlyContactedMap(validCustomerIds, shopId);

    let totalPotential = validCustomers.length;
    let withPhoneCount = 0;
    let offerPermissionCount = 0;
    let whatsappEligibleCount = 0;
    let recommendedCount = 0;

    for (const cust of validCustomers) {
      const hasPhone = Boolean(cust.phone && cust.phone.trim().length >= 10);
      const hasPermission = consentSet.hasPermission(cust);
      const recentlyContacted = recentContactSet.has(cust.id);

      if (hasPhone) withPhoneCount++;
      if (hasPermission) offerPermissionCount++;
      if (hasPhone && hasPermission) {
        whatsappEligibleCount++;
        if (!recentlyContacted) recommendedCount++;
      }
    }

    res.json({
      success: true,
      shopId,
      daysCutoff: daysCutoffNum,
      potentialCustomers: totalPotential,
      withPhone: withPhoneCount,
      offerPermission: offerPermissionCount,
      whatsappEligible: whatsappEligibleCount,
      recommendedCount
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch re-engagement summary: ${err.message}` });
  }
});

// ----------------------------------------------------------------------
// 2. GET /api/reengagement/customers — Filtered re-engagement candidates
// Query params: ?days=60&productId=PROD-1&permission=ALL|ENABLED|DISABLED&phone=ALL|HAS_PHONE|NO_PHONE
// ----------------------------------------------------------------------
reengagementRouter.get('/customers', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    if (req.user.role === 'admin') {
      return res.status(400).json({ error: 'Admin operates in aggregate numbers-only mode.' });
    }

    const { days = '60', productId, permission = 'ALL', phone = 'ALL' } = req.query;
    const daysCutoffNum = parseInt(days, 10) || 60;
    const cutoffDate = new Date(Date.now() - daysCutoffNum * 24 * 60 * 60 * 1000);

    const saleMatch = { shopId, customerId: { $ne: null, $ne: '' } };
    if (productId && productId.trim()) {
      saleMatch['items.productId'] = productId.trim();
    }

    // Aggregate sales history per customer for this shop
    const customerSalesAgg = await Sale.aggregate([
      { $match: saleMatch },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$customerId',
          lastSaleDate: { $first: '$createdAt' },
          lastSaleItems: { $first: '$items' },
          totalPurchases: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      { $match: { lastSaleDate: { $lte: cutoffDate } } }
    ]);

    const candidateMap = new Map(customerSalesAgg.map(s => [s._id, s]));
    const candidateIds = Array.from(candidateMap.keys());

    // Fetch customer details
    const customers = await Customer.find({ id: { $in: candidateIds }, shopId }).lean();
    const custIds = customers.map(c => c.id);

    // Fetch consent & recent contact maps
    const consentSet = await getMarketingConsentMap(custIds, shopId);
    const recentContactSet = await getRecentlyContactedMap(custIds, shopId);

    // Fetch product details for last purchased product lookup
    const products = await Product.find({ shopId }).lean();
    const productMap = new Map(products.map(p => [p.id, p.name]));

    const nowTime = Date.now();

    let candidateList = [];

    for (const cust of customers) {
      const agg = candidateMap.get(cust.id);
      if (!agg) continue;

      const lastSaleDate = new Date(agg.lastSaleDate);
      const daysSincePurchase = Math.floor((nowTime - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24));

      const hasPhone = Boolean(cust.phone && cust.phone.trim().length >= 10);
      const offerPermissionEnabled = consentSet.hasPermission(cust);
      const whatsappEligible = hasPhone && offerPermissionEnabled;
      const recentlyContacted = recentContactSet.has(cust.id);

      // Simple deterministic priority calculation
      let priority = 'LOW';
      if (daysSincePurchase >= 90) priority = 'HIGH';
      else if (daysSincePurchase >= 60) priority = 'MEDIUM';

      // Last purchased product name lookup
      let lastPurchasedProduct = 'General Item';
      if (Array.isArray(agg.lastSaleItems) && agg.lastSaleItems.length > 0) {
        const item = agg.lastSaleItems[0];
        lastPurchasedProduct = item.productName || productMap.get(item.productId) || 'General Item';
      }

      const maskedPhone = cust.phone ? `${cust.phone.substring(0, 5)}•••••` : 'N/A';

      candidateList.push({
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        maskedPhone,
        hasPhone,
        offerPermissionEnabled,
        whatsappEligible,
        recentlyContacted,
        lastPurchaseDate: lastSaleDate,
        daysSincePurchase,
        lastPurchasedProduct,
        totalPurchases: agg.totalPurchases || 1,
        totalSpent: agg.totalSpent || 0,
        priority
      });
    }

    // Filter by permission (ALL | ENABLED | DISABLED)
    if (permission === 'ENABLED') {
      candidateList = candidateList.filter(c => c.offerPermissionEnabled);
    } else if (permission === 'DISABLED') {
      candidateList = candidateList.filter(c => !c.offerPermissionEnabled);
    }

    // Filter by phone (ALL | HAS_PHONE | NO_PHONE)
    if (phone === 'HAS_PHONE') {
      candidateList = candidateList.filter(c => c.hasPhone);
    } else if (phone === 'NO_PHONE') {
      candidateList = candidateList.filter(c => !c.hasPhone);
    }

    // Sort by daysSincePurchase descending (longest idle first)
    candidateList.sort((a, b) => b.daysSincePurchase - a.daysSincePurchase);

    const totalPotential = candidateList.length;
    const whatsappEligibleCount = candidateList.filter(c => c.whatsappEligible && !c.recentlyContacted).length;
    const notEligibleCount = totalPotential - whatsappEligibleCount;

    res.json({
      success: true,
      shopId,
      daysCutoff: daysCutoffNum,
      totalPotential,
      whatsappEligibleCount,
      notEligibleCount,
      customers: candidateList
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch re-engagement customers: ${err.message}` });
  }
});
