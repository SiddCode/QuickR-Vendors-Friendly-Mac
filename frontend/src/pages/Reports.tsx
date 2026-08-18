import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, Users, ShoppingBag, IndianRupee, Receipt, CreditCard, Smartphone, Wallet, Download, FileSpreadsheet, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const Reports: React.FC = () => {
  const { sales, customers, products } = useApp();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todaySales = sales.filter(s => new Date(s.createdAt) >= todayStart);
  const weekSales = sales.filter(s => new Date(s.createdAt) >= weekStart);
  const monthSales = sales.filter(s => new Date(s.createdAt) >= monthStart);

  const getTotal = (arr: typeof sales) => arr.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const getAvg = (arr: typeof sales) => arr.length ? Math.round(getTotal(arr) / arr.length) : 0;

  const paymentBreakdown = (arr: typeof sales) => {
    const breakdown: Record<string, number> = { Cash: 0, UPI: 0, Card: 0, Other: 0 };
    arr.forEach(s => {
      const m = s.paymentMethod || 'Other';
      breakdown[m] = (breakdown[m] || 0) + (s.totalAmount || 0);
    });
    return breakdown;
  };

  // Top selling products from sale items
  const productSalesMap: Record<string, { name: string; revenue: number; qty: number }> = {};
  sales.forEach(s => {
    (s.items || []).forEach(item => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.productName, revenue: 0, qty: 0 };
      }
      productSalesMap[item.productId].revenue += item.total;
      productSalesMap[item.productId].qty += item.quantity;
    });
  });
  const topProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const periodSales = period === 'today' ? todaySales : period === 'week' ? weekSales : monthSales;
  const breakdown = paymentBreakdown(periodSales);

  // Business Excel Export State
  const [reportType, setReportType] = useState<'summary' | 'customers' | 'enquiries' | 'followups' | 'products' | 'sales'>('summary');
  const [exportPeriod, setExportPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  return (
    <div className="flex-grow p-4 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Business Reports</h2>
          <p className="text-xs text-slate-400">Insights calculated from actual sale records</p>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1">
          {(['today', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'Today'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-50 rounded-lg"><IndianRupee className="w-4 h-4 text-primary-600" /></div>
            <span className="text-xs font-semibold text-slate-400">Total Sales</span>
          </div>
          <p className="text-2xl font-black text-slate-800">₹{getTotal(periodSales).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-success-50 rounded-lg"><Receipt className="w-4 h-4 text-success-600" /></div>
            <span className="text-xs font-semibold text-slate-400">Bills Created</span>
          </div>
          <p className="text-2xl font-black text-slate-800">{periodSales.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-warning-50 rounded-lg"><TrendingUp className="w-4 h-4 text-warning-600" /></div>
            <span className="text-xs font-semibold text-slate-400">Avg Bill Value</span>
          </div>
          <p className="text-2xl font-black text-slate-800">₹{getAvg(periodSales).toLocaleString('en-IN')}</p>
        </div>
         {/* Total Customers Card with badge */}
         <div className="relative bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-slate-100 rounded-lg"><Users className="w-4 h-4 text-slate-600" /></div>
             <span className="text-xs font-semibold text-slate-400">Total Customers</span>
           </div>
           <p className="text-2xl font-black text-slate-800">{customers.length}</p>
           <span className="absolute top-2 right-2 bg-primary-100 text-primary-600 text-xs font-semibold px-2 py-1 rounded-full">{customers.length}</span>
         </div>
      </div>

      {/* ─── Business Excel Export Section ─── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-5 text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Excel Business Reports Generator</h3>
            <p className="text-xs text-slate-500 font-medium">Export multi-tab, formatted .xlsx spreadsheets calculated from live store records</p>
          </div>
        </div>

        {/* Report Type Pills */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Select Report Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { id: 'summary', label: 'Executive Summary' },
              { id: 'customers', label: 'Customers' },
              { id: 'enquiries', label: 'Enquiries & Leads' },
              { id: 'followups', label: 'Follow-ups' },
              { id: 'products', label: 'Products' },
              { id: 'sales', label: 'Sales & Revenue' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => {
                  setReportType(r.id as any);
                  setExportError(null);
                  setExportSuccess(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center ${
                  reportType === r.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Period Selector Pills */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Select Time Horizon (IST)</label>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Date Range' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setExportPeriod(p.id as any);
                  setExportError(null);
                  setExportSuccess(null);
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  exportPeriod === p.id
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Inputs */}
        {exportPeriod === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-fadeIn">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Start Date (IST)</label>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">End Date (IST)</label>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Error Notification */}
        {exportError && (
          <div className="p-3 bg-danger-50 border border-danger-100 rounded-xl flex items-center gap-2 text-xs text-danger-700 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* Success Notification */}
        {exportSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-semibold">
            {exportSuccess}
          </div>
        )}

        {/* Trigger Download Button */}
        <div>
          <button
            onClick={async () => {
              setExporting(true);
              setExportError(null);
              setExportSuccess(null);
              try {
                await api.exportBusinessReport({
                  type: reportType,
                  period: exportPeriod,
                  startDate: customStartDate || undefined,
                  endDate: customEndDate || undefined
                });
                setExportSuccess(`${reportType.toUpperCase()} report downloaded successfully.`);
              } catch (err: any) {
                setExportError(err.message || 'Unable to generate business report.');
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2 disabled:opacity-50"
          >
            {exporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating Excel Report...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {reportType.toUpperCase()} Report (.xlsx)
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Payment Method Breakdown</h3>
          <div className="space-y-3">
            {[
              { method: 'Cash', icon: Wallet, color: 'text-success-600 bg-success-50' },
              { method: 'UPI', icon: Smartphone, color: 'text-primary-600 bg-primary-50' },
              { method: 'Card', icon: CreditCard, color: 'text-purple-600 bg-purple-50' },
              { method: 'Other', icon: IndianRupee, color: 'text-slate-600 bg-slate-100' },
            ].map(({ method, icon: Icon, color }) => (
              <div key={method} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
                  <span className="font-semibold text-slate-700 text-sm">{method}</span>
                </div>
                <span className="font-bold text-slate-800">₹{(breakdown[method] || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Top Selling Products</h3>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <ShoppingBag className="w-10 h-10 mb-3 text-slate-200" />
              <p className="text-sm">No sales yet. Start creating bills!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.qty} units sold</p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-700 text-sm">₹{p.revenue.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All-time Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900 p-6 rounded-2xl text-white">
        <div>
          <p className="text-slate-400 text-xs font-semibold mb-1">All-time Revenue</p>
          <p className="text-2xl font-black">₹{getTotal(sales).toLocaleString('en-IN')}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs font-semibold mb-1">Total Bills</p>
          <p className="text-2xl font-black">{sales.length}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs font-semibold mb-1">Products Listed</p>
          <p className="text-2xl font-black">{products.length}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs font-semibold mb-1">Avg Bill (All Time)</p>
          <p className="text-2xl font-black">₹{getAvg(sales).toLocaleString('en-IN')}</p>
        </div>
      </div>
    </div>
  );
};
