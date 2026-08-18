/**
 * Utility for Indian 10-digit mobile number normalization and validation.
 * Canonical stored format: Exactly 10 digits starting with 6, 7, 8, or 9.
 */

export const normalizeIndianMobileNumber = (phoneStr) => {
  if (!phoneStr) return null;
  
  // 1. Convert to string and strip all non-digit characters
  let digits = String(phoneStr).replace(/\D/g, '');

  // 2. Strip leading 0 if present (e.g., 09876543210 -> 9876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // 3. Strip leading 91 Indian country code if present (e.g., 919876543210 -> 9876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  }

  // 4. Validate exact 10-digit length and valid Indian mobile prefix (6, 7, 8, 9)
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  return null;
};
