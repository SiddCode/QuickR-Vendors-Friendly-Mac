import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Filter, ArrowLeft, Eye, X } from 'lucide-react';

interface AdminBillingProps {
  setCurrentPage: (page: string) => void;
}

export const AdminBilling: React.FC<AdminBillingProps> = ({ setCurrentPage }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  useEffect(() => { loadShops(); }, []);

  useEffect(() => { loadBilling(); }, [selectedShopId]);

  const loadShops = async () => {
    try {
      const data = await api.adminGetShops();
      setShops(data);
    } catch (err) {
      console.error('Failed to load shops:', err);
    }
  };

  const loadBilling = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetBilling(selectedShopId || undefined);
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load admin billing:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('admin-dashboard')} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Global Billing & Invoice Registry</h1>
            <p className="text-sm text-slate-500">Read-Only view of all generated manual billing invoices across shops</p>
          </div>
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
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading billing records...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-5 py-3.5 text-left">Invoice No.</th>
                  <th className="px-5 py-3.5 text-left">Shop</th>
                  <th className="px-5 py-3.5 text-left">Customer</th>
                  <th className="px-5 py-3.5 text-center">Items Count</th>
                  <th className="px-5 py-3.5 text-center">Payment Method</th>
                  <th className="px-5 py-3.5 text-right">Total Amount</th>
                  <th className="px-5 py-3.5 text-left">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-25 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-800">{inv.invoiceNumber}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                        {inv.shopName}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">{inv.customerName}</td>
                    <td className="px-5 py-4 text-center font-bold text-slate-700">{inv.itemsCount}</td>
                    <td className="px-5 py-4 text-center font-semibold text-slate-600">{inv.paymentMethod}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-700">₹{(inv.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        title="View Invoice Breakdown"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.length === 0 && (
              <div className="p-8 text-center text-slate-400">No billing records found.</div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Details Popup */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Invoice: {selectedInvoice.invoiceNumber}</h2>
                <p className="text-xs text-slate-400">Shop: {selectedInvoice.shopName} ({selectedInvoice.shopId})</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2 mb-4 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Customer:</span> <strong className="text-slate-800">{selectedInvoice.customerName}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Payment Method:</span> <span className="font-semibold">{selectedInvoice.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Billing Source:</span> <span className="font-semibold">{selectedInvoice.source}</span></div>
            </div>

            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Item Breakdown</h4>
            <div className="border border-slate-100 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {selectedInvoice.items.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2 font-bold text-slate-700">{it.productName}</td>
                      <td className="p-2 text-center">{it.quantity}</td>
                      <td className="p-2 text-right">₹{it.rate}</td>
                      <td className="p-2 text-right font-bold text-slate-800">₹{it.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1.5 font-semibold">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{selectedInvoice.subtotal}</span></div>
              <div className="flex justify-between text-slate-500"><span>Discount</span><span>-₹{selectedInvoice.discount}</span></div>
              <div className="flex justify-between text-sm font-black text-emerald-700 pt-1 border-t border-slate-200">
                <span>Grand Total</span><span>₹{selectedInvoice.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
