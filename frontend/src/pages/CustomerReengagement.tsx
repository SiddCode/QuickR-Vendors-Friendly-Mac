import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { 
  Users, 
  RefreshCw, 
  AlertCircle, 
  Megaphone,
  Search
} from 'lucide-react';

interface CustomerReengagementProps {
  setCurrentPage: (page: string) => void;
  setReengagementCustomerIdsForCampaign?: (ids: string[]) => void;
}

export const CustomerReengagement: React.FC<CustomerReengagementProps> = ({ 
  setCurrentPage, 
  setReengagementCustomerIdsForCampaign 
}) => {
  const { products } = useApp();
  const { language } = useLanguage();
  const isTa = language === 'ta';

  const [days, setDays] = useState<string>('60');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [permissionFilter, setPermissionFilter] = useState<string>('ALL');
  const [phoneFilter, setPhoneFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [summary, setSummary] = useState<any>(null);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [selectedCustIds, setSelectedCustIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReengagementData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [sumRes, custRes] = await Promise.all([
        api.getReengagementSummary(days),
        api.getReengagementCustomers(days, selectedProductId, permissionFilter, phoneFilter)
      ]);

      if (sumRes.success) setSummary(sumRes);
      if (custRes.success) {
        setCustomersList(custRes.customers);
        // Pre-select all WhatsApp eligible customers by default
        const eligible = custRes.customers.filter((c: any) => c.whatsappEligible && !c.recentlyContacted).map((c: any) => c.id);
        setSelectedCustIds(eligible);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load re-engagement data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReengagementData();
  }, [days, selectedProductId, permissionFilter, phoneFilter]);

  const toggleSelectCustomer = (id: string) => {
    if (selectedCustIds.includes(id)) {
      setSelectedCustIds(selectedCustIds.filter(x => x !== id));
    } else {
      setSelectedCustIds([...selectedCustIds, id]);
    }
  };

  const selectAllEligible = () => {
    const eligible = customersList.filter(c => c.whatsappEligible && !c.recentlyContacted).map(c => c.id);
    setSelectedCustIds(eligible);
  };

  const handleCreateOfferForSelected = () => {
    if (selectedCustIds.length === 0) return;
    if (typeof setReengagementCustomerIdsForCampaign === 'function') {
      setReengagementCustomerIdsForCampaign(selectedCustIds);
    }
    setCurrentPage('campaigns');
  };

  const activeProducts = products.filter(p => p.isActive);

  // Client-side search filtering
  const filteredCustomers = customersList.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.lastPurchasedProduct.toLowerCase().includes(q);
  });

  return (
    <div className="flex-grow p-4 md:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isTa ? 'வாடிக்கையாளர் மீண்டும் தொடர்புகொள்ளுதல்' : 'Customer Re-Engagement'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isTa ? 'சமீபத்தில் வாங்காத வாடிக்கையாளர்களுடன் மீண்டும் இணையுங்கள்' : 'Reconnect with customers who haven\'t purchased recently based on past purchase history'}
            </p>
          </div>
        </div>

        <button
          disabled={selectedCustIds.length === 0}
          onClick={handleCreateOfferForSelected}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Megaphone className="w-4 h-4" />
          <span>{isTa ? `தேர்ந்தெடுக்கப்பட்ட ${selectedCustIds.length} பேருக்கு ஆஃபர் உருவாக்கவும்` : `Create Offer for Selected (${selectedCustIds.length})`}</span>
        </button>
      </div>

      {/* Summary Metrics Cards Grid */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Potential Customers</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{summary.potentialCustomers}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Haven't bought in {days}+ days</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">With Phone</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{summary.withPhone}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Valid 10-digit mobile</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Offer Permission</span>
            <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">{summary.offerPermission}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">WhatsApp offers enabled</span>
          </div>

          <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 shadow-soft">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">WhatsApp Eligible</span>
            <span className="text-2xl font-extrabold text-indigo-950 mt-1 block">{summary.whatsappEligible}</span>
            <span className="text-[10px] text-indigo-500 block mt-0.5">Phone + Permission active</span>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft space-y-3 font-sans">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Period Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Purchase Idle Period</label>
            <select
              value={days}
              onChange={e => setDays(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="30">30+ Days Idle</option>
              <option value="60">60+ Days Idle (Default)</option>
              <option value="90">90+ Days Idle</option>
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Previous Purchased Product</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Products</option>
              {activeProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
              ))}
            </select>
          </div>

          {/* Permission Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">WhatsApp Offer Permission</label>
            <select
              value={permissionFilter}
              onChange={e => setPermissionFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Permission States</option>
              <option value="ENABLED">Permission Enabled Only</option>
              <option value="DISABLED">Permission Not Enabled</option>
            </select>
          </div>

          {/* Phone Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Mobile Availability</label>
            <select
              value={phoneFilter}
              onChange={e => setPhoneFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Customers</option>
              <option value="HAS_PHONE">Has Phone Number</option>
              <option value="NO_PHONE">No Phone Number</option>
            </select>
          </div>
        </div>

        {/* Search & Select All Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name or product..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs">
            <button
              onClick={selectAllEligible}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
            >
              Select All Eligible ({customersList.filter(c => c.whatsappEligible && !c.recentlyContacted).length})
            </button>
            <span className="text-slate-500 font-bold">
              Selected: <strong className="text-indigo-600 font-extrabold">{selectedCustIds.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Customers Cards List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Calculating re-engagement candidates...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-3 shadow-soft">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No re-engagement candidates found</h3>
          <p className="text-xs text-slate-400">All customers have purchased within the last {days} days or match selected filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map(cust => {
            const isSelected = selectedCustIds.includes(cust.id);
            return (
              <div
                key={cust.id}
                onClick={() => {
                  if (cust.whatsappEligible && !cust.recentlyContacted) toggleSelectCustomer(cust.id);
                }}
                className={`bg-white p-5 rounded-2xl border shadow-soft space-y-4 flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Customer Info Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!cust.whatsappEligible || cust.recentlyContacted}
                        onChange={() => toggleSelectCustomer(cust.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <h3 className="text-sm font-bold text-slate-800">{cust.name}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                      cust.priority === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                      cust.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {cust.priority} Priority
                    </span>
                  </div>

                  {/* Purchase History Details Grid */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Last Purchased:</span>
                      <strong className="text-slate-800 font-bold">{cust.lastPurchasedProduct}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Last Sale Date:</span>
                      <strong className="text-slate-700 font-medium">
                        {new Date(cust.lastPurchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ({cust.daysSincePurchase} days ago)
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Total Purchases / Spent:</span>
                      <strong className="text-slate-800 font-bold">{cust.totalPurchases} orders • ₹{cust.totalSpent.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

                {/* Status Badges Footer */}
                <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] font-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium font-mono">{cust.maskedPhone}</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      cust.offerPermissionEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {cust.offerPermissionEnabled ? '🟢 Offers Enabled' : '⚪ Offers Not Enabled'}
                    </span>
                  </div>

                  {cust.recentlyContacted ? (
                    <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[10px] font-bold text-center">
                      Recently Contacted (within 14 days) • Excluded from default
                    </div>
                  ) : !cust.whatsappEligible ? (
                    <div className="p-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold text-center">
                      {!cust.hasPhone ? 'Missing Phone Number' : 'WhatsApp Offers Not Enabled'}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
