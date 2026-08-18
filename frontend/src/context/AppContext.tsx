import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Customer, Product, Enquiry, FollowUp, Sale, Activity, Note, Message } from '../types';
import { api, type UserSession } from '../services/api';

interface AppContextType {
  currentUser: UserSession | null;
  isAuthenticated: boolean;
  customers: Customer[];
  products: Product[];
  enquiries: Enquiry[];
  followUps: FollowUp[];
  sales: Sale[];
  activities: Activity[];
  notes: Note[];
  messages: Message[];
  todayWork: {
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
  } | null;
  shopName: string;
  isLoading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<boolean>;
  register: (ownerName: string, shopName: string, email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<Product | null>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer | null>;
  deleteCustomer: (id: string) => Promise<boolean>;
  addEnquiry: (enquiry: Omit<Enquiry, 'id' | 'createdAt'>) => Promise<Enquiry | null>;
  deleteEnquiry: (id: string) => Promise<boolean>;
  updateEnquiry: (id: string, updates: Partial<Enquiry>) => Promise<void>;
  updateFollowUpStatus: (id: string, status: FollowUp['status'], outcome?: FollowUp['outcome']) => Promise<void>;
  sendWhatsAppMock: (followUpId: string, customMessage: string) => Promise<boolean>;
  createSale: (saleData: Omit<Sale, 'id' | 'createdAt' | 'shopId' | 'invoiceNumber'>) => Promise<Sale | null>;
  deleteSales: (ids: string[]) => Promise<boolean>;
  handleOutcomeStillInterested: (followUpId: string, nextDateStr: string) => Promise<void>;
  handleOutcomeNotInterested: (followUpId: string) => Promise<void>;
  handleOutcomeNoResponse: (followUpId: string, scheduleNext: boolean) => Promise<void>;
  addNote: (customerId: string, content: string) => void;
  updateShopProfile: (data: { name?: string; phone?: string }) => Promise<boolean>;
  refreshData: () => Promise<void>;
  resetData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [todayWork, setTodayWork] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error] = useState<string | null>(null);

  // Load user session on mount
  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMe();
      if (res && res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        await loadBusinessData();
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      setCurrentUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBusinessData = async () => {
    try {
      const [cList, pList, eList, fList, sList, aList, mList, workData] = await Promise.all([
        api.getCustomers().catch(() => []),
        api.getProducts().catch(() => []),
        api.getEnquiries().catch(() => []),
        api.getFollowUps().catch(() => []),
        api.getSales().catch(() => []),
        api.getActivities().catch(() => []),
        api.getMessages().catch(() => []),
        api.getTodayWork().catch(() => null),
      ]);

      setCustomers(cList);
      setProducts(pList);
      setEnquiries(eList);
      setFollowUps(fList);
      setSales(sList);
      setActivities(aList);
      setMessages(mList);
      if (workData) {
        console.log('APPCONTEXT setTodayWork:', 'dueToday=' + workData.dueToday?.length, 'overdue=' + workData.overdue?.length, 'summary:', workData.summary);
        setTodayWork(workData);
      }
    } catch (err: any) {
      console.error('Failed to load business data:', err);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.login({ email, password: pass });
      if (res && res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        await loadBusinessData();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (ownerName: string, shopName: string, email: string, pass: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.register({ ownerName, shopName, email, password: pass });
      if (res && res.user) {
        setCurrentUser(res.user);
        setIsAuthenticated(true);
        await loadBusinessData();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Register error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout request error:', err);
    } finally {
      // Clear all state to prevent data bleed
      setCurrentUser(null);
      setIsAuthenticated(false);
      setCustomers([]);
      setProducts([]);
      setEnquiries([]);
      setFollowUps([]);
      setSales([]);
      setActivities([]);
      setNotes([]);
      setMessages([]);
      setTodayWork(null);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt'>): Promise<Product | null> => {
    try {
      setIsLoading(true);
      const created = await api.createProduct(productData);
      setProducts(prev => [created, ...prev]);
      return created;
    } catch (err: any) {
      alert(`Unable to save product: ${err.message || 'Server error'}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product | null> => {
    try {
      setIsLoading(true);
      const updated = await api.updateProduct(id, updates);
      setProducts(prev => prev.map(p => p.id === id ? updated : p));
      return updated;
    } catch (err: any) {
      alert(`Unable to update product: ${err.message || 'Server error'}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.deleteProduct(id);
      if (res.success) {
        setProducts(prev => prev.filter(p => p.id !== id));
        return true;
      }
      return false;
    } catch (err: any) {
      alert(`Unable to delete product: ${err.message || 'Server error'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer | null> => {
    try {
      setIsLoading(true);
      const created = await api.createCustomer(customerData);
      setCustomers(prev => [created, ...prev]);
      const updatedActs = await api.getActivities().catch(() => []);
      setActivities(updatedActs);
      return created;
    } catch (err: any) {
      alert(`Unable to save customer: ${err.message || 'Server error'}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.deleteCustomer(id);
      if (res.success) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        setEnquiries(prev => prev.filter(e => e.customerId !== id));
        setFollowUps(prev => prev.filter(f => f.customerId !== id));
        setMessages(prev => prev.filter(m => m.customerId !== id));
        setActivities(prev => prev.filter(a => a.customerId !== id));
        setNotes(prev => prev.filter(n => n.customerId !== id));
        // Refresh today's work summary
        loadBusinessData().catch(() => {});
        return true;
      }
      return false;
    } catch (err: any) {
      alert(`Unable to delete customer: ${err.message || 'Server error'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const addEnquiry = async (enquiryData: Omit<Enquiry, 'id' | 'createdAt'>): Promise<Enquiry | null> => {
    try {
      setIsLoading(true);
      const res = await api.createEnquiry(enquiryData);
      if (!res || !res.enquiry) {
        throw new Error('Backend did not return a created enquiry.');
      }
      await loadBusinessData();
      return res.enquiry;
    } catch (err: any) {
      alert(`Failed to create enquiry: ${err.message || 'Server error'}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEnquiry = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.deleteEnquiry(id);
      if (res && res.success) {
        await loadBusinessData();
        return true;
      }
      return false;
    } catch (err: any) {
      alert(`Failed to delete enquiry: ${err.message || 'Server error'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateEnquiry = async (id: string, updates: Partial<Enquiry>) => {
    try {
      setEnquiries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    } catch (err) {
      console.error('Update enquiry error', err);
    }
  };

  const updateFollowUpStatus = async (id: string, status: FollowUp['status'], outcome?: FollowUp['outcome']) => {
    try {
      setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status, outcome: outcome || f.outcome } : f));
    } catch (err) {
      console.error('Update followup error', err);
    }
  };

  const sendWhatsAppMock = async (followUpId: string, customMessage: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.sendFollowUpMessage(followUpId, customMessage);
      if (res.success) {
        setFollowUps(prev => prev.map(f => f.id === followUpId ? res.followUp : f));
        setMessages(prev => [res.message, ...prev]);
        const updatedActs = await api.getActivities().catch(() => []);
        setActivities(updatedActs);
        return true;
      }
      return false;
    } catch (err: any) {
      alert(`Failed to send message: ${err.message || 'Server error'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const createSale = async (saleData: Omit<Sale, 'id' | 'createdAt' | 'shopId' | 'invoiceNumber'>): Promise<Sale | null> => {
    try {
      setIsLoading(true);
      const newSale = await api.createSale(saleData);
      setSales(prev => [newSale, ...prev]);
      await loadBusinessData();
      return newSale;
    } catch (err: any) {
      alert(`Unable to generate bill: ${err.message || 'Server error'}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSales = async (ids: string[]): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.deleteSales(ids);
      if (res && res.success) {
        setSales(prev => prev.filter(s => !ids.includes(s.id)));
        await loadBusinessData();
        return true;
      }
      return false;
    } catch (err: any) {
      alert(`Unable to delete sales: ${err.message || 'Server error'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleOutcomeStillInterested = async (followUpId: string, nextDateStr: string) => {
    try {
      setIsLoading(true);
      await api.recordFollowUpOutcome(followUpId, 'Still Interested', nextDateStr);
      // Optimistically update the followUps state to mark this follow-up as completed.
      setFollowUps(prev =>
        prev.map(f =>
          f.id === followUpId ? { ...f, status: 'completed' as any, outcome: 'Still Interested' as any } : f
        )
      );
      // Do NOT reload the entire business data to avoid resetting the WorkMode queue.
    } catch (err: any) {
      alert(`Failed to record outcome: ${err.message || 'Server error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOutcomeNotInterested = async (followUpId: string) => {
    try {
      // Update local followUps state optimistically — do NOT reload todayWork so
      // the WorkMode queue snapshot is preserved for the rest of the session.
      await api.recordFollowUpOutcome(followUpId, 'Not Interested');
      setFollowUps(prev =>
        prev.map(f => f.id === followUpId ? { ...f, status: 'completed' as any, outcome: 'Not Interested' as any } : f)
      );
    } catch (err: any) {
      console.error('Failed to record Not Interested outcome:', err);
    }
  };

  const handleOutcomeNoResponse = async (followUpId: string, scheduleNext: boolean) => {
    try {
      // Update local followUps state optimistically — do NOT reload todayWork so
      // the WorkMode queue snapshot is preserved for the rest of the session.
      await api.recordFollowUpOutcome(followUpId, 'No Response', undefined, scheduleNext);
      setFollowUps(prev =>
        prev.map(f => f.id === followUpId ? { ...f, status: 'completed' as any, outcome: 'No Response' as any } : f)
      );
    } catch (err: any) {
      console.error('Failed to record No Response outcome:', err);
    }
  };

  const addNote = (customerId: string, content: string) => {
    const newNote: Note = {
      id: `N-${Date.now()}`,
      customerId,
      content,
      createdAt: new Date().toISOString()
    };
    setNotes(prev => [newNote, ...prev]);
  };

  const updateShopProfile = async (data: { name?: string; phone?: string }): Promise<boolean> => {
    try {
      const res = await api.updateShopProfile(data);
      if (res.success && res.shop) {
        if (currentUser) {
          setCurrentUser({
            ...currentUser,
            shopName: res.shop.name
          });
        }
        await loadBusinessData();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Failed to update shop profile:', err);
      throw err;
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      isAuthenticated,
      customers,
      products,
      enquiries,
      followUps,
      sales,
      activities,
      notes,
      messages,
      todayWork,
      shopName: currentUser?.shopName || 'Shop Name',
      isLoading,
      error,
      login,
      register,
      logout,
      addProduct,
      updateProduct,
      deleteProduct,
      addCustomer,
      deleteCustomer,
      addEnquiry,
      deleteEnquiry,
      updateEnquiry,
      updateFollowUpStatus,
      sendWhatsAppMock,
      createSale,
      deleteSales,
      handleOutcomeStillInterested,
      handleOutcomeNotInterested,
      handleOutcomeNoResponse,
      addNote,
      updateShopProfile,
      refreshData: loadBusinessData,
      resetData: loadBusinessData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
