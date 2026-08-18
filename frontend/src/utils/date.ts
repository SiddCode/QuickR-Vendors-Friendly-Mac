// src/utils/date.ts
// Helper functions to format dates and times in India Standard Time (Asia/Kolkata).
// All timestamps are stored in UTC in MongoDB. These functions convert to IST for display.

export const formatDateIST = (date: Date | string): string => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d);
};

export const formatTimeIST = (date: Date | string): string => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(d);
};

export const formatDateTimeIST = (date: Date | string): string => {
  return `${formatDateIST(date)} ${formatTimeIST(date)}`;
};

/**
 * Calculates scheduled follow-up date based on user selection in IST.
 * Options: 'Today', 'Tomorrow', '3 days' / '3 Days', 'Next week', etc.
 * Adds calendar days (24h * N) in IST without date shifting.
 */
export const calculateFollowUpDateIST = (followUpOption?: string, baseDate: Date = new Date()): Date => {
  const now = new Date(baseDate);
  if (!followUpOption) return now;

  const opt = String(followUpOption).trim().toLowerCase();

  if (opt === 'today') {
    return now;
  }
  if (opt === 'tomorrow') {
    return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  }
  if (opt === '3 days' || opt === '3days' || opt === '3_days') {
    return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  }
  if (opt === 'next week' || opt === 'nextweek' || opt === 'next_week') {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const parsed = new Date(followUpOption);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // Default to tomorrow
};

