import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, Filter, Eye, ArrowLeft, X } from 'lucide-react';

interface AdminCustomersProps {
  setCurrentPage: (page: string) => void;
}

export const AdminCustomers: React.FC<AdminCustomersProps> = ({ setCurrentPage }) => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<any | null>(null);


  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [selectedShopId, searchTerm]);

  const loadShops = async () => {
    try {
      const data = await api.adminGetShops();
      setShops(data);
    } catch (err) {
      console.error('Failed to load shops:', err);
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetCustomers(selectedShopId || undefined, searchTerm || undefined);
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load admin customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (id: string) => {
    try {
      const data = await api.adminGetCustomerDetails(id);
      setSelectedCustomerDetails(data);
    } catch (err) {
      alert('Failed to load customer details');
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
            <h1 className="text-2xl font-bold text-slate-800">Global Customer Directory</h1>
            <p className="text-sm text-slate-500">Read-Only view of all customer records across shops</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search name, phone, or shop ID..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
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

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading customer directory...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-5 py-3.5 text-left">Customer</th>
                  <th className="px-5 py-3.5 text-left">Phone / Email</th>
                  <th className="px-5 py-3.5 text-left">Shop</th>
                  <th className="px-5 py-3.5 text-center">Enquiries</th>
                  <th className="px-5 py-3.5 text-center">Purchases</th>
                  <th className="px-5 py-3.5 text-right">Total Spent</th>
                  <th className="px-5 py-3.5 text-left">Created Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-25 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-800">{c.name}</td>
                    <td className="px-5 py-4 text-slate-600">
                      <div>{c.phone}</div>
                      <div className="text-xs text-slate-400">{c.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                        {c.shopName}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-700">{c.totalEnquiries}</td>
                    <td className="px-5 py-4 text-center font-bold text-emerald-600">{c.totalPurchases}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-800">
                      ₹{(c.totalSpending || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleOpenDetails(c.id)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        title="View Customer Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 && (
              <div className="p-8 text-center text-slate-400">No customers found.</div>
            )}
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomerDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedCustomerDetails.customer.name}</h2>
                <p className="text-xs text-slate-400">Shop: {selectedCustomerDetails.customer.shopName} ({selectedCustomerDetails.customer.shopId})</p>
              </div>
              <button onClick={() => setSelectedCustomerDetails(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl text-xs mb-6">
              <div><span className="text-slate-400 font-medium">Phone:</span> <strong className="text-slate-700 block">{selectedCustomerDetails.customer.phone}</strong></div>
              <div><span className="text-slate-400 font-medium">Email:</span> <strong className="text-slate-700 block">{selectedCustomerDetails.customer.email || '—'}</strong></div>
              <div><span className="text-slate-400 font-medium">Location:</span> <strong className="text-slate-700 block">{selectedCustomerDetails.customer.location}</strong></div>
            </div>

            {/* Enquiries History */}
            <h3 className="font-bold text-slate-800 text-sm mb-3">Enquiries ({selectedCustomerDetails.enquiries.length})</h3>
            <div className="space-y-2 mb-6">
              {selectedCustomerDetails.enquiries.map((e: any) => (
                <div key={e.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">{e.productName} ({e.size} / {e.color})</p>
                    <p className="text-slate-400 mt-0.5">{new Date(e.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-bold ${e.purchaseStatus === 'Purchased' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {e.purchaseStatus}
                  </span>
                </div>
              ))}
            </div>

            {/* Sales History */}
            <h3 className="font-bold text-slate-800 text-sm mb-3">Sales / Billing History ({selectedCustomerDetails.sales.length})</h3>
            <div className="space-y-2">
              {selectedCustomerDetails.sales.map((s: any) => (
                <div key={s.id} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">{s.invoiceNumber}</p>
                    <p className="text-slate-400 mt-0.5">{new Date(s.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <p className="font-bold text-emerald-700 text-sm">₹{(s.totalAmount || 0).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
