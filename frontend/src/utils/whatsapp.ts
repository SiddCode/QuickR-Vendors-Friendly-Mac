/**
 * Helper utility to sanitize phone numbers and open WhatsApp wa.me links.
 */

export const sanitizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
};

export const buildWhatsAppMessage = (
  shopName: string,
  customerName?: string,
  message?: string
): string => {
  const cleanShop = (shopName || '').trim();
  if (!cleanShop) return '';

  let cleanMsg = (message || '').trim();
  if (!cleanMsg) return '';

  // Clean emojis, (N/A), placeholders, and signature lines from body while preserving line breaks
  cleanMsg = cleanMsg
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{FF00}-\u{FFEF}]/gu, '')
    .replace(/\(N\/A\)/gi, '')
    .replace(/\bN\/A\b/gi, '')
    .replace(/\[Shop Name\]/gi, '')
    .replace(/\[Customer Name\]/gi, '')
    .replace(/—\s*Shop Name/gi, '')
    .replace(/—\s*[A-Za-z0-9\s]+$/gi, '')
    .trim();

  // If the message is ALREADY a pre-formatted full bill containing Invoice: or ITEMS, ensure shop identity header
  if (cleanMsg.includes('Invoice:') || cleanMsg.includes('ITEMS')) {
    // If it already has greeting at the top, return cleanMsg
    if (/^Hi\s+[^!\n]+!\s+This is\s+[^.\n]+\./i.test(cleanMsg) || /^Hi!\s+This is\s+[^.\n]+\./i.test(cleanMsg)) {
      return cleanMsg;
    }
  }

  // Aggressively strip any existing greetings or identity headers from top of message body
  // Handles patterns like "Hi Sidd K,", "Hi Sidd K!", "Hi Sidd K! This is Sidd Clothes.", "Hi Ram, hope you're well! Just checking in..."
  cleanMsg = cleanMsg
    .replace(/^(Hi\s+[^!\n,]+[!,]\s*(This is\s+[^.\n]+\.)?(\s*hope you're [^\n,!]+[!,]?)?(\s*Just checking in[^\n.]*\.?)?)\s*/i, '')
    .replace(/^Hi\s+[A-Za-z0-9\s]+!\s*/i, '')
    .replace(/^Hi\s+[A-Za-z0-9\s]+,\s*/i, '')
    .replace(/^Hi!\s*/i, '')
    .replace(/^This is\s+[A-Za-z0-9\s]+\.\s*/i, '')
    .trim();

  const cleanCust = customerName && customerName.trim() && customerName.trim() !== 'Customer' ? customerName.trim() : '';

  const greetingHeader = cleanCust
    ? `Hi ${cleanCust}! This is ${cleanShop}.`
    : `Hi! This is ${cleanShop}.`;

  return `${greetingHeader}\n\n${cleanMsg}`;
};

export const openWhatsApp = (
  phone: string,
  textMessage: string,
  shopName?: string,
  customerName?: string
): boolean => {
  if (!shopName || !shopName.trim()) {
    alert('Unable to open WhatsApp because your shop name is unavailable. Please refresh and try again.');
    return false;
  }

  const cleanPhone = sanitizePhoneNumber(phone);
  if (!cleanPhone) {
    alert('Please enter a valid 10-digit mobile number.');
    return false;
  }

  const finalMessage = buildWhatsAppMessage(shopName.trim(), customerName, textMessage);
  if (!finalMessage) {
    alert('Unable to generate WhatsApp message.');
    return false;
  }

  const encoded = encodeURIComponent(finalMessage);
  const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};

export const buildWhatsAppBillMessage = (
  shopName: string,
  customerName: string,
  sale: {
    invoiceNumber: string;
    createdAt?: string | Date;
    items: Array<{ productName: string; quantity: number; rate?: number; total: number }>;
    subtotal: number;
    discount?: number;
    totalAmount: number;
    paymentMethod: string;
  }
): string => {
  let cleanShop = (shopName || 'QuickR Shop').trim();
  let cleanCust = (customerName || 'Customer').trim();

  // Strip emojis from customer name and shop name
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{FF00}-\u{FFEF}]/gu;
  cleanShop = cleanShop.replace(emojiRegex, '').trim() || 'QuickR Shop';
  cleanCust = cleanCust.replace(emojiRegex, '').trim() || 'Customer';

  // Date formatting: DD Mon YYYY (e.g. 18 Aug 2026)
  const d = sale.createdAt ? new Date(sale.createdAt) : new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = months[d.getMonth()];
  const yearStr = d.getFullYear();
  const formattedDate = `${dayStr} ${monthStr} ${yearStr}`;

  // Multi-line item list array: Product Name x Quantity = Rs.LineTotal
  const itemLines = (sale.items || []).map(i => {
    let pName = (i.productName || 'Item').replace(/\(N\/A\)/gi, '').replace(/\bN\/A\b/gi, '').trim() || 'Item';
    pName = pName.replace(emojiRegex, '').trim();
    const qty = i.quantity || 1;
    const lineTotal = (i.total !== undefined ? i.total : (i.rate || 0) * qty);
    return `${pName} x ${qty} = Rs.${lineTotal.toLocaleString('en-IN')}`;
  });

  // Discount percentage & amount calculations
  const subtotalVal = sale.subtotal !== undefined ? sale.subtotal : sale.totalAmount;
  const discountAmt = sale.discount !== undefined ? sale.discount : 0;
  
  let discountPct = 0;
  if (discountAmt > 0 && subtotalVal > 0) {
    discountPct = Math.round((discountAmt / subtotalVal) * 100);
  }

  const grandTotal = sale.totalAmount !== undefined ? sale.totalAmount : Math.max(0, subtotalVal - discountAmt);
  const paymentMethodStr = (sale.paymentMethod || 'Cash').trim();

  // Construct array of lines joined with explicit '\n'
  const messageLines = [
    `Hi ${cleanCust}! This is ${cleanShop}.`,
    "",
    "Thank you for your purchase.",
    "",
    `Invoice: ${sale.invoiceNumber}`,
    `Date: ${formattedDate}`,
    "",
    "ITEMS",
    ...itemLines,
    "",
    `Subtotal: Rs.${subtotalVal.toLocaleString('en-IN')}`,
    `Discount: ${discountPct}%`,
    `Discount Amount: Rs.${discountAmt.toLocaleString('en-IN')}`,
    `TOTAL: Rs.${grandTotal.toLocaleString('en-IN')}`,
    "",
    `Payment Method: ${paymentMethodStr}`,
    "",
    "Thank you for shopping with us!"
  ];

  return messageLines.join('\n');
};
