import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerProfile } from './pages/CustomerProfile';
import { NewEnquiry } from './pages/NewEnquiry';
import { SmartFollowUp } from './pages/SmartFollowUp';
import { WorkMode } from './pages/WorkMode';
import { Products } from './pages/Products';
import { Billing } from './pages/Billing';
import { Sales } from './pages/Sales';
import { Automation } from './pages/Automation';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Campaigns } from './pages/Campaigns';
import { Enquiries } from './pages/Enquiries';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminShops } from './pages/AdminShops';
import { AdminShopDetails } from './pages/AdminShopDetails';
import { AdminUsers } from './pages/AdminUsers';
import { AdminActivity } from './pages/AdminActivity';
import { AdminCustomers } from './pages/AdminCustomers';
import { AdminProducts } from './pages/AdminProducts';
import { AdminEnquiries } from './pages/AdminEnquiries';
import { AdminFollowUps } from './pages/AdminFollowUps';
import { AdminSales } from './pages/AdminSales';
import { AdminBilling } from './pages/AdminBilling';
import { AdminReports } from './pages/AdminReports';
import { PrivacyNotice } from './pages/PrivacyNotice';
import { PrivacyDashboard } from './pages/PrivacyDashboard';
import { AdminPrivacy } from './pages/AdminPrivacy';
import { CustomerReengagement } from './pages/CustomerReengagement';
import { X, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, currentUser, login, shopName } = useApp();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [billingInitialData, setBillingInitialData] = useState<any>(null);
  const [reengagementCustomerIds, setReengagementCustomerIds] = useState<string[]>([]);
  const [adminSelectedShopId, setAdminSelectedShopId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Set the correct default page based on role after authentication
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (currentUser.role === 'admin' && !currentPage.startsWith('admin-')) {
        setCurrentPage('admin-dashboard');
      }
    }
  }, [isAuthenticated, currentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center font-sans text-slate-100">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-300">Loading QuickR...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authMode === 'register') {
      return (
        <Register
          onSwitchToLogin={() => setAuthMode('login')}
        />
      );
    }
    return (
      <Login
        onLogin={login}
        onSwitchToRegister={() => setAuthMode('register')}
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      // ─── Admin Pages ───
      case 'admin-dashboard':
        return <AdminDashboard setCurrentPage={setCurrentPage} />;
      case 'admin-shops':
        return <AdminShops setCurrentPage={setCurrentPage} setAdminSelectedShopId={setAdminSelectedShopId} />;
      case 'admin-shop-details':
        return <AdminShopDetails shopId={adminSelectedShopId} setCurrentPage={setCurrentPage} />;
      case 'admin-users':
        return <AdminUsers setCurrentPage={setCurrentPage} />;
      case 'admin-activity':
        return <AdminActivity setCurrentPage={setCurrentPage} />;
      case 'admin-customers':
        return <AdminCustomers setCurrentPage={setCurrentPage} />;
      case 'admin-products':
        return <AdminProducts setCurrentPage={setCurrentPage} />;
      case 'admin-enquiries':
        return <AdminEnquiries setCurrentPage={setCurrentPage} />;
      case 'admin-followups':
        return <AdminFollowUps setCurrentPage={setCurrentPage} />;
      case 'admin-sales':
        return <AdminSales setCurrentPage={setCurrentPage} />;
      case 'admin-billing':
        return <AdminBilling setCurrentPage={setCurrentPage} />;
      case 'admin-reports':
        return <AdminReports setCurrentPage={setCurrentPage} />;
      case 'admin-privacy':
        return <AdminPrivacy />;

      // ─── Business Pages ───
      case 'dashboard':
        return <Dashboard setCurrentPage={setCurrentPage} setSelectedCustomerId={setSelectedCustomerId} />;
      case 'customers':
        return <Customers setCurrentPage={setCurrentPage} setSelectedCustomerId={setSelectedCustomerId} />;
      case 'customer-profile':
        return (
          <CustomerProfile 
            customerId={selectedCustomerId || ''} 
            setCurrentPage={setCurrentPage} 
            setSelectedCustomerId={setSelectedCustomerId} 
          />
        );
      case 'new-enquiry':
        return (
          <NewEnquiry 
            setCurrentPage={setCurrentPage} 
            setSelectedCustomerId={setSelectedCustomerId} 
            initialCustomerId={selectedCustomerId || undefined}
          />
        );
      case 'smart-followup':
        return <SmartFollowUp setCurrentPage={setCurrentPage} setSelectedCustomerId={setSelectedCustomerId} />;
      case 'work-mode':
        return <WorkMode setCurrentPage={setCurrentPage} setBillingInitialData={setBillingInitialData} />;
      case 'products':
        return <Products />;
      case 'billing':
        return <Billing setCurrentPage={setCurrentPage} billingInitialData={billingInitialData} />;
      case 'enquiries':
        return <Enquiries setCurrentPage={setCurrentPage} setSelectedCustomerId={setSelectedCustomerId} />;
      case 'sales':
        return <Sales setCurrentPage={setCurrentPage} />;
      case 'automation':
        return <Automation />;
      case 'reports':
        return <Reports />;
      case 'campaigns':
        return <Campaigns setCurrentPage={setCurrentPage} initialSelectedCustomerIds={reengagementCustomerIds} />;
      case 'reengagement':
        return (
          <CustomerReengagement 
            setCurrentPage={setCurrentPage} 
            setReengagementCustomerIdsForCampaign={setReengagementCustomerIds} 
          />
        );
      case 'privacy':
        return <PrivacyDashboard setCurrentPage={setCurrentPage} />;
      case 'privacy-notice':
        return <PrivacyNotice setCurrentPage={setCurrentPage} />;
      case 'settings':
        return <Settings setCurrentPage={setCurrentPage} />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} setSelectedCustomerId={setSelectedCustomerId} />;
    }
  };

  const pageTitles: Record<string, string> = {
    dashboard: `Good morning, ${shopName}`,
    customers: 'Customers',
    'customer-profile': 'Customer Profile',
    'new-enquiry': 'New Enquiry',
    'smart-followup': 'Smart Follow-up',
    'work-mode': 'Focused Work Mode',
    products: 'Products',
    billing: 'New Bill',
    enquiries: 'Enquiries',
    sales: 'Sales',
    automation: 'Automation',
    reports: 'Reports',
    campaigns: 'Offers & Campaigns',
    reengagement: 'Customer Re-Engagement',
    privacy: 'Privacy & Data Controls',
    'privacy-notice': 'Privacy & Data Protection Notice',
    settings: 'Settings',
    'admin-dashboard': 'Admin Dashboard',
    'admin-shops': 'Shop Management',
    'admin-shop-details': 'Shop Details',
    'admin-users': 'User Management',
    'admin-activity': 'Activity Log',
    'admin-customers': 'Global Customer Directory',
    'admin-products': 'Global Product Inventory',
    'admin-enquiries': 'Global Enquiries',
    'admin-followups': 'Global Follow-ups',
    'admin-sales': 'Global Sales Registry',
    'admin-billing': 'Global Billing Records',
    'admin-reports': 'Admin Reports & Analytics',
    'admin-privacy': 'Admin Privacy & Compliance Dashboard'
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh] w-full min-w-0 bg-slate-50 font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
            <div className="absolute right-4 top-4">
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-500 rounded-lg hover:bg-slate-50">
                <X className="w-6 h-6" />
              </button>
            </div>
            <Sidebar currentPage={currentPage} setCurrentPage={(p) => { setCurrentPage(p); setMobileMenuOpen(false); }} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <Header 
          title={pageTitles[currentPage] || 'Dashboard'} 
          setCurrentPage={setCurrentPage}
          setSelectedCustomerId={setSelectedCustomerId}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1 flex flex-col w-full min-w-0 min-h-0 bg-slate-50 pb-16 lg:pb-0">
          {renderPage()}
        </main>

        {/* Mobile Bottom Navigation */}
        {!currentUser?.role?.includes('admin') && (
          <BottomNav 
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />
        )}
      </div>
    </div>
  );
};

import { LanguageProvider } from './context/LanguageContext';

export function App() {
  return (
    <LanguageProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </LanguageProvider>
  );
}

export default App;

