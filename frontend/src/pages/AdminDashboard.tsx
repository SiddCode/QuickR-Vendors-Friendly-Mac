import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Store, Users, ShieldCheck, MessageSquare, IndianRupee, Receipt, ClipboardList, TrendingUp, Package, Filter, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface AdminDashboardProps {
  setCurrentPage: (page: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ setCurrentPage }) => {
  const [stats, setStats] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Admin AI Business Intelligence State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [adminBiResult, setAdminBiResult] = useState<{
    stats: {
      totalShops: number;
      activeShops: number;
      disabledShops: number;
      totalCustomers: number;
      totalEnquiries: number;
      totalPurchasedEnquiries: number;
      totalNotPurchasedEnquiries: number;
      totalFollowUps: number;
      pendingFollowUps: number;
      completedFollowUps: number;
      totalSales: number;
      totalSalesAmount: number;
    };
    shopPerformance: Array<{
      shopId: string;
      shopName: string;
      customers: number;
      enquiries: number;
      purchases: number;
      salesAmount: number;
      pendingFollowUps: number;
      conversionRate: number;
    }>;
    aiInsights: {
      summary: string;
      insights: Array<{
        type: 'TOP_PERFORMER' | 'ATTENTION' | 'OPPORTUNITY' | 'CONVERSION' | 'FOLLOW_UP' | 'SALES' | 'GENERAL';
        title: string;
        description: string;
      }>;
      recommendations: string[];
    };
  } | null>(null);

  // Platform Trends State
  const [platformTrendsLoading, setPlatformTrendsLoading] = useState(false);
  const [platformTrendsError, setPlatformTrendsError] = useState<string | null>(null);
  const [platformTrendsResult, setPlatformTrendsResult] = useState<{
    metrics?: any;
    shopLeaders?: any;
  } | null>(null);

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    loadStats();
  }, [selectedShopId]);

  const loadShops = async () => {
    try {
      const data = await api.adminGetShops();
      setShops(data);
    } catch (err) {
      console.error('Failed to load shops:', err);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetDashboardStats(selectedShopId || undefined);
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const primaryCards = [
    { label: 'Total Shops', value: stats?.totalShops || 0, icon: Store, color: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-100', page: 'admin-shops' },
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'bg-indigo-50 text-indigo-600', iconBg: 'bg-indigo-100', page: 'admin-users' },
    { label: 'Total Customers', value: stats?.totalCustomers || 0, icon: Users, color: 'bg-violet-50 text-violet-600', iconBg: 'bg-violet-100', page: null },
    { label: 'Total Products', value: stats?.totalProducts || 0, icon: Package, color: 'bg-amber-50 text-amber-600', iconBg: 'bg-amber-100', page: null },
    { label: 'Total Enquiries', value: stats?.totalEnquiries || 0, icon: MessageSquare, color: 'bg-pink-50 text-pink-600', iconBg: 'bg-pink-100', page: null },
    { label: 'Total Follow-ups', value: stats?.totalFollowUps || 0, icon: ClipboardList, color: 'bg-orange-50 text-orange-600', iconBg: 'bg-orange-100', page: null },
    { label: 'Total Sales Count', value: stats?.totalSales || 0, icon: IndianRupee, color: 'bg-teal-50 text-teal-600', iconBg: 'bg-teal-100', page: null },
    { label: 'Total Revenue', value: `₹${(stats?.totalBillingAmount || 0).toLocaleString('en-IN')}`, icon: Receipt, color: 'bg-emerald-50 text-emerald-700', iconBg: 'bg-emerald-100', page: 'admin-reports' },
  ];

  const todayCards = [
    { label: "Today's Follow-ups", value: stats?.todayFollowUps || 0, color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { label: 'Overdue Follow-ups', value: stats?.overdueFollowUps || 0, color: 'text-red-700 bg-red-50 border-red-200' },
    { label: "Today's Enquiries", value: stats?.todayEnquiries || 0, color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { label: "Today's Sales Revenue", value: `₹${(stats?.todaySalesAmount || 0).toLocaleString('en-IN')}`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Global Admin Dashboard (Numbers Only Mode)</h1>
            <p className="text-sm text-slate-500">QuickR Platform Multi-Shop Aggregated Performance Overview</p>
          </div>
        </div>

        {/* Global Shop Selector */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <span className="text-xs font-bold text-slate-500 uppercase">Shop Filter:</span>
          <select
            value={selectedShopId}
            onChange={e => setSelectedShopId(e.target.value)}
            className="px-3 py-1.5 text-sm font-bold text-slate-700 bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">🌐 All Shops ({shops.length})</option>
            {shops.map(s => (
              <option key={s.customId} value={s.customId}>
                {s.name} ({s.customId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium">Loading platform aggregate metrics...</div>
      ) : (
        <>
          {/* Today & Priority Highlights */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {todayCards.map(c => (
              <div key={c.label} className={`p-4 rounded-2xl border shadow-sm ${c.color}`}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-75">{c.label}</p>
                <p className="text-2xl font-black mt-1">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {primaryCards.map(card => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  onClick={() => card.page && setCurrentPage(card.page)}
                  className={`${card.color} rounded-2xl p-5 border border-slate-100 shadow-sm transition-all ${card.page ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : 'cursor-default'} text-left group`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {card.page && <TrendingUp className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />}
                  </div>
                  <p className="text-2xl font-bold mb-1">{card.value}</p>
                  <p className="text-xs font-semibold opacity-70">{card.label}</p>
                </div>
              );
            })}
          </div>

          {/* AI Business Intelligence Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-6 mb-8 font-sans">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-500" />
                  AI Business Intelligence
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Cross-shop performance analytics & strategic recommendations</p>
              </div>
              {adminBiResult ? (
                <button
                  onClick={async () => {
                    setAiLoading(true);
                    setAiError(null);
                    try {
                      const res = await api.generateAdminInsights();
                      if (res.success && res.stats && res.shopPerformance && res.aiInsights) {
                        setAdminBiResult({
                          stats: res.stats,
                          shopPerformance: res.shopPerformance,
                          aiInsights: res.aiInsights
                        });
                      } else {
                        setAiError(res.error || 'Local AI is currently unavailable.');
                      }
                    } catch (err: any) {
                      setAiError(err.message || 'Local AI is currently unavailable.');
                    } finally {
                      setAiLoading(false);
                    }
                  }}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3.5 py-2 rounded-xl transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} />
                  Refresh AI Insights
                </button>
              ) : null}
            </div>

            {!adminBiResult && !aiLoading && !aiError && (
              <div className="text-center py-8 bg-slate-50/60 rounded-2xl border border-slate-100 space-y-3">
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                  Evaluate cross-shop conversion metrics, top performers, pending follow-up backlogs & AI recommendations.
                </p>
                <button
                  onClick={async () => {
                    setAiLoading(true);
                    setAiError(null);
                    try {
                      const res = await api.generateAdminInsights();
                      if (res.success && res.stats && res.shopPerformance && res.aiInsights) {
                        setAdminBiResult({
                          stats: res.stats,
                          shopPerformance: res.shopPerformance,
                          aiInsights: res.aiInsights
                        });
                      } else {
                        setAiError(res.error || 'Local AI is currently unavailable.');
                      }
                    } catch (err: any) {
                      setAiError(err.message || 'Local AI is currently unavailable.');
                    } finally {
                      setAiLoading(false);
                    }
                  }}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate AI Insights
                </button>
              </div>
            )}

            {aiLoading && (
              <div className="py-10 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-700">Analyzing QuickR business data...</p>
                <p className="text-xs text-slate-400">Processing cross-shop enquiries, sales revenue & conversion metrics</p>
              </div>
            )}

            {aiError && (
              <div className="p-4 bg-danger-50 border border-danger-100 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs text-danger-700 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
                <button
                  onClick={async () => {
                    setAiLoading(true);
                    setAiError(null);
                    try {
                      const res = await api.generateAdminInsights();
                      if (res.success && res.stats && res.shopPerformance && res.aiInsights) {
                        setAdminBiResult({
                          stats: res.stats,
                          shopPerformance: res.shopPerformance,
                          aiInsights: res.aiInsights
                        });
                      } else {
                        setAiError(res.error || 'Local AI is currently unavailable.');
                      }
                    } catch (err: any) {
                      setAiError(err.message || 'Local AI is currently unavailable.');
                    } finally {
                      setAiLoading(false);
                    }
                  }}
                  className="px-4 py-1.5 bg-white border border-danger-200 text-danger-700 hover:bg-danger-50 font-bold text-xs rounded-lg transition-all"
                >
                  Retry Analysis
                </button>
              </div>
            )}

            {adminBiResult && !aiLoading && (
              <div className="space-y-6 animate-fadeIn">
                {/* Platform Overview Cards */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Platform Overview</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Shops</span>
                      <span className="text-lg font-black text-slate-800">{adminBiResult.stats.activeShops}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Customers</span>
                      <span className="text-lg font-black text-slate-800">{adminBiResult.stats.totalCustomers}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Enquiries</span>
                      <span className="text-lg font-black text-slate-800">{adminBiResult.stats.totalEnquiries}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Purchases</span>
                      <span className="text-lg font-black text-slate-800">{adminBiResult.stats.totalPurchasedEnquiries}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Sales</span>
                      <span className="text-lg font-black text-slate-800">₹{adminBiResult.stats.totalSalesAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-600 uppercase block">Pending Follow-ups</span>
                      <span className="text-lg font-black text-amber-800">{adminBiResult.stats.pendingFollowUps}</span>
                    </div>
                  </div>
                </div>

                {/* AI Executive Summary */}
                <div className="p-4 bg-primary-50/70 border border-primary-100 rounded-xl">
                  <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider block mb-1">AI Business Summary</span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">{adminBiResult.aiInsights.summary}</p>
                </div>

                {/* Shop Performance Compact Table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Shop Performance Breakdown</h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Shop</th>
                          <th className="p-3 text-center">Enquiries</th>
                          <th className="p-3 text-center">Purchases</th>
                          <th className="p-3 text-center">Conversion</th>
                          <th className="p-3 text-right">Sales Amount</th>
                          <th className="p-3 text-center">Pending Follow-ups</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {adminBiResult.shopPerformance.slice(0, 8).map((s) => (
                          <tr key={s.shopId} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-800">{s.shopName}</td>
                            <td className="p-3 text-center">{s.enquiries}</td>
                            <td className="p-3 text-center">{s.purchases}</td>
                            <td className="p-3 text-center">
                              <span className={`font-bold px-2 py-0.5 rounded-md ${s.conversionRate >= 50 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                {s.conversionRate}%
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold">₹{s.salesAmount.toLocaleString('en-IN')}</td>
                            <td className="p-3 text-center">{s.pendingFollowUps}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* AI Insights Grid */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Strategic Observations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {adminBiResult.aiInsights.insights.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                          {item.type.replace(/_/g, ' ')}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {adminBiResult.aiInsights.recommendations.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommended Operational Actions</h3>
                    <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                      {adminBiResult.aiInsights.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-primary-500 font-bold shrink-0">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Platform Trends & Shop Leaders Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-6 mb-8 font-sans">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Platform Trends & Shop Leaders
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">30-day comparative platform trends & backend shop rankings</p>
              </div>
              <button
                onClick={async () => {
                  setPlatformTrendsLoading(true);
                  setPlatformTrendsError(null);
                  try {
                    const res = await api.generateTrends();
                    if (res.success && res.metrics) {
                      setPlatformTrendsResult({ metrics: res.metrics, shopLeaders: res.shopLeaders });
                    } else {
                      setPlatformTrendsError(res.error || 'Local AI is currently unavailable.');
                    }
                  } catch (err: any) {
                    setPlatformTrendsError(err.message || 'Local AI is currently unavailable.');
                  } finally {
                    setPlatformTrendsLoading(false);
                  }
                }}
                disabled={platformTrendsLoading}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${platformTrendsLoading ? 'animate-spin' : ''}`} />
                {platformTrendsResult ? 'Refresh Platform Trends' : 'Load Platform Trends'}
              </button>
            </div>

            {platformTrendsError && (
              <div className="p-3 bg-danger-50 border border-danger-100 rounded-xl text-xs text-danger-700 font-semibold">
                {platformTrendsError}
              </div>
            )}

            {platformTrendsResult && !platformTrendsLoading && (
              <div className="space-y-6 animate-fadeIn">
                {/* Platform Trends Cards */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Platform Trend Overview</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: 'Sales Count', item: platformTrendsResult.metrics.salesCount, isCurrency: false },
                      { label: 'Revenue', item: platformTrendsResult.metrics.salesAmount, isCurrency: true },
                      { label: 'Enquiries', item: platformTrendsResult.metrics.enquiries, isCurrency: false },
                      { label: 'Purchases', item: platformTrendsResult.metrics.purchases, isCurrency: false },
                      { label: 'Conversion Rate', item: platformTrendsResult.metrics.conversionRate, isPercent: true },
                      { label: 'Follow-ups', item: platformTrendsResult.metrics.followUpsCreated, isCurrency: false }
                    ].map(({ label, item, isCurrency, isPercent }) => {
                      if (!item) return null;
                      const isUp = item.direction === 'UP';
                      const isDown = item.direction === 'DOWN';
                      return (
                        <div key={label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">{label}</span>
                          <div className="text-base font-black text-slate-800 my-0.5">
                            {isCurrency ? `₹${item.current.toLocaleString('en-IN')}` : isPercent ? `${item.current}%` : item.current}
                          </div>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                            isUp ? 'bg-emerald-100 text-emerald-800' : isDown ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {item.changePercent !== null ? `${item.changePercent > 0 ? '+' : ''}${item.changePercent}%` : item.direction}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Shop Leaders Grids */}
                {platformTrendsResult.shopLeaders && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Shop Trend Leaders</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Fastest Improving */}
                      <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                        <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">Fastest Improving</span>
                        <div className="space-y-1 text-xs font-semibold">
                          {platformTrendsResult.shopLeaders.fastestImproving.map((s: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-800">{s.shopName}</span>
                              <span className="text-emerald-700 font-bold">{s.salesChangePercent !== null ? `+${s.salesChangePercent}%` : 'UP'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Declining Activity */}
                      <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                        <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider block">Declining Activity</span>
                        <div className="space-y-1 text-xs font-semibold">
                          {platformTrendsResult.shopLeaders.decliningActivity.map((s: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-800">{s.shopName}</span>
                              <span className="text-rose-700 font-bold">{s.salesChangePercent !== null ? `${s.salesChangePercent}%` : 'STABLE'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Improving Conversion */}
                      <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                        <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider block">Improving Conversion</span>
                        <div className="space-y-1 text-xs font-semibold">
                          {platformTrendsResult.shopLeaders.improvingConversion.map((s: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-800">{s.shopName}</span>
                              <span className="text-purple-700 font-bold">{s.conversionChangePercent !== null ? `+${s.conversionChangePercent}%` : '0%'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Highest Pending Follow-ups */}
                      <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2">
                        <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider block">Highest Pending Follow-ups</span>
                        <div className="space-y-1 text-xs font-semibold">
                          {platformTrendsResult.shopLeaders.highestPendingFollowups.map((s: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-800">{s.shopName}</span>
                              <span className="text-amber-700 font-bold">{s.pendingFollowUps} pending</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
