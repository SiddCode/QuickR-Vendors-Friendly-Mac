export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  shopId: string;
}

export interface Shop {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  shopId?: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  allowWhatsAppOffers?: boolean;
  preferences: {
    interestedIn?: string;
    preferredSize?: string;
    preferredColors?: string[];
    lastPurchase?: string;
  };
  status: 'Active' | 'Inactive' | 'Lead';
  createdAt: string;
  totalPurchases?: number;
  totalSpending?: number;
  conversionRate?: number;
}

export interface Product {
  id: string;
  shopId?: string;
  name: string;
  category: string;
  subcategory?: string;
  sellingPrice: number;
  originalPrice?: number;
  sizes: string[];
  colors: string[];
  availability: number;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  shopId?: string;
  customerId: string;
  productId: string;
  productName?: string;
  productCategory?: string;
  priceAtEnquiry?: number;
  size: string;
  color: string;
  quantity: number;
  interest: 'Just Enquiring' | 'Interested' | 'Very Interested';
  purchaseStatus: 'Pending' | 'Purchased' | "Didn't Purchase";
  notes?: string;
  scheduledAt?: string | Date;
  followUpDate?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  shopId: string;
  customerId: string;
  enquiryId?: string;
  followUpId?: string;
  channel: 'whatsapp';
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'mock';
  provider?: 'whatsapp_cloud_api' | 'mock';
  providerMessageId?: string;
  error?: string;
  sentAt: string;
  responseStatus?: 'No Response' | 'Replied' | 'Awaiting';
  createdAt: string;
}

export interface FollowUp {
  id: string;
  shopId: string;
  customerId: string;
  enquiryId: string;
  reason: string;
  scheduledAt: string;
  status: 'scheduled' | 'ready' | 'sent' | 'waiting' | 'completed' | 'snoozed' | 'closed';
  message: string;
  priority: 'High' | 'Medium' | 'Low';
  messageId?: string;
  completedAt?: string;
  outcome?: 'Purchased' | 'Still Interested' | 'Not Interested' | 'No Response';
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface Sale {
  id: string;
  shopId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  enquiryId?: string;
  followUpId?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  source: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  shopId: string;
  customerId: string;
  type: 'enquiry_created' | 'followup_created' | 'message_sent' | 'customer_replied' | 'followup_completed' | 'sale_created' | 'customer_marked_not_interested' | 'note_added' | 'customer_added';
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Note {
  id: string;
  customerId: string;
  content: string;
  createdAt: string;
}
