import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Filter, ArrowLeft, Calendar } from 'lucide-react';

interface AdminSalesProps {
  setCurrentPage: (page: string) => void;
}

export const AdminSales: React.FC<AdminSalesProps> = ({ setCurrentPage }) => {
  const [salesData, setSalesData] = useState<any>({ sales: [], summary: {} });
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { loadShops(); }, []);

  useEffect(() => { loadSales(); }, [selectedShopId, startDate, endDate]);

  const loadShops = async () => {
    try {
      const data = await api.adminGetShops();
      setShops(data);
    } catch (err) {
      console.error('Failed to load shops:', err);
    }
  };

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetSales(selectedShopId || undefined, startDate || undefined, endDate || undefined);
      setSalesData(data);
    } catch (err) {
      console.error('Failed to load admin sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const { sales = [], summary = {} } = salesData;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('admin-dashboard')} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Global Sales Registry</h1>
            <p className="text-sm text-slate-500">Read-Only view of sales across all shops</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Sales Revenue</p>
          <p className="text-3xl font-black text-emerald-800 mt-1">₹{(summary.totalSalesAmount || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Invoices</p>
          <p className="text-3xl font-black text-blue-800 mt-1">{summary.totalInvoices || 0}</p>
        </div>
        <div className="bg-violet-50 border border-violet-100 p-5 rounded-2xl">
          <p className="text-xs font-bold text-violet-600 uppercase tracking-wider">Average Order Value</p>
          <p className="text-3xl font-black text-violet-800 mt-1">₹{(summary.averageSaleValue || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
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

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-xl text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500 font-bold">From:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-slate-700 focus:outline-none font-semibold" />
          <span className="text-slate-500 font-bold ml-2">To:</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-slate-700 focus:outline-none font-semibold" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading sales records...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-5 py-3.5 text-left">Invoice No.</th>
                  <th className="px-5 py-3.5 text-left">Customer</th>
                  <th className="px-5 py-3.5 text-left">Shop</th>
                  <th className="px-5 py-3.5 text-center">Items</th>
                  <th className="px-5 py-3.5 text-center">Payment Method</th>
                  <th className="px-5 py-3.5 text-right">Total Amount</th>
                  <th className="px-5 py-3.5 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-25 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-800">{s.invoiceNumber}</td>
                    <td className="px-5 py-4 font-bold text-slate-700">{s.customerName || 'Walk-in Customer'}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                        {s.shopName}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-700">{s.items?.length || 0}</td>
                    <td className="px-5 py-4 text-center font-semibold text-slate-600">{s.paymentMethod}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-700">₹{(s.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sales.length === 0 && (
              <div className="p-8 text-center text-slate-400">No sales records found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
