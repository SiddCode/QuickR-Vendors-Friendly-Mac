import type { Customer, Product, Enquiry, FollowUp, Sale, Activity, Message } from '../types';

const API_BASE_URL = 'http://localhost:53211/api';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  shopId: string;
  role: string;
  shopName: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || `HTTP error ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }
  return response.json();
}

export const api = {
  // Auth
  async register(data: { ownerName: string; shopName: string; email: string; password: string }): Promise<{ user: UserSession; token?: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ user: UserSession; token?: string }>(res);
  },

  async login(data: { email: string; password: string }): Promise<{ user: UserSession; token?: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ user: UserSession; token?: string }>(res);
  },

  async getMe(): Promise<{ user: UserSession }> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<{ user: UserSession }>(res);
  },

  // Today's Work Queue
  async getTodayWork(): Promise<{
    totalTasks: number;
    dueToday: any[];
    overdue: any[];
    upcoming: any[];
    highPriority: any[];
    summary: {
      todayWorkCount: number;
      overdueCount: number;
      enquiriesCount: number;
      recoveredSalesAmount: number;
      convertedCount: number;
    };
  }> {
    const res = await fetch(`${API_BASE_URL}/work/today`, { credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    console.log('========== GET TODAY WORK ==========');
    console.log('FULL RESPONSE keys:', Object.keys(data));
    console.log('dueToday length:', data?.dueToday?.length);
    console.log('overdue length:', data?.overdue?.length);
    console.log('dueToday IDs:', data?.dueToday?.map((t: any) => t.id + ' ' + (t.customer?.name || t.customerId)));
    console.log('overdue IDs:', data?.overdue?.map((t: any) => t.id + ' ' + (t.customer?.name || t.customerId)));
    console.log('summary:', data?.summary);
    console.log('====================================');
    return data;
  },

  async logout(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // Customers
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch(`${API_BASE_URL}/customers`, { credentials: 'include' });
    return handleResponse<Customer[]>(res);
  },

  async getCustomerById(id: string): Promise<Customer> {
    const res = await fetch(`${API_BASE_URL}/customers/${id}`, { credentials: 'include' });
    return handleResponse<Customer>(res);
  },

  async createCustomer(data: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    const res = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<Customer>(res);
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ success: boolean; message?: string }>(res);
  },

  // Products
  async getProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE_URL}/products`, { credentials: 'include' });
    return handleResponse<Product[]>(res);
  },

  async createProduct(data: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<Product>(res);
  },

  async deleteProduct(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // Enquiries
  async getEnquiries(): Promise<Enquiry[]> {
    const res = await fetch(`${API_BASE_URL}/enquiries`, { credentials: 'include' });
    return handleResponse<Enquiry[]>(res);
  },

  async createEnquiry(data: Omit<Enquiry, 'id' | 'createdAt'>): Promise<{ enquiry: Enquiry; followUp: FollowUp | null }> {
    const res = await fetch(`${API_BASE_URL}/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ enquiry: Enquiry; followUp: FollowUp | null }>(res);
  },

  async deleteEnquiry(id: string): Promise<{ success: boolean; deletedEnquiryId?: string }> {
    const res = await fetch(`${API_BASE_URL}/enquiries/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ success: boolean; deletedEnquiryId?: string }>(res);
  },

  // Follow-ups
  async getFollowUps(): Promise<FollowUp[]> {
    const res = await fetch(`${API_BASE_URL}/followups`, { credentials: 'include' });
    return handleResponse<FollowUp[]>(res);
  },

  async getTodayFollowUps(): Promise<FollowUp[]> {
    const res = await fetch(`${API_BASE_URL}/followups/today`, { credentials: 'include' });
    return handleResponse<FollowUp[]>(res);
  },

  async sendFollowUpMessage(id: string, content: string): Promise<{ success: boolean; followUp: FollowUp; message: Message; provider?: string; status?: string }> {
    const res = await fetch(`${API_BASE_URL}/followups/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });
    return handleResponse<{ success: boolean; followUp: FollowUp; message: Message; provider?: string; status?: string }>(res);
  },

  async recordFollowUpOutcome(
    id: string, 
    outcome: string, 
    nextDateStr?: string, 
    scheduleNext?: boolean
  ): Promise<{ success: boolean; followUp: FollowUp }> {
    const res = await fetch(`${API_BASE_URL}/followups/${id}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ outcome, nextDateStr, scheduleNext }),
    });
    return handleResponse<{ success: boolean; followUp: FollowUp }>(res);
  },

  // WhatsApp Cloud API Integration
  async getWhatsAppStatus(): Promise<{ configured: boolean; provider: string; mode: string; version: string }> {
    const res = await fetch(`${API_BASE_URL}/whatsapp/status`, { credentials: 'include' });
    return handleResponse<{ configured: boolean; provider: string; mode: string; version: string }>(res);
  },

  async sendDirectWhatsAppMessage(customerId: string, message: string, followUpId?: string): Promise<{ success: boolean; status: string; provider: string; messageId: string; message: Message; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ customerId, message, followUpId }),
    });
    return handleResponse<{ success: boolean; status: string; provider: string; messageId: string; message: Message; error?: string }>(res);
  },

  // Messages
  async getMessages(customerId?: string): Promise<Message[]> {
    const url = customerId ? `${API_BASE_URL}/messages/${customerId}` : `${API_BASE_URL}/messages`;
    const res = await fetch(url, { credentials: 'include' });
    return handleResponse<Message[]>(res);
  },

  // Sales
  async getSales(): Promise<Sale[]> {
    const res = await fetch(`${API_BASE_URL}/sales`, { credentials: 'include' });
    return handleResponse<Sale[]>(res);
  },

  async createSale(data: Omit<Sale, 'id' | 'createdAt' | 'shopId' | 'invoiceNumber'>): Promise<Sale> {
    const res = await fetch(`${API_BASE_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<Sale>(res);
  },

  async deleteSales(ids: string[]): Promise<{ success: boolean; deletedIds: string[] }> {
    const res = await fetch(`${API_BASE_URL}/sales`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids }),
    });
    return handleResponse<{ success: boolean; deletedIds: string[] }>(res);
  },

  // Activities
  async getActivities(): Promise<Activity[]> {
    const res = await fetch(`${API_BASE_URL}/activities`, { credentials: 'include' });
    return handleResponse<Activity[]>(res);
  },

  // Dashboard analytics
  async getDashboardStats(): Promise<{
    todaySalesCount?: number;
    todayRevenue?: number;
    todayEnquiriesCount?: number;
    todayPurchasesCount?: number;
    todayFollowUpsCount?: number;
    activeFollowUps?: number;
    overdueFollowUps?: number;
    upcomingFollowUps?: number;
    pendingFollowUps?: number;
    totalCustomers?: number;
    totalProducts?: number;
    totalEnquiries?: number;
    followUps: number;
    enquiries: number;
    recoveredSales: number;
    conversions: number;
    conversionRate: number;
    responseRate: number;
  }> {
    const res = await fetch(`${API_BASE_URL}/dashboard`, { credentials: 'include' });
    return handleResponse(res);
  },

  // ═══════════════════════════════════════════════════════════
  // ADMIN APIs
  // ═══════════════════════════════════════════════════════════

  async adminGetStats(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/stats`, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminGetShops(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/admin/shops`, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminCreateShop(data: { shopName: string; ownerName: string; ownerEmail: string; password: string }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/shops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async adminGetShop(shopId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/shops/${shopId}`, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminUpdateShop(shopId: string, data: { name?: string; status?: string }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/shops/${shopId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async adminUpdateShopStatus(shopId: string, status: 'active' | 'disabled'): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/shops/${shopId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  async adminDeleteShop(shopId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/shops/${shopId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async adminGetUsers(shopId?: string, role?: string): Promise<any[]> {
    let url = `${API_BASE_URL}/admin/users`;
    const params = new URLSearchParams();
    if (shopId) params.set('shopId', shopId);
    if (role) params.set('role', role);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminCreateStaff(data: { name: string; email: string; password: string; shopId: string }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/users/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async adminUpdateUser(userId: string, data: { status?: string }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async adminResetPassword(userId: string, newPassword: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ newPassword }),
    });
    return handleResponse(res);
  },

  async adminGetDashboardStats(shopId?: string): Promise<any> {
    const url = shopId ? `${API_BASE_URL}/admin/dashboard?shopId=${encodeURIComponent(shopId)}` : `${API_BASE_URL}/admin/dashboard`;
    const res = await fetch(url, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminGetAggregateDashboardStats(shopId?: string): Promise<{
    success: boolean;
    data: {
      totalShops: number;
      activeShops: number;
      disabledShops: number;
      totalUsers: number;
      activeUsers: number;
      totalProducts: number;
      totalCustomers: number;
      totalEnquiries: number;
      totalFollowUps: number;
      totalSales: number;
    };
  }> {
    const url = shopId ? `${API_BASE_URL}/admin/dashboard-stats?shopId=${encodeURIComponent(shopId)}` : `${API_BASE_URL}/admin/dashboard-stats`;
    const res = await fetch(url, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminGetCustomers(shopId?: string, search?: string): Promise<any[]> {
    let url = `${API_BASE_URL}/admin/customers`;
    const params = new URLSearchParams();
    if (shopId) params.set('shopId', shopId);
    if (search) params.set('search', search);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminGetCustomerDetails(id: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/customers/${id}`, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminGetProducts(shopId?: string, category?: string): Promise<any[]> {
    let url = `${API_BASE_URL}/admin/products`;
    const params = new URLSearchParams();
    if (shopId) params.set('shopId', shopId);
    if (category) params.set('category', category);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminGetEnquiries(filters?: { shopId?: string; interest?: string; purchaseStatus?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    let url = `${API_BASE_URL}/admin/enquiries`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.shopId) params.set('shopId', filters.shopId);
      if (filters.interest) params.set('interest', filters.interest);
      if (filters.purchaseStatus) params.set('purchaseStatus', filters.purchaseStatus);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (params.toString()) url += `?${params.toString()}`;
    }
    const res = await fetch(url, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminGetFollowUps(shopId?: string, filter?: string): Promise<any[]> {
    let url = `${API_BASE_URL}/admin/followups`;
    const params = new URLSearchParams();
    if (shopId) params.set('shopId', shopId);
    if (filter) params.set('filter', filter);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminGetSales(shopId?: string, startDate?: string, endDate?: string): Promise<any> {
    let url = `${API_BASE_URL}/admin/sales`;
    const params = new URLSearchParams();
    if (shopId) params.set('shopId', shopId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await fetch(url, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminGetBilling(shopId?: string): Promise<any[]> {
    const url = shopId ? `${API_BASE_URL}/admin/billing?shopId=${encodeURIComponent(shopId)}` : `${API_BASE_URL}/admin/billing`;
    const res = await fetch(url, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminGetReports(filters?: { shopId?: string; period?: string; startDate?: string; endDate?: string }): Promise<any> {
    let url = `${API_BASE_URL}/admin/reports`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.shopId) params.set('shopId', filters.shopId);
      if (filters.period) params.set('period', filters.period);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (params.toString()) url += `?${params.toString()}`;
    }
    const res = await fetch(url, { credentials: 'include' });
    return handleResponse(res);
  },

  async adminGetActivities(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/admin/activities`, { credentials: 'include' });
    return handleResponse(res);
  },

  async generateFollowUpMessage(data: {
    customerName?: string;
    productName?: string;
    interest?: string;
    purchaseStatus?: string;
    followUpReason?: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/ai/followup-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; message?: string; error?: string }>(res);
  },

  async generateCustomerIntelligence(customerId: string): Promise<{
    success: boolean;
    intelligence?: {
      leadLevel: 'HOT' | 'WARM' | 'COLD' | 'LOW_PRIORITY';
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
      reason: string;
      recommendedAction: string;
      recommendedTiming: 'TODAY' | 'TOMORROW' | 'WITHIN_3_DAYS' | 'WAIT' | 'NO_FOLLOW_UP';
    };
    error?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/ai/customer-intelligence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ customerId }),
    });
    return handleResponse<{
      success: boolean;
      intelligence?: {
        leadLevel: 'HOT' | 'WARM' | 'COLD' | 'LOW_PRIORITY';
        confidence: 'HIGH' | 'MEDIUM' | 'LOW';
        reason: string;
        recommendedAction: string;
        recommendedTiming: 'TODAY' | 'TOMORROW' | 'WITHIN_3_DAYS' | 'WAIT' | 'NO_FOLLOW_UP';
      };
      error?: string;
    }>(res);
  },

  async generateSalesOpportunity(customerId: string): Promise<{
    success: boolean;
    opportunity?: {
      opportunityScore: number;
      leadLevel: 'HOT' | 'WARM' | 'COLD' | 'LOW_PRIORITY';
      recommendedAction: string;
      recommendedTiming: 'TODAY' | 'TOMORROW' | 'WITHIN_3_DAYS' | 'WAIT' | 'NO_FOLLOW_UP';
      reason: string;
    };
    error?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/ai/sales-opportunity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ customerId }),
    });
    return handleResponse<{
      success: boolean;
      opportunity?: {
        opportunityScore: number;
        leadLevel: 'HOT' | 'WARM' | 'COLD' | 'LOW_PRIORITY';
        recommendedAction: string;
        recommendedTiming: 'TODAY' | 'TOMORROW' | 'WITHIN_3_DAYS' | 'WAIT' | 'NO_FOLLOW_UP';
        reason: string;
      };
      error?: string;
    }>(res);
  },

  async generateShopInsights(): Promise<{
    success: boolean;
    shopInsights?: {
      summary: string;
      insights: Array<{
        type: 'SALES_OPPORTUNITY' | 'PRODUCT' | 'FOLLOW_UP' | 'CUSTOMER' | 'CONVERSION' | 'GENERAL';
        title: string;
        description: string;
      }>;
      recommendations: string[];
      stats?: any;
    };
    error?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/ai/shop-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse<{
      success: boolean;
      shopInsights?: {
        summary: string;
        insights: Array<{
          type: 'SALES_OPPORTUNITY' | 'PRODUCT' | 'FOLLOW_UP' | 'CUSTOMER' | 'CONVERSION' | 'GENERAL';
          title: string;
          description: string;
        }>;
        recommendations: string[];
        stats?: any;
      };
      error?: string;
    }>(res);
  },

  async generateAdminInsights(): Promise<{
    success: boolean;
    stats?: {
      totalShops: number;
      activeShops: number;
      disabledShops: number;
      totalCustomers: number;
      totalEnquiries: number;
      totalPurchasedEnquiries: number;
      totalNotPurchasedEnquiries: number;
      totalFollowUps: number;
      pendingFollowUps: number;
      completedFollowUps: number;
      totalSales: number;
      totalSalesAmount: number;
    };
    shopPerformance?: Array<{
      shopId: string;
      shopName: string;
      customers: number;
      enquiries: number;
      purchases: number;
      salesAmount: number;
      pendingFollowUps: number;
      conversionRate: number;
    }>;
    aiInsights?: {
      summary: string;
      insights: Array<{
        type: 'TOP_PERFORMER' | 'ATTENTION' | 'OPPORTUNITY' | 'CONVERSION' | 'FOLLOW_UP' | 'SALES' | 'GENERAL';
        title: string;
        description: string;
      }>;
      recommendations: string[];
    };
    error?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/ai/admin-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse<{
      success: boolean;
      stats?: {
        totalShops: number;
        activeShops: number;
        disabledShops: number;
        totalCustomers: number;
        totalEnquiries: number;
        totalPurchasedEnquiries: number;
        totalNotPurchasedEnquiries: number;
        totalFollowUps: number;
        pendingFollowUps: number;
        completedFollowUps: number;
        totalSales: number;
        totalSalesAmount: number;
      };
      shopPerformance?: Array<{
        shopId: string;
        shopName: string;
        customers: number;
        enquiries: number;
        purchases: number;
        salesAmount: number;
        pendingFollowUps: number;
        conversionRate: number;
      }>;
      aiInsights?: {
        summary: string;
        insights: Array<{
          type: 'TOP_PERFORMER' | 'ATTENTION' | 'OPPORTUNITY' | 'CONVERSION' | 'FOLLOW_UP' | 'SALES' | 'GENERAL';
          title: string;
          description: string;
        }>;
        recommendations: string[];
      };
      error?: string;
    }>(res);
  },

  async generateTrends(): Promise<{
    success: boolean;
    period?: {
      current: string;
      previous: string;
    };
    metrics?: {
      salesCount: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
      salesAmount: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
      enquiries: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
      purchases: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
      conversionRate: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
      followUpsCreated: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
      followUpsCompleted: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
      followUpsPending: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
      newCustomers: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
    };
    shopLeaders?: {
      fastestImproving: Array<{ shopName: string; salesChangePercent: number | null }>;
      decliningActivity: Array<{ shopName: string; salesChangePercent: number | null }>;
      improvingConversion: Array<{ shopName: string; conversionChangePercent: number | null }>;
      highestPendingFollowups: Array<{ shopName: string; pendingFollowUps: number }>;
    };
    aiInsights?: {
      summary: string;
      trends: Array<{
        type: 'SALES' | 'REVENUE' | 'ENQUIRY' | 'CONVERSION' | 'FOLLOW_UP' | 'CUSTOMER' | 'SHOP_ACTIVITY' | 'GENERAL';
        title: string;
        description: string;
        direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA';
        importance: 'HIGH' | 'MEDIUM' | 'LOW';
      }>;
      recommendations: string[];
    };
    error?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/ai/trends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse<{
      success: boolean;
      period?: {
        current: string;
        previous: string;
      };
      metrics?: {
        salesCount: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
        salesAmount: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
        enquiries: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
        purchases: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
        conversionRate: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
        followUpsCreated: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
        followUpsCompleted: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
        followUpsPending: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
        newCustomers: { metric: string; current: number; previous: number; changePercent: number | null; direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA' };
      };
      shopLeaders?: {
        fastestImproving: Array<{ shopName: string; salesChangePercent: number | null }>;
        decliningActivity: Array<{ shopName: string; salesChangePercent: number | null }>;
        improvingConversion: Array<{ shopName: string; conversionChangePercent: number | null }>;
        highestPendingFollowups: Array<{ shopName: string; pendingFollowUps: number }>;
      };
      aiInsights?: {
        summary: string;
        trends: Array<{
          type: 'SALES' | 'REVENUE' | 'ENQUIRY' | 'CONVERSION' | 'FOLLOW_UP' | 'CUSTOMER' | 'SHOP_ACTIVITY' | 'GENERAL';
          title: string;
          description: string;
          direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA';
          importance: 'HIGH' | 'MEDIUM' | 'LOW';
        }>;
        recommendations: string[];
      };
      error?: string;
    }>(res);
  },

  async generateFollowUpPriorities(): Promise<{
    success: boolean;
    priorities?: Array<{
      followUpId: string;
      customerId: string;
      customerName: string;
      scheduledAt: string;
      priorityScore: number;
      leadLevel: 'HOT' | 'WARM' | 'COLD' | 'LOW_PRIORITY';
      recommendedAction: string;
      reason: string;
    }>;
    error?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/ai/followup-priorities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse<{
      success: boolean;
      priorities?: Array<{
        followUpId: string;
        customerId: string;
        customerName: string;
        scheduledAt: string;
        priorityScore: number;
        leadLevel: 'HOT' | 'WARM' | 'COLD' | 'LOW_PRIORITY';
        recommendedAction: string;
        reason: string;
      }>;
      error?: string;
    }>(res);
  },

  async exportSalesReport(options: { period: 'today' | 'week' | 'month' | 'custom'; startDate?: string; endDate?: string }): Promise<void> {
    const params = new URLSearchParams();
    params.set('period', options.period);
    if (options.startDate) params.set('startDate', options.startDate);
    if (options.endDate) params.set('endDate', options.endDate);

    const url = `${API_BASE_URL}/sales/export?${params.toString()}`;
    const res = await fetch(url, { credentials: 'include' });

    if (!res.ok) {
      let errMsg = 'Unable to generate sales report.';
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) errMsg = errJson.error;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = `QuickR_Sales_${options.period}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async exportBusinessReport(options: {
    type: 'customers' | 'enquiries' | 'followups' | 'products' | 'summary' | 'sales';
    period: 'today' | 'week' | 'month' | 'custom';
    startDate?: string;
    endDate?: string;
  }): Promise<void> {
    const params = new URLSearchParams();
    params.set('type', options.type);
    params.set('period', options.period);
    if (options.startDate) params.set('startDate', options.startDate);
    if (options.endDate) params.set('endDate', options.endDate);

    const url = `${API_BASE_URL}/reports/export?${params.toString()}`;
    const res = await fetch(url, { credentials: 'include' });

    if (!res.ok) {
      let errMsg = 'Unable to generate business report.';
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) errMsg = errJson.error;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = `QuickR_${options.type.toUpperCase()}_Report_${options.period}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // Subscription Requests
  async submitSubscriptionRequest(data: {
    name: string;
    shopName: string;
    phone: string;
    email: string;
    requestedPlan?: string;
    message?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/subscription-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async adminGetSubscriptionRequests(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/admin/subscription-requests`, { credentials: 'include' });
    return handleResponse<any[]>(res);
  },

  async adminApproveSubscriptionRequest(id: string, adminNotes?: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/subscription-requests/${id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ adminNotes }),
    });
    return handleResponse<any>(res);
  },

  async adminRejectSubscriptionRequest(id: string, adminNotes?: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/subscription-requests/${id}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ adminNotes }),
    });
    return handleResponse<any>(res);
  },

  async adminDeleteSubscriptionRequests(ids: string[]): Promise<{ success: boolean; message: string; deletedCount: number }> {
    const res = await fetch(`${API_BASE_URL}/admin/subscription-requests`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ids }),
    });
    return handleResponse<{ success: boolean; message: string; deletedCount: number }>(res);
  },

  // Shop Profile
  async getShopProfile(): Promise<{ customId: string; name: string; phone: string; address?: string; status: string; subscriptionStatus: string }> {
    const res = await fetch(`${API_BASE_URL}/shop/profile`, { credentials: 'include' });
    return handleResponse<{ customId: string; name: string; phone: string; address?: string; status: string; subscriptionStatus: string }>(res);
  },

  async updateShopProfile(data: { name?: string; phone?: string }): Promise<{ success: boolean; message: string; shop: any }> {
    const res = await fetch(`${API_BASE_URL}/shop/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; message: string; shop: any }>(res);
  },

  // ─── Privacy & Data Layer APIs ───
  async getPrivacyNotice(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/privacy/notice`, { credentials: 'include' });
    return handleResponse<any>(res);
  },

  async getConsentHistory(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/privacy/consent`, { credentials: 'include' });
    return handleResponse<any[]>(res);
  },

  async withdrawConsent(purpose: string): Promise<{ success: boolean; consent: any }> {
    const res = await fetch(`${API_BASE_URL}/privacy/consent/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ purpose }),
    });
    return handleResponse<{ success: boolean; consent: any }>(res);
  },

  async grantConsent(purpose: string): Promise<{ success: boolean; consent: any }> {
    const res = await fetch(`${API_BASE_URL}/privacy/consent/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ purpose }),
    });
    return handleResponse<{ success: boolean; consent: any }>(res);
  },

  async getMyData(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/privacy/my-data`, { credentials: 'include' });
    return handleResponse<any>(res);
  },

  async exportMyData(): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/privacy/export`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to export personal data.');
    return res.blob();
  },

  async deleteAccount(confirmationText: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/privacy/delete-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ confirmationText }),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async getPrivacyRequests(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/privacy/requests`, { credentials: 'include' });
    return handleResponse<any[]>(res);
  },

  async createPrivacyRequest(requestType: string, description: string): Promise<{ success: boolean; request: any }> {
    const res = await fetch(`${API_BASE_URL}/privacy/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ requestType, description }),
    });
    return handleResponse<{ success: boolean; request: any }>(res);
  },

  async getAdminPrivacyRequests(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/privacy/admin/requests`, { credentials: 'include' });
    return handleResponse<any[]>(res);
  },

  async updateAdminPrivacyRequest(id: string, data: { status?: string; adminNotes?: string }): Promise<{ success: boolean; request: any }> {
    const res = await fetch(`${API_BASE_URL}/privacy/admin/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; request: any }>(res);
  },

  async getAdminPrivacyAuditLogs(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/privacy/admin/audit-logs`, { credentials: 'include' });
    return handleResponse<any[]>(res);
  },

  async getAdminSecurityIncidents(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/privacy/admin/incidents`, { credentials: 'include' });
    return handleResponse<any[]>(res);
  },

  async recordAdminSecurityIncident(data: { severity?: string; description: string; affectedSystem?: string; affectedDataCategories?: string[]; containmentAction?: string }): Promise<{ success: boolean; incident: any }> {
    const res = await fetch(`${API_BASE_URL}/privacy/admin/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; incident: any }>(res);
  },

  async getShopActivitySecurity(): Promise<{ success: boolean; shopId: string; activities: any[] }> {
    const res = await fetch(`${API_BASE_URL}/privacy/activity-security`, { credentials: 'include' });
    return handleResponse<{ success: boolean; shopId: string; activities: any[] }>(res);
  },

  async runRetentionCleanup(): Promise<{ success: boolean; deletedTechnicalLogsCount: number; note: string }> {
    const res = await fetch(`${API_BASE_URL}/privacy/cleanup-retention`, {
      method: 'POST',
      credentials: 'include'
    });
    return handleResponse<{ success: boolean; deletedTechnicalLogsCount: number; note: string }>(res);
  },

  async getCampaigns(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/campaigns`, { credentials: 'include' });
    return handleResponse<any[]>(res);
  },

  async getCampaignById(id: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}`, { credentials: 'include' });
    return handleResponse<any>(res);
  },

  async uploadCampaignMedia(file: File, mediaType: 'image' | 'video'): Promise<{ success: boolean; temporaryMediaReference: string; fileName: string; originalName: string }> {
    const res = await fetch(`${API_BASE_URL}/campaigns/upload-media`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
        'x-media-type': mediaType,
        'x-file-name': file.name
      },
      credentials: 'include',
      body: file
    });
    return handleResponse<{ success: boolean; temporaryMediaReference: string; fileName: string; originalName: string }>(res);
  },

  async getTargetingCustomers(filterType: string = 'all_eligible', productId?: string): Promise<{ success: boolean; eligibleCount: number; ineligibleCount: number; eligibleCustomers: any[]; ineligibleCustomers: any[] }> {
    const params = new URLSearchParams({ filterType });
    if (productId) params.append('productId', productId);
    const res = await fetch(`${API_BASE_URL}/campaigns/targeting-customers?${params.toString()}`, { credentials: 'include' });
    return handleResponse<{ success: boolean; eligibleCount: number; ineligibleCount: number; eligibleCustomers: any[]; ineligibleCustomers: any[] }>(res);
  },

  async createCampaign(data: any): Promise<{ success: boolean; campaign: any }> {
    const res = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return handleResponse<{ success: boolean; campaign: any }>(res);
  },

  async getWhatsAppProviderStatus(): Promise<{ configured: boolean; status: string; provider: string; mode: string; version: string; phoneNumberId: string; templateName: string }> {
    const res = await fetch(`${API_BASE_URL}/campaigns/provider-status`, { credentials: 'include' });
    return handleResponse<{ configured: boolean; status: string; provider: string; mode: string; version: string; phoneNumberId: string; templateName: string }>(res);
  },

  async sendCampaign(id: string): Promise<{ success: boolean; campaignId: string; status: string; summary: { total: number; sent: number; failed: number; skipped: number } }> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/send`, {
      method: 'POST',
      credentials: 'include'
    });
    return handleResponse<{ success: boolean; campaignId: string; status: string; summary: { total: number; sent: number; failed: number; skipped: number } }>(res);
  },

  async getCampaignRecipients(id: string): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/recipients`, { credentials: 'include' });
    return handleResponse<any[]>(res);
  },

  async getManualCampaignTargets(id: string): Promise<{ success: boolean; campaignId: string; totalTargets: number; targets: any[] }> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/manual-targets`, { credentials: 'include' });
    return handleResponse<{ success: boolean; campaignId: string; totalTargets: number; targets: any[] }>(res);
  },

  async markManualRecipientSent(id: string, customerId: string): Promise<{ success: boolean; recipient: any }> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/mark-manual-sent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ customerId })
    });
    return handleResponse<{ success: boolean; recipient: any }>(res);
  },

  async skipManualRecipient(id: string, customerId: string): Promise<{ success: boolean; recipient: any }> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/skip-recipient`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ customerId })
    });
    return handleResponse<{ success: boolean; recipient: any }>(res);
  },

  async recordCampaignResponse(id: string, customerId: string, responseType: string, notes?: string, scheduledFollowUpDate?: string, followUpNotes?: string): Promise<{ success: boolean; campaignResponse: any; enquiryId: string; followUpId: string }> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/record-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ customerId, responseType, notes, scheduledFollowUpDate, followUpNotes })
    });
    return handleResponse<{ success: boolean; campaignResponse: any; enquiryId: string; followUpId: string }>(res);
  },

  async getCampaignResponses(id: string): Promise<{ success: boolean; totalResponses: number; summary: Record<string, number>; responses: any[] }> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/responses`, { credentials: 'include' });
    return handleResponse<{ success: boolean; totalResponses: number; summary: Record<string, number>; responses: any[] }>(res);
  },

  async getCustomerCampaignHistory(customerId: string): Promise<{ success: boolean; customerId: string; history: any[] }> {
    const res = await fetch(`${API_BASE_URL}/campaigns/customer/${customerId}/history`, { credentials: 'include' });
    return handleResponse<{ success: boolean; customerId: string; history: any[] }>(res);
  },

  async getCustomerOfferPermission(customerId: string): Promise<{ success: boolean; customerId: string; allowWhatsAppOffers: boolean; status: string }> {
    const res = await fetch(`${API_BASE_URL}/privacy/customers/${customerId}/permission`, { credentials: 'include' });
    return handleResponse<{ success: boolean; customerId: string; allowWhatsAppOffers: boolean; status: string }>(res);
  },

  async setCustomerOfferPermission(customerId: string, allowWhatsAppOffers: boolean): Promise<{ success: boolean; customerId: string; allowWhatsAppOffers: boolean; status: string }> {
    const res = await fetch(`${API_BASE_URL}/privacy/customers/${customerId}/permission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ allowWhatsAppOffers })
    });
    return handleResponse<{ success: boolean; customerId: string; allowWhatsAppOffers: boolean; status: string }>(res);
  },

  async getReengagementSummary(days: string = '60'): Promise<{ success: boolean; potentialCustomers: number; withPhone: number; offerPermission: number; whatsappEligible: number; recommendedCount: number }> {
    const res = await fetch(`${API_BASE_URL}/reengagement/summary?days=${days}`, { credentials: 'include' });
    return handleResponse<{ success: boolean; potentialCustomers: number; withPhone: number; offerPermission: number; whatsappEligible: number; recommendedCount: number }>(res);
  },

  async getReengagementCustomers(days: string = '60', productId?: string, permission: string = 'ALL', phone: string = 'ALL'): Promise<{ success: boolean; totalPotential: number; whatsappEligibleCount: number; notEligibleCount: number; customers: any[] }> {
    const query = new URLSearchParams({ days, permission, phone });
    if (productId) query.append('productId', productId);
    const res = await fetch(`${API_BASE_URL}/reengagement/customers?${query.toString()}`, { credentials: 'include' });
    return handleResponse<{ success: boolean; totalPotential: number; whatsappEligibleCount: number; notEligibleCount: number; customers: any[] }>(res);
  },

  async getCampaignAnalytics(id: string): Promise<{ success: boolean; analytics: any }> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/analytics`, { credentials: 'include' });
    return handleResponse<{ success: boolean; analytics: any }>(res);
  },

  async getCampaignAnalyticsSummary(): Promise<{ success: boolean; summaries: any[] }> {
    const res = await fetch(`${API_BASE_URL}/campaigns/analytics/summary`, { credentials: 'include' });
    return handleResponse<{ success: boolean; summaries: any[] }>(res);
  }
};
