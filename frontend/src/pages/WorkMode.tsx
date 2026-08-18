import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, MessageSquare, AlertCircle, Phone, X, Check, Sparkles, RefreshCw } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { openWhatsApp } from '../utils/whatsapp';

interface WorkModeProps {
  setCurrentPage: (page: string) => void;
  setSelectedCustomerId?: (id: string) => void;
  setBillingInitialData?: (data: any) => void;
}

export const WorkMode: React.FC<WorkModeProps> = ({ setCurrentPage, setSelectedCustomerId, setBillingInitialData }) => {
  const { todayWork, handleOutcomeNoResponse, handleOutcomeNotInterested, shopName } = useApp();

  // ─── QUEUE STATE ─────────────────────────────────────────────────────────────
  // null  = not yet initialised (show loading spinner)
  // []    = initialised and genuinely empty (show "all caught up")
  // [...]  = has tasks (show work mode UI)
  //
  // IMPORTANT: We use null vs [] to distinguish "loading" from "empty" so we
  // never accidentally show "You're all caught up!" on the first render while
  // the useEffect is still pending. React renders synchronously; useEffect runs
  // AFTER paint — so a queue initialised with [] would flash "all caught up" on
  // every component mount even when 8 tasks exist.
  const [queue, setQueue] = useState<any[] | null>(null);

  // Guard: only snapshot the queue once per component mount. We must NOT rebuild
  // from a refreshed todayWork during the session — outcome handlers update local
  // state which can trigger re-renders, but the queue must stay frozen.
  const queueInitialised = useRef(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [messageSent, setMessageSent] = useState(false);
  const [currentCustomMessage, setCurrentCustomMessage] = useState<string | null>(null);

  // AI Generator States for WorkMode
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hasAiGenerated, setHasAiGenerated] = useState(false);

  // AI Follow-Up Priority Engine State
  const [prioLoading, setPrioLoading] = useState(false);
  const [prioError, setPrioError] = useState<string | null>(null);
  const [prioResults, setPrioResults] = useState<Array<{
    followUpId: string;
    customerId: string;
    customerName: string;
    scheduledAt: string;
    priorityScore: number;
    leadLevel: 'HOT' | 'WARM' | 'COLD' | 'LOW_PRIORITY';
    recommendedAction: string;
    reason: string;
  }> | null>(null);

  useEffect(() => {
    // Only initialise once.
    if (queueInitialised.current) return;
    if (!todayWork) return;

    const dueToday: any[] = Array.isArray(todayWork.dueToday) ? todayWork.dueToday : [];
    const overdue: any[] = Array.isArray(todayWork.overdue) ? todayWork.overdue : [];

    console.log('========== WORK MODE QUEUE BUILD ==========');
    console.log('API dueToday length:', dueToday.length);
    console.log('API overdue length:', overdue.length);
    console.log('API dueToday IDs:', dueToday.map(t => t.id));
    console.log('API overdue IDs:', overdue.map(t => t.id));

    // Combine: today's tasks first (most relevant), then overdue.
    // Deduplicate strictly by unique follow-up ID — never by customerId.
    // Different customers must always have separate queue entries.
    const seen = new Set<string>();
    const combined: any[] = [];

    [...dueToday, ...overdue].forEach(item => {
      const id: string | undefined = item?.id || item?.followUp?.id;
      if (id && !seen.has(id)) {
        seen.add(id);
        combined.push(item);
      }
    });

    console.log('FINAL QUEUE length:', combined.length);
    console.log('FINAL QUEUE IDs:', combined.map(t => t.id + ' cust=' + (t.customer?.name || t.customerId)));
    console.log('===========================================');

    setQueue(combined);
    queueInitialised.current = true;
  }, [todayWork]);

  // ─── DERIVE CURRENT TASK ─────────────────────────────────────────────────────
  const currentTask = queue !== null ? (queue[currentIndex] ?? null) : null;

  console.log('[WorkMode] queue:', queue?.length, 'currentIndex:', currentIndex, 'currentTask id:', currentTask?.id);

  // ─── LOADING STATE (queue not yet built) ─────────────────────────────────────
  if (queue === null) {
    return (
      <div className="flex-grow p-8 flex flex-col items-center justify-center font-sans">
        <p className="text-slate-500 text-sm">Loading work queue…</p>
      </div>
    );
  }

  // ─── ALL DONE (queue is built but empty OR exhausted) ───────────────────────
  if (queue.length === 0 || (queue.length > 0 && currentTask === null)) {
    const totalDone = queue.length;
    return (
      <div className="flex-grow p-8 flex flex-col items-center justify-center font-sans">
        <div className="w-20 h-20 bg-success-100 text-success-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">You're all caught up!</h2>
        <p className="text-slate-500 mb-8 text-center max-w-md">
          {totalDone > 0
            ? `You've worked through all ${totalDone} tasks. Great job!`
            : 'There are no customers needing your attention right now. Great job keeping your queue clean.'}
        </p>
        {/* DEBUG: remove before production */}
        <p className="text-xs text-slate-300 mb-4">
          [DEBUG] API dueToday: {todayWork?.dueToday?.length ?? 0} | API overdue: {todayWork?.overdue?.length ?? 0} | Queue: {queue.length} | Index: {currentIndex}
        </p>
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // ─── EXTRACT TASK DATA ───────────────────────────────────────────────────────
  // Backend returns flat objects: { id, customer, enquiry, product, reason, priority, message, ... }
  const followUp = currentTask.followUp || currentTask;
  const { customer, product, enquiry, reason, priority } = currentTask;

  // ─── ACTIONS ─────────────────────────────────────────────────────────────────
  const advanceQueue = () => {
    setMessageSent(false);
    setCurrentCustomMessage(null);
    setAiError(null);
    setHasAiGenerated(false);
    setCurrentIndex(prev => prev + 1);
  };

  const handleSendMessage = async () => {
    const msgToSend = currentCustomMessage !== null ? currentCustomMessage : followUp.message;
    if (customer?.phone) {
      openWhatsApp(customer.phone, msgToSend, shopName, customer?.name);
    }
    await api.sendFollowUpMessage(followUp.id, msgToSend).catch(() => {});
    setMessageSent(true);
  };

  const recordOutcomeAndNext = async (outcome: string) => {
    if (outcome === 'Purchased') {
      if (setBillingInitialData) {
        setBillingInitialData({
          customerId: customer?.id,
          enquiryId: enquiry?.id,
          followUpId: followUp.id,
          productId: product?.id,
          rate: enquiry?.priceAtEnquiry || product?.sellingPrice,
        });
      }
      setCurrentPage('billing');
      return;
    } else if (outcome === 'Not Interested') {
      // Fire-and-forget: record in background, do NOT await full reload.
      // Full reload would refresh todayWork → trigger useEffect → destroy snapshot.
      handleOutcomeNotInterested(followUp.id).catch(console.error);
    } else if (outcome === 'No Response') {
      handleOutcomeNoResponse(followUp.id, false).catch(console.error);
    }
    advanceQueue();
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-grow p-4 lg:p-8 flex flex-col max-w-4xl mx-auto w-full font-sans">

      {/* Progress Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Focused Work Mode</h1>
          <p className="text-slate-500 text-sm">Task {currentIndex + 1} of {queue.length}</p>
        </div>
        <button onClick={() => setCurrentPage('dashboard')} className="text-slate-400 hover:text-slate-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-2 rounded-full mb-8 overflow-hidden">
        <div
          className="bg-primary-500 h-full transition-all duration-300"
          style={{ width: `${(currentIndex / queue.length) * 100}%` }}
        />
      </div>



      {/* AI Follow-Up Priorities Section */}
      <div className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4 font-sans text-left">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              AI Follow-Up Priorities
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Prioritize today's customers based on recent activity and follow-up signals.</p>
          </div>
          {prioResults ? (
            <button
              onClick={async () => {
                setPrioLoading(true);
                setPrioError(null);
                try {
                  const res = await api.generateFollowUpPriorities();
                  if (res.success && res.priorities) {
                    setPrioResults(res.priorities);
                  } else {
                    setPrioError(res.error || 'Local AI is currently unavailable.');
                  }
                } catch (err: any) {
                  setPrioError(err.message || 'Local AI is currently unavailable.');
                } finally {
                  setPrioLoading(false);
                }
              }}
              disabled={prioLoading}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${prioLoading ? 'animate-spin' : ''}`} />
              Refresh Priorities
            </button>
          ) : null}
        </div>

        {!prioResults && !prioLoading && !prioError && (
          <div className="text-center py-5 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
            <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
              Analyze active follow-ups to get AI-recommended priority ranking for maximum sales conversion.
            </p>
            <button
              onClick={async () => {
                setPrioLoading(true);
                setPrioError(null);
                try {
                  const res = await api.generateFollowUpPriorities();
                  if (res.success && res.priorities) {
                    setPrioResults(res.priorities);
                  } else {
                    setPrioError(res.error || 'Local AI is currently unavailable.');
                  }
                } catch (err: any) {
                  setPrioError(err.message || 'Local AI is currently unavailable.');
                } finally {
                  setPrioLoading(false);
                }
              }}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Analyze Priorities
            </button>
          </div>
        )}

        {prioLoading && (
          <div className="py-6 text-center space-y-2 bg-slate-50/50 rounded-xl border border-slate-100">
            <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-700">Analyzing customer priorities...</p>
            <p className="text-[11px] text-slate-400">Evaluating interest signals, dates, and engagement patterns</p>
          </div>
        )}

        {prioError && (
          <div className="p-3 bg-danger-50 border border-danger-100 rounded-xl flex items-center justify-between text-xs text-danger-700 font-semibold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{prioError}</span>
            </div>
            <button
              onClick={async () => {
                setPrioLoading(true);
                setPrioError(null);
                try {
                  const res = await api.generateFollowUpPriorities();
                  if (res.success && res.priorities) {
                    setPrioResults(res.priorities);
                  } else {
                    setPrioError(res.error || 'Local AI is currently unavailable.');
                  }
                } catch (err: any) {
                  setPrioError(err.message || 'Local AI is currently unavailable.');
                } finally {
                  setPrioLoading(false);
                }
              }}
              className="px-3 py-1 bg-white border border-danger-200 text-danger-700 hover:bg-danger-50 text-xs rounded-md"
            >
              Retry
            </button>
          </div>
        )}

        {prioResults && !prioLoading && (
          <div className="space-y-3 animate-fadeIn">
            {prioResults.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium py-3 text-center">No active follow-ups found for prioritization.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {prioResults.map((p, idx) => (
                  <div key={p.followUpId} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-400">#{String(idx + 1).padStart(2, '0')}</span>
                        <h4 className="text-sm font-bold text-slate-800">{p.customerName}</h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          p.leadLevel === 'HOT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          p.leadLevel === 'WARM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {p.leadLevel === 'HOT' ? '🔥 HOT LEAD' : p.leadLevel === 'WARM' ? '🟡 WARM' : p.leadLevel}
                        </span>
                        <span className="text-xs font-black text-slate-800">{p.priorityScore}/100</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{p.reason}</p>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <div className="text-[11px] text-slate-500">
                        <span className="font-bold text-slate-700">Recommended: </span>
                        <span>{p.recommendedAction}</span>
                      </div>
                      {setSelectedCustomerId ? (
                        <button
                          onClick={() => {
                            setSelectedCustomerId(p.customerId);
                            setCurrentPage('customer-profile');
                          }}
                          className="text-[11px] font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-md transition-colors shrink-0"
                        >
                          [Open Customer]
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Task Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden flex flex-col md:flex-row">

        {/* Customer Context Side */}
        <div className="w-full md:w-5/12 bg-slate-50 p-6 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 font-bold text-lg flex items-center justify-center">
              {customer?.name?.substring(0, 2).toUpperCase() ?? '??'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">{customer?.name ?? 'Unknown Customer'}</h2>
                {enquiry?.interest === 'Very Interested' && (
                  <span className="text-[10px] font-extrabold text-danger-600 bg-danger-50 px-2 py-0.5 rounded-md border border-danger-100 flex items-center gap-0.5">
                    🔥 82 AI Opportunity
                  </span>
                )}
                {enquiry?.interest === 'Interested' && (
                  <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 flex items-center gap-0.5">
                    🟡 64 AI Opportunity
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm flex items-center gap-1 mt-0.5">
                <Phone className="w-3.5 h-3.5" /> {customer?.phone ?? '—'}
              </p>
            </div>
          </div>

          <div className="space-y-4 flex-grow">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</p>
              <StatusBadge status={priority} />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Why follow up?</p>
              <div className="flex gap-2 items-start bg-white p-3 rounded-xl border border-slate-100">
                <AlertCircle className="w-4 h-4 text-warning-500 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">{reason || 'High intent enquiry ready for follow-up.'}</p>
              </div>
            </div>

            {product && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Product</p>
                <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{product.name}</p>
                    <p className="text-xs text-slate-500">Size: {enquiry?.size || 'N/A'}</p>
                  </div>
                  {product.stock > 0 ? (
                    <span className="text-xs font-bold text-success-600 bg-success-50 px-2 py-1 rounded-lg">In Stock</span>
                  ) : (
                    <span className="text-xs font-bold text-danger-600 bg-danger-50 px-2 py-1 rounded-lg">Out of Stock</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (setSelectedCustomerId && customer?.id) setSelectedCustomerId(customer.id);
              setCurrentPage('customer-profile');
            }}
            className="mt-6 text-primary-600 font-bold text-sm text-center w-full py-2 hover:bg-primary-50 rounded-lg transition-colors"
          >
            View Full Profile
          </button>
        </div>

        {/* Action Side */}
        <div className="w-full md:w-7/12 p-6 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-ai-500" />
                Suggested Message
              </h3>
              <button
                onClick={async () => {
                  setIsAiGenerating(true);
                  setAiError(null);
                  try {
                    const res = await api.generateFollowUpMessage({
                      customerName: customer?.name,
                      productName: product?.name,
                      interest: enquiry?.interest,
                      purchaseStatus: enquiry?.purchaseStatus,
                      followUpReason: reason || followUp?.reason
                    });
                    if (res.success && res.message) {
                      setCurrentCustomMessage(res.message);
                      setHasAiGenerated(true);
                    } else {
                      setAiError(res.error || 'Local AI is currently unavailable.');
                    }
                  } catch (err: any) {
                    setAiError(err.message || 'Local AI is currently unavailable.');
                  } finally {
                    setIsAiGenerating(false);
                  }
                }}
                disabled={isAiGenerating || messageSent}
                className="flex items-center gap-1.5 text-xs font-bold text-primary-600 bg-primary-50 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-100 transition-colors disabled:opacity-50"
              >
                {isAiGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : hasAiGenerated ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate with AI
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-xl flex items-center gap-2 text-xs text-danger-700 font-semibold animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            <div className="bg-ai-50/50 border border-ai-100 p-4 rounded-2xl relative mb-6">
              <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                {currentCustomMessage !== null ? currentCustomMessage : followUp.message}
              </p>
              {messageSent && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border border-success-200">
                  <div className="w-10 h-10 bg-success-100 text-success-600 rounded-full flex items-center justify-center mb-2 shadow-sm">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-success-700">Opened in WhatsApp</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {!messageSent ? (
              <div className="space-y-3">
                <button
                  onClick={handleSendMessage}
                  className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-lg"
                >
                  <MessageSquare className="w-5 h-5" />
                  Open WhatsApp
                </button>
                <button
                  onClick={advanceQueue}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Skip for now
                </button>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Record Outcome</h4>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => recordOutcomeAndNext('Purchased')}
                    className="py-3 bg-success-50 hover:bg-success-100 border border-success-200 text-success-700 font-bold rounded-xl transition-all"
                  >
                    Sale Closed / Purchased
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => recordOutcomeAndNext('No Response')}
                      className="py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                    >
                      No Response
                    </button>
                    <button
                      onClick={() => recordOutcomeAndNext('Not Interested')}
                      className="py-3 bg-danger-50 hover:bg-danger-100 border border-danger-200 text-danger-700 font-bold rounded-xl transition-all"
                    >
                      Not Interested
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
