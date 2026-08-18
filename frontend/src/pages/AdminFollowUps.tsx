import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Filter, ArrowLeft } from 'lucide-react';
import { formatDateIST, formatTimeIST } from '../utils/date';

interface AdminFollowUpsProps {
  setCurrentPage: (page: string) => void;
}

export const AdminFollowUps: React.FC<AdminFollowUpsProps> = ({ setCurrentPage }) => {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'overdue' | 'upcoming' | 'completed' | 'all'>('all');

  useEffect(() => { loadShops(); }, []);

  useEffect(() => { loadFollowUps(); }, [selectedShopId, activeTab]);

  const loadShops = async () => {
    try {
      const data = await api.adminGetShops();
      setShops(data);
    } catch (err) {
      console.error('Failed to load shops:', err);
    }
  };

  const loadFollowUps = async () => {
    setLoading(true);
    try {
      const filterParam = activeTab === 'all' ? undefined : activeTab;
      const data = await api.adminGetFollowUps(selectedShopId || undefined, filterParam);
      setFollowUps(data);
    } catch (err) {
      console.error('Failed to load admin followups:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
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
            <h1 className="text-2xl font-bold text-slate-800">Global Smart Follow-ups</h1>
            <p className="text-sm text-slate-500">Read-Only view of follow-ups across all shops (IST Date Math)</p>
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all capitalize whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
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

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading follow-ups...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-5 py-3.5 text-left">Customer</th>
                  <th className="px-5 py-3.5 text-left">Shop</th>
                  <th className="px-5 py-3.5 text-left">Product</th>
                  <th className="px-5 py-3.5 text-left">Scheduled Date (IST)</th>
                  <th className="px-5 py-3.5 text-center">Priority</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-left">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {followUps.map(f => (
                  <tr key={f.id} className="hover:bg-slate-25 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-800">{f.customerName}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                        {f.shopName}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-medium">{f.productName}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-800">
                      <div>{formatDateIST(f.scheduledAt)}</div>
                      <div className="text-slate-400">{formatTimeIST(f.scheduledAt)}</div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        f.priority === 'High' ? 'bg-red-50 text-red-600' :
                        f.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        {f.priority}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        f.status === 'completed' || f.status === 'closed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        f.status === 'ready' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 max-w-xs truncate">{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {followUps.length === 0 && (
              <div className="p-8 text-center text-slate-400">No follow-ups found for selected filters.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
