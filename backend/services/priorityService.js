/**
 * QuickR Priority & Recommendation Engine Service
 * Calculates task priority (HIGH, MEDIUM, LOW) and human-readable explanation logic.
 */

export const calculatePriorityAndReason = (followUp, enquiry, customer, product) => {
  let score = 0;
  const reasons = [];

  const now = new Date();
  const scheduledDate = followUp && followUp.scheduledAt ? new Date(followUp.scheduledAt) : now;
  const diffTime = now.getTime() - scheduledDate.getTime();
  const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // 1. Overdue scoring
  if (daysOverdue > 0) {
    score += Math.min(daysOverdue * 25, 50);
    reasons.push(`Follow-up is ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} overdue`);
  }

  // 2. Customer interest level
  if (enquiry?.interest === 'Very Interested') {
    score += 30;
    reasons.push('Customer expressed high interest');
  } else if (enquiry?.interest === 'Interested') {
    score += 20;
    reasons.push('Customer showed interest but hasn\'t purchased');
  }

  // 3. Purchase history
  if (customer?.totalPurchases > 0) {
    score += 25;
    reasons.push('Repeat customer with previous purchase history');
  }

  // 4. Product availability
  if (product?.availableQuantity > 0) {
    score += 15;
    reasons.push(`Item (${product.name}) is in stock (${product.availableQuantity} left)`);
  }

  // 5. Recent enquiry recency
  if (enquiry?.createdAt) {
    const enquiryDate = new Date(enquiry.createdAt);
    const enqAgeDays = Math.floor((now.getTime() - enquiryDate.getTime()) / (1000 * 60 * 60 * 24));
    if (enqAgeDays <= 2) {
      score += 15;
      reasons.push('Enquiry received recently');
    }
  }

  // Map score to priority level
  let priority = 'Low';
  if (score >= 60 || daysOverdue >= 1) {
    priority = 'High';
  } else if (score >= 35) {
    priority = 'Medium';
  }

  // Human-readable primary explanation
  let explanation = reasons[0] || 'Scheduled customer follow-up';
  if (reasons.length >= 2) {
    explanation = `${reasons[0]} and ${reasons[1].toLowerCase()}.`;
  } else {
    explanation = `${explanation}.`;
  }

  return {
    score,
    priority,
    daysOverdue: Math.max(0, daysOverdue),
    reason: explanation
  };
};
