import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldCheck } from 'lucide-react';

export const AdminPrivacy: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'requests' | 'audit' | 'incidents'>('requests');
  const [_loading, setLoading] = useState(false);

  // New incident form state
  const [incDesc, setIncDesc] = useState('');
  const [incSev, setIncSev] = useState('MEDIUM');

  const fetchAdminPrivacyData = async () => {
    setLoading(true);
    try {
      const [reqList, logList, incList] = await Promise.all([
        api.getAdminPrivacyRequests(),
        api.getAdminPrivacyAuditLogs(),
        api.getAdminSecurityIncidents()
      ]);
      setRequests(reqList);
      setAuditLogs(logList);
      setIncidents(incList);
    } catch (err) {
      console.error('Failed to load admin privacy data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminPrivacyData();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await api.updateAdminPrivacyRequest(id, { status });
      if (res.success) fetchAdminPrivacyData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incDesc.trim()) return;
    try {
      const res = await api.recordAdminSecurityIncident({ severity: incSev, description: incDesc });
      if (res.success) {
        setIncDesc('');
        fetchAdminPrivacyData();
      }
    } catch (err) {
      alert('Failed to record incident');
    }
  };

  return (
    <div className="flex-grow p-4 md:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans text-left">
      {/* Admin Privacy Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Admin Privacy & Compliance Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage user privacy requests, security audit logs & internal security incidents</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 gap-6 text-sm font-semibold">
        {[
          { id: 'requests', label: `Privacy Requests (${requests.length})` },
          { id: 'audit', label: `Audit Trail (${auditLogs.length})` },
          { id: 'incidents', label: `Security Incidents (${incidents.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 transition-all ${
              activeTab === tab.id
                ? 'text-violet-600 font-bold border-b-2 border-violet-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PRIVACY REQUESTS */}
      {activeTab === 'requests' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">User Privacy Requests & Grievances</h3>
          {requests.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No privacy requests found.</p>
          ) : (
            <div className="space-y-3">
              {requests.map(r => (
                <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase">{r.requestType}</span>
                      <span className="text-[10px] text-slate-400">• User: {r.userId} • Shop: {r.shopId}</span>
                    </div>
                    <p className="text-slate-600 font-medium">{r.description}</p>
                    <p className="text-[10px] text-slate-400">ID: {r.id} • Created: {new Date(r.createdAt).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={r.status}
                      onChange={e => handleUpdateStatus(r.id, e.target.value)}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="under_review">Under Review</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Privacy Audit Trail</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.map(l => (
              <div key={l.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-violet-600 mr-2">{l.action}</span>
                  <span className="text-slate-600">User: {l.userId}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {l.ipAddress} • {new Date(l.createdAt).toLocaleTimeString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY INCIDENTS */}
      {activeTab === 'incidents' && (
        <div className="space-y-6 font-sans">
          {/* Create Incident */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Record Security Incident</h3>
            <form onSubmit={handleCreateIncident} className="flex gap-3 text-xs">
              <select
                value={incSev}
                onChange={e => setIncSev(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
              <input
                type="text"
                required
                value={incDesc}
                onChange={e => setIncDesc(e.target.value)}
                placeholder="Describe security incident..."
                className="flex-grow p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
              <button type="submit" className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shrink-0">
                Record Incident
              </button>
            </form>
          </div>

          {/* List Incidents */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Security Incident Records</h3>
            {incidents.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No security incidents logged.</p>
            ) : (
              <div className="space-y-3">
                {incidents.map(i => (
                  <div key={i.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold px-2 py-0.5 rounded ${i.severity === 'CRITICAL' || i.severity === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                        {i.severity} SEVERITY
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(i.createdAt).toLocaleString('en-IN')}</span>
                    </div>
                    <p className="font-semibold text-slate-800">{i.description}</p>
                    <p className="text-[10px] text-slate-500">System: {i.affectedSystem} • ID: {i.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
