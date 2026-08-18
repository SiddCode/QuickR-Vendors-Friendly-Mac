import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { PhoneCall, Mail, IndianRupee, Sparkles, ChevronRight, Receipt, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface DashboardProps {
  setCurrentPage: (page: string) => void;
  setSelectedCustomerId: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setCurrentPage, setSelectedCustomerId }) => {
  const { enquiries, followUps, sales, todayWork, customers } = useApp();
  const { t } = useLanguage();
  // Live Backend Stats State
  const [backendStats, setBackendStats] = useState<any>(null);
  const [reengagementCount, setReengagementCount] = useState<number>(0);

  // AI Shop Sales Insights State
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsResult, setInsightsResult] = useState<{
    summary: string;
    insights: Array<{
      type: 'SALES_OPPORTUNITY' | 'PRODUCT' | 'FOLLOW_UP' | 'CUSTOMER' | 'CONVERSION' | 'GENERAL';
      title: string;
      description: string;
    }>;
    recommendations: string[];
    stats?: any;
  } | null>(null);

  // AI Business Trends State
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const [trendsResult, setTrendsResult] = useState<{
    period?: { current: string; previous: string };
    metrics?: any;
    aiInsights?: {
      summary: string;
      trends: Array<{
        type: 'SALES' | 'REVENUE' | 'ENQUIRY' | 'CONVERSION' | 'FOLLOW_UP' | 'CUSTOMER' | 'SHOP_ACTIVITY' | 'GENERAL';
        title: string;
        description: string;
        direction: 'UP' | 'DOWN' | 'STABLE' | 'NO_DATA';
        importance: 'HIGH' | 'MEDIUM' | 'LOW';
      }>;
      recommendations: string[];
    };
  } | null>(null);

  // Load Authoritative Backend Stats
  useEffect(() => {
    let isMounted = true;
    api.getDashboardStats().then(data => {
      if (isMounted) setBackendStats(data);
    }).catch(err => console.error('Failed to load dashboard stats:', err));

    api.getReengagementSummary('60').then(data => {
      if (isMounted && data.success) {
        setReengagementCount(data.recommendedCount || data.whatsappEligible || 0);
      }
    }).catch(err => console.error('Failed to load re-engagement summary:', err));

    return () => { isMounted = false; };
  }, [sales, followUps, enquiries]);

  // Pre-calculated stats fallback
  const followupCount = backendStats?.activeFollowUps ?? followUps.filter(f => f.status === 'ready' || f.status === 'sent' || f.status === 'scheduled').length;
  const enquiriesCount = backendStats?.totalEnquiries ?? enquiries.length;
  
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todaySales = sales.filter(s => new Date(s.createdAt) >= todayStart);
  const todayRevenue = backendStats?.todayRevenue ?? todaySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const todayBillCount = backendStats?.todaySalesCount ?? todaySales.length;

  const overdueCount = backendStats?.overdueFollowUps ?? todayWork?.summary?.overdueCount ?? 0;
  const upcomingCount = backendStats?.upcomingFollowUps ?? 0;

  const handleActionClick = () => {
    setCurrentPage('work-mode');
  };

  const handleCustomerClick = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCurrentPage('customer-profile');
  };

  // Derive live follow-ups from AppContext
  const custMap = new Map(customers.map(c => [c.id, c]));
  const liveRecentFollowups = followUps.slice(0, 5).map((f) => {
    const cust = custMap.get(f.customerId);
    const name = cust ? cust.name : 'Customer';
    const phone = cust ? cust.phone : 'N/A';
    const initial = name.substring(0, 2).toUpperCase();
    const date = f.scheduledAt ? new Date(f.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today';
    const priority = f.priority || 'Medium';

    return {
      id: f.id,
      customerId: f.customerId,
      name,
      phone,
      initial,
      status: f.status === 'ready' ? 'Follow-up' : f.status,
      date,
      priority
    };
  });

  return (
    <div className="flex-grow p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto max-w-7xl mx-auto w-full font-sans">
      {/* 1. Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t('dashboard.todayRevenue')} value={`₹${todayRevenue.toLocaleString('en-IN')}`} icon={IndianRupee} theme="green" />
        <StatCard label={t('dashboard.todaySales')} value={todayBillCount} icon={Receipt} theme="blue" />
        <StatCard label={t('dashboard.activeFollowups')} value={followupCount} icon={PhoneCall} theme="yellow" />
        <StatCard label={t('dashboard.totalEnquiries')} value={enquiriesCount} icon={Mail} theme="blue" />
      </div>

      {/* 2. Today's Actions + Recent Follow-ups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Today's Actions Card */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Today's Actions</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors duration-150 group" onClick={handleActionClick}>
                <div className="flex items-center gap-4">
                  <div className="w-3.5 h-3.5 rounded-full bg-danger-500 shrink-0" />
                  <p className="text-sm font-semibold text-slate-700">
                    <span className="text-danger-500 text-lg mr-1.5 font-bold">{overdueCount}</span> customers overdue for follow-up
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors duration-150 group" onClick={() => setCurrentPage('enquiries')}>
                <div className="flex items-center gap-4">
                  <div className="w-3.5 h-3.5 rounded-full bg-warning-500 shrink-0" />
                  <p className="text-sm font-semibold text-slate-700">
                    <span className="text-warning-500 text-lg mr-1.5 font-bold">{todayWork?.summary?.enquiriesCount || enquiriesCount}</span> enquiries waiting for response
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors duration-150 group" onClick={handleActionClick}>
                <div className="flex items-center gap-4">
                  <div className="w-3.5 h-3.5 rounded-full bg-success-500 shrink-0" />
                  <p className="text-sm font-semibold text-slate-700">
                    <span className="text-success-500 text-lg mr-1.5 font-bold">{todayWork?.summary?.todayWorkCount || 0}</span> customers ready today • <span className="text-blue-600 font-bold">{upcomingCount}</span> upcoming
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary-50/60 border border-primary-100 hover:bg-primary-50 cursor-pointer transition-colors duration-150 group" onClick={() => setCurrentPage('billing')}>
                <div className="flex items-center gap-4">
                  <div className="w-3.5 h-3.5 rounded-full bg-primary-500" />
                  <p className="text-sm font-semibold text-slate-700">
                    <span className="text-primary-500 text-lg mr-1.5 font-bold">{todayBillCount}</span> bills created today
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 hover:bg-indigo-100/60 cursor-pointer transition-colors duration-150 group" onClick={() => setCurrentPage('reengagement')}>
                <div className="flex items-center gap-4">
                  <div className="w-3.5 h-3.5 rounded-full bg-indigo-600 shrink-0" />
                  <p className="text-sm font-semibold text-slate-700">
                    <span className="text-indigo-600 text-lg mr-1.5 font-bold">{reengagementCount}</span> customers worth reconnecting
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => setCurrentPage('billing')}
              className="flex-1 py-3 border border-primary-200 bg-white text-primary-600 hover:bg-primary-50 font-bold rounded-xl transition-all duration-200 text-sm"
            >
              + New Bill
            </button>
            <button 
              onClick={handleActionClick}
              className="flex-1 py-3 border border-primary-200 bg-primary-600 text-white hover:bg-primary-700 font-bold rounded-xl transition-all duration-200 text-sm"
            >
              Start Today's Work
            </button>
          </div>
        </div>

        {/* Recent Follow-ups Table */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Recent Follow-ups</h2>
              <button onClick={handleActionClick} className="text-xs font-bold text-primary-500 hover:underline">
                View All
              </button>
            </div>
            {/* Mobile Cards View (sm and below) */}
            <div className="md:hidden space-y-3">
              {liveRecentFollowups.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleCustomerClick(item.customerId)}
                  className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 hover:bg-slate-100/80 cursor-pointer transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-extrabold text-xs flex items-center justify-center">
                        {item.initial}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.phone}</p>
                      </div>
                    </div>
                    <StatusBadge status={item.priority} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/50">
                    <span className="text-slate-500">Date: <strong className="text-slate-700">{item.date}</strong></span>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (md and above) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-400 font-medium border-b border-slate-50 pb-2">
                    <th className="py-2.5 font-semibold text-xs">Customer</th>
                    <th className="py-2.5 font-semibold text-xs text-center">Status</th>
                    <th className="py-2.5 font-semibold text-xs">Next Follow-up</th>
                    <th className="py-2.5 font-semibold text-xs text-center">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {liveRecentFollowups.map((item) => (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors duration-100 group"
                      onClick={() => handleCustomerClick(item.customerId)}
                    >
                      <td className="py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 font-bold text-xs flex items-center justify-center">
                          {item.initial}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 group-hover:text-primary-600 transition-colors">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.phone}</p>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3 text-xs text-slate-500 font-medium">{item.date}</td>
                      <td className="py-3 text-center">
                        <StatusBadge status={item.priority} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button 
            onClick={handleActionClick}
            className="text-primary-500 font-bold text-sm text-center w-full mt-4 hover:underline flex items-center justify-center gap-1.5"
          >
            View All Follow-ups &rarr;
          </button>
        </div>
      </div>

      {/* 3. AI Shop Sales Insights Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4 font-sans">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-500" />
            AI Shop Sales Insights
          </h2>
          {insightsResult ? (
            <button
              onClick={async () => {
                setInsightsLoading(true);
                setInsightsError(null);
                try {
                  const res = await api.generateShopInsights();
                  if (res.success && res.shopInsights) {
                    setInsightsResult(res.shopInsights);
                  } else {
                    setInsightsError(res.error || 'Local AI is currently unavailable.');
                  }
                } catch (err: any) {
                  setInsightsError(err.message || 'Local AI is currently unavailable.');
                } finally {
                  setInsightsLoading(false);
                }
              }}
              disabled={insightsLoading}
              className="flex items-center gap-1.5 text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
              Refresh Insights
            </button>
          ) : null}
        </div>

        {!insightsResult && !insightsLoading && !insightsError && (
          <div className="text-center py-6 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
            <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
              Analyze shop sales, customer engagement patterns, and conversion opportunities using local AI.
            </p>
            <button
              onClick={async () => {
                setInsightsLoading(true);
                setInsightsError(null);
                try {
                  const res = await api.generateShopInsights();
                  if (res.success && res.shopInsights) {
                    setInsightsResult(res.shopInsights);
                  } else {
                    setInsightsError(res.error || 'Local AI is currently unavailable.');
                  }
                } catch (err: any) {
                  setInsightsError(err.message || 'Local AI is currently unavailable.');
                } finally {
                  setInsightsLoading(false);
                }
              }}
              className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate Shop Insights
            </button>
          </div>
        )}

        {insightsLoading && (
          <div className="py-8 text-center space-y-2 bg-slate-50/50 rounded-xl border border-slate-100">
            <RefreshCw className="w-7 h-7 text-primary-500 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">Generating Shop Insights...</p>
            <p className="text-xs text-slate-400">Evaluating sales performance, conversion trends & follow-up opportunities</p>
          </div>
        )}

        {insightsError && (
          <div className="p-4 bg-danger-50 border border-danger-100 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs text-danger-700 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{insightsError}</span>
            </div>
            <button
              onClick={async () => {
                setInsightsLoading(true);
                setInsightsError(null);
                try {
                  const res = await api.generateShopInsights();
                  if (res.success && res.shopInsights) {
                    setInsightsResult(res.shopInsights);
                  } else {
                    setInsightsError(res.error || 'Local AI is currently unavailable.');
                  }
                } catch (err: any) {
                  setInsightsError(err.message || 'Local AI is currently unavailable.');
                } finally {
                  setInsightsLoading(false);
                }
              }}
              className="px-4 py-1.5 bg-white border border-danger-200 text-danger-700 hover:bg-danger-50 font-bold text-xs rounded-lg transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {insightsResult && !insightsLoading && (
          <div className="space-y-5 animate-fadeIn">
            {/* Summary Banner */}
            <div className="p-4 bg-primary-50/60 border border-primary-100 rounded-xl">
              <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider block mb-1">Executive Summary</span>
              <p className="text-xs font-semibold text-slate-800 leading-relaxed">{insightsResult.summary}</p>
            </div>

            {/* Insights Grid */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Key Shop Observations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insightsResult.insights.map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1 text-left">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations List */}
            {insightsResult.recommendations.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommended Owner Actions</h3>
                <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                  {insightsResult.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
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

      {/* 4. AI Business Trends Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-5 font-sans">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              AI Business Trends
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Last 30 Days vs Previous 30 Days</p>
          </div>
          {trendsResult ? (
            <button
              onClick={async () => {
                setTrendsLoading(true);
                setTrendsError(null);
                try {
                  const res = await api.generateTrends();
                  if (res.success && res.metrics) {
                    setTrendsResult({ period: res.period, metrics: res.metrics, aiInsights: res.aiInsights });
                  } else {
                    setTrendsError(res.error || 'Local AI is currently unavailable.');
                  }
                } catch (err: any) {
                  setTrendsError(err.message || 'Local AI is currently unavailable.');
                } finally {
                  setTrendsLoading(false);
                }
              }}
              disabled={trendsLoading}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${trendsLoading ? 'animate-spin' : ''}`} />
              Refresh Trends
            </button>
          ) : null}
        </div>

        {!trendsResult && !trendsLoading && !trendsError && (
          <div className="text-center py-6 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
            <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
              Compare current period performance against previous 30 days and analyze direction signals.
            </p>
            <button
              onClick={async () => {
                setTrendsLoading(true);
                setTrendsError(null);
                try {
                  const res = await api.generateTrends();
                  if (res.success && res.metrics) {
                    setTrendsResult({ period: res.period, metrics: res.metrics, aiInsights: res.aiInsights });
                  } else {
                    setTrendsError(res.error || 'Local AI is currently unavailable.');
                  }
                } catch (err: any) {
                  setTrendsError(err.message || 'Local AI is currently unavailable.');
                } finally {
                  setTrendsLoading(false);
                }
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Analyze Business Trends
            </button>
          </div>
        )}

        {trendsLoading && (
          <div className="py-8 text-center space-y-2 bg-slate-50/50 rounded-xl border border-slate-100">
            <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">Analyzing Business Trends...</p>
            <p className="text-xs text-slate-400">Comparing 30-day metrics against previous period</p>
          </div>
        )}

        {trendsError && (
          <div className="p-4 bg-danger-50 border border-danger-100 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs text-danger-700 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{trendsError}</span>
            </div>
            <button
              onClick={async () => {
                setTrendsLoading(true);
                setTrendsError(null);
                try {
                  const res = await api.generateTrends();
                  if (res.success && res.metrics) {
                    setTrendsResult({ period: res.period, metrics: res.metrics, aiInsights: res.aiInsights });
                  } else {
                    setTrendsError(res.error || 'Local AI is currently unavailable.');
                  }
                } catch (err: any) {
                  setTrendsError(err.message || 'Local AI is currently unavailable.');
                } finally {
                  setTrendsLoading(false);
                }
              }}
              className="px-4 py-1.5 bg-white border border-danger-200 text-danger-700 hover:bg-danger-50 font-bold text-xs rounded-lg transition-all"
            >
              Retry Trends
            </button>
          </div>
        )}

        {trendsResult && !trendsLoading && (
          <div className="space-y-6 animate-fadeIn">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Sales', item: trendsResult.metrics.salesCount, isCurrency: false },
                { label: 'Revenue', item: trendsResult.metrics.salesAmount, isCurrency: true },
                { label: 'Enquiries', item: trendsResult.metrics.enquiries, isCurrency: false },
                { label: 'Purchases', item: trendsResult.metrics.purchases, isCurrency: false },
                { label: 'Conversion Rate', item: trendsResult.metrics.conversionRate, isPercent: true },
                { label: 'Follow-ups', item: trendsResult.metrics.followUpsCreated, isCurrency: false }
              ].map(({ label, item, isCurrency, isPercent }) => {
                if (!item) return null;
                const isUp = item.direction === 'UP';
                const isDown = item.direction === 'DOWN';
                return (
                  <div key={label} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">{label}</span>
                    <div className="my-1">
                      <div className="text-base font-black text-slate-800">
                        {isCurrency ? `₹${item.current.toLocaleString('en-IN')}` : isPercent ? `${item.current}%` : item.current}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Prev: {isCurrency ? `₹${item.previous.toLocaleString('en-IN')}` : isPercent ? `${item.previous}%` : item.previous}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                        isUp ? 'bg-emerald-100 text-emerald-800' : isDown ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {isUp && <TrendingUp className="w-3 h-3" />}
                        {isDown && <TrendingDown className="w-3 h-3" />}
                        {!isUp && !isDown && <Minus className="w-3 h-3" />}
                        {item.changePercent !== null ? `${item.changePercent > 0 ? '+' : ''}${item.changePercent}%` : item.direction}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Trend Summary */}
            {trendsResult.aiInsights && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">AI Trend Summary</span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">{trendsResult.aiInsights.summary}</p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Key Metric Trends</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {trendsResult.aiInsights.trends.map((t, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 space-y-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t.type}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                            t.importance === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {t.importance}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          {t.direction === 'UP' && <span className="text-emerald-600">📈</span>}
                          {t.direction === 'DOWN' && <span className="text-rose-600">📉</span>}
                          {t.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{t.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {trendsResult.aiInsights.recommendations.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommended Actions</h3>
                    <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                      {trendsResult.aiInsights.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-emerald-600 font-bold shrink-0">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
