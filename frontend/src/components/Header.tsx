import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, ShoppingBag, HelpCircle, Receipt, ArrowRight, X, Menu } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  title?: string;
  onSearchChange?: (val: string) => void;
  searchValue?: string;
  setCurrentPage?: (page: string) => void;
  setSelectedCustomerId?: (id: string) => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onSearchChange, searchValue, setCurrentPage, setSelectedCustomerId, onOpenMobileMenu }) => {
  const { shopName, customers, products, enquiries, sales, currentUser } = useApp();
  const { t } = useLanguage();
  const [localSearch, setLocalSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const query = (searchValue !== undefined ? searchValue : localSearch).trim().toLowerCase();

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter shop-isolated entities
  const matchingCustomers = query ? customers.filter(c => 
    c.name.toLowerCase().includes(query) || (c.phone && c.phone.includes(query))
  ).slice(0, 3) : [];

  const matchingProducts = query ? products.filter(p => 
    p.name.toLowerCase().includes(query) || (p.category && p.category.toLowerCase().includes(query))
  ).slice(0, 3) : [];

  const custMap = new Map(customers.map(c => [c.id, c]));

  const matchingEnquiries = query ? enquiries.filter(e => {
    const cust = custMap.get(e.customerId);
    const cName = cust ? cust.name.toLowerCase() : '';
    return (e.productName && e.productName.toLowerCase().includes(query)) || cName.includes(query);
  }).slice(0, 3) : [];

  const matchingSales = query ? sales.filter(s => 
    (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(query)) ||
    (s.customerName && s.customerName.toLowerCase().includes(query))
  ).slice(0, 3) : [];

  const hasResults = matchingCustomers.length > 0 || matchingProducts.length > 0 || matchingEnquiries.length > 0 || matchingSales.length > 0;

  return (
    <header className="w-full bg-white px-3 sm:px-6 lg:px-8 py-3 lg:py-4 border-b border-slate-100 flex items-center justify-between font-sans shrink-0 gap-2 sm:gap-4 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onOpenMobileMenu && (
          <button 
            onClick={onOpenMobileMenu}
            className="p-1.5 text-slate-500 lg:hidden hover:bg-slate-50 rounded-lg shrink-0"
            title="Open Menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
        <h1 className="text-sm sm:text-xl font-bold text-slate-800 tracking-tight truncate">
          {title || `${t('header.goodMorning')}, ${shopName}`}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Global Search Bar */}
        <div ref={searchRef} className="relative w-36 sm:w-64">
          <div className="relative">
            <input
              type="text"
              placeholder={t('header.searchPlaceholder')}
              value={searchValue !== undefined ? searchValue : localSearch}
              onChange={(e) => {
                const val = e.target.value;
                setLocalSearch(val);
                if (onSearchChange) onSearchChange(val);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 sm:pl-4 pr-8 text-xs sm:text-sm focus:outline-none focus:border-primary-500 focus:bg-white transition-all duration-150 font-medium"
            />
            {query ? (
              <button 
                onClick={() => { setLocalSearch(''); if (onSearchChange) onSearchChange(''); setShowDropdown(false); }}
                className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            )}
          </div>

          {/* Global Search Dropdown Results */}
          {showDropdown && query && (
            <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden font-sans animate-fadeIn">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>{t('header.shopResults')} ({matchingCustomers.length + matchingProducts.length + matchingEnquiries.length + matchingSales.length})</span>
                <span className="text-[10px] text-slate-400 font-medium">{t('header.clickToNavigate')}</span>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-slate-50 p-2 space-y-2">
                {!hasResults && (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium">
                    {t('header.noMatch')} "{query}"
                  </div>
                )}

                {/* Customers */}
                {matchingCustomers.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 pt-1 text-[10px] font-extrabold text-primary-600 uppercase flex items-center gap-1">
                      <User className="w-3 h-3" /> {t('nav.customers')}
                    </div>
                    {matchingCustomers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          if (setSelectedCustomerId) setSelectedCustomerId(c.id);
                          if (setCurrentPage) setCurrentPage('customer-profile');
                          setShowDropdown(false);
                        }}
                        className="p-2 hover:bg-primary-50 rounded-xl cursor-pointer flex justify-between items-center group transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-primary-700">{c.name}</p>
                          <p className="text-[11px] text-slate-400">{c.phone || 'No phone'}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Products */}
                {matchingProducts.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 pt-1 text-[10px] font-extrabold text-emerald-600 uppercase flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3" /> {t('nav.products')}
                    </div>
                    {matchingProducts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (setCurrentPage) setCurrentPage('products');
                          setShowDropdown(false);
                        }}
                        className="p-2 hover:bg-emerald-50 rounded-xl cursor-pointer flex justify-between items-center group transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">{p.name}</p>
                          <p className="text-[11px] text-slate-400">₹{p.sellingPrice?.toLocaleString('en-IN')} • {p.category}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Enquiries */}
                {matchingEnquiries.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 pt-1 text-[10px] font-extrabold text-amber-600 uppercase flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" /> {t('nav.enquiries')}
                    </div>
                    {matchingEnquiries.map(e => (
                      <div
                        key={e.id}
                        onClick={() => {
                          if (setCurrentPage) setCurrentPage('enquiries');
                          setShowDropdown(false);
                        }}
                        className="p-2 hover:bg-amber-50 rounded-xl cursor-pointer flex justify-between items-center group transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700">{e.productName || 'General Enquiry'}</p>
                          <p className="text-[11px] text-slate-400">{custMap.get(e.customerId)?.name || 'Walk-in'} • {e.purchaseStatus}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Sales */}
                {matchingSales.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2 pt-1 text-[10px] font-extrabold text-purple-600 uppercase flex items-center gap-1">
                      <Receipt className="w-3 h-3" /> {t('nav.sales')}
                    </div>
                    {matchingSales.map(s => (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (setCurrentPage) setCurrentPage('sales');
                          setShowDropdown(false);
                        }}
                        className="p-2 hover:bg-purple-50 rounded-xl cursor-pointer flex justify-between items-center group transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700">{s.invoiceNumber || s.id}</p>
                          <p className="text-[11px] text-slate-400">{s.customerName} • ₹{s.totalAmount?.toLocaleString('en-IN')}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>



        {/* Notifications */}
        <button 
          onClick={() => setCurrentPage && setCurrentPage('work-mode')}
          className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all duration-150 shrink-0"
          title={t('header.viewTasks')}
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
            !
          </span>
        </button>

        {/* Shop Badge */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-100">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">{shopName}</p>
            <p className="text-xs text-slate-400 capitalize">{currentUser?.role || t('header.shopAccount')}</p>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-xs shadow-sm uppercase shrink-0">
            {shopName ? shopName.substring(0, 2) : 'QK'}
          </div>
        </div>
      </div>
    </header>
  );
};
