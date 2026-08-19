import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { Shop } from '../models/Shop.js';
import { Customer } from '../models/Customer.js';
import { Enquiry } from '../models/Enquiry.js';
import { FollowUp } from '../models/FollowUp.js';
import { Sale } from '../models/Sale.js';

const router = express.Router();

// Protected endpoint: POST /api/ai/followup-message
router.post('/followup-message', requireAuth, async (req, res) => {
  try {
    const {
      customerName,
      productName,
      interest,
      purchaseStatus,
      followUpReason
    } = req.body || {};

    const prompt = `You are a WhatsApp follow-up assistant for a clothing shop.

Generate ONE short, natural WhatsApp follow-up message.

Customer: ${customerName || 'Valued Customer'}
Product: ${productName || 'N/A'}
Interest: ${interest || 'N/A'}
Purchase status: ${purchaseStatus || 'N/A'}
Follow-up reason: ${followUpReason || 'N/A'}

Rules:
- Maximum 40 words.
- Friendly and professional.
- Use the customer's name.
- Mention the product when available.
- Do not invent discounts, offers, stock, availability, delivery dates, product details, or promises.
- Do not use bullet points.
- Do not pressure the customer.
- Return ONLY the WhatsApp message.
- Do not return explanations.
- Do not return JSON.
- Do not expose reasoning or thinking.`;

    console.log('[AI Route] Sending request to Ollama...');

    const controller = new AbortController();

    // Allow local Qwen enough time to generate
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 120000);

    let ollamaRes;

    try {
      ollamaRes = await fetch(
        'http://127.0.0.1:11434/api/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'qwen3:4b-instruct',
            prompt,
            stream: false,
            think: false,
            options: {
              num_predict: 100,
              temperature: 0.7
            }
          }),
          signal: controller.signal
        }
      );
    } catch (err) {
      console.error('[AI Route] Ollama error:', {
        name: err.name,
        message: err.message,
        cause: err.cause?.message || err.cause?.code || null
      });

      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'AI generation timed out. Please try again.'
        });
      }

      return res.status(503).json({
        success: false,
        error: 'Unable to connect to local AI.'
      });
    }

    clearTimeout(timeoutId);

    console.log(
      '[AI Route] Ollama response status:',
      ollamaRes.status
    );

    if (!ollamaRes.ok) {
      const errorText = await ollamaRes.text().catch(() => '');

      console.error(
        '[AI Route] Ollama returned error:',
        ollamaRes.status,
        errorText
      );

      return res.status(503).json({
        success: false,
        error: 'Local AI returned an error.'
      });
    }

    const data = await ollamaRes.json().catch(err => {
      console.error(
        '[AI Route] JSON parse error:',
        err.message
      );

      return null;
    });

    if (!data || typeof data.response !== 'string') {
      console.error(
        '[AI Route] Ollama returned invalid response:',
        data
      );

      return res.status(503).json({
        success: false,
        error: 'Local AI returned an invalid response.'
      });
    }

    let cleanedMessage = data.response.trim();

    // Remove surrounding quotes if Qwen adds them
    if (
      (cleanedMessage.startsWith('"') &&
        cleanedMessage.endsWith('"')) ||
      (cleanedMessage.startsWith("'") &&
        cleanedMessage.endsWith("'"))
    ) {
      cleanedMessage = cleanedMessage
        .slice(1, -1)
        .trim();
    }

    if (!cleanedMessage) {
      console.error(
        '[AI Route] Ollama returned an empty message.'
      );

      return res.status(503).json({
        success: false,
        error: 'AI generated an empty message.'
      });
    }

    console.log(
      '[AI Route] AI message generated successfully.'
    );

    return res.json({
      success: true,
      message: cleanedMessage
    });

  } catch (err) {
    console.error(
      '[AI Route] Internal server error:',
      err
    );

    return res.status(500).json({
      success: false,
      error: 'Local AI is currently unavailable.'
    });
  }
});

// Protected endpoint: POST /api/ai/customer-intelligence
router.post('/customer-intelligence', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.body || {};

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'customerId is required.'
      });
    }

    let shopId = req.user?.shopId;
    // If user is admin without shopId, fallback to customer's shopId if found or req.body.shopId
    if (!shopId && req.user?.role === 'admin') {
      const targetCust = await Customer.findOne({ id: customerId });
      if (targetCust) {
        shopId = targetCust.shopId;
      }
    }

    if (!shopId) {
      return res.status(403).json({
        success: false,
        error: 'Shop access required for AI Customer Intelligence.'
      });
    }

    // 1-6. Strict shop isolation query
    const customer = await Customer.findOne({ id: customerId, shopId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found.'
      });
    }

    const [enquiries, followUps, sales] = await Promise.all([
      Enquiry.find({ customerId, shopId }).sort({ createdAt: -1 }).limit(10).lean(),
      FollowUp.find({ customerId, shopId }).sort({ createdAt: -1 }).limit(10).lean(),
      Sale.find({ customerId, shopId }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    // Format clean data payload for Qwen prompt
    const customerPayload = {
      name: customer.name,
      preferences: customer.preferences || {},
      totalPurchases: customer.totalPurchases || 0,
      totalSpending: customer.totalSpending || 0,
      conversionRate: customer.conversionRate || 0,
      status: customer.status || 'Active'
    };

    const enquiriesPayload = enquiries.map(e => ({
      productName: e.productName || 'N/A',
      productCategory: e.productCategory || 'N/A',
      interest: e.interest || 'N/A',
      purchaseStatus: e.purchaseStatus || 'N/A',
      size: e.size || 'N/A',
      color: e.color || 'N/A',
      notes: e.notes || '',
      createdAt: e.createdAt
    }));

    const followUpsPayload = followUps.map(f => ({
      status: f.status,
      scheduledAt: f.scheduledAt,
      outcome: f.outcome || 'N/A',
      priority: f.priority,
      reason: f.reason,
      completedAt: f.completedAt
    }));

    const salesPayload = sales.map(s => ({
      items: (s.items || []).map(i => ({ productName: i.productName, category: i.category, quantity: i.quantity, total: i.total })),
      totalAmount: s.totalAmount,
      createdAt: s.createdAt,
      source: s.source
    }));

    const prompt = `You are QuickR's customer intelligence assistant for a retail shop.

Analyze ONLY the supplied customer data.

Do not invent facts.
Do not assume stock availability.
Do not assume the customer will purchase.
Do not invent customer preferences.
Do not invent discounts or offers.

Classify the customer into exactly one lead level:

HOT
WARM
COLD
LOW_PRIORITY

Return valid JSON only:

{
  "leadLevel": "HOT|WARM|COLD|LOW_PRIORITY",
  "confidence": "HIGH|MEDIUM|LOW",
  "reason": "short explanation based only on supplied data",
  "recommendedAction": "short recommended action",
  "recommendedTiming": "TODAY|TOMORROW|WITHIN_3_DAYS|WAIT|NO_FOLLOW_UP"
}

Rules:

HOT:
Strong recent interest, repeated engagement, purchase intent, or a recent enquiry/follow-up where the customer has not purchased yet.

WARM:
Some genuine interest or engagement, but weaker or older than a hot lead.

COLD:
Old or weak engagement with little recent activity.

LOW_PRIORITY:
Not interested, explicitly declined, repeatedly unresponsive, or no meaningful opportunity for follow-up.

Never classify a customer as HOT only because they have purchased before.

Use recent activity more heavily than old activity.

Do not recommend contacting a customer marked Not Interested.

Do not recommend TODAY if the customer already has a follow-up scheduled for today unless the data clearly indicates the current follow-up needs attention.

Keep reason under 25 words.
Keep recommendedAction under 20 words.

Data:
CUSTOMER:
${JSON.stringify(customerPayload, null, 2)}

ENQUIRIES:
${JSON.stringify(enquiriesPayload, null, 2)}

FOLLOW-UPS:
${JSON.stringify(followUpsPayload, null, 2)}

SALES:
${JSON.stringify(salesPayload, null, 2)}`;

    console.log('[AI Intelligence] Sending request to Ollama for customer:', customerId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let ollamaRes;
    try {
      ollamaRes = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:4b-instruct',
          prompt,
          stream: false,
          think: false,
          options: {
            num_predict: 150,
            temperature: 0.2
          }
        }),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[AI Intelligence] Ollama connection error:', err.message);
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    clearTimeout(timeoutId);

    if (!ollamaRes.ok) {
      console.error('[AI Intelligence] Ollama response not OK:', ollamaRes.status);
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    const data = await ollamaRes.json().catch(err => {
      console.error('[AI Intelligence] Response JSON parse error:', err.message);
      return null;
    });

    if (!data || typeof data.response !== 'string') {
      console.error('[AI Intelligence] Invalid data.response from Ollama:', data);
      return res.status(503).json({
        success: false,
        error: 'Local AI returned an invalid response.'
      });
    }

    // Strip markdown code fences if present (e.g., ```json ... ```)
    let rawText = data.response.trim();
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    // Extract JSON object if Qwen included surrounding text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[AI Intelligence] Failed to parse Qwen JSON response:', rawText);
      return res.status(500).json({
        success: false,
        error: 'AI returned an invalid intelligence result.'
      });
    }

    const validLeadLevels = ['HOT', 'WARM', 'COLD', 'LOW_PRIORITY'];
    const validConfidences = ['HIGH', 'MEDIUM', 'LOW'];
    const validTimings = ['TODAY', 'TOMORROW', 'WITHIN_3_DAYS', 'WAIT', 'NO_FOLLOW_UP'];

    const leadLevel = validLeadLevels.includes(parsedJson.leadLevel) ? parsedJson.leadLevel : 'WARM';
    const confidence = validConfidences.includes(parsedJson.confidence) ? parsedJson.confidence : 'MEDIUM';
    const reason = typeof parsedJson.reason === 'string' && parsedJson.reason ? parsedJson.reason : 'Based on recent enquiry history.';
    const recommendedAction = typeof parsedJson.recommendedAction === 'string' && parsedJson.recommendedAction ? parsedJson.recommendedAction : 'Follow up with customer.';
    const recommendedTiming = validTimings.includes(parsedJson.recommendedTiming) ? parsedJson.recommendedTiming : 'TOMORROW';

    return res.json({
      success: true,
      intelligence: {
        leadLevel,
        confidence,
        reason,
        recommendedAction,
        recommendedTiming
      }
    });

  } catch (err) {
    console.error('[AI Intelligence] Unexpected internal error:', err);
    return res.status(500).json({
      success: false,
      error: 'Local AI is currently unavailable.'
    });
  }
});

// Protected endpoint: POST /api/ai/sales-opportunity
router.post('/sales-opportunity', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.body || {};

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'customerId is required.'
      });
    }

    let shopId = req.user?.shopId;
    if (!shopId && req.user?.role === 'admin') {
      const targetCust = await Customer.findOne({ id: customerId });
      if (targetCust) {
        shopId = targetCust.shopId;
      }
    }

    if (!shopId) {
      return res.status(403).json({
        success: false,
        error: 'Shop access required for AI Sales Opportunity Engine.'
      });
    }

    // 1-8. Strict shop isolation query
    const customer = await Customer.findOne({ id: customerId, shopId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found.'
      });
    }

    const [enquiries, followUps, sales] = await Promise.all([
      Enquiry.find({ customerId, shopId }).sort({ createdAt: -1 }).limit(10).lean(),
      FollowUp.find({ customerId, shopId }).sort({ createdAt: -1 }).limit(10).lean(),
      Sale.find({ customerId, shopId }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    const customerPayload = {
      name: customer.name,
      totalPurchases: customer.totalPurchases || 0,
      totalSpending: customer.totalSpending || 0
    };

    const enquiriesPayload = enquiries.map(e => ({
      productName: e.productName || 'N/A',
      productCategory: e.productCategory || 'N/A',
      interest: e.interest || 'N/A',
      purchaseStatus: e.purchaseStatus || 'N/A',
      quantity: e.quantity || 1,
      size: e.size || 'N/A',
      color: e.color || 'N/A',
      notes: e.notes || '',
      createdAt: e.createdAt
    }));

    const followUpsPayload = followUps.map(f => ({
      status: f.status,
      scheduledAt: f.scheduledAt,
      reason: f.reason,
      outcome: f.outcome || 'N/A',
      completedAt: f.completedAt
    }));

    const salesPayload = sales.map(s => ({
      items: (s.items || []).map(i => ({ productName: i.productName, category: i.category, quantity: i.quantity, total: i.total })),
      totalAmount: s.totalAmount,
      createdAt: s.createdAt,
      source: s.source
    }));

    const prompt = `You are QuickR's AI Sales Opportunity Engine for a retail shop.

Analyze ONLY the supplied customer history.

Return valid JSON only:

{
  "opportunityScore": 82,
  "leadLevel": "HOT|WARM|COLD|LOW_PRIORITY",
  "recommendedAction": "Follow up with the customer today.",
  "recommendedTiming": "TODAY|TOMORROW|WITHIN_3_DAYS|WAIT|NO_FOLLOW_UP",
  "reason": "Customer recently showed strong interest but has not purchased."
}

Rules:

opportunityScore:
- Integer from 0 to 100 representing sales opportunity score.

leadLevel:
- HOT: high opportunity, active intent
- WARM: moderate opportunity, older or moderate interest
- COLD: weak opportunity, long inactivity
- LOW_PRIORITY: explicitly not interested or repeatedly declined

recommendedTiming:
- TODAY, TOMORROW, WITHIN_3_DAYS, WAIT, or NO_FOLLOW_UP

Guidelines:
- Do not invent facts, stock, or discounts.
- Do not recommend contacting customers who explicitly said they are not interested.
- Do not give a high score simply because the customer purchased previously.
- Recent activity has higher weight than old activity.
- If a follow-up is already scheduled for tomorrow, do not recommend TODAY unless evidence requires earlier action.
- Keep reason under 25 words.

Data:
CUSTOMER:
${JSON.stringify(customerPayload, null, 2)}

ENQUIRIES:
${JSON.stringify(enquiriesPayload, null, 2)}

FOLLOW-UPS:
${JSON.stringify(followUpsPayload, null, 2)}

SALES:
${JSON.stringify(salesPayload, null, 2)}`;

    console.log('[AI Sales Opportunity] Sending request to Ollama for customer:', customerId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let ollamaRes;
    try {
      ollamaRes = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:4b-instruct',
          prompt,
          stream: false,
          think: false,
          options: {
            num_predict: 150,
            temperature: 0.2
          }
        }),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[AI Sales Opportunity] Ollama connection error:', err.message);
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    clearTimeout(timeoutId);

    if (!ollamaRes.ok) {
      console.error('[AI Sales Opportunity] Ollama status not OK:', ollamaRes.status);
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    const data = await ollamaRes.json().catch(err => {
      console.error('[AI Sales Opportunity] JSON parse error:', err.message);
      return null;
    });

    if (!data || typeof data.response !== 'string') {
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    // Strip markdown code fences
    let rawText = data.response.trim();
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[AI Sales Opportunity] Failed to parse Qwen JSON:', rawText);
      return res.status(500).json({
        success: false,
        error: 'AI returned an invalid sales opportunity result.'
      });
    }

    const rawScore = parseInt(parsedJson.opportunityScore, 10);
    const opportunityScore = !isNaN(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 50;

    const validLeadLevels = ['HOT', 'WARM', 'COLD', 'LOW_PRIORITY'];
    const validTimings = ['TODAY', 'TOMORROW', 'WITHIN_3_DAYS', 'WAIT', 'NO_FOLLOW_UP'];

    const leadLevel = validLeadLevels.includes(parsedJson.leadLevel) ? parsedJson.leadLevel : (opportunityScore >= 75 ? 'HOT' : opportunityScore >= 45 ? 'WARM' : 'COLD');
    const recommendedAction = typeof parsedJson.recommendedAction === 'string' && parsedJson.recommendedAction ? parsedJson.recommendedAction : 'Follow up with the customer.';
    const recommendedTiming = validTimings.includes(parsedJson.recommendedTiming) ? parsedJson.recommendedTiming : 'TOMORROW';
    const reason = typeof parsedJson.reason === 'string' && parsedJson.reason ? parsedJson.reason : 'Based on recent customer activity.';

    return res.json({
      success: true,
      opportunity: {
        opportunityScore,
        leadLevel,
        recommendedAction,
        recommendedTiming,
        reason
      }
    });

  } catch (err) {
    console.error('[AI Sales Opportunity] Unexpected internal error:', err);
    return res.status(500).json({
      success: false,
      error: 'Local AI is currently unavailable.'
    });
  }
});

// Protected endpoint: POST /api/ai/shop-insights
router.post('/shop-insights', requireAuth, async (req, res) => {
  try {
    const shopId = req.user?.shopId;

    if (!shopId) {
      return res.status(403).json({
        success: false,
        error: 'Shop context is required for shop insights.'
      });
    }

    // Exact pre-calculated statistics scoped to shopId
    const [
      totalCustomers,
      totalEnquiries,
      purchasedEnquiries,
      notPurchasedEnquiries,
      interestedEnquiries,
      notInterestedEnquiries,
      totalFollowUps,
      completedFollowUps,
      pendingFollowUps,
      salesDocs,
      recentEnquiries,
      recentFollowUps,
      recentSales
    ] = await Promise.all([
      Customer.countDocuments({ shopId }),
      Enquiry.countDocuments({ shopId }),
      Enquiry.countDocuments({ shopId, purchaseStatus: 'Purchased' }),
      Enquiry.countDocuments({ shopId, purchaseStatus: "Didn't Purchase" }),
      Enquiry.countDocuments({ shopId, interest: { $in: ['Interested', 'Very Interested'] } }),
      Enquiry.countDocuments({ shopId, interest: 'Just Enquiring' }),
      FollowUp.countDocuments({ shopId }),
      FollowUp.countDocuments({ shopId, status: 'completed' }),
      FollowUp.countDocuments({ shopId, status: { $in: ['ready', 'scheduled', 'waiting'] } }),
      Sale.find({ shopId }).lean(),
      Enquiry.find({ shopId }).sort({ createdAt: -1 }).limit(10).lean(),
      FollowUp.find({ shopId }).sort({ createdAt: -1 }).limit(10).lean(),
      Sale.find({ shopId }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    const totalSales = salesDocs.length;
    const totalSalesAmount = salesDocs.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    // Product insights calculation if available
    const productStatsMap = {};
    salesDocs.forEach(s => {
      (s.items || []).forEach(item => {
        if (item.productName) {
          if (!productStatsMap[item.productName]) {
            productStatsMap[item.productName] = { purchaseCount: 0, salesAmount: 0 };
          }
          productStatsMap[item.productName].purchaseCount += item.quantity || 1;
          productStatsMap[item.productName].salesAmount += item.total || 0;
        }
      });
    });

    const topProducts = Object.entries(productStatsMap)
      .map(([productName, stat]) => ({ productName, ...stat }))
      .sort((a, b) => b.salesAmount - a.salesAmount)
      .slice(0, 5);

    const statsPayload = {
      totalCustomers,
      totalEnquiries,
      purchasedEnquiries,
      notPurchasedEnquiries,
      interestedEnquiries,
      notInterestedEnquiries,
      totalFollowUps,
      completedFollowUps,
      pendingFollowUps,
      totalSales,
      totalSalesAmount,
      topProducts
    };

    const recentEnquiriesPayload = recentEnquiries.map(e => ({
      productName: e.productName,
      productCategory: e.productCategory,
      interest: e.interest,
      purchaseStatus: e.purchaseStatus,
      createdAt: e.createdAt
    }));

    const recentFollowUpsPayload = recentFollowUps.map(f => ({
      status: f.status,
      scheduledAt: f.scheduledAt,
      reason: f.reason,
      outcome: f.outcome || 'N/A'
    }));

    const recentSalesPayload = recentSales.map(s => ({
      totalAmount: s.totalAmount,
      source: s.source,
      createdAt: s.createdAt
    }));

    const prompt = `You are QuickR's AI Shop Sales Advisor for a retail shop.

Analyze ONLY the supplied shop statistics and recent activity.

The statistics supplied by the backend are authoritative.
Do NOT change or invent numbers.
Do NOT invent products, sales, customers, offers, discounts, or stock information.
Only interpret the supplied information to identify useful business patterns and practical recommendations.

Recommendations MUST be based only on the supplied data.
Do NOT recommend discounts, special offers, promotions, price changes, stock availability, delivery promises, or product changes unless explicitly provided in the input data.
If the data does not support a specific recommendation, recommend a safe action such as:
- follow up with interested customers
- review pending follow-ups
- review enquiry conversion
- monitor product enquiry activity

RETURN VALID JSON ONLY:

{
  "summary": "Short overall shop performance summary.",
  "insights": [
    {
      "type": "SALES_OPPORTUNITY|PRODUCT|FOLLOW_UP|CUSTOMER|CONVERSION|GENERAL",
      "title": "Short title",
      "description": "Short explanation based only on supplied data."
    }
  ],
  "recommendations": [
    "Short recommendation 1",
    "Short recommendation 2",
    "Short recommendation 3"
  ]
}

Rules:
- Allowed insight types: SALES_OPPORTUNITY, PRODUCT, FOLLOW_UP, CUSTOMER, CONVERSION, GENERAL
- Maximum 4 insights.
- Maximum 3 recommendations.
- Keep description concise under 25 words.

Data:
AUTHORITATIVE SHOP STATISTICS:
${JSON.stringify(statsPayload, null, 2)}

RECENT ENQUIRIES:
${JSON.stringify(recentEnquiriesPayload, null, 2)}

RECENT FOLLOW-UPS:
${JSON.stringify(recentFollowUpsPayload, null, 2)}

RECENT SALES:
${JSON.stringify(recentSalesPayload, null, 2)}`;

    console.log('[AI Shop Insights] Sending request to Ollama for shopId:', shopId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let ollamaRes;
    try {
      ollamaRes = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:4b-instruct',
          prompt,
          stream: false,
          think: false,
          options: {
            num_predict: 300,
            temperature: 0.2
          }
        }),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[AI Shop Insights] Ollama connection error:', err.message);
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    clearTimeout(timeoutId);

    if (!ollamaRes.ok) {
      console.error('[AI Shop Insights] Ollama status not OK:', ollamaRes.status);
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    const data = await ollamaRes.json().catch(err => {
      console.error('[AI Shop Insights] JSON parse error:', err.message);
      return null;
    });

    if (!data || typeof data.response !== 'string') {
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    // Strip markdown code fences
    let rawText = data.response.trim();
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[AI Shop Insights] Failed to parse Qwen JSON:', rawText);
      return res.status(500).json({
        success: false,
        error: 'AI returned an invalid shop insights result.'
      });
    }

    const validTypes = ['SALES_OPPORTUNITY', 'PRODUCT', 'FOLLOW_UP', 'CUSTOMER', 'CONVERSION', 'GENERAL'];

    const summary = typeof parsedJson.summary === 'string' && parsedJson.summary ? parsedJson.summary : `Shop performance summary: ${totalSales} sales completed with ₹${totalSalesAmount} total revenue.`;

    const insights = Array.isArray(parsedJson.insights)
      ? parsedJson.insights.slice(0, 4).map(item => ({
          type: validTypes.includes(item.type) ? item.type : 'GENERAL',
          title: typeof item.title === 'string' && item.title ? item.title : 'Shop Activity Insight',
          description: typeof item.description === 'string' && item.description ? item.description : 'Activity trend observed in recent shop data.'
        }))
      : [];

    const forbiddenKeywords = ['discount', 'special offer', 'promotion', 'price change', 'stock availability', 'delivery promise', 'product change'];

    const rawRecommendations = Array.isArray(parsedJson.recommendations) ? parsedJson.recommendations : [];

    const sanitizedRecommendations = rawRecommendations
      .map(r => String(r).trim())
      .filter(r => {
        const lower = r.toLowerCase();
        return !forbiddenKeywords.some(kw => lower.includes(kw));
      })
      .slice(0, 3);

    const safeDefaults = [
      'Follow up with interested customers today.',
      'Review pending follow-ups to ensure timely engagement.',
      'Monitor product enquiry activity and conversion trends.'
    ];

    while (sanitizedRecommendations.length < 3) {
      const nextDefault = safeDefaults[sanitizedRecommendations.length];
      if (!sanitizedRecommendations.includes(nextDefault)) {
        sanitizedRecommendations.push(nextDefault);
      } else {
        break;
      }
    }

    return res.json({
      success: true,
      shopInsights: {
        summary,
        insights,
        recommendations: sanitizedRecommendations,
        stats: statsPayload
      }
    });

  } catch (err) {
    console.error('[AI Shop Insights] Unexpected internal error:', err);
    return res.status(500).json({
      success: false,
      error: 'Local AI is currently unavailable.'
    });
  }
});

// Protected endpoint: POST /api/ai/admin-insights (ADMIN ONLY)
router.post('/admin-insights', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required.'
      });
    }

    // 1. Authoritative Platform Totals directly from MongoDB
    const [
      totalShops,
      activeShops,
      disabledShops,
      totalCustomers,
      totalEnquiries,
      totalPurchasedEnquiries,
      totalNotPurchasedEnquiries,
      totalFollowUps,
      pendingFollowUps,
      completedFollowUps,
      allSalesDocs,
      allShops
    ] = await Promise.all([
      Shop.countDocuments(),
      Shop.countDocuments({ status: { $ne: 'disabled' } }),
      Shop.countDocuments({ status: 'disabled' }),
      Customer.countDocuments(),
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ purchaseStatus: 'Purchased' }),
      Enquiry.countDocuments({ purchaseStatus: "Didn't Purchase" }),
      FollowUp.countDocuments(),
      FollowUp.countDocuments({ status: { $in: ['ready', 'scheduled', 'waiting'] } }),
      FollowUp.countDocuments({ status: 'completed' }),
      Sale.find().lean(),
      Shop.find().lean()
    ]);

    const totalSales = allSalesDocs.length;
    const totalSalesAmount = allSalesDocs.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    const stats = {
      totalShops,
      activeShops,
      disabledShops,
      totalCustomers,
      totalEnquiries,
      totalPurchasedEnquiries,
      totalNotPurchasedEnquiries,
      totalFollowUps,
      pendingFollowUps,
      completedFollowUps,
      totalSales,
      totalSalesAmount
    };

    // 2. Aggregated Shop-Level Performance
    const shopPerformance = await Promise.all(
      allShops.map(async (shop) => {
        const sId = shop.customId;
        const [custCount, enqCount, purCount, salesList, pendFwCount] = await Promise.all([
          Customer.countDocuments({ shopId: sId }),
          Enquiry.countDocuments({ shopId: sId }),
          Enquiry.countDocuments({ shopId: sId, purchaseStatus: 'Purchased' }),
          Sale.find({ shopId: sId }).lean(),
          FollowUp.countDocuments({ shopId: sId, status: { $in: ['ready', 'scheduled', 'waiting'] } })
        ]);

        const salesAmt = salesList.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const conversionRate = enqCount > 0 ? Number(((purCount / enqCount) * 100).toFixed(1)) : 0;

        return {
          shopId: sId,
          shopName: shop.name || sId,
          customers: custCount,
          enquiries: enqCount,
          purchases: purCount,
          salesAmount: salesAmt,
          pendingFollowUps: pendFwCount,
          conversionRate
        };
      })
    );

    // Limit shop performance payload sent to Qwen to active/top 10 shops to avoid token bloat
    const condensedShopPerformance = shopPerformance
      .sort((a, b) => (b.salesAmount + b.enquiries) - (a.salesAmount + a.enquiries))
      .slice(0, 10)
      .map(s => ({
        shopName: s.shopName,
        customers: s.customers,
        enquiries: s.enquiries,
        purchases: s.purchases,
        salesAmount: s.salesAmount,
        pendingFollowUps: s.pendingFollowUps,
        conversionRate: s.conversionRate
      }));

    // 3. Backend Shop Rankings
    const topShopsBySales = [...shopPerformance].sort((a, b) => b.salesAmount - a.salesAmount).slice(0, 3);
    const topShopsByConversion = [...shopPerformance].sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 3);
    const highestPendingFollowups = [...shopPerformance].sort((a, b) => b.pendingFollowUps - a.pendingFollowUps).slice(0, 3);
    const highEnquiryLowPurchase = [...shopPerformance]
      .filter(s => s.enquiries > 0)
      .sort((a, b) => a.conversionRate - b.conversionRate)
      .slice(0, 3);

    const rankingPayload = {
      topShopsBySales: topShopsBySales.map(s => ({ shopName: s.shopName, salesAmount: s.salesAmount })),
      topShopsByConversion: topShopsByConversion.map(s => ({ shopName: s.shopName, conversionRate: s.conversionRate })),
      highestPendingFollowups: highestPendingFollowups.map(s => ({ shopName: s.shopName, pendingFollowUps: s.pendingFollowUps })),
      highEnquiryLowPurchase: highEnquiryLowPurchase.map(s => ({ shopName: s.shopName, enquiries: s.enquiries, purchases: s.purchases, conversionRate: s.conversionRate }))
    };

    const prompt = `You are QuickR's global AI Business Intelligence assistant for the platform admin.

Analyze ONLY the supplied authoritative platform statistics, shop performance, and shop rankings.

The backend supplied authoritative statistics. You must NOT modify, invent, estimate, or recalculate the supplied numbers.
Do NOT invent discounts, offers, promotions, stock, pricing, delivery information, or business facts that are not supplied.

Recommendations MUST be safe operational recommendations based strictly on supplied statistics (e.g. review shops with low conversion, focus on shops with pending follow-ups, monitor sales activity).

RETURN VALID JSON ONLY:

{
  "summary": "Short overall platform summary.",
  "insights": [
    {
      "type": "TOP_PERFORMER|ATTENTION|OPPORTUNITY|CONVERSION|FOLLOW_UP|SALES|GENERAL",
      "title": "Short title",
      "description": "Short explanation based only on supplied statistics."
    }
  ],
  "recommendations": [
    "Short safe recommendation 1",
    "Short safe recommendation 2"
  ]
}

Rules:
- Allowed insight types: TOP_PERFORMER, ATTENTION, OPPORTUNITY, CONVERSION, FOLLOW_UP, SALES, GENERAL
- Maximum 5 insights.
- Maximum 4 recommendations.
- Keep description concise under 20 words.

Data:
PLATFORM TOTALS:
${JSON.stringify(stats, null, 2)}

TOP SHOPS PERFORMANCE:
${JSON.stringify(condensedShopPerformance, null, 2)}

RANKINGS & HIGHLIGHTS:
${JSON.stringify(rankingPayload, null, 2)}`;

    console.log('[AI Admin Insights] Sending request to Ollama...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let ollamaRes;
    try {
      ollamaRes = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:4b-instruct',
          prompt,
          stream: false,
          think: false,
          options: {
            num_predict: 500,
            temperature: 0.2
          }
        }),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[AI Admin Insights] Ollama connection error:', err.message);
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    clearTimeout(timeoutId);

    if (!ollamaRes.ok) {
      console.error('[AI Admin Insights] Ollama status not OK:', ollamaRes.status);
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    const data = await ollamaRes.json().catch(err => {
      console.error('[AI Admin Insights] JSON parse error:', err.message);
      return null;
    });

    if (!data || typeof data.response !== 'string') {
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    // Strip markdown code fences
    let rawText = data.response.trim();
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (parseErr) {
      // Attempt JSON repair if truncated at recommendations array
      if (rawText.includes('"insights":') && !rawText.endsWith('}')) {
        let repaired = rawText;
        if (!repaired.includes('"recommendations":')) {
          repaired += ',\n"recommendations": []\n}';
        } else if (!repaired.endsWith(']')) {
          repaired += '"]\n}';
        } else {
          repaired += '\n}';
        }
        try {
          parsedJson = JSON.parse(repaired);
        } catch (rErr) {
          console.error('[AI Admin Insights] Failed to parse Qwen JSON after repair attempt:', rawText);
          return res.status(500).json({
            success: false,
            error: 'AI returned an invalid admin insights result.'
          });
        }
      } else {
        console.error('[AI Admin Insights] Failed to parse Qwen JSON:', rawText);
        return res.status(500).json({
          success: false,
          error: 'AI returned an invalid admin insights result.'
        });
      }
    }

    const validTypes = ['TOP_PERFORMER', 'ATTENTION', 'OPPORTUNITY', 'CONVERSION', 'FOLLOW_UP', 'SALES', 'GENERAL'];

    const summary = typeof parsedJson.summary === 'string' && parsedJson.summary ? parsedJson.summary : `Platform summary: ${totalShops} shops registered with ₹${totalSalesAmount} total sales volume across ${totalSales} orders.`;

    const insights = Array.isArray(parsedJson.insights)
      ? parsedJson.insights.slice(0, 5).map(item => ({
          type: validTypes.includes(item.type) ? item.type : 'GENERAL',
          title: typeof item.title === 'string' && item.title ? item.title : 'Business Trend',
          description: typeof item.description === 'string' && item.description ? item.description : 'Observed across platform shops.'
        }))
      : [];

    const forbiddenKeywords = ['discount', 'special offer', 'promotion', 'price change', 'stock availability', 'delivery promise', 'product change'];

    const rawRecommendations = Array.isArray(parsedJson.recommendations) ? parsedJson.recommendations : [];

    const sanitizedRecommendations = rawRecommendations
      .map(r => String(r).trim())
      .filter(r => {
        const lower = r.toLowerCase();
        return !forbiddenKeywords.some(kw => lower.includes(kw));
      })
      .slice(0, 4);

    const safeDefaults = [
      'Review shops with low enquiry conversion rates.',
      'Focus support on shops with high pending follow-up backlogs.',
      'Investigate processes in top-performing shops to share best practices.',
      'Monitor platform sales activity and shop engagement.'
    ];

    while (sanitizedRecommendations.length < 4) {
      const nextDefault = safeDefaults[sanitizedRecommendations.length];
      if (!sanitizedRecommendations.includes(nextDefault)) {
        sanitizedRecommendations.push(nextDefault);
      } else {
        break;
      }
    }

    return res.json({
      success: true,
      stats,
      shopPerformance,
      aiInsights: {
        summary,
        insights,
        recommendations: sanitizedRecommendations
      }
    });

  } catch (err) {
    console.error('[AI Admin Insights] Unexpected internal error:', err);
    return res.status(500).json({
      success: false,
      error: 'Local AI is currently unavailable.'
    });
  }
});

// Protected endpoint: POST /api/ai/trends
router.post('/trends', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    let targetShopId = req.user?.shopId;

    // Strict Shop Isolation: Never trust req.body.shopId for non-admin users
    if (!isAdmin && !targetShopId) {
      return res.status(403).json({
        success: false,
        error: 'Shop context is required for trend analysis.'
      });
    }

    // Period Boundaries (30 Days Current vs 30 Days Previous)
    const now = new Date();
    const currentEnd = new Date(now);
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 30);
    currentStart.setHours(0, 0, 0, 0);

    const previousEnd = new Date(currentStart);
    previousEnd.setMilliseconds(-1);

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 30);
    previousStart.setHours(0, 0, 0, 0);

    // Helpers for safe percentage change and direction
    const calcChange = (curr, prev) => {
      if (prev === 0) {
        if (curr === 0) return 0;
        return null; // Return null when change cannot be meaningfully calculated
      }
      return Number((((curr - prev) / prev) * 100).toFixed(1));
    };

    const getDirection = (changePercent, curr, prev) => {
      if (curr === 0 && prev === 0) return 'NO_DATA';
      if (changePercent === null) return curr > 0 ? 'UP' : 'NO_DATA';
      if (changePercent >= 5.0) return 'UP';
      if (changePercent <= -5.0) return 'DOWN';
      return 'STABLE';
    };

    const buildMetricObject = (metricName, currVal, prevVal) => {
      const changePercent = calcChange(currVal, prevVal);
      const direction = getDirection(changePercent, currVal, prevVal);
      return {
        metric: metricName,
        current: currVal,
        previous: prevVal,
        changePercent,
        direction
      };
    };

    // Construct MongoDB Match Queries
    const queryFilter = (dateStart, dateEnd) => {
      const filter = { createdAt: { $gte: dateStart, $lte: dateEnd } };
      if (!isAdmin) {
        filter.shopId = targetShopId;
      }
      return filter;
    };

    // Calculate Authoritative Backend Metrics for Current and Previous Periods
    const [
      currSalesDocs, prevSalesDocs,
      currEnquiries, prevEnquiries,
      currPurchased, prevPurchased,
      currNotPurchased, prevNotPurchased,
      currFollowUpsCreated, prevFollowUpsCreated,
      currFollowUpsCompleted, prevFollowUpsCompleted,
      currFollowUpsPending, prevFollowUpsPending,
      currNewCustomers, prevNewCustomers
    ] = await Promise.all([
      Sale.find(queryFilter(currentStart, currentEnd)).lean(),
      Sale.find(queryFilter(previousStart, previousEnd)).lean(),
      Enquiry.countDocuments(queryFilter(currentStart, currentEnd)),
      Enquiry.countDocuments(queryFilter(previousStart, previousEnd)),
      Enquiry.countDocuments({ ...queryFilter(currentStart, currentEnd), purchaseStatus: 'Purchased' }),
      Enquiry.countDocuments({ ...queryFilter(previousStart, previousEnd), purchaseStatus: 'Purchased' }),
      Enquiry.countDocuments({ ...queryFilter(currentStart, currentEnd), purchaseStatus: "Didn't Purchase" }),
      Enquiry.countDocuments({ ...queryFilter(previousStart, previousEnd), purchaseStatus: "Didn't Purchase" }),
      FollowUp.countDocuments(queryFilter(currentStart, currentEnd)),
      FollowUp.countDocuments(queryFilter(previousStart, previousEnd)),
      FollowUp.countDocuments({ ...queryFilter(currentStart, currentEnd), status: 'completed' }),
      FollowUp.countDocuments({ ...queryFilter(previousStart, previousEnd), status: 'completed' }),
      FollowUp.countDocuments(isAdmin ? { status: { $in: ['ready', 'scheduled', 'waiting'] } } : { shopId: targetShopId, status: { $in: ['ready', 'scheduled', 'waiting'] } }),
      FollowUp.countDocuments(isAdmin ? { status: { $in: ['ready', 'scheduled', 'waiting'] } } : { shopId: targetShopId, status: { $in: ['ready', 'scheduled', 'waiting'] } }),
      Customer.countDocuments(queryFilter(currentStart, currentEnd)),
      Customer.countDocuments(queryFilter(previousStart, previousEnd))
    ]);

    const currSalesCount = currSalesDocs.length;
    const prevSalesCount = prevSalesDocs.length;

    const currSalesAmount = currSalesDocs.reduce((s, d) => s + (d.totalAmount || 0), 0);
    const prevSalesAmount = prevSalesDocs.reduce((s, d) => s + (d.totalAmount || 0), 0);

    const currConversionRate = currEnquiries > 0 ? Number(((currPurchased / currEnquiries) * 100).toFixed(1)) : 0;
    const prevConversionRate = prevEnquiries > 0 ? Number(((prevPurchased / prevEnquiries) * 100).toFixed(1)) : 0;

    const metrics = {
      salesCount: buildMetricObject('salesCount', currSalesCount, prevSalesCount),
      salesAmount: buildMetricObject('salesAmount', currSalesAmount, prevSalesAmount),
      enquiries: buildMetricObject('enquiries', currEnquiries, prevEnquiries),
      purchases: buildMetricObject('purchasedEnquiries', currPurchased, prevPurchased),
      conversionRate: buildMetricObject('conversionRate', currConversionRate, prevConversionRate),
      followUpsCreated: buildMetricObject('followUpsCreated', currFollowUpsCreated, prevFollowUpsCreated),
      followUpsCompleted: buildMetricObject('followUpsCompleted', currFollowUpsCompleted, prevFollowUpsCompleted),
      followUpsPending: buildMetricObject('followUpsPending', currFollowUpsPending, prevFollowUpsPending),
      newCustomers: buildMetricObject('newCustomers', currNewCustomers, prevNewCustomers)
    };

    // If Admin, calculate per-shop trends and ranking leaders
    let shopTrends = [];
    let shopLeaders = null;

    if (isAdmin) {
      const allShops = await Shop.find().lean();

      shopTrends = await Promise.all(
        allShops.map(async (shop) => {
          const sId = shop.customId;
          const [cEnq, pEnq, cPur, pPur, cSales, pSales, cFw, pFw] = await Promise.all([
            Enquiry.countDocuments({ shopId: sId, createdAt: { $gte: currentStart, $lte: currentEnd } }),
            Enquiry.countDocuments({ shopId: sId, createdAt: { $gte: previousStart, $lte: previousEnd } }),
            Enquiry.countDocuments({ shopId: sId, purchaseStatus: 'Purchased', createdAt: { $gte: currentStart, $lte: currentEnd } }),
            Enquiry.countDocuments({ shopId: sId, purchaseStatus: 'Purchased', createdAt: { $gte: previousStart, $lte: previousEnd } }),
            Sale.find({ shopId: sId, createdAt: { $gte: currentStart, $lte: currentEnd } }).lean(),
            Sale.find({ shopId: sId, createdAt: { $gte: previousStart, $lte: previousEnd } }).lean(),
            FollowUp.countDocuments({ shopId: sId, status: { $in: ['ready', 'scheduled', 'waiting'] } }),
            FollowUp.countDocuments({ shopId: sId, status: { $in: ['ready', 'scheduled', 'waiting'] } })
          ]);

          const cAmt = cSales.reduce((s, d) => s + (d.totalAmount || 0), 0);
          const pAmt = pSales.reduce((s, d) => s + (d.totalAmount || 0), 0);

          const cConv = cEnq > 0 ? (cPur / cEnq) * 100 : 0;
          const pConv = pEnq > 0 ? (pPur / pEnq) * 100 : 0;

          return {
            shopId: sId,
            shopName: shop.name || sId,
            salesChangePercent: calcChange(cAmt, pAmt),
            enquiryChangePercent: calcChange(cEnq, pEnq),
            conversionChangePercent: calcChange(cConv, pConv),
            pendingFollowUps: cFw
          };
        })
      );

      const fastestImproving = [...shopTrends]
        .filter(s => s.salesChangePercent !== null)
        .sort((a, b) => b.salesChangePercent - a.salesChangePercent)
        .slice(0, 3);

      const decliningActivity = [...shopTrends]
        .filter(s => s.salesChangePercent !== null)
        .sort((a, b) => a.salesChangePercent - b.salesChangePercent)
        .slice(0, 3);

      const improvingConversion = [...shopTrends]
        .filter(s => s.conversionChangePercent !== null)
        .sort((a, b) => b.conversionChangePercent - a.conversionChangePercent)
        .slice(0, 3);

      const highestPendingFollowups = [...shopTrends]
        .sort((a, b) => b.pendingFollowUps - a.pendingFollowUps)
        .slice(0, 3);

      shopLeaders = {
        fastestImproving: fastestImproving.map(s => ({ shopName: s.shopName, salesChangePercent: s.salesChangePercent })),
        decliningActivity: decliningActivity.map(s => ({ shopName: s.shopName, salesChangePercent: s.salesChangePercent })),
        improvingConversion: improvingConversion.map(s => ({ shopName: s.shopName, conversionChangePercent: s.conversionChangePercent })),
        highestPendingFollowups: highestPendingFollowups.map(s => ({ shopName: s.shopName, pendingFollowUps: s.pendingFollowUps }))
      };
    }

    const prompt = `You are QuickR's business trend analysis assistant.

The backend has already calculated all numerical values.
Do NOT recalculate, modify, invent, or estimate numbers.
Use ONLY the supplied statistics.
Explain meaningful business trends.
Do NOT claim that a trend guarantees future results.
Do NOT make exact future revenue or sales predictions (e.g. do NOT say "next month revenue will be X").
Do NOT invent discounts, offers, pricing, stock, delivery information, or promotions.

RETURN VALID JSON ONLY:

{
  "summary": "Short summary of the most important business trends.",
  "trends": [
    {
      "type": "SALES|REVENUE|ENQUIRY|CONVERSION|FOLLOW_UP|CUSTOMER|SHOP_ACTIVITY|GENERAL",
      "title": "Short title",
      "description": "Short explanation based only on supplied trend statistics.",
      "direction": "UP|DOWN|STABLE|NO_DATA",
      "importance": "HIGH|MEDIUM|LOW"
    }
  ],
  "recommendations": [
    "Safe operational recommendation based on the supplied trend statistics."
  ]
}

Rules:
- Allowed type: SALES, REVENUE, ENQUIRY, CONVERSION, FOLLOW_UP, CUSTOMER, SHOP_ACTIVITY, GENERAL
- Allowed direction: UP, DOWN, STABLE, NO_DATA
- Allowed importance: HIGH, MEDIUM, LOW
- Maximum 6 trends.
- Maximum 4 recommendations.
- Keep description concise under 20 words.

Data:
AUTHORITATIVE TREND METRICS (Last 30 Days vs Previous 30 Days):
${JSON.stringify(metrics, null, 2)}

${isAdmin ? `SHOP LEADERS & PLATFORM HIGHLIGHTS:\n${JSON.stringify(shopLeaders, null, 2)}` : ''}`;

    console.log('[AI Trends] Sending request to Ollama...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let Res;
    try {
      ollamaRes = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:4b-instruct',
          prompt,
          stream: false,
          think: false,
          options: {
            num_predict: 550,
            temperature: 0.2
          }
        }),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[AI Trends] Ollama connection error:', err.message);
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    clearTimeout(timeoutId);

    if (!ollamaRes.ok) {
      console.error('[AI Trends] Ollama status not OK:', ollamaRes.status);
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    const data = await ollamaRes.json().catch(err => {
      console.error('[AI Trends] JSON parse error:', err.message);
      return null;
    });

    if (!data || typeof data.response !== 'string') {
      return res.status(503).json({
        success: false,
        error: 'Local AI is currently unavailable.'
      });
    }

    // Strip markdown code fences
    let rawText = data.response.trim();
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (parseErr) {
      if (rawText.includes('"trends":') && !rawText.endsWith('}')) {
        let repaired = rawText;
        if (!repaired.includes('"recommendations":')) {
          repaired += ',\n"recommendations": []\n}';
        } else if (!repaired.endsWith(']')) {
          repaired += '"]\n}';
        } else {
          repaired += '\n}';
        }
        try {
          parsedJson = JSON.parse(repaired);
        } catch (rErr) {
          console.error('[AI Trends] Failed to parse Qwen JSON after repair attempt:', rawText);
          return res.status(500).json({
            success: false,
            error: 'AI trend analysis could not be completed.'
          });
        }
      } else {
        console.error('[AI Trends] Failed to parse Qwen JSON:', rawText);
        return res.status(500).json({
          success: false,
          error: 'AI trend analysis could not be completed.'
        });
      }
    }

    const validTypes = ['SALES', 'REVENUE', 'ENQUIRY', 'CONVERSION', 'FOLLOW_UP', 'CUSTOMER', 'SHOP_ACTIVITY', 'GENERAL'];
    const validDirections = ['UP', 'DOWN', 'STABLE', 'NO_DATA'];
    const validImportances = ['HIGH', 'MEDIUM', 'LOW'];

    const summary = typeof parsedJson.summary === 'string' && parsedJson.summary ? parsedJson.summary : 'Business trend analysis for the current 30-day period versus the previous 30 days.';

    const trends = Array.isArray(parsedJson.trends)
      ? parsedJson.trends.slice(0, 6).map(t => ({
          type: validTypes.includes(t.type) ? t.type : 'GENERAL',
          title: typeof t.title === 'string' && t.title ? t.title : 'Performance Trend',
          description: typeof t.description === 'string' && t.description ? t.description : 'Observed trend in business metrics.',
          direction: validDirections.includes(t.direction) ? t.direction : 'STABLE',
          importance: validImportances.includes(t.importance) ? t.importance : 'MEDIUM'
        }))
      : [];

    const forbiddenKeywords = ['discount', 'special offer', 'promotion', 'price change', 'stock availability', 'delivery promise', 'product change'];
    const rawRecommendations = Array.isArray(parsedJson.recommendations) ? parsedJson.recommendations : [];

    const sanitizedRecommendations = rawRecommendations
      .map(r => String(r).trim())
      .filter(r => {
        const lower = r.toLowerCase();
        return !forbiddenKeywords.some(kw => lower.includes(kw));
      })
      .slice(0, 4);

    const safeDefaults = [
      'Monitor sales and enquiry conversion trends regularly.',
      'Review pending follow-ups to maintain customer engagement.',
      'Investigate shops or categories experiencing activity changes.',
      'Maintain consistent customer outreach processes.'
    ];

    while (sanitizedRecommendations.length < 4) {
      const nextDefault = safeDefaults[sanitizedRecommendations.length];
      if (!sanitizedRecommendations.includes(nextDefault)) {
        sanitizedRecommendations.push(nextDefault);
      } else {
        break;
      }
    }

    return res.json({
      success: true,
      period: {
        current: `${currentStart.toISOString().substring(0, 10)} to ${currentEnd.toISOString().substring(0, 10)}`,
        previous: `${previousStart.toISOString().substring(0, 10)} to ${previousEnd.toISOString().substring(0, 10)}`
      },
      metrics,
      shopLeaders,
      aiInsights: {
        summary,
        trends,
        recommendations: sanitizedRecommendations
      }
    });

  } catch (err) {
    console.error('[AI Trends] Unexpected internal error:', err);
    return res.status(500).json({
      success: false,
      error: 'Local AI is currently unavailable.'
    });
  }
});

router.get('/health', requireAuth, async (req, res) => {
  res.json({ status: 'ok', service: 'AI Intelligence Service', timestamp: new Date() });
});

export const aiRouter = router;