import express from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { Customer } from '../models/Customer.js';
import { Message } from '../models/Message.js';
import { FollowUp } from '../models/FollowUp.js';
import { Activity } from '../models/Activity.js';
import { getWhatsAppConfig, sendWhatsAppCloudMessage } from '../services/whatsapp.js';

export const whatsappRouter = express.Router();

// GET /api/whatsapp/status - Returns safe connection status (never secret credentials)
whatsappRouter.get('/status', requireAuth, (req, res) => {
  const config = getWhatsAppConfig();
  res.json({
    configured: config.configured,
    provider: config.provider,
    mode: config.mode,
    version: config.version,
    phoneNumberId: config.phoneNumberId ? `${config.phoneNumberId.substring(0, 4)}***` : ''
  });
});

// POST /api/whatsapp/send - Direct WhatsApp message dispatch endpoint with shop isolation & mock fallback
whatsappRouter.post('/send', requireAuth, async (req, res) => {
  try {
    const { customerId, message, followUpId } = req.body;
    const shopId = req.user.shopId;

    if (!customerId || !message || !message.trim()) {
      return res.status(400).json({ error: 'customerId and non-empty message content are required' });
    }

    // Verify customer belongs strictly to authenticated user's shop
    const customer = await Customer.findOne({ id: customerId, shopId });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found or does not belong to your shop account' });
    }

    // Attempt WhatsApp Cloud API dispatch (falls back to mock if credentials missing)
    const result = await sendWhatsAppCloudMessage(customer.phone, message.trim());

    // Record Message entry in MongoDB with shop isolation
    const msgId = `MSG-${Date.now()}`;
    const newMsg = new Message({
      id: msgId,
      customerId: customer.id,
      followUpId: followUpId || '',
      channel: 'whatsapp',
      content: message.trim(),
      status: result.status,
      provider: result.provider,
      providerMessageId: result.providerMessageId || '',
      error: result.error || '',
      sentAt: new Date(),
      shopId
    });
    await newMsg.save();

    // Log Activity
    await Activity.create({
      id: `ACT-${Date.now()}`,
      customerId: customer.id,
      type: 'message_sent',
      description: `WhatsApp message (${result.provider}): "${message.substring(0, 30)}..."`,
      metadata: { channel: 'whatsapp', messageId: msgId, provider: result.provider, status: result.status },
      shopId
    });

    // If linked to a FollowUp, update follow-up status
    if (followUpId) {
      await FollowUp.findOneAndUpdate(
        { id: followUpId, shopId },
        { status: 'sent', message: message.trim(), messageId: msgId }
      );
    }

    res.json({
      success: result.success,
      status: result.status,
      provider: result.provider,
      messageId: msgId,
      providerMessageId: result.providerMessageId,
      message: newMsg,
      error: result.error
    });

  } catch (err) {
    console.error('WhatsApp send endpoint error:', err);
    res.status(500).json({ error: `Failed to send WhatsApp message: ${err.message}` });
  }
});

// GET /api/whatsapp/webhook - Meta Graph API Webhook Challenge Verification
whatsappRouter.get('/webhook', (req, res) => {
  const config = getWhatsAppConfig();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && challenge) {
    if (mode === 'subscribe' && (token === config._verifyToken || (!config._verifyToken && !token))) {
      console.log('✅ WhatsApp Webhook verified successfully');
      return res.status(200).send(challenge);
    } else {
      console.warn('⚠️ WhatsApp Webhook verification failed: Invalid verify token');
      return res.status(403).json({ error: 'Webhook verification failed: Invalid verify token' });
    }
  }
  res.status(400).json({ error: 'Invalid webhook request parameters' });
});

// POST /api/whatsapp/webhook - Incoming Meta Status Updates (sent, delivered, read, failed)
whatsappRouter.post('/webhook', async (req, res) => {
  try {
    const config = getWhatsAppConfig();

    // Validate Signature if APP_SECRET is set
    if (config._appSecret && req.headers['x-hub-signature-256']) {
      const signature = req.headers['x-hub-signature-256'];
      const rawBody = JSON.stringify(req.body);
      const expectedSignature = 'sha256=' + crypto.createHmac('sha256', config._appSecret).update(rawBody).digest('hex');
      
      if (signature !== expectedSignature) {
        console.warn('⚠️ WhatsApp Webhook signature mismatch');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};
          const statuses = value.statuses || [];
          
          for (const statusObj of statuses) {
            const providerMessageId = statusObj.id;
            const newStatus = statusObj.status; // 'sent', 'delivered', 'read', 'failed'

            if (providerMessageId && ['sent', 'delivered', 'read', 'failed'].includes(newStatus)) {
              const matchingMsg = await Message.findOne({ providerMessageId });
              if (matchingMsg) {
                matchingMsg.status = newStatus;
                if (statusObj.errors && statusObj.errors.length > 0) {
                  matchingMsg.error = statusObj.errors[0].title || 'Delivery failed';
                }
                await matchingMsg.save();
                console.log(`[WHATSAPP WEBHOOK] Message ${matchingMsg.id} (${providerMessageId}) status updated to: ${newStatus}`);
              }
            }
          }
        }
      }
      return res.status(200).send('EVENT_RECEIVED');
    }

    res.status(404).send('Not a WhatsApp event');
  } catch (err) {
    console.error('WhatsApp webhook processing error:', err);
    // Always return 200 to Meta webhooks to avoid server retry floods
    res.status(200).send('EVENT_PROCESSED_WITH_ERRORS');
  }
});
