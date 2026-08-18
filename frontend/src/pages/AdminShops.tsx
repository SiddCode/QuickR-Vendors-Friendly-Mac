import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Eye, ShieldOff, ShieldCheck, ArrowLeft, Key, X, Check, AlertTriangle, Trash2 } from 'lucide-react';

interface AdminShopsProps {
  setCurrentPage: (page: string) => void;
  setAdminSelectedShopId?: (id: string) => void;
}

export const AdminShops: React.FC<AdminShopsProps> = ({ setCurrentPage, setAdminSelectedShopId }) => {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdResult, setCreatedResult] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ shopId: string; action: string; shopName: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ shopId: string; shopName: string } | null>(null);
  const [deleteInputText, setDeleteInputText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [resetModal, setResetModal] = useState<{ userId: string; userName: string } | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetResult, setResetResult] = useState('');

  // Create form
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [activeTab, setActiveTab] = useState<'shops' | 'requests'>('shops');
  const [subRequests, setSubRequests] = useState<any[]>([]);
  
  const [approveModal, setApproveModal] = useState<any>(null);
  const [approveAdminNotes, setApproveAdminNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState('');

  const [rejectModal, setRejectModal] = useState<any>(null);
  const [rejectAdminNotes, setRejectAdminNotes] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteErr, setBulkDeleteErr] = useState('');

  const handleSelectAllRequests = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRequestIds(subRequests.map(r => r.id));
    } else {
      setSelectedRequestIds([]);
    }
  };

  const handleToggleSelectRequest = (id: string) => {
    setSelectedRequestIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteRequests = async () => {
    if (selectedRequestIds.length === 0 || bulkDeleting) return;
    setBulkDeleting(true);
    setBulkDeleteErr('');
    try {
      await api.adminDeleteSubscriptionRequests(selectedRequestIds);
      setSelectedRequestIds([]);
      setBulkDeleteModal(false);
      loadSubscriptionRequests();
    } catch (err: any) {
      setBulkDeleteErr(err.message || 'Failed to delete selected subscription requests');
    } finally {
      setBulkDeleting(false);
    }
  };

  useEffect(() => { 
    loadShops(); 
    loadSubscriptionRequests();
  }, []);

  const loadShops = async () => {
    try {
      const data = await api.adminGetShops();
      setShops(data);
    } catch (err) {
      console.error('Failed to load shops:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionRequests = async () => {
    try {
      const data = await api.adminGetSubscriptionRequests();
      setSubRequests(data);
    } catch (err) {
      console.error('Failed to load subscription requests:', err);
    }
  };

  const handleCreateShop = async () => {
    setCreateError('');
    if (!shopName || !ownerName || !ownerEmail || !password) {
      setCreateError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setCreateError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPw) {
      setCreateError('Passwords do not match.');
      return;
    }

    setCreating(true);
    try {
      const result = await api.adminCreateShop({ shopName, ownerName, ownerEmail, password });
      setCreatedResult(result);
      setShowCreateModal(false);
      setShopName(''); setOwnerName(''); setOwnerEmail(''); setPassword(''); setConfirmPw('');
      loadShops();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create shop');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (shopId: string, newStatus: string) => {
    try {
      await api.adminUpdateShopStatus(shopId, newStatus as 'active' | 'disabled');
      setConfirmAction(null);
      loadShops();
    } catch (err: any) {
      alert(err.message || 'Failed to update shop status');
    }
  };

  const handleDeleteShop = async () => {
    if (!deleteModal || deleteInputText.trim() !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.adminDeleteShop(deleteModal.shopId);
      setDeleteModal(null);
      setDeleteInputText('');
      loadShops();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete shop');
    } finally {
      setDeleting(false);
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

  const handleApproveRequest = async () => {
    if (!approveModal || approving) return;
    setApproving(true);
    setApproveError('');
    try {
      const res = await api.adminApproveSubscriptionRequest(approveModal.id, approveAdminNotes);
      setCreatedResult(res);
      setApproveModal(null);
      setApproveAdminNotes('');
      loadSubscriptionRequests();
      loadShops();
    } catch (err: any) {
      setApproveError(err.message || 'Failed to approve subscription request');
    } finally {
      setApproving(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectModal || rejecting) return;
    setRejecting(true);
    setRejectError('');
    try {
      await api.adminRejectSubscriptionRequest(rejectModal.id, rejectAdminNotes);
      setRejectModal(null);
      setRejectAdminNotes('');
      loadSubscriptionRequests();
    } catch (err: any) {
      setRejectError(err.message || 'Failed to reject subscription request');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading shops...</div>;
  }

  const pendingRequestsCount = subRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('admin-dashboard')} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Shop & Subscription Management</h1>
            <p className="text-sm text-slate-500">{shops.length} active shops · {pendingRequestsCount} pending requests</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" /> Create Shop Directly
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('shops')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'shops'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Registered Shops ({shops.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Subscription Access Requests ({subRequests.length})
          {pendingRequestsCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white font-extrabold text-[10px] rounded-full">
              {pendingRequestsCount} PENDING
            </span>
          )}
        </button>
      </div>

      {/* Tab Content: Registered Shops */}
      {activeTab === 'shops' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Shop ID</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Shop Name</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Owner</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Subscription</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Created</th>
                  <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {shops.map(shop => (
                  <tr key={shop.customId} className="hover:bg-slate-25 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">{shop.customId}</td>
                    <td className="px-5 py-4 font-bold text-slate-800">{shop.name}</td>
                    <td className="px-5 py-4 text-slate-700">{shop.owner?.name || '—'}</td>
                    <td className="px-5 py-4 text-slate-500">{shop.owner?.email || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                        shop.status === 'disabled' 
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                        {shop.status === 'disabled' ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {shop.subscriptionStatus || 'active'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(shop.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { if (setAdminSelectedShopId) setAdminSelectedShopId(shop.customId); setCurrentPage('admin-shop-details'); }}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="View Details"
                        ><Eye className="w-4 h-4" /></button>
                        {shop.status !== 'disabled' ? (
                          <button
                            onClick={() => setConfirmAction({ shopId: shop.customId, action: 'disabled', shopName: shop.name })}
                            className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Disable Shop"
                          ><ShieldOff className="w-4 h-4" /></button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(shop.customId, 'active')}
                            className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors" title="Enable Shop"
                          ><ShieldCheck className="w-4 h-4" /></button>
                        )}
                        {shop.owner && (
                          <button
                            onClick={() => { setResetModal({ userId: shop.owner.id, userName: shop.owner.name }); setResetPassword(''); setResetResult(''); }}
                            className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors" title="Reset Owner Password"
                          ><Key className="w-4 h-4" /></button>
                        )}
                        <button
                          onClick={() => { setDeleteModal({ shopId: shop.customId, shopName: shop.name }); setDeleteInputText(''); setDeleteError(''); }}
                          className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors" title="Delete Shop Permanently"
                        ><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Subscription Access Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Bulk action bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer select-none px-2 py-1 hover:bg-slate-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={subRequests.length > 0 && selectedRequestIds.length === subRequests.length}
                  onChange={handleSelectAllRequests}
                  className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500 cursor-pointer"
                />
                <span>Select All</span>
              </label>
              {selectedRequestIds.length > 0 && (
                <span className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full font-extrabold text-[11px]">
                  {selectedRequestIds.length} selected
                </span>
              )}
            </div>

            {selectedRequestIds.length > 0 && (
              <button
                onClick={() => setBulkDeleteModal(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs"
              >
                <Trash2 className="w-4 h-4" /> Delete Selected ({selectedRequestIds.length})
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="w-10 px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={subRequests.length > 0 && selectedRequestIds.length === subRequests.length}
                        onChange={handleSelectAllRequests}
                        className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left px-4 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Applicant</th>
                    <th className="text-left px-4 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Shop Name</th>
                    <th className="text-left px-4 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Mobile</th>
                    <th className="text-left px-4 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Plan</th>
                    <th className="text-left px-4 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Requested</th>
                    <th className="text-right px-4 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {subRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-400 text-xs font-semibold">
                        No subscription requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    subRequests.map(req => {
                      const isSelected = selectedRequestIds.includes(req.id);
                      return (
                        <tr key={req.id} className={`hover:bg-slate-25 transition-colors ${isSelected ? 'bg-primary-50/30' : ''}`}>
                          <td className="w-10 px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRequest(req.id)}
                              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-4 font-bold text-slate-800">{req.name}</td>
                          <td className="px-4 py-4 font-bold text-primary-600">{req.shopName}</td>
                          <td className="px-4 py-4 font-mono text-xs text-slate-700">{req.phone}</td>
                          <td className="px-4 py-4 text-slate-600 text-xs">{req.email}</td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[11px] font-bold">
                              {req.requestedPlan || 'Standard'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase ${
                              req.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : req.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-500 text-xs">
                            {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {req.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => { setApproveModal(req); setApproveAdminNotes(''); setApproveError(''); }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => { setRejectModal(req); setRejectAdminNotes(''); setRejectError(''); }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">
                                {req.status === 'approved' ? `Created ${req.createdShopId}` : 'Processed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {bulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Delete selected requests?</h3>
                <p className="text-xs text-rose-600 font-bold">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium">
              You are about to permanently delete <strong>{selectedRequestIds.length}</strong> subscription request(s). Active shops and owner accounts created from previously approved requests will remain intact.
            </p>

            {bulkDeleteErr && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200">{bulkDeleteErr}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                disabled={bulkDeleting}
                onClick={() => setBulkDeleteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={bulkDeleting}
                onClick={handleBulkDeleteRequests}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {bulkDeleting ? 'Deleting...' : 'Delete Requests'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Approve this shop?</h3>
            
            <p className="text-xs text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 p-3 rounded-xl font-medium">
              This will create an active QuickR shop and owner account for <strong>{approveModal.shopName}</strong> ({approveModal.email}). Make sure the subscription/payment discussion has been completed before approving.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Admin Notes (Optional)</label>
              <textarea
                rows={2}
                value={approveAdminNotes}
                onChange={e => setApproveAdminNotes(e.target.value)}
                placeholder="e.g. Payment discussion complete on phone call. Standard 1-year plan."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {approveError && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200">{approveError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                disabled={approving}
                onClick={() => setApproveModal(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={approving}
                onClick={handleApproveRequest}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                {approving ? 'Creating Shop...' : 'Approve & Launch Shop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Reject subscription request?</h3>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 p-3 rounded-xl font-medium">
              Rejecting access request for <strong>{rejectModal.shopName}</strong> ({rejectModal.email}). No active shop or owner account will be created.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rejection Reason / Notes (Optional)</label>
              <textarea
                rows={2}
                value={rejectAdminNotes}
                onChange={e => setRejectAdminNotes(e.target.value)}
                placeholder="e.g. Applicant requested invalid phone contact."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {rejectError && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200">{rejectError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                disabled={rejecting}
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={rejecting}
                onClick={handleRejectRequest}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                {rejecting ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Shop Modal ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Create New Shop</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Shop Name</label>
                <input value={shopName} onChange={e => setShopName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Kumar Fashion" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Owner Name</label>
                <input value={ownerName} onChange={e => setOwnerName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Rahul Kumar" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Owner Email</label>
                <input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="rahul@kumarfashion.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Temporary Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="••••••" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Confirm Password</label>
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="••••••" />
                </div>
              </div>
              {createError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>}
              <button onClick={handleCreateShop} disabled={creating} className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Shop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Created Success Modal ─── */}
      {createdResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"><Check className="w-5 h-5 text-emerald-600" /></div>
              <h2 className="text-xl font-bold text-slate-800">Shop Created Successfully</h2>
            </div>
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl text-sm mb-4">
              <div><span className="font-bold text-slate-500">Shop ID:</span> <span className="font-mono text-slate-800">{createdResult.shop.customId}</span></div>
              <div><span className="font-bold text-slate-500">Shop Name:</span> <span className="text-slate-800">{createdResult.shop.name}</span></div>
              <div><span className="font-bold text-slate-500">Owner:</span> <span className="text-slate-800">{createdResult.owner.name}</span></div>
              <div><span className="font-bold text-slate-500">Email:</span> <span className="text-slate-800">{createdResult.owner.email}</span></div>
              <div className="pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-500">Temporary Password:</span>
                <span className="ml-2 px-3 py-1 bg-amber-100 text-amber-800 font-mono font-bold rounded-lg">{createdResult.temporaryPassword}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-xl mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">Save this temporary password. It will not be shown again.</p>
            </div>
            <button onClick={() => setCreatedResult(null)} className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">Done</button>
          </div>
        </div>
      )}

      {/* ─── Confirm Disable Modal ─── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <h3 className="text-lg font-bold text-slate-800">Disable Shop?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Disable <strong>{confirmAction.shopName}</strong>? Users from this shop will not be able to log in, but their business data will be preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={() => handleToggleStatus(confirmAction.shopId, 'disabled')} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">Disable</button>
            </div>
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
            <input
              type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="New temporary password (min 6 chars)"
            />
            {resetResult && (
              <div className={`text-sm px-3 py-2 rounded-lg mb-3 ${resetResult.startsWith('Password reset') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {resetResult}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setResetModal(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Cancel</button>
              <button onClick={handleResetPassword} className="flex-1 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700">Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Permanent Delete Confirmation Modal ─── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-rose-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Permanently Delete Shop</h3>
                <p className="text-xs text-rose-600 font-bold">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              This action will permanently delete <strong>{deleteModal.shopName}</strong> ({deleteModal.shopId}) and all associated shop-owned data, including customers, enquiries, follow-ups, products, sales, and staff accounts.
            </p>

            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl mb-4 text-xs font-semibold text-rose-800">
              Type <span className="font-mono font-black text-rose-900 bg-rose-200 px-1.5 py-0.5 rounded">DELETE</span> to confirm permanent removal.
            </div>

            <input
              type="text"
              value={deleteInputText}
              onChange={e => setDeleteInputText(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 mb-4 focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Type DELETE"
            />

            {deleteError && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-200 text-xs rounded-xl mb-4 font-semibold">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteShop}
                disabled={deleteInputText.trim() !== 'DELETE' || deleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting Shop...' : 'Delete Shop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
