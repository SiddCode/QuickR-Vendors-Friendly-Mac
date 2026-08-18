/**
 * WhatsApp Cloud API Service Module
 * Handles Meta Graph API communication, phone number sanitization, mock fallback mode, and security.
 */

export const getWhatsAppConfig = () => {
  const version = process.env.WHATSAPP_API_VERSION || 'v19.0';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
  const appSecret = process.env.WHATSAPP_APP_SECRET || '';

  const configured = Boolean(accessToken && phoneNumberId);

  return {
    configured,
    provider: configured ? 'whatsapp_cloud_api' : 'mock',
    mode: configured ? 'production' : 'development',
    version,
    phoneNumberId,
    businessAccountId,
    // Secret values stay inside this module and are NEVER exported to API responses
    _accessToken: accessToken,
    _verifyToken: verifyToken,
    _appSecret: appSecret
  };
};

export const sanitizePhoneNumber = (phone) => {
  if (!phone) return '';
  // Strip all non-digit characters
  let digits = String(phone).replace(/\D/g, '');
  // Default to Indian country code +91 if 10 digits provided
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
};

export const sendWhatsAppCloudMessage = async (recipientPhone, textMessage) => {
  const config = getWhatsAppConfig();

  // Fallback to Mock Mode if credentials are not configured
  if (!config.configured) {
    return {
      success: true,
      status: 'mock',
      provider: 'mock',
      providerMessageId: `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    };
  }

  const cleanPhone = sanitizePhoneNumber(recipientPhone);
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('Invalid recipient phone number format.');
  }

  const url = `https://graph.facebook.com/${config.version}/${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'text',
    text: { preview_url: false, body: textMessage }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config._accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || `WhatsApp API error (${response.status})`;
      console.error('[WHATSAPP SERVICE ERROR]:', errorMsg);
      return {
        success: false,
        status: 'failed',
        provider: 'whatsapp_cloud_api',
        error: errorMsg
      };
    }

    const providerMessageId = data?.messages?.[0]?.id || `WAMID-${Date.now()}`;
    return {
      success: true,
      status: 'sent',
      provider: 'whatsapp_cloud_api',
      providerMessageId
    };

  } catch (err) {
    console.error('[WHATSAPP SERVICE EXCEPTION]:', err.message);
    return {
      success: false,
      status: 'failed',
      provider: 'whatsapp_cloud_api',
      error: err.message || 'Network exception while connecting to Meta WhatsApp Cloud API'
    };
  }
};
