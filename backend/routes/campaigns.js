import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { Campaign } from '../models/Campaign.js';
import { CampaignRecipient } from '../models/CampaignRecipient.js';
import { CampaignResponse } from '../models/CampaignResponse.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { ConsentRecord } from '../models/ConsentRecord.js';
import { Sale } from '../models/Sale.js';
import { Enquiry } from '../models/Enquiry.js';
import { FollowUp } from '../models/FollowUp.js';
import { getWhatsAppConfig, sendWhatsAppCloudMessage, sanitizePhoneNumber } from '../services/whatsapp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_UPLOADS_DIR = path.join(__dirname, '../uploads/temp_campaign_media');

// Ensure temporary storage directory exists
if (!fs.existsSync(TEMP_UPLOADS_DIR)) {
  fs.mkdirSync(TEMP_UPLOADS_DIR, { recursive: true });
}

export const campaignRouter = express.Router();

// Helper: Check if customer has explicit active marketing consent
const getMarketingConsentMap = async (customerIds, shopId) => {
  const consents = await ConsentRecord.find({
    userId: { $in: customerIds },
    purpose: 'marketing',
    status: 'active'
  }).lean();
  const consentUserSet = new Set(consents.map(c => c.userId));
  return consentUserSet;
};

// ----------------------------------------------------------------------
// 0. GET /api/campaigns/provider-status — WhatsApp Cloud API Connection Status
// ----------------------------------------------------------------------
campaignRouter.get('/provider-status', requireAuth, async (req, res) => {
  try {
    const config = getWhatsAppConfig();
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'quickr_offer_campaign';
    const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

    res.json({
      configured: config.configured,
      status: config.configured ? 'CONFIGURED' : 'NOT_CONFIGURED',
      provider: config.provider,
      mode: config.mode,
      version: config.version,
      phoneNumberId: config.phoneNumberId ? `${config.phoneNumberId.substring(0, 4)}••••` : '',
      templateName,
      templateLanguage
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch WhatsApp provider status.' });
  }
});

// ----------------------------------------------------------------------
// 1. GET /api/campaigns — List all campaigns for authenticated shop
// ----------------------------------------------------------------------
campaignRouter.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(400).json({ error: 'Admin dashboard operates in aggregate numbers-only mode.' });
    }
    const campaigns = await Campaign.find({ shopId: req.user.shopId }).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// ----------------------------------------------------------------------
// 1B. GET /api/campaigns/targeting-customers — Fetch Eligible Target Customers
// ----------------------------------------------------------------------
campaignRouter.get('/targeting-customers', requireAuth, async (req, res) => {
  try {
    const { filterType = 'all_eligible', productId } = req.query;
    const shopId = req.user.shopId;

    // Fetch all customers for this shop
    const customers = await Customer.find({ shopId }).sort({ name: 1 }).lean();
    const consentSet = await getMarketingConsentMap(customers.map(c => c.id), shopId);

    // Identify buyers/enquirers/followups if requested
    let targetCustomerIds = new Set();

    if (filterType === 'product_buyers' && productId) {
      const sales = await Sale.find({ shopId }).lean();
      sales.forEach(s => {
        if (Array.isArray(s.items) && s.items.some(i => i.productId === productId)) {
          if (s.customerId) targetCustomerIds.add(s.customerId);
        }
      });
    } else if (filterType === 'enquiry_customers') {
      const enquiries = await Enquiry.find({ shopId }).lean();
      enquiries.forEach(e => { if (e.customerId) targetCustomerIds.add(e.customerId); });
    } else if (filterType === 'followup_customers') {
      const followups = await FollowUp.find({ shopId }).lean();
      followups.forEach(f => { if (f.customerId) targetCustomerIds.add(f.customerId); });
    }

    // Process customer eligibility & masking
    const eligibleList = [];
    const ineligibleList = [];

    customers.forEach(c => {
      const hasPhone = Boolean(c.phone && c.phone.trim().length >= 10);
      const hasConsent = consentSet.has(c.id); // Phone number alone DOES NOT EQUAL marketing consent

      const maskedPhone = hasPhone
        ? `${c.phone.substring(0, 5)}•••••`
        : 'No Phone';

      const isEligible = hasPhone && hasConsent;

      // Filter check
      if (filterType !== 'all_eligible' && filterType !== 'custom_selected') {
        if (targetCustomerIds.size > 0 && !targetCustomerIds.has(c.id)) {
          return; // Skip customers outside targeting filter
        }
      }

      const formattedCust = {
        id: c.id,
        name: c.name,
        maskedPhone,
        hasPhone,
        hasConsent,
        isEligible,
        reason: !hasPhone ? 'No mobile phone number' : (!hasConsent ? 'No WhatsApp marketing consent' : 'Eligible')
      };

      if (isEligible) eligibleList.push(formattedCust);
      else ineligibleList.push(formattedCust);
    });

    res.json({
      success: true,
      eligibleCount: eligibleList.length,
      ineligibleCount: ineligibleList.length,
      eligibleCustomers: eligibleList,
      ineligibleCustomers: ineligibleList
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch targeting customers.' });
  }
});

// ----------------------------------------------------------------------
// 2. GET /api/campaigns/:id — Retrieve single campaign details
// ----------------------------------------------------------------------
campaignRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ id: req.params.id, shopId: req.user.shopId });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaign details' });
  }
});

// ----------------------------------------------------------------------
// 3. POST /api/campaigns/upload-media — Temporary Campaign Media Upload
// Custom binary parser without external dependencies (Image: JPG, PNG, WEBP <= 10MB; Video: MP4 <= 25MB)
// ----------------------------------------------------------------------
campaignRouter.post('/upload-media', requireAuth, express.raw({ type: '*/*', limit: '30mb' }), async (req, res) => {
  try {
    const mediaTypeHeader = req.headers['x-media-type'] || 'image';
    const originalFileName = req.headers['x-file-name'] || 'campaign_media';
    const contentType = req.headers['content-type'] || '';

    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedVideoTypes = ['video/mp4'];

    let isImage = allowedImageTypes.includes(contentType.toLowerCase()) || mediaTypeHeader === 'image';
    let isVideo = allowedVideoTypes.includes(contentType.toLowerCase()) || mediaTypeHeader === 'video';

    if (!isImage && !isVideo) {
      // Check file extension
      const ext = path.extname(originalFileName).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) isImage = true;
      else if (['.mp4'].includes(ext)) isVideo = true;
    }

    if (!isImage && !isVideo) {
      return res.status(400).json({ error: 'Unsupported file type. Only JPG, PNG, WEBP images and MP4 videos are allowed.' });
    }

    const fileSize = req.body?.length || 0;
    const maxImgSize = 10 * 1024 * 1024;  // 10MB
    const maxVidSize = 25 * 1024 * 1024;  // 25MB

    if (isImage && fileSize > maxImgSize) {
      return res.status(400).json({ error: 'Image file size exceeds allowed 10MB limit.' });
    }
    if (isVideo && fileSize > maxVidSize) {
      return res.status(400).json({ error: 'Video file size exceeds allowed 25MB limit.' });
    }

    const fileExt = isVideo ? '.mp4' : (path.extname(originalFileName) || '.jpg');
    const tempFileName = `temp_${req.user.shopId}_${Date.now()}_${Math.floor(Math.random() * 10000)}${fileExt}`;
    const filePath = path.join(TEMP_UPLOADS_DIR, tempFileName);

    await fs.promises.writeFile(filePath, req.body);

    const temporaryMediaReference = `/api/campaigns/media/${tempFileName}`;

    res.json({
      success: true,
      mediaType: isVideo ? 'video' : 'image',
      temporaryMediaReference,
      fileName: tempFileName,
      originalName: originalFileName
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload temporary campaign media.' });
  }
});

// ----------------------------------------------------------------------
// 4. GET /api/campaigns/media/:filename — Serve Temporary Campaign Media
// ----------------------------------------------------------------------
campaignRouter.get('/media/:filename', requireAuth, async (req, res) => {
  try {
    const filename = req.params.filename;
    // Security check: ensure file name starts with shopId context or belongs to temp storage
    if (!filename.startsWith(`temp_${req.user.shopId}_`) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to campaign media.' });
    }

    const filePath = path.join(TEMP_UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Campaign media file not found or expired.' });
    }

    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve media file.' });
  }
});

// ----------------------------------------------------------------------
// 6. POST /api/campaigns — Create / Save Offer Campaign
// ----------------------------------------------------------------------
campaignRouter.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      discountType,
      discountValue,
      productIds,
      startDate,
      endDate,
      mediaType,
      temporaryMediaReference,
      selectedCustomerIds,
      targetAudienceType,
      campaignCost,
      status
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Offer title is required.' });
    }
    if (!discountType || !['Percentage', 'Fixed Amount'].includes(discountType)) {
      return res.status(400).json({ error: 'Valid discountType (Percentage or Fixed Amount) is required.' });
    }
    const val = Number(discountValue);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ error: 'Discount value must be a positive number.' });
    }
    if (discountType === 'Percentage' && val > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100%.' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required.' });
    }
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end date.' });
    }
    if (eDate < sDate) {
      return res.status(400).json({ error: 'End date cannot be before start date.' });
    }

    // Verify selected products belong to shop
    let validProductIds = [];
    if (Array.isArray(productIds) && productIds.length > 0) {
      const prods = await Product.find({ id: { $in: productIds }, shopId: req.user.shopId });
      validProductIds = prods.map(p => p.id);
    }

    const campaignId = `CMP-${Date.now()}`;

    const newCampaign = new Campaign({
      id: campaignId,
      title: title.trim(),
      description: description ? description.trim() : '',
      discountType,
      discountValue: val,
      productIds: validProductIds,
      startDate: sDate,
      endDate: eDate,
      mediaType: mediaType || 'none',
      temporaryMediaReference: temporaryMediaReference || '',
      selectedCustomerIds: Array.isArray(selectedCustomerIds) ? selectedCustomerIds : [],
      targetAudienceType: targetAudienceType || 'all_eligible',
      eligibleCustomerCount: Array.isArray(selectedCustomerIds) ? selectedCustomerIds.length : 0,
      campaignCost: Number(campaignCost) > 0 ? Number(campaignCost) : 0,
      status: status || 'READY',
      createdBy: req.user.id,
      shopId: req.user.shopId
    });

    await newCampaign.save();

    res.status(201).json({ success: true, campaign: newCampaign });
  } catch (err) {
    res.status(500).json({ error: `Failed to create offer campaign: ${err.message}` });
  }
});

// ----------------------------------------------------------------------
// 7. GET /api/campaigns/:id/recipients — Retrieve recipient logs for campaign
// ----------------------------------------------------------------------
campaignRouter.get('/:id/recipients', requireAuth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ id: req.params.id, shopId: req.user.shopId });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const recipients = await CampaignRecipient.find({ campaignId: req.params.id, shopId: req.user.shopId }).lean();
    res.json(recipients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaign recipients.' });
  }
});

// ----------------------------------------------------------------------
// 8. POST /api/campaigns/:id/send — Official WhatsApp Campaign Send Process
// ----------------------------------------------------------------------
campaignRouter.post('/:id/send', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const campaign = await Campaign.findOne({ id: req.params.id, shopId });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found for your shop.' });
    }

    if (campaign.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Campaign has already been completed and sent.' });
    }

    const config = getWhatsAppConfig();
    const allowTestSend = req.headers['x-allow-test-send'] === 'true' || process.env.DEV_ALLOW_MOCK_SEND === 'true';

    // Check WhatsApp provider configuration
    if (!config.configured && !allowTestSend) {
      return res.status(400).json({
        error: 'Official Meta WhatsApp Business Cloud API credentials are not configured. Please configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment variables.',
        configured: false,
        status: 'NOT_CONFIGURED'
      });
    }

    // Set campaign status to SENDING
    campaign.status = 'SENDING';
    await campaign.save();

    // Server-side Recalculation & Re-validation of Target Customers
    const targetCustomerIds = campaign.selectedCustomerIds || [];
    const targetCustomers = await Customer.find({ id: { $in: targetCustomerIds }, shopId }).lean();
    const consentSet = await getMarketingConsentMap(targetCustomers.map(c => c.id), shopId);

    // Fetch products & shop info for template variables
    let prodName = 'Special Products';
    if (campaign.productIds && campaign.productIds.length > 0) {
      const prods = await Product.find({ id: { $in: campaign.productIds }, shopId }).lean();
      if (prods.length > 0) prodName = prods.map(p => p.name).join(', ');
    }

    const discountFormatted = campaign.discountType === 'Percentage' ? `${campaign.discountValue}%` : `₹${campaign.discountValue}`;

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Process recipients in controlled batches
    for (const cust of targetCustomers) {
      const hasPhone = Boolean(cust.phone && cust.phone.trim().length >= 10);
      const hasConsent = consentSet.has(cust.id);

      // Check idempotency: avoid sending duplicate messages to recipients already marked SENT
      let recipientDoc = await CampaignRecipient.findOne({ campaignId: campaign.id, shopId, customerId: cust.id });
      if (!recipientDoc) {
        recipientDoc = new CampaignRecipient({
          id: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          campaignId: campaign.id,
          shopId,
          customerId: cust.id,
          phone: cust.phone || '',
          status: 'PENDING'
        });
      }

      if (recipientDoc.status === 'SENT') {
        sentCount++;
        continue; // Skip previously sent recipients for retry safety
      }

      if (!hasPhone || !hasConsent) {
        recipientDoc.status = 'SKIPPED';
        recipientDoc.errorCode = 'NO_CONSENT_OR_PHONE';
        recipientDoc.errorMessage = !hasPhone ? 'Missing mobile phone' : 'Missing active marketing consent';
        await recipientDoc.save();
        skippedCount++;
        continue;
      }

      // Build official WhatsApp Cloud API message template format
      const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'quickr_offer_campaign';
      const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

      const textBody = `🎉 Special Offer from QuickR Shop!\n\nHi ${cust.name},\n\nGet ${discountFormatted} OFF on ${prodName}!\n\nOffer valid from ${new Date(campaign.startDate).toLocaleDateString('en-IN')} until ${new Date(campaign.endDate).toLocaleDateString('en-IN')}.`;

      try {
        const sendResult = await sendWhatsAppCloudMessage(cust.phone, textBody);
        
        if (sendResult.success) {
          recipientDoc.status = 'SENT';
          recipientDoc.providerMessageId = sendResult.providerMessageId || `WA-MSG-${Date.now()}`;
          recipientDoc.sentAt = new Date();
          await recipientDoc.save();
          sentCount++;
        } else {
          recipientDoc.status = 'FAILED';
          recipientDoc.errorCode = sendResult.errorCode || 'SEND_ERROR';
          recipientDoc.errorMessage = sendResult.errorMessage || 'WhatsApp API request failed';
          await recipientDoc.save();
          failedCount++;
        }
      } catch (sendErr) {
        recipientDoc.status = 'FAILED';
        recipientDoc.errorCode = 'API_EXCEPTION';
        recipientDoc.errorMessage = sendErr.message || 'Meta API error';
        await recipientDoc.save();
        failedCount++;
      }
    }

    // Determine final campaign state
    let finalStatus = 'COMPLETED';
    if (failedCount > 0 && sentCount > 0) {
      finalStatus = 'PARTIALLY_COMPLETED';
    } else if (failedCount > 0 && sentCount === 0) {
      finalStatus = 'FAILED';
    }

    campaign.status = finalStatus;
    await campaign.save();

    res.json({
      success: true,
      campaignId: campaign.id,
      status: finalStatus,
      summary: {
        total: targetCustomers.length,
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: `Campaign send process failed: ${err.message}` });
  }
});

// ----------------------------------------------------------------------
// 9. GET /api/campaigns/:id/manual-targets — Get target customers with generated deep-links
// ----------------------------------------------------------------------
campaignRouter.get('/:id/manual-targets', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const campaign = await Campaign.findOne({ id: req.params.id, shopId });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found for your shop.' });

    // Fetch shop info for {{ShopName}}
    const ShopModel = (await import('../models/Shop.js')).Shop;
    const shopDoc = await ShopModel.findOne({ customId: shopId });
    const shopName = shopDoc ? shopDoc.name : 'QuickR Shop';

    // Fetch product info
    let prodName = 'Special Offer Products';
    if (campaign.productIds && campaign.productIds.length > 0) {
      const prods = await Product.find({ id: { $in: campaign.productIds }, shopId }).lean();
      if (prods.length > 0) prodName = prods.map(p => p.name).join(', ');
    }

    const discountFormatted = campaign.discountType === 'Percentage' ? `${campaign.discountValue}%` : `₹${campaign.discountValue}`;
    const startDateFormatted = new Date(campaign.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const endDateFormatted = new Date(campaign.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    // Server-side customer re-validation & marketing consent check
    const targetCustomerIds = campaign.selectedCustomerIds || [];
    const targetCustomers = await Customer.find({ id: { $in: targetCustomerIds }, shopId }).sort({ name: 1 }).lean();
    const consentSet = await getMarketingConsentMap(targetCustomers.map(c => c.id), shopId);

    // Fetch existing recipient docs for status
    const recipientDocs = await CampaignRecipient.find({ campaignId: campaign.id, shopId }).lean();
    const recipientMap = new Map(recipientDocs.map(r => [r.customerId, r]));

    const manualTargets = [];

    for (const cust of targetCustomers) {
      const hasPhone = Boolean(cust.phone && cust.phone.trim().length >= 10);
      const hasConsent = consentSet.has(cust.id);

      if (!hasPhone || !hasConsent) continue; // Skip ineligible customers (no phone or consent withdrawn/missing)

      const cleanPhone = sanitizePhoneNumber(cust.phone);
      const rDoc = recipientMap.get(cust.id);
      const currentStatus = rDoc ? rDoc.status : 'PENDING';

      // Personalized message generation
      const messageText = `Hi ${cust.name}! 👋\n\n${shopName} has a special offer for you.\n\n🎉 ${campaign.title}\nGet ${discountFormatted} OFF on ${prodName}.\n\nOffer valid from ${startDateFormatted} until ${endDateFormatted}.\n\nVisit us to claim the offer!`;
      const encodedText = encodeURIComponent(messageText);
      const waDeepLink = `https://wa.me/${cleanPhone}?text=${encodedText}`;

      manualTargets.push({
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        maskedPhone: `${cust.phone.substring(0, 5)}•••••`,
        status: currentStatus,
        personalizedMessage: messageText,
        waDeepLink
      });
    }

    res.json({
      success: true,
      campaignId: campaign.id,
      totalTargets: manualTargets.length,
      targets: manualTargets
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch manual targets: ${err.message}` });
  }
});

// ----------------------------------------------------------------------
// 10. POST /api/campaigns/:id/mark-manual-sent — Mark recipient as MANUAL_SENT
// ----------------------------------------------------------------------
campaignRouter.post('/:id/mark-manual-sent', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { customerId } = req.body;

    if (!customerId) return res.status(400).json({ error: 'customerId is required.' });

    const campaign = await Campaign.findOne({ id: req.params.id, shopId });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found for your shop.' });

    const customer = await Customer.findOne({ id: customerId, shopId });
    if (!customer) return res.status(404).json({ error: 'Customer not found for your shop.' });

    let recipientDoc = await CampaignRecipient.findOne({ campaignId: campaign.id, shopId, customerId });
    if (!recipientDoc) {
      recipientDoc = new CampaignRecipient({
        id: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        campaignId: campaign.id,
        shopId,
        customerId,
        phone: customer.phone || '',
        status: 'MANUAL_SENT',
        sendingMethod: 'MANUAL_WHATSAPP',
        sentAt: new Date()
      });
    } else {
      recipientDoc.status = 'MANUAL_SENT';
      recipientDoc.sendingMethod = 'MANUAL_WHATSAPP';
      recipientDoc.sentAt = new Date();
    }

    await recipientDoc.save();

    res.json({ success: true, recipient: recipientDoc });
  } catch (err) {
    res.status(500).json({ error: `Failed to mark manual recipient sent: ${err.message}` });
  }
});

// ----------------------------------------------------------------------
// 10B. POST /api/campaigns/:id/skip-recipient — Mark recipient as SKIPPED
// ----------------------------------------------------------------------
campaignRouter.post('/:id/skip-recipient', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { customerId } = req.body;

    if (!customerId) return res.status(400).json({ error: 'customerId is required.' });

    const campaign = await Campaign.findOne({ id: req.params.id, shopId });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found for your shop.' });

    const customer = await Customer.findOne({ id: customerId, shopId });
    if (!customer) return res.status(404).json({ error: 'Customer not found for your shop.' });

    let recipientDoc = await CampaignRecipient.findOne({ campaignId: campaign.id, shopId, customerId });
    if (!recipientDoc) {
      recipientDoc = new CampaignRecipient({
        id: `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        campaignId: campaign.id,
        shopId,
        customerId,
        phone: customer.phone || '',
        status: 'SKIPPED',
        sendingMethod: 'MANUAL_WHATSAPP'
      });
    } else {
      recipientDoc.status = 'SKIPPED';
    }

    await recipientDoc.save();

    res.json({ success: true, recipient: recipientDoc });
  } catch (err) {
    res.status(500).json({ error: `Failed to skip recipient: ${err.message}` });
  }
});

// ----------------------------------------------------------------------
// 11. POST /api/campaigns/:id/record-response — Record owner-confirmed customer campaign response
// Connects Campaign -> Customer Response -> Enquiry -> Follow-up / Billing
// ----------------------------------------------------------------------
campaignRouter.post('/:id/record-response', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const campaignId = req.params.id;
    const { customerId, responseType, notes, scheduledFollowUpDate, followUpNotes } = req.body;

    if (!customerId || !responseType) {
      return res.status(400).json({ error: 'customerId and responseType are required.' });
    }

    const validResponses = ['INTERESTED', 'MORE_INFORMATION', 'VISIT_SHOP', 'NOT_INTERESTED', 'PURCHASED', 'NO_RESPONSE'];
    if (!validResponses.includes(responseType)) {
      return res.status(400).json({ error: 'Invalid responseType.' });
    }

    // Verify campaign & customer belong to authenticated shop
    const campaign = await Campaign.findOne({ id: campaignId, shopId });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found for your shop.' });

    const customer = await Customer.findOne({ id: customerId, shopId });
    if (!customer) return res.status(404).json({ error: 'Customer not found for your shop.' });

    // Find recipient doc if exists
    const recipient = await CampaignRecipient.findOne({ campaignId, shopId, customerId });
    const recipientId = recipient ? recipient.id : '';

    let enquiryId = '';
    let followUpId = '';

    // Create or update Enquiry for INTERESTED, MORE_INFORMATION, VISIT_SHOP
    if (['INTERESTED', 'MORE_INFORMATION', 'VISIT_SHOP'].includes(responseType)) {
      let productId = campaign.productIds && campaign.productIds.length > 0 ? campaign.productIds[0] : '';
      let prodDoc = null;
      if (productId) {
        prodDoc = await Product.findOne({ id: productId, shopId });
      }

      // Check if enquiry already exists for this campaign + customer to prevent duplicates
      let enquiry = await Enquiry.findOne({ shopId, customerId, campaignId });
      if (!enquiry) {
        const count = await Enquiry.countDocuments({ shopId });
        enquiry = new Enquiry({
          id: `ENQ-${count + 101}`,
          customerId,
          productId: productId || 'GENERAL',
          productName: prodDoc ? prodDoc.name : campaign.title,
          productCategory: prodDoc ? prodDoc.category : 'Promotional Offer',
          priceAtEnquiry: prodDoc ? prodDoc.sellingPrice : campaign.discountValue,
          size: 'Standard',
          color: 'Standard',
          quantity: 1,
          interest: responseType === 'INTERESTED' ? 'Very Interested' : 'Interested',
          purchaseStatus: 'Pending',
          notes: notes || `Responded to campaign: ${campaign.title} (${responseType})`,
          campaignId,
          source: 'whatsapp_campaign',
          shopId
        });
        await enquiry.save();
      }
      enquiryId = enquiry.id;

      // Create FollowUp if requested or for MORE_INFORMATION / VISIT_SHOP
      if (scheduledFollowUpDate || ['MORE_INFORMATION', 'VISIT_SHOP'].includes(responseType)) {
        let existingFollowUp = await FollowUp.findOne({ shopId, customerId, enquiryId: enquiry.id });
        if (!existingFollowUp) {
          const fuCount = await FollowUp.countDocuments({ shopId });
          const dueDate = scheduledFollowUpDate ? new Date(scheduledFollowUpDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
          existingFollowUp = new FollowUp({
            id: `FW-${fuCount + 101}`,
            customerId,
            enquiryId: enquiry.id,
            reason: followUpNotes || `Campaign follow-up: ${campaign.title} (${responseType})`,
            scheduledAt: dueDate,
            status: 'ready',
            message: `Hi ${customer.name}, following up on our offer: ${campaign.title}`,
            priority: responseType === 'VISIT_SHOP' ? 'High' : 'Medium',
            campaignId,
            shopId
          });
          await existingFollowUp.save();
        }
        followUpId = existingFollowUp.id;
      }
    }

    // Upsert CampaignResponse (Duplicate Protection)
    let campResponse = await CampaignResponse.findOne({ shopId, campaignId, customerId });
    if (!campResponse) {
      campResponse = new CampaignResponse({
        id: `CMP-RESP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        shopId,
        campaignId,
        customerId,
        campaignRecipientId: recipientId,
        responseType,
        notes: notes || '',
        enquiryId,
        followUpId,
        createdBy: req.user.id
      });
    } else {
      campResponse.responseType = responseType;
      campResponse.notes = notes || campResponse.notes;
      if (enquiryId) campResponse.enquiryId = enquiryId;
      if (followUpId) campResponse.followUpId = followUpId;
    }

    await campResponse.save();

    res.json({
      success: true,
      campaignResponse: campResponse,
      enquiryId,
      followUpId
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to record campaign response: ${err.message}` });
  }
});

// ----------------------------------------------------------------------
// 12. GET /api/campaigns/:id/responses — Campaign Response Statistics & Summary
// ----------------------------------------------------------------------
campaignRouter.get('/:id/responses', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const campaign = await Campaign.findOne({ id: req.params.id, shopId });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found for your shop.' });

    const responses = await CampaignResponse.find({ campaignId: req.params.id, shopId }).lean();
    const summary = {
      INTERESTED: 0,
      MORE_INFORMATION: 0,
      VISIT_SHOP: 0,
      NOT_INTERESTED: 0,
      PURCHASED: 0,
      NO_RESPONSE: 0
    };

    responses.forEach(r => {
      if (summary[r.responseType] !== undefined) {
        summary[r.responseType]++;
      }
    });

    res.json({
      success: true,
      totalResponses: responses.length,
      summary,
      responses
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch campaign responses: ${err.message}` });
  }
});

// ----------------------------------------------------------------------
// 13. GET /api/campaigns/customer/:customerId/history — Customer Campaign History Timeline
// ----------------------------------------------------------------------
campaignRouter.get('/customer/:customerId/history', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const customerId = req.params.customerId;

    const customer = await Customer.findOne({ id: customerId, shopId });
    if (!customer) return res.status(404).json({ error: 'Customer not found for your shop.' });

    const recipients = await CampaignRecipient.find({ customerId, shopId }).sort({ createdAt: -1 }).lean();
    const responses = await CampaignResponse.find({ customerId, shopId }).lean();
    const responseMap = new Map(responses.map(r => [r.campaignId, r]));

    const campaignIds = recipients.map(r => r.campaignId);
    const campaigns = await Campaign.find({ id: { $in: campaignIds }, shopId }).lean();
    const campaignMap = new Map(campaigns.map(c => [c.id, c]));

    const history = recipients.map(r => {
      const camp = campaignMap.get(r.campaignId);
      const resp = responseMap.get(r.campaignId);
      return {
        campaignId: r.campaignId,
        campaignTitle: camp ? camp.title : 'Campaign',
        discount: camp ? (camp.discountType === 'Percentage' ? `${camp.discountValue}% OFF` : `₹${camp.discountValue} OFF`) : '',
        sentStatus: r.status,
        sendingMethod: r.sendingMethod,
        sentAt: r.sentAt || r.createdAt,
        responseType: resp ? resp.responseType : 'NO_RESPONSE',
        responseNotes: resp ? resp.notes : '',
        respondedAt: resp ? resp.updatedAt : null
      };
    });

    res.json({
      success: true,
      customerId,
      history
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch customer campaign history: ${err.message}` });
  }
});

// ----------------------------------------------------------------------
// 14. GET /api/campaigns/:id/analytics — Comprehensive Campaign Analytics & ROI
// ----------------------------------------------------------------------
campaignRouter.get('/:id/analytics', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const campaignId = req.params.id;

    const campaign = await Campaign.findOne({ id: campaignId, shopId }).lean();
    if (!campaign) return res.status(404).json({ error: 'Campaign not found for your shop.' });

    // Fetch Recipient stats
    const recipients = await CampaignRecipient.find({ campaignId, shopId }).lean();
    
    let manualSentCustomers = 0;
    let apiSentCustomers = 0;
    let skippedCustomers = 0;
    let failedCustomers = 0;

    recipients.forEach(r => {
      if (r.status === 'MANUAL_SENT') {
        manualSentCustomers++;
      } else if (r.status === 'SENT') {
        apiSentCustomers++;
      } else if (r.status === 'SKIPPED') {
        skippedCustomers++;
      } else if (r.status === 'FAILED') {
        failedCustomers++;
      }
    });

    const sentCustomers = manualSentCustomers + apiSentCustomers;
    const targetedCustomers = campaign.selectedCustomerIds ? campaign.selectedCustomerIds.length : (recipients.length || campaign.eligibleCustomerCount || 0);

    // Fetch CampaignResponse stats
    const responses = await CampaignResponse.find({ campaignId, shopId }).lean();
    
    let interestedCount = 0;
    let moreInformationCount = 0;
    let visitShopCount = 0;
    let notInterestedCount = 0;
    let noResponseCount = 0;
    let purchasedResponseCount = 0;

    responses.forEach(r => {
      if (r.responseType === 'INTERESTED') interestedCount++;
      else if (r.responseType === 'MORE_INFORMATION') moreInformationCount++;
      else if (r.responseType === 'VISIT_SHOP') visitShopCount++;
      else if (r.responseType === 'NOT_INTERESTED') notInterestedCount++;
      else if (r.responseType === 'NO_RESPONSE') noResponseCount++;
      else if (r.responseType === 'PURCHASED') purchasedResponseCount++;
    });

    // Exclude NO_RESPONSE from positive/engaged response count
    const responseCount = interestedCount + moreInformationCount + visitShopCount + notInterestedCount + purchasedResponseCount;

    // Fetch Actual Campaign-Attributed Sales
    const sales = await Sale.find({ shopId, campaignId, saleSource: 'campaign' }).lean();
    const salesCount = sales.length;
    const revenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    // Rates calculation
    const responseRate = sentCustomers > 0 ? Number(((responseCount / sentCustomers) * 100).toFixed(1)) : 0;
    const purchaseRate = sentCustomers > 0 ? Number(((salesCount / sentCustomers) * 100).toFixed(1)) : 0;
    const averageSaleValue = salesCount > 0 ? Number((revenue / salesCount).toFixed(2)) : 0;

    // ROI calculation
    const campaignCost = campaign.campaignCost || 0;
    let roi = null;
    if (campaignCost > 0) {
      roi = Number((((revenue - campaignCost) / campaignCost) * 100).toFixed(1));
    }

    res.json({
      success: true,
      analytics: {
        campaignId,
        title: campaign.title,
        status: campaign.status,
        discount: campaign.discountType === 'Percentage' ? `${campaign.discountValue}% OFF` : `₹${campaign.discountValue} OFF`,
        targetedCustomers,
        sentCustomers,
        manualSentCustomers,
        apiSentCustomers,
        skippedCustomers,
        failedCustomers,
        responseCount,
        interestedCount,
        moreInformationCount,
        visitShopCount,
        notInterestedCount,
        noResponseCount,
        purchasedResponseCount,
        salesCount,
        revenue,
        responseRate,
        purchaseRate,
        averageSaleValue,
        campaignCost,
        roi
      }
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch campaign analytics: ${err.message}` });
  }
});

// ----------------------------------------------------------------------
// 15. GET /api/campaigns/analytics/summary — Lightweight Aggregate Summaries for Campaign Cards
// ----------------------------------------------------------------------
campaignRouter.get('/analytics/summary', requireAuth, async (req, res) => {
  try {
    const shopId = req.user.shopId;

    const campaigns = await Campaign.find({ shopId }).sort({ createdAt: -1 }).lean();
    if (campaigns.length === 0) {
      return res.json({ success: true, summaries: [] });
    }

    const campaignIds = campaigns.map(c => c.id);

    const [recipients, responses, sales] = await Promise.all([
      CampaignRecipient.find({ shopId, campaignId: { $in: campaignIds }, status: { $in: ['SENT', 'MANUAL_SENT'] } }).lean(),
      CampaignResponse.find({ shopId, campaignId: { $in: campaignIds }, responseType: { $ne: 'NO_RESPONSE' } }).lean(),
      Sale.find({ shopId, campaignId: { $in: campaignIds }, saleSource: 'campaign' }).lean()
    ]);

    const sentMap = new Map();
    recipients.forEach(r => {
      sentMap.set(r.campaignId, (sentMap.get(r.campaignId) || 0) + 1);
    });

    const responseMap = new Map();
    responses.forEach(r => {
      responseMap.set(r.campaignId, (responseMap.get(r.campaignId) || 0) + 1);
    });

    const salesMap = new Map();
    const revenueMap = new Map();
    sales.forEach(s => {
      salesMap.set(s.campaignId, (salesMap.get(s.campaignId) || 0) + 1);
      revenueMap.set(s.campaignId, (revenueMap.get(s.campaignId) || 0) + (s.totalAmount || 0));
    });

    const summaries = campaigns.map(c => ({
      campaignId: c.id,
      title: c.title,
      status: c.status,
      discount: c.discountType === 'Percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`,
      sentCustomers: sentMap.get(c.id) || 0,
      responseCount: responseMap.get(c.id) || 0,
      salesCount: salesMap.get(c.id) || 0,
      revenue: revenueMap.get(c.id) || 0
    }));

    res.json({ success: true, summaries });
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch campaign analytics summary: ${err.message}` });
  }
});
