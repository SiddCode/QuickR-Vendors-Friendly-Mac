import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ArrowLeft, FileText, Store, Users, Key, ShieldOff, ShieldCheck } from 'lucide-react';

interface AdminActivityProps {
  setCurrentPage: (page: string) => void;
}

const actionIcons: Record<string, any> = {
  SHOP_CREATED: { icon: Store, color: 'bg-blue-100 text-blue-600' },
  SHOP_UPDATED: { icon: Store, color: 'bg-slate-100 text-slate-600' },
  SHOP_DISABLED: { icon: ShieldOff, color: 'bg-red-100 text-red-600' },
  SHOP_ENABLED: { icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-600' },
  OWNER_CREATED: { icon: Users, color: 'bg-violet-100 text-violet-600' },
  STAFF_CREATED: { icon: Users, color: 'bg-amber-100 text-amber-600' },
  USER_DISABLED: { icon: ShieldOff, color: 'bg-red-100 text-red-600' },
  USER_ENABLED: { icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-600' },
  PASSWORD_RESET: { icon: Key, color: 'bg-orange-100 text-orange-600' },
};

export const AdminActivity: React.FC<AdminActivityProps> = ({ setCurrentPage }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await api.adminGetActivities();
      setActivities(data);
    } catch (err) {
      console.error('Failed to load admin activities:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading activity log...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => setCurrentPage('admin-dashboard')} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <FileText className="w-6 h-6 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Activity Log</h1>
          <p className="text-sm text-slate-500">{activities.length} actions recorded</p>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-3">
        {activities.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            No admin activity recorded yet.
          </div>
        )}
        {activities.map((act, idx) => {
          const cfg = actionIcons[act.type] || { icon: FileText, color: 'bg-slate-100 text-slate-600' };
          const Icon = cfg.icon;
          return (
            <div key={act.id || idx} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{act.description}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">{act.type}</span>
                  {act.shopId && act.shopId !== 'ADMIN' && (
                    <span className="text-xs text-slate-500">Shop: {act.shopId}</span>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Date(act.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
