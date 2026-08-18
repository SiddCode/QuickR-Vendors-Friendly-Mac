import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Shop } from '../models/Shop.js';
import { ConsentRecord } from '../models/ConsentRecord.js';
import { PrivacyAuditLog } from '../models/PrivacyAuditLog.js';
import { PrivacyRequest } from '../models/PrivacyRequest.js';
import { SecurityIncident } from '../models/SecurityIncident.js';

export const privacyRouter = express.Router();

const CURRENT_NOTICE_VERSION = '1.0';

// Helper to log audit actions securely
const logPrivacyAudit = async (req, action, resourceType = 'User', resourceId = '', metadata = {}) => {
  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'QuickR-Client';
    await PrivacyAuditLog.create({
      id: `PAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: req.user.id,
      shopId: req.user.shopId || 'SYSTEM',
      action,
      resourceType,
      resourceId: resourceId || req.user.id,
      ipAddress: String(ipAddress).split(',')[0].trim(),
      userAgent,
      metadata
    });
  } catch (err) {
    console.error('[PrivacyAuditLog] Logging failed:', err.message);
  }
};

// ----------------------------------------------------------------------
// 0. GET /api/privacy/activity-security — Shop Owner Activity & Security Log
// ----------------------------------------------------------------------
privacyRouter.get('/activity-security', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(400).json({ error: 'Admin activity is separate and handled via admin routes.' });
    }

    // STRICT SHOP ISOLATION: enforce req.user.shopId and explicitly filter OUT any admin system activity
    const filter = {
      shopId: req.user.shopId,
      userId: { $exists: true },
      'metadata.role': { $ne: 'admin' }
    };

    const logs = await PrivacyAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Format for Activity & Security UI while ensuring sensitive fields (passwords, tokens) are NEVER returned
    const formattedLogs = logs.map(l => ({
      id: l.id,
      action: l.action,
      resourceType: l.resourceType,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      createdAt: l.createdAt,
      metadata: {
        role: l.metadata?.role,
        purpose: l.metadata?.purpose,
        requestType: l.metadata?.requestType
      }
    }));

    res.json({
      success: true,
      shopId: req.user.shopId,
      activities: formattedLogs
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Activity & Security logs.' });
  }
});

// ----------------------------------------------------------------------
// 0B. POST /api/privacy/cleanup-retention — Safe Configurable Storage Retention Cleanup
// ----------------------------------------------------------------------
privacyRouter.post('/cleanup-retention', requireAuth, async (req, res) => {
  try {
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '180', 10);
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    let deletedAuditLogsCount = 0;
    let deletedResolvedRequestsCount = 0;

    if (req.user.role === 'admin') {
      // Admin cleanup across technical logs older than retention period
      const auditDel = await PrivacyAuditLog.deleteMany({ createdAt: { $lt: cutoffDate } });
      const reqDel = await PrivacyRequest.deleteMany({ status: { $in: ['completed', 'rejected'] }, resolvedAt: { $lt: cutoffDate } });
      deletedAuditLogsCount = auditDel.deletedCount || 0;
      deletedResolvedRequestsCount = reqDel.deletedCount || 0;

      await logPrivacyAudit(req, 'DATA_RETENTION_CLEANUP_PERFORMED', 'System', 'GLOBAL', {
        retentionDays,
        cutoffDate,
        deletedAuditLogsCount,
        deletedResolvedRequestsCount
      });
    } else {
      // Shop Owner cleanup: only clean up technical logs belonging to their own shop older than retention period
      const auditDel = await PrivacyAuditLog.deleteMany({ shopId: req.user.shopId, createdAt: { $lt: cutoffDate } });
      deletedAuditLogsCount = auditDel.deletedCount || 0;

      await logPrivacyAudit(req, 'DATA_RETENTION_CLEANUP_PERFORMED', 'Shop', req.user.shopId, {
        retentionDays,
        cutoffDate,
        deletedAuditLogsCount
      });
    }

    res.json({
      success: true,
      retentionConfigDays: retentionDays,
      cutoffDate,
      deletedTechnicalLogsCount: deletedAuditLogsCount,
      deletedResolvedRequestsCount,
      note: 'Safe technical storage cleanup complete. Active business records (customers, products, sales, enquiries, followups) were preserved.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to perform safe data retention cleanup.' });
  }
});

// ----------------------------------------------------------------------
// 1. GET /api/privacy/notice — Public / Authenticated Privacy Notice Info
// ----------------------------------------------------------------------
privacyRouter.get('/notice', (req, res) => {
  res.json({
    noticeVersion: CURRENT_NOTICE_VERSION,
    effectiveDate: '2026-08-18',
    dpoContact: 'dpo@quickr.com',
    retentionConfigDays: parseInt(process.env.DATA_RETENTION_DAYS || '180', 10),
    thirdPartyProcessors: [
      { name: 'MongoDB Atlas', purpose: 'Encrypted Database Storage', location: 'India/Asia-South' },
      { name: 'WhatsApp Cloud API / Direct Desktop Protocol', purpose: 'Vendor Customer Follow-up Communications', location: 'Global' }
    ]
  });
});

// ----------------------------------------------------------------------
// 2. GET /api/privacy/consent — Retrieve authenticated user consent history
// ----------------------------------------------------------------------
privacyRouter.get('/consent', requireAuth, async (req, res) => {
  try {
    const history = await ConsentRecord.find({ userId: req.user.id }).sort({ createdAt: -1 });
    
    // Check if defaults exist, if not seed initial active service & marketing records
    if (history.length === 0) {
      const initialService = await ConsentRecord.create({
        id: `CNS-${Date.now()}-1`,
        userId: req.user.id,
        shopId: req.user.shopId,
        purpose: 'service',
        status: 'active',
        noticeVersion: CURRENT_NOTICE_VERSION,
        language: 'en'
      });
      const initialMarketing = await ConsentRecord.create({
        id: `CNS-${Date.now()}-2`,
        userId: req.user.id,
        shopId: req.user.shopId,
        purpose: 'marketing',
        status: 'active',
        noticeVersion: CURRENT_NOTICE_VERSION,
        language: 'en'
      });
      return res.json([initialService, initialMarketing]);
    }

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve consent history.' });
  }
});

// ----------------------------------------------------------------------
// 3. POST /api/privacy/consent/withdraw — Withdraw optional consent
// ----------------------------------------------------------------------
privacyRouter.post('/consent/withdraw', requireAuth, async (req, res) => {
  try {
    const { purpose } = req.body;
    if (!purpose || !['marketing', 'analytics'].includes(purpose)) {
      return res.status(400).json({ error: 'Only optional consent (marketing, analytics) can be withdrawn. Essential service consent is required to maintain an active account.' });
    }

    const updated = await ConsentRecord.findOneAndUpdate(
      { userId: req.user.id, purpose },
      { status: 'withdrawn', withdrawnAt: new Date(), noticeVersion: CURRENT_NOTICE_VERSION },
      { new: true, upsert: true }
    );

    await logPrivacyAudit(req, 'CONSENT_WITHDRAWN', 'ConsentRecord', updated.id, { purpose });

    res.json({ success: true, consent: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to withdraw consent.' });
  }
});

// ----------------------------------------------------------------------
// 4. POST /api/privacy/consent/grant — Re-grant optional consent
// ----------------------------------------------------------------------
privacyRouter.post('/consent/grant', requireAuth, async (req, res) => {
  try {
    const { purpose } = req.body;
    if (!purpose || !['marketing', 'analytics'].includes(purpose)) {
      return res.status(400).json({ error: 'Invalid purpose specified.' });
    }

    const updated = await ConsentRecord.findOneAndUpdate(
      { userId: req.user.id, purpose },
      { status: 'active', consentedAt: new Date(), withdrawnAt: null, noticeVersion: CURRENT_NOTICE_VERSION },
      { new: true, upsert: true }
    );

    await logPrivacyAudit(req, 'CONSENT_GRANTED', 'ConsentRecord', updated.id, { purpose });

    res.json({ success: true, consent: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to grant consent.' });
  }
});
privacyRouter.get('/customers/:customerId/permission', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { customerId } = req.params;

    const CustomerModel = (await import('../models/Customer.js')).Customer;
    const customer = await CustomerModel.findOne({ id: customerId, shopId });
    if (!customer) return res.status(404).json({ error: 'Customer not found for your shop.' });

    const consentDoc = await ConsentRecord.findOne({ userId: customerId, shopId, purpose: 'marketing' });
    const enabled = Boolean(consentDoc && consentDoc.status === 'active');

    res.json({
      success: true,
      customerId,
      shopId,
      allowWhatsAppOffers: enabled,
      status: enabled ? 'active' : 'withdrawn'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer offer permission.' });
  }
});

privacyRouter.post('/customers/:customerId/permission', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { customerId } = req.params;
    const { allowWhatsAppOffers } = req.body;

    const CustomerModel = (await import('../models/Customer.js')).Customer;
    const customer = await CustomerModel.findOne({ id: customerId, shopId });
    if (!customer) return res.status(404).json({ error: 'Customer not found for your shop.' });

    const enable = Boolean(allowWhatsAppOffers);
    const newStatus = enable ? 'active' : 'withdrawn';

    const consentDoc = await ConsentRecord.findOneAndUpdate(
      { userId: customerId, shopId, purpose: 'marketing' },
      {
        id: `CNS-${Date.now()}`,
        userId: customerId,
        shopId,
        purpose: 'marketing',
        status: newStatus,
        consentedAt: enable ? new Date() : null,
        withdrawnAt: enable ? null : new Date(),
        noticeVersion: CURRENT_NOTICE_VERSION
      },
      { upsert: true, new: true }
    );

    await logPrivacyAudit(req, enable ? 'OFFER_PERMISSION_ENABLED' : 'OFFER_PERMISSION_DISABLED', 'CustomerConsent', customerId, {
      shopId,
      allowWhatsAppOffers: enable
    });

    res.json({
      success: true,
      customerId,
      allowWhatsAppOffers: enable,
      status: newStatus,
      consentRecord: consentDoc
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer offer permission.' });
  }
});

// ----------------------------------------------------------------------
// 5. GET /api/privacy/my-data — View Personal Data
// ----------------------------------------------------------------------
privacyRouter.get('/my-data', requireAuth, async (req, res) => {
  try {
    const userDoc = await User.findOne({ id: req.user.id }).lean();
    let shopDoc = null;
    if (req.user.shopId) {
      shopDoc = await Shop.findOne({ customId: req.user.shopId }).lean();
    }
    const consents = await ConsentRecord.find({ userId: req.user.id }).lean();

    await logPrivacyAudit(req, 'DATA_EXPORT_REQUESTED', 'User', req.user.id, { viewOnly: true });

    res.json({
      account: {
        userId: userDoc.id,
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        status: userDoc.status,
        createdAt: userDoc.createdAt
      },
      shop: shopDoc ? {
        shopId: shopDoc.customId,
        name: shopDoc.name,
        phone: shopDoc.phone,
        address: shopDoc.address,
        createdAt: shopDoc.createdAt
      } : null,
      consents: consents.map(c => ({
        purpose: c.purpose,
        status: c.status,
        noticeVersion: c.noticeVersion,
        consentedAt: c.consentedAt,
        withdrawnAt: c.withdrawnAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch personal data.' });
  }
});

// ----------------------------------------------------------------------
// 6. GET /api/privacy/export — Download Personal Data JSON
// ----------------------------------------------------------------------
privacyRouter.get('/export', requireAuth, async (req, res) => {
  try {
    const userDoc = await User.findOne({ id: req.user.id }).lean();
    let shopDoc = null;
    if (req.user.shopId) {
      shopDoc = await Shop.findOne({ customId: req.user.shopId }).lean();
    }
    const consents = await ConsentRecord.find({ userId: req.user.id }).lean();
    const requests = await PrivacyRequest.find({ userId: req.user.id }).lean();

    await logPrivacyAudit(req, 'DATA_EXPORT_COMPLETED', 'User', req.user.id, { exportType: 'JSON' });

    const exportPayload = {
      quickrExportMetadata: {
        exportedAt: new Date().toISOString(),
        noticeVersion: CURRENT_NOTICE_VERSION,
        dataSubjectId: req.user.id
      },
      userProfile: {
        id: userDoc.id,
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        createdAt: userDoc.createdAt
      },
      associatedShopProfile: shopDoc ? {
        customId: shopDoc.customId,
        name: shopDoc.name,
        phone: shopDoc.phone,
        address: shopDoc.address
      } : null,
      consentRecords: consents,
      submittedPrivacyRequests: requests
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=quickr-my-data-${req.user.id}.json`);
    res.send(JSON.stringify(exportPayload, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate personal data export.' });
  }
});

// ----------------------------------------------------------------------
// 7. POST /api/privacy/delete-account — Confirm & Anonymize / Delete Account
// ----------------------------------------------------------------------
privacyRouter.post('/delete-account', requireAuth, async (req, res) => {
  try {
    const { confirmationText } = req.body;
    if (!confirmationText || confirmationText.trim().toUpperCase() !== 'DELETE') {
      return res.status(400).json({ error: 'Confirmation text must equal "DELETE" to proceed.' });
    }

    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'System administrator accounts cannot be deleted directly via self-service. Contact super-admin.' });
    }

    await logPrivacyAudit(req, 'ACCOUNT_DELETION_REQUESTED', 'User', req.user.id);

    // Controlled Anonymization Strategy: disable user account, clear personal identifying information
    const userDoc = await User.findOne({ id: req.user.id });
    if (userDoc) {
      userDoc.status = 'disabled';
      userDoc.name = `Anonymized User (${userDoc.id})`;
      userDoc.email = `deleted_${Date.now()}_${userDoc.id}@anonymized.quickr`;
      await userDoc.save();
    }

    // Log deletion event
    await logPrivacyAudit(req, 'ACCOUNT_DELETED', 'User', req.user.id);

    // Clear auth cookie
    res.clearCookie('token');
    res.json({ success: true, message: 'Account successfully deactivated and personal data anonymized.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process account deletion.' });
  }
});

// ----------------------------------------------------------------------
// 8. GET & POST /api/privacy/requests — User Privacy Requests & Grievances
// ----------------------------------------------------------------------
privacyRouter.get('/requests', requireAuth, async (req, res) => {
  try {
    const list = await PrivacyRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch privacy requests.' });
  }
});

privacyRouter.post('/requests', requireAuth, async (req, res) => {
  try {
    const { requestType, description } = req.body;
    if (!requestType || !description || !description.trim()) {
      return res.status(400).json({ error: 'requestType and description are required.' });
    }

    const validTypes = ['access', 'correction', 'erasure', 'consent', 'grievance', 'other'];
    if (!validTypes.includes(requestType)) {
      return res.status(400).json({ error: `Invalid requestType. Must be one of: ${validTypes.join(', ')}` });
    }

    const reqDoc = await PrivacyRequest.create({
      id: `PRQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: req.user.id,
      shopId: req.user.shopId || 'SYSTEM',
      requestType,
      description: description.trim(),
      status: 'pending'
    });

    await logPrivacyAudit(req, 'PRIVACY_REQUEST_CREATED', 'PrivacyRequest', reqDoc.id, { requestType });

    res.json({ success: true, request: reqDoc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit privacy request.' });
  }
});

// ----------------------------------------------------------------------
// 9. ADMIN PRIVACY ROUTES
// ----------------------------------------------------------------------
privacyRouter.get('/admin/requests', requireAuth, requireAdmin, async (req, res) => {
  try {
    const list = await PrivacyRequest.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin privacy requests.' });
  }
});

privacyRouter.patch('/admin/requests/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const reqDoc = await PrivacyRequest.findOne({ id: req.params.id });
    if (!reqDoc) return res.status(404).json({ error: 'Privacy request not found.' });

    if (status) reqDoc.status = status;
    if (adminNotes !== undefined) reqDoc.adminNotes = adminNotes;
    if (status === 'completed' || status === 'rejected') reqDoc.resolvedAt = new Date();

    await reqDoc.save();

    await logPrivacyAudit(req, 'PRIVACY_REQUEST_UPDATED', 'PrivacyRequest', reqDoc.id, { status });

    res.json({ success: true, request: reqDoc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update privacy request.' });
  }
});

privacyRouter.get('/admin/audit-logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const logs = await PrivacyAuditLog.find().sort({ createdAt: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch privacy audit logs.' });
  }
});

privacyRouter.get('/admin/incidents', requireAuth, requireAdmin, async (req, res) => {
  try {
    const incidents = await SecurityIncident.find().sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch security incidents.' });
  }
});

privacyRouter.post('/admin/incidents', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { severity, description, affectedSystem, affectedDataCategories, containmentAction } = req.body;
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Incident description is required.' });
    }

    const incident = await SecurityIncident.create({
      id: `INC-${Date.now()}`,
      severity: severity || 'MEDIUM',
      status: 'open',
      description: description.trim(),
      affectedSystem: affectedSystem || 'QuickR Core Application',
      affectedDataCategories: affectedDataCategories || ['User Metadata'],
      containmentAction: containmentAction || ''
    });

    res.json({ success: true, incident });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record security incident.' });
  }
});
