import React from 'react';
import { Logo } from './Logo';
import { useApp } from '../context/AppContext';
import { 
  LayoutGrid, 
  Users, 
  IndianRupee, 
  BarChart2, 
  Settings,
  LogOut,
  Package,
  MessageSquare,
  Receipt,
  ShieldCheck,
  Store,
  FileText,
  TrendingUp,
  Megaphone,
  RefreshCw
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const { currentUser, logout, shopName } = useApp();
  const { t } = useLanguage();

  const isAdmin = currentUser?.role === 'admin';

  // Admin menu items - Numbers-Only & Platform Administration
  const adminMenuItems = [
    { id: 'admin-dashboard', label: t('nav.dashboard'), icon: ShieldCheck },
    { id: 'admin-shops', label: t('admin.title'), icon: Store },
    { id: 'admin-reports', label: t('nav.reports'), icon: TrendingUp },
    { id: 'admin-privacy', label: t('nav.privacy'), icon: ShieldCheck },
    { id: 'admin-users', label: t('nav.profile'), icon: Users },
    { id: 'admin-activity', label: t('common.details'), icon: FileText },
  ];

  // Normal business menu items (for owner/staff)
  const menuItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutGrid },
    { id: 'customers', label: t('nav.customers'), icon: Users },
    { id: 'products', label: t('nav.products'), icon: Package },
    { id: 'enquiries', label: t('nav.enquiries'), icon: MessageSquare },
    { id: 'billing', label: t('nav.newBill'), icon: Receipt },
    { id: 'sales', label: t('nav.sales'), icon: IndianRupee },
    { id: 'reports', label: t('nav.reports'), icon: BarChart2 },
    { id: 'campaigns', label: t('nav.campaigns'), icon: Megaphone },
    { id: 'reengagement', label: 'Customer Re-Engagement', icon: RefreshCw },
    { id: 'privacy', label: t('nav.privacy'), icon: ShieldCheck },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  const getInitials = (name: string) => {
    if (!name) return 'QK';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const renderMenuItems = (items: typeof menuItems) => (
    items.map((item) => {
      const Icon = item.icon;
      const isActive = currentPage === item.id 
        || (item.id === 'followups' && currentPage === 'smart-followup') 
        || (item.id === 'enquiries' && currentPage === 'new-enquiry')
        || (item.id === 'billing' && currentPage === 'billing')
        || (item.id === 'admin-shops' && (currentPage === 'admin-shop-details' || currentPage === 'admin-create-shop'));
      return (
        <button
          key={item.id}
          onClick={() => setCurrentPage(item.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
            isActive
              ? 'bg-primary-50 text-primary-600 shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary-500' : 'text-slate-400'}`} />
          <span className="truncate text-left">{item.label}</span>
        </button>
      );
    })
  );

  return (
    <div className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 font-sans">
      {/* Brand Logo */}
      <div className="p-6 flex items-center">
        <Logo className="h-9 w-auto" />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {isAdmin ? (
          /* Admin sees only admin pages – no access to owner/staff flows */
          <>
            <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin</p>
            {renderMenuItems(adminMenuItems)}
          </>
        ) : (
          <>
            {renderMenuItems(menuItems)}
          </>
        )}
      </nav>

      {/* User Profile & Logout Footer */}
      <div className="p-4 border-t border-slate-50 space-y-2">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs ${isAdmin ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-primary-600'}`}>
              {getInitials(currentUser?.name || 'QuickR')}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">{currentUser?.name || 'Vendor'}</p>
              <p className="text-[10px] text-slate-400 truncate">{isAdmin ? '🛡️ System Admin' : shopName}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

