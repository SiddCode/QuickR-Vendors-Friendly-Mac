import React from 'react';
import { 
  LayoutGrid, 
  Users, 
  Receipt, 
  Menu
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

interface BottomNavProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onOpenMobileMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  currentPage, 
  setCurrentPage, 
  onOpenMobileMenu 
}) => {
  const { t } = useLanguage();

  const navItems = [
    { id: 'dashboard', label: t('nav.home'), icon: LayoutGrid },
    { id: 'customers', label: t('nav.customers'), icon: Users },
    { id: 'billing', label: t('nav.newBill'), icon: Receipt },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around lg:hidden shadow-lg font-sans"
      style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 ${
              isActive 
                ? 'text-primary-600 font-bold bg-primary-50' 
                : 'text-slate-500 font-medium hover:text-slate-800'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
            <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}

      <button
        onClick={onOpenMobileMenu}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-500 font-medium hover:text-slate-800 transition-all duration-150"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 tracking-tight">{t('common.actions')}</span>
      </button>
    </nav>
  );
};
