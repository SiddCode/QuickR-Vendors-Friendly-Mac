import type { Enquiry, Customer, Product } from '../types';

export interface Recommendation {
  customerId: string;
  enquiryId: string;
  productId: string;
  reason: string;
  priority: 'High' | 'Medium' | 'Low';
  recommendedDate: string;
}

export const recommendationService = {
  getRecommendation(enquiry: Enquiry, customer: Customer, product: Product): Recommendation | null {
    // If interest is Interested and purchaseStatus is Didn't Purchase or Pending
    if (
      (enquiry.interest === 'Interested' || enquiry.interest === 'Very Interested') &&
      enquiry.purchaseStatus === "Didn't Purchase"
    ) {
      // Determine priority
      let priority: 'High' | 'Medium' | 'Low' = 'Medium';
      
      // If customer has purchased before (Active status) or has many enquiries, mark High
      if (customer.status === 'Active') {
        priority = 'High';
      } else if (enquiry.interest === 'Very Interested') {
        priority = 'High';
      }

      // Recommend follow-up today (since it is Didn't Purchase and they were interested)
      const today = new Date().toISOString().split('T')[0];

      return {
        customerId: customer.id,
        enquiryId: enquiry.id,
        productId: product.id,
        reason: `${customer.name} showed interest in ${product.name} (${enquiry.size}) but didn't purchase.`,
        priority,
        recommendedDate: today,
      };
    }
    
    // If pending enquiry, remind after 1 day
    if (enquiry.purchaseStatus === 'Pending') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      return {
        customerId: customer.id,
        enquiryId: enquiry.id,
        productId: product.id,
        reason: `Pending enquiry response for ${product.name} (${enquiry.size}).`,
        priority: 'Low',
        recommendedDate: tomorrowStr,
      };
    }

    return null;
  },

  analyzePreferences(customerEnquiries: Enquiry[]): { preferredSize?: string, preferredColors?: string[] } {
    if (customerEnquiries.length === 0) return {};

    const sizesCount: Record<string, number> = {};
    const colorsCount: Record<string, number> = {};

    customerEnquiries.forEach(e => {
      if (e.size) {
        sizesCount[e.size] = (sizesCount[e.size] || 0) + 1;
      }
      if (e.color) {
        colorsCount[e.color] = (colorsCount[e.color] || 0) + 1;
      }
    });

    // Find most common size
    let preferredSize = '';
    let maxSizes = 0;
    Object.entries(sizesCount).forEach(([size, count]) => {
      if (count > maxSizes) {
        maxSizes = count;
        preferredSize = size;
      }
    });

    // Find colors that appeared at least once, sorted by count
    const preferredColors = Object.entries(colorsCount)
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color)
      .slice(0, 3); // top 3 colors

    return {
      preferredSize: preferredSize || undefined,
      preferredColors: preferredColors.length > 0 ? preferredColors : undefined
    };
  }
};
