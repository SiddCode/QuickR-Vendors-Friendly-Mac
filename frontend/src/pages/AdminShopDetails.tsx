import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ArrowLeft, Store, Users, Package, MessageSquare, ClipboardList, IndianRupee, ShieldCheck, ShieldOff, Key, X, AlertTriangle } from 'lucide-react';

interface AdminShopDetailsProps {
  shopId: string | null;
  setCurrentPage: (page: string) => void;
}

export const AdminShopDetails: React.FC<AdminShopDetailsProps> = ({ shopId, setCurrentPage }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [resetModal, setResetModal] = useState<{ userId: string; userName: string } | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetResult, setResetResult] = useState('');
  const [confirmDisable, setConfirmDisable] = useState(false);

  useEffect(() => {
    if (shopId) loadShop();
  }, [shopId]);

  const loadShop = async () => {
    try {
      const result = await api.adminGetShop(shopId!);
      setData(result);
      setEditName(result.shop.name);
    } catch (err) {
      console.error('Failed to load shop details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    try {
      await api.adminUpdateShop(shopId!, { name: editName.trim() });
      setEditing(false);
      loadShop();
    } catch (err: any) {
      alert(err.message || 'Failed to update shop name');
    }
  };

  const handleToggleStatus = async (newStatus: string) => {
    try {
      await api.adminUpdateShop(shopId!, { status: newStatus });
      setConfirmDisable(false);
      loadShop();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleResetPassword = async () => {
    if (!resetModal || !resetPassword || resetPassword.length < 6) {
      setResetResult('Password must be at least 6 characters.');
      return;
    }
    try {
      const res = await api.adminResetPassword(resetModal.userId, resetPassword);
      setResetResult(`Password reset successfully. Temporary password: ${res.temporaryPassword}`);
    } catch (err: any) {
      setResetResult(err.message || 'Failed to reset password');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading shop details...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Shop not found</div>;

  const { shop, owner, staff, statistics } = data;

  const statCards = [
    { label: 'Customers', value: statistics.customers, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Products', value: statistics.products, icon: Package, color: 'text-violet-600 bg-violet-50' },
    { label: 'Enquiries', value: statistics.enquiries, icon: MessageSquare, color: 'text-pink-600 bg-pink-50' },
    { label: 'Follow-ups', value: statistics.followUps, icon: ClipboardList, color: 'text-amber-600 bg-amber-50' },
    { label: 'Sales', value: statistics.sales, icon: IndianRupee, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => setCurrentPage('admin-shops')} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <Store className="w-6 h-6 text-primary-500" />
        <div className="flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input value={editName} onChange={e => setEditName(e.target.value)} className="text-xl font-bold text-slate-800 border border-slate-200 px-3 py-1 rounded-lg" />
              <button onClick={handleSaveName} className="px-3 py-1.5 bg-primary-600 text-white text-sm font-bold rounded-lg">Save</button>
              <button onClick={() => { setEditing(false); setEditName(shop.name); }} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-lg">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{shop.name}</h1>
              <button onClick={() => setEditing(true)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
            </div>
          )}
          <p className="text-sm text-slate-500 font-mono">{shop.customId}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-xl text-sm font-bold ${shop.status === 'disabled' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
          {shop.status === 'disabled' ? 'Disabled' : 'Active'}
        </span>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* Shop Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Shop Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Shop ID</span><span className="font-mono text-slate-800">{shop.customId}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="font-bold">{shop.status === 'disabled' ? '🔴 Disabled' : '🟢 Active'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Created</span><span>{new Date(shop.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
          </div>
          <div className="mt-5 flex gap-2">
            {shop.status !== 'disabled' ? (
              <button onClick={() => setConfirmDisable(true)} className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 font-bold text-sm rounded-xl hover:bg-red-100 border border-red-200">
                <ShieldOff className="w-4 h-4" /> Disable Shop
              </button>
            ) : (
              <button onClick={() => handleToggleStatus('active')} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 font-bold text-sm rounded-xl hover:bg-emerald-100 border border-emerald-200">
                <ShieldCheck className="w-4 h-4" /> Enable Shop
              </button>
            )}
          </div>
        </div>

        {/* Owner Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Owner</h3>
          {owner ? (
            <>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-bold text-slate-800">{owner.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="text-slate-700">{owner.email}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`font-bold ${owner.status === 'disabled' ? 'text-red-600' : 'text-emerald-600'}`}>{owner.status === 'disabled' ? 'Disabled' : 'Active'}</span></div>
              </div>
              <button
                onClick={() => { setResetModal({ userId: owner.id, userName: owner.name }); setResetPassword(''); setResetResult(''); }}
                className="mt-5 flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-600 font-bold text-sm rounded-xl hover:bg-amber-100 border border-amber-200"
              >
                <Key className="w-4 h-4" /> Reset Password
              </button>
            </>
          ) : (
            <p className="text-slate-500 text-sm">No owner assigned</p>
          )}
        </div>
      </div>

      {/* Statistics */}
      <h3 className="font-bold text-slate-800 mb-4">Shop Statistics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.color} rounded-2xl p-4 text-center border border-slate-100`}>
              <Icon className="w-5 h-5 mx-auto mb-2 opacity-70" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-70">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Staff List */}
      {staff && staff.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Staff ({staff.length})</h3>
          <div className="space-y-3">
            {staff.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.email}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${s.status === 'disabled' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {s.status === 'disabled' ? 'Disabled' : 'Active'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Disable */}
      {confirmDisable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <h3 className="text-lg font-bold text-slate-800">Disable Shop?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">Disable <strong>{shop.name}</strong>? Users will not be able to log in, but data will be preserved.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDisable(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl">Cancel</button>
              <button onClick={() => handleToggleStatus('disabled')} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl">Disable</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Reset Password</h3>
              <button onClick={() => setResetModal(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-600 mb-4">Reset password for <strong>{resetModal.userName}</strong></p>
            <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="New temporary password" />
            {resetResult && <div className={`text-sm px-3 py-2 rounded-lg mb-3 ${resetResult.startsWith('Password reset') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{resetResult}</div>}
            <div className="flex gap-3">
              <button onClick={() => setResetModal(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl">Cancel</button>
              <button onClick={handleResetPassword} className="flex-1 py-2.5 bg-amber-600 text-white font-bold rounded-xl">Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
