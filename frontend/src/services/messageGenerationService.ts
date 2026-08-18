
export const messageGenerationService = {
  generateWhatsAppMessage(_customerName: string, productName?: string, size?: string): string {
    const validProd = productName && productName !== 'N/A' && productName !== 'General Item' ? productName : '';
    const sizeStr = size && size !== 'N/A' && size !== 'Free Size' ? ` (${size})` : '';
    if (validProd) {
      return `Good to see your interest in our ${validProd}${sizeStr}. It is currently available and ready for you. Would you like to place an order or need help with anything?`;
    }
    return `Good to see your interest in our items. They are currently available and ready for you. Would you like to place an order or need help with anything?`;
  },

  generateFollowUpQuickMessage(_customerName: string, productName?: string, size?: string): string {
    const validProd = productName && productName !== 'N/A' && productName !== 'General Item' ? productName : '';
    const sizeStr = size && size !== 'N/A' && size !== 'Free Size' ? ` in ${size}` : '';
    if (validProd) {
      return `The ${validProd}${sizeStr} you were looking for is available. Would you like us to keep it aside for you?`;
    }
    return `The item you were looking for is currently available. Would you like us to keep it aside for you?`;
  }
};
