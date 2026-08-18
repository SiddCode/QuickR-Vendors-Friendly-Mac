import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Filter, ArrowLeft, BarChart2, Store, Users, MessageSquare } from 'lucide-react';

interface AdminReportsProps {
  setCurrentPage: (page: string) => void;
}

export const AdminReports: React.FC<AdminReportsProps> = ({ setCurrentPage }) => {
  const [reportsData, setReportsData] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  useEffect(() => { loadShops(); }, []);

  useEffect(() => { loadReports(); }, [selectedShopId, selectedPeriod]);

  const loadShops = async () => {
    try {
      const data = await api.adminGetShops();
      setShops(data);
    } catch (err) {
      console.error('Failed to load shops:', err);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetReports({
        shopId: selectedShopId || undefined,
        period: selectedPeriod !== 'all' ? selectedPeriod : undefined
      });
      setReportsData(data);
    } catch (err) {
      console.error('Failed to load admin reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const periods = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' }
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('admin-dashboard')} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Global Admin Reports & Aggregations</h1>
            <p className="text-sm text-slate-500">Cross-shop performance benchmarks and analytics</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2 border-b border-slate-200">
          {periods.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriod(p.id)}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
                selectedPeriod === p.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-xl">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedShopId}
            onChange={e => setSelectedShopId(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-transparent focus:outline-none"
          >
            <option value="">🌐 All Shops</option>
            {shops.map(s => (
              <option key={s.customId} value={s.customId}>{s.name} ({s.customId})</option>
            ))}
          </select>
        </div>
      </div>

      {loading || !reportsData ? (
        <div className="p-12 text-center text-slate-500">Loading reports and aggregations...</div>
      ) : (
        <div className="space-y-8">
          
          {/* Sales & Revenue by Shop */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-600" /> Revenue & Sales Invoices by Shop
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                    <th className="px-4 py-3 text-left">Shop Name</th>
                    <th className="px-4 py-3 text-left">Shop ID</th>
                    <th className="px-4 py-3 text-center">Invoices Issued</th>
                    <th className="px-4 py-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reportsData.salesByShop.map((s: any) => (
                    <tr key={s.shopId} className="hover:bg-slate-25">
                      <td className="px-4 py-3 font-bold text-slate-800">{s.shopName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.shopId}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">{s.invoiceCount}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">₹{(s.totalRevenue || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {reportsData.salesByShop.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-6 text-slate-400">No sales recorded for this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enquiries & Conversion Rates by Shop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Enquiries Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pink-500" /> Enquiries & Conversion Rates
              </h3>
              <div className="space-y-3">
                {reportsData.enquiriesByShop.map((e: any) => (
                  <div key={e.shopId} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{e.shopName}</p>
                      <p className="text-xs text-slate-400">{e.count} Total Enquiries • {e.purchasedCount} Converted</p>
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 font-bold rounded-lg text-xs">
                      {e.conversionRate}% Conv.
                    </span>
                  </div>
                ))}
                {reportsData.enquiriesByShop.length === 0 && (
                  <p className="text-center text-slate-400 py-4">No enquiries recorded.</p>
                )}
              </div>
            </div>

            {/* Follow-ups Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-amber-500" /> Follow-ups Execution by Shop
              </h3>
              <div className="space-y-3">
                {reportsData.followUpsByShop.map((f: any) => (
                  <div key={f.shopId} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{f.shopName}</p>
                      <p className="text-xs text-slate-400">{f.count} Total Follow-ups</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs">
                      {f.completedCount} Completed
                    </span>
                  </div>
                ))}
                {reportsData.followUpsByShop.length === 0 && (
                  <p className="text-center text-slate-400 py-4">No follow-ups recorded.</p>
                )}
              </div>
            </div>

          </div>

          {/* Top Customers Leaderboard */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-600" /> Top Customers across Platform
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                    <th className="px-4 py-3 text-left">Customer Name</th>
                    <th className="px-4 py-3 text-left">Shop</th>
                    <th className="px-4 py-3 text-center">Purchases</th>
                    <th className="px-4 py-3 text-right">Total Lifetime Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reportsData.topCustomers.map((c: any) => (
                    <tr key={c.customerId} className="hover:bg-slate-25">
                      <td className="px-4 py-3 font-bold text-slate-800">{c.name}</td>
                      <td className="px-4 py-3 text-slate-600">{c.shopName}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">{c.purchaseCount}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">₹{(c.totalSpent || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {reportsData.topCustomers.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-6 text-slate-400">No customer spend records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
