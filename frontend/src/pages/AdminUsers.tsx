import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ArrowLeft, Plus, ShieldOff, ShieldCheck, Key, X, AlertTriangle, Search } from 'lucide-react';

interface AdminUsersProps {
  setCurrentPage: (page: string) => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ setCurrentPage }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterShop, setFilterShop] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Create Staff
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffShopId, setStaffShopId] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffResult, setStaffResult] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  // Reset Password
  const [resetModal, setResetModal] = useState<{ userId: string; userName: string } | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetResult, setResetResult] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, shopsData] = await Promise.all([
        api.adminGetUsers(),
        api.adminGetShops()
      ]);
      setUsers(usersData);
      setShops(shopsData);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, newStatus: string) => {
    try {
      await api.adminUpdateUser(userId, { status: newStatus });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  };

  const handleCreateStaff = async () => {
    setStaffError('');
    if (!staffName || !staffEmail || !staffPassword || !staffShopId) {
      setStaffError('All fields are required.');
      return;
    }
    if (staffPassword.length < 6) {
      setStaffError('Password must be at least 6 characters.');
      return;
    }
    setCreating(true);
    try {
      const result = await api.adminCreateStaff({
        name: staffName, email: staffEmail, password: staffPassword, shopId: staffShopId
      });
      setStaffResult(result);
      setShowCreateStaff(false);
      setStaffName(''); setStaffEmail(''); setStaffPassword(''); setStaffShopId('');
      loadData();
    } catch (err: any) {
      setStaffError(err.message || 'Failed to create staff');
    } finally {
      setCreating(false);
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

  // Filter logic
  const filteredUsers = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterShop && u.shopId !== filterShop) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!u.name.toLowerCase().includes(term) && !u.email.toLowerCase().includes(term)) return false;
    }
    return true;
  });

  if (loading) return <div className="p-8 text-center text-slate-500">Loading users...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('admin-dashboard')} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
            <p className="text-sm text-slate-500">{users.length} total users</p>
          </div>
        </div>
        <button onClick={() => setShowCreateStaff(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-sm">
          <Plus className="w-4 h-4" /> Create Staff
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search name or email..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
          <option value="staff">Staff</option>
        </select>
        <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Shops</option>
          {shops.map(s => <option key={s.customId} value={s.customId}>{s.name}</option>)}
        </select>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Shop</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Created</th>
                <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-25 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-800">{user.name}</td>
                  <td className="px-5 py-4 text-slate-600">{user.email}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                      user.role === 'admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                      user.role === 'owner' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                      'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}>{user.role}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{user.shopName || user.shopId || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                      user.status === 'disabled' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>{user.status === 'disabled' ? 'Disabled' : 'Active'}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {user.role !== 'admin' && (
                        <>
                          {user.status !== 'disabled' ? (
                            <button onClick={() => handleToggleUserStatus(user.id, 'disabled')} className="p-2 hover:bg-red-50 text-red-500 rounded-lg" title="Disable User">
                              <ShieldOff className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => handleToggleUserStatus(user.id, 'active')} className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg" title="Enable User">
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => { setResetModal({ userId: user.id, userName: user.name }); setResetPassword(''); setResetResult(''); }} className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg" title="Reset Password">
                            <Key className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-slate-400">No users found matching filters.</div>
          )}
        </div>
      </div>

      {/* ─── Create Staff Modal ─── */}
      {showCreateStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Create Staff</h2>
              <button onClick={() => setShowCreateStaff(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Shop</label>
                <select value={staffShopId} onChange={e => setStaffShopId(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select a shop...</option>
                  {shops.filter(s => s.status !== 'disabled').map(s => <option key={s.customId} value={s.customId}>{s.name} ({s.customId})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Staff Name</label>
                <input value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Arun" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Staff Email</label>
                <input type="email" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="arun@kumarfashion.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Temporary Password</label>
                <input type="password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Min 6 characters" />
              </div>
              {staffError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{staffError}</p>}
              <button onClick={handleCreateStaff} disabled={creating} className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Staff'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Staff Created Success Modal ─── */}
      {staffResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Staff Created</h2>
            <div className="space-y-2 bg-slate-50 p-4 rounded-xl text-sm mb-4">
              <div><span className="font-bold text-slate-500">Name:</span> {staffResult.user.name}</div>
              <div><span className="font-bold text-slate-500">Email:</span> {staffResult.user.email}</div>
              <div><span className="font-bold text-slate-500">Shop:</span> {staffResult.user.shopId}</div>
              <div className="pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-500">Temp Password:</span>
                <span className="ml-2 px-3 py-1 bg-amber-100 text-amber-800 font-mono font-bold rounded-lg">{staffResult.temporaryPassword}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-xl mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">Save this temporary password. It will not be shown again.</p>
            </div>
            <button onClick={() => setStaffResult(null)} className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl">Done</button>
          </div>
        </div>
      )}

      {/* ─── Password Reset Modal ─── */}
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
