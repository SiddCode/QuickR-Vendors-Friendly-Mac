import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Filter, ArrowLeft, Eye, X } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

interface AdminEnquiriesProps {
  setCurrentPage: (page: string) => void;
}

export const AdminEnquiries: React.FC<AdminEnquiriesProps> = ({ setCurrentPage }) => {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null);

  useEffect(() => { loadShops(); }, []);

  useEffect(() => { loadEnquiries(); }, [selectedShopId, selectedInterest, selectedStatus]);

  const loadShops = async () => {
    try {
      const data = await api.adminGetShops();
      setShops(data);
    } catch (err) {
      console.error('Failed to load shops:', err);
    }
  };

  const loadEnquiries = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetEnquiries({
        shopId: selectedShopId || undefined,
        interest: selectedInterest || undefined,
        purchaseStatus: selectedStatus || undefined
      });
      setEnquiries(data);
    } catch (err) {
      console.error('Failed to load admin enquiries:', err);
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
            <h1 className="text-2xl font-bold text-slate-800">Global Customer Enquiries</h1>
            <p className="text-sm text-slate-500">Read-Only view of enquiries across all shops</p>
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

        <select
          value={selectedInterest}
          onChange={e => setSelectedInterest(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none"
        >
          <option value="">All Interest Levels</option>
          <option value="Just Enquiring">Just Enquiring</option>
          <option value="Interested">Interested</option>
          <option value="Very Interested">Very Interested</option>
        </select>

        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none"
        >
          <option value="">All Purchase Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Purchased">Purchased</option>
          <option value="Didn't Purchase">Didn't Purchase</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading enquiries...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-5 py-3.5 text-left">Customer</th>
                  <th className="px-5 py-3.5 text-left">Shop</th>
                  <th className="px-5 py-3.5 text-left">Product</th>
                  <th className="px-5 py-3.5 text-left">Requirement</th>
                  <th className="px-5 py-3.5 text-center">Interest</th>
                  <th className="px-5 py-3.5 text-center">Purchase Status</th>
                  <th className="px-5 py-3.5 text-left">Enquiry Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {enquiries.map(e => (
                  <tr key={e.id} className="hover:bg-slate-25 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-800">{e.customerName}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                        {e.shopName}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-medium">{e.productName}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{e.size} / {e.color} ({e.quantity})</td>
                    <td className="px-5 py-4 text-center"><StatusBadge status={e.interest} /></td>
                    <td className="px-5 py-4 text-center"><StatusBadge status={e.purchaseStatus} /></td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedEnquiry(e)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        title="View Enquiry Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {enquiries.length === 0 && (
              <div className="p-8 text-center text-slate-400">No enquiries found.</div>
            )}
          </div>
        </div>
      )}

      {/* Enquiry Detail Modal */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-800">Enquiry Details</h2>
              <button onClick={() => setSelectedEnquiry(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Enquiry ID:</span> <span className="font-mono text-slate-800">{selectedEnquiry.id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Shop:</span> <span className="font-bold text-slate-800">{selectedEnquiry.shopName} ({selectedEnquiry.shopId})</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Customer:</span> <span className="font-bold text-slate-800">{selectedEnquiry.customerName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Product:</span> <span className="text-slate-800">{selectedEnquiry.productName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Size / Color:</span> <span className="text-slate-800">{selectedEnquiry.size} / {selectedEnquiry.color}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Quantity:</span> <span className="text-slate-800">{selectedEnquiry.quantity}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Price at Enquiry:</span> <span className="font-bold text-slate-800">₹{(selectedEnquiry.priceAtEnquiry || 0).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Interest:</span> <span><StatusBadge status={selectedEnquiry.interest} /></span></div>
              <div className="flex justify-between"><span className="text-slate-500">Purchase Status:</span> <span><StatusBadge status={selectedEnquiry.purchaseStatus} /></span></div>
              {selectedEnquiry.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500 block mb-1">Notes:</span>
                  <p className="bg-slate-50 p-3 rounded-xl text-slate-700 italic text-xs">"{selectedEnquiry.notes}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
