import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { 
  Pause, 
  Play, 
  MessageSquare, 
  Smile, 
  Image as ImageIcon, 
  Code, 
  Check, 
  TrendingUp,
  PartyPopper,
  X,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { openWhatsApp } from '../utils/whatsapp';

interface SmartFollowUpProps {
  setCurrentPage: (page: string) => void;
  setSelectedCustomerId: (id: string) => void;
}

export const SmartFollowUp: React.FC<SmartFollowUpProps> = ({ 
  setCurrentPage, 
  setSelectedCustomerId 
}) => {
  const { 
    customers, 
    products, 
    enquiries, 
    followUps, 
    createSale,
    handleOutcomeStillInterested,
    handleOutcomeNotInterested,
    handleOutcomeNoResponse,
    shopName
  } = useApp();

  const [activeQueueIndex, setActiveQueueIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  // AI Follow-up Generator States
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hasAiGenerated, setHasAiGenerated] = useState(false);

  // Outcome Flow States
  const [selectedOutcome, setSelectedOutcome] = useState<'Purchased' | 'Still Interested' | 'Not Interested' | 'No Response' | null>(null);
  
  // Purchased modal state
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  
  // Still Interested rescheduled date selection
  const [rescheduleDate, setRescheduleDate] = useState('Tomorrow');
  
  // No response scheduling
  const [noResponseOption, setNoResponseOption] = useState<boolean>(true); // true = schedule, false = don't followup

  // Today's session metrics for completion page
  const [sessionCompleted, setSessionCompleted] = useState(0);
  const [sessionSent, setSessionSent] = useState(0);
  const [sessionConverted, setSessionConverted] = useState(0);
  const [sessionRecoveredAmount, setSessionRecoveredAmount] = useState(0);

  // Filter for active followups in the work queue
  // Show 'ready' or 'sent' followups
  const workQueue = followUps.filter(f => f.status === 'ready' || f.status === 'sent');
  const currentFollowUp = workQueue[activeQueueIndex];

  // Sync message when active followup changes
  useEffect(() => {
    if (currentFollowUp) {
      setCustomMsg(currentFollowUp.message);
      setIsSent(currentFollowUp.status === 'sent');
      setSelectedOutcome(null);
      setAiError(null);
      setHasAiGenerated(false);
    }
  }, [currentFollowUp]);

  // Trigger celebration when queue is empty or index reaches end of queue
  const isQueueFinished = workQueue.length === 0 || activeQueueIndex >= workQueue.length;

  useEffect(() => {
    if (isQueueFinished && sessionCompleted > 0) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [isQueueFinished]);

  if (isQueueFinished) {
    return (
      <div className="flex-grow p-8 flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-6 font-sans animate-fadeIn">
        <div className="w-20 h-20 bg-success-50 text-success-500 rounded-full flex items-center justify-center shadow-soft">
          <PartyPopper className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">🎉 You're done.</h2>
          <p className="text-sm text-slate-500">QuickR will take care of the rest.</p>
        </div>

        <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-soft text-left space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
              <span className="text-xl font-bold text-slate-800 block">{sessionCompleted}</span>
              <span className="text-[10px] font-semibold text-slate-400">Follow-ups Completed</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
              <span className="text-xl font-bold text-slate-800 block">{sessionSent}</span>
              <span className="text-[10px] font-semibold text-slate-400">Messages Sent</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
              <span className="text-xl font-bold text-success-600 block">{sessionConverted}</span>
              <span className="text-[10px] font-semibold text-slate-400">Customers Converted</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
              <span className="text-xl font-bold text-primary-500 block">₹{sessionRecoveredAmount.toLocaleString('en-IN')}</span>
              <span className="text-[10px] font-semibold text-slate-400">Recovered Sales</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-400 leading-relaxed max-w-sm">
          We'll follow up automatically and notify you about any responses.
        </div>
        
        <button 
          onClick={() => setCurrentPage('dashboard')} 
          className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-sm transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentCustomer = customers.find(c => c.id === currentFollowUp.customerId);
  const currentEnquiry = enquiries.find(e => e.id === currentFollowUp.enquiryId);
  const currentProduct = currentEnquiry ? products.find(p => p.id === currentEnquiry.productId) : null;
  const handleSend = async () => {
    if (!currentFollowUp) return;
    if (currentCustomer?.phone) {
      openWhatsApp(currentCustomer.phone, customMsg, shopName, currentCustomer?.name);
    }
    await api.sendFollowUpMessage(currentFollowUp.id, customMsg).catch(() => {});
    setIsSent(true);
    setSessionSent(prev => prev + 1);
  };

  const advanceQueue = () => {
    // Increment completed count
    setSessionCompleted(prev => prev + 1);
    
    // Automatically load the next follow-up
    if (activeQueueIndex < workQueue.length - 1) {
      // Stay on same index if we filtered out the current item, but since state updates might render asynchronously,
      // let's keep index advancing aligned.
      // If we closed/completed the item, the length of workQueue will shrink.
      // So keeping index at activeQueueIndex is safe if the item is removed from queue!
      // But if we snoozed/completed it, it leaves the workQueue.
      // Let's reset page outcome state
      setSelectedOutcome(null);
      setIsSent(false);
    } else {
      setSelectedOutcome(null);
      setIsSent(false);
    }
  };

  const handleOutcomeConfirm = () => {
    if (!currentFollowUp) return;

    if (selectedOutcome === 'Purchased') {
      setIsPurchaseModalOpen(true);
    } else if (selectedOutcome === 'Still Interested') {
      const nextDays = rescheduleDate === 'Tomorrow' ? 1 : rescheduleDate === '3 days' ? 3 : 7;
      const dateStr = new Date(Date.now() + nextDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      handleOutcomeStillInterested(currentFollowUp.id, dateStr);
      advanceQueue();
    } else if (selectedOutcome === 'Not Interested') {
      handleOutcomeNotInterested(currentFollowUp.id);
      advanceQueue();
    } else if (selectedOutcome === 'No Response') {
      handleOutcomeNoResponse(currentFollowUp.id, noResponseOption);
      advanceQueue();
    }
  };

  const handleRecordSale = async () => {
    if (!currentFollowUp || !currentProduct) return;
    const amount = currentProduct.sellingPrice;
    await createSale({
      customerId: currentFollowUp.customerId,
      customerName: currentCustomer?.name || 'Customer',
      enquiryId: currentFollowUp.enquiryId,
      followUpId: currentFollowUp.id,
      items: [{
        productId: currentProduct.id,
        productName: currentProduct.name,
        category: currentProduct.category,
        quantity: 1,
        rate: amount,
        total: amount
      }],
      subtotal: amount,
      discount: 0,
      totalAmount: amount,
      paymentMethod: 'Cash',
      source: 'quickr_followup'
    });
    
    // Update session stats
    setSessionConverted(prev => prev + 1);
    setSessionRecoveredAmount(prev => prev + amount);
    
    setIsPurchaseModalOpen(false);
    advanceQueue();
  };

  // Session progress
  const completedCount = sessionCompleted;
  const progressPercent = Math.min(100, Math.round((completedCount / 5) * 100));

  return (
    <div className="flex-grow p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Smart Follow-up</h2>
          <p className="text-xs text-slate-400">Work Queue</p>
        </div>
        <button 
          onClick={() => setIsPaused(!isPaused)}
          className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl font-bold text-xs shadow-sm transition-all ${
            isPaused 
              ? 'bg-primary-50 border-primary-200 text-primary-500' 
              : 'bg-white border-slate-100 text-slate-655 hover:bg-slate-50'
          }`}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          {isPaused ? 'Resume Queue' : 'Pause Queue'}
        </button>
      </div>

      {/* Progress banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">We've got {workQueue.length} things for you.</h3>
            <p className="text-xs text-slate-400">QuickR will help you follow up with interested customers.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-700">{completedCount} / 5 Completed</p>
            <div className="w-32 bg-slate-100 h-2 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-primary-500 h-full transition-all duration-300" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>
          <span className="text-lg font-extrabold text-slate-750">{progressPercent}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left main work area */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Main Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-6">
            
            {/* Upper label info */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-50">
              <span className="text-xs font-bold text-primary-500 uppercase tracking-wide">
                CURRENT ({activeQueueIndex + 1} OF {workQueue.length})
              </span>
              <button 
                onClick={() => {
                  setSelectedCustomerId(currentFollowUp.customerId);
                  setCurrentPage('customer-profile');
                }}
                className="text-xs font-bold text-primary-500 hover:underline"
              >
                View Profile
              </button>
            </div>

            {/* Profile split grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentCustomer && (
                <div className="text-left space-y-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 font-extrabold text-sm flex items-center justify-center">
                      {currentCustomer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                        {currentCustomer.name}
                        <StatusBadge status="Interested" />
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{currentCustomer.phone}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    <p>{currentCustomer.email}</p>
                    <p>{currentCustomer.location}</p>
                  </div>
                </div>
              )}

              {currentProduct && (
                <div className="space-y-2 text-xs font-medium text-slate-500 border-l border-slate-50 pl-6">
                  <div className="flex justify-between">
                    <span>Product:</span>
                    <span className="font-bold text-slate-800">{currentProduct.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size / Color:</span>
                    <span className="font-bold text-slate-850">{currentEnquiry?.size} / {currentEnquiry?.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-bold text-slate-800">₹{currentProduct.sellingPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last enquiry:</span>
                    <span className="text-slate-400 font-semibold">15 May 2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <StatusBadge status={currentEnquiry?.purchaseStatus || "Didn't Purchase"} />
                  </div>
                </div>
              )}
            </div>

            {/* Why Follow Up section */}
            <div className="p-4 bg-primary-50/20 border border-primary-100/30 rounded-xl space-y-1.5 text-left">
              <h4 className="text-xs font-bold text-primary-600 uppercase tracking-wide">Why follow up?</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {currentFollowUp.reason}
              </p>
            </div>

            {/* Message composer / outcome flow */}
            {!isSent ? (
              <div className="space-y-4 pt-4 border-t border-slate-50 text-left">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wider">Send WhatsApp Message</h4>
                  <button 
                    onClick={async () => {
                      setIsAiGenerating(true);
                      setAiError(null);
                      try {
                        const res = await api.generateFollowUpMessage({
                          customerName: currentCustomer?.name,
                          productName: currentProduct?.name,
                          interest: currentEnquiry?.interest,
                          purchaseStatus: currentEnquiry?.purchaseStatus,
                          followUpReason: currentFollowUp?.reason
                        });
                        console.log("AI FOLLOWUP RESPONSE:", res);
                        if (res.success && res.message) {
                          setCustomMsg(res.message);
                          setHasAiGenerated(true);
                        } else {
                          setAiError(res.error || 'AI generation is currently unavailable.');
                        }
                      } catch (err: any) {
                        setAiError(err.message || 'Local AI is currently unavailable.');
                      } finally {
                        setIsAiGenerating(false);
                      }
                    }}
                    disabled={isAiGenerating}
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
                  <div className="p-3 bg-danger-50 border border-danger-200 rounded-xl flex items-center gap-2 text-xs text-danger-700 font-semibold animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                <div className="border border-slate-100 rounded-2xl overflow-hidden focus-within:border-primary-400 transition-colors">
                  <textarea
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    rows={5}
                    className="w-full bg-slate-50/50 p-4 text-xs font-medium focus:outline-none border-b border-slate-50/80 leading-relaxed text-slate-700"
                  />
                  <div className="px-4 py-2 bg-slate-50 flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-3">
                      <button className="hover:text-slate-600"><Smile className="w-4 h-4" /></button>
                      <button className="hover:text-slate-600"><ImageIcon className="w-4 h-4" /></button>
                      <button className="hover:text-slate-600"><Code className="w-4 h-4" /></button>
                    </div>
                    <span className="text-[10px] font-bold">{customMsg.length} / 1024</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={handleSend}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all"
                  >
                    <MessageSquare className="w-4 h-4" /> Open WhatsApp
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-4 border-t border-slate-50 text-left animate-fadeIn">
                <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-xs text-emerald-600 font-semibold">
                  <Check className="w-4 h-4" /> Message draft opened in WhatsApp
                </div>

                {/* Outcome selector */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800">What happened?</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['Purchased', 'Still Interested', 'Not Interested', 'No Response'] as const).map(out => (
                      <button
                        key={out}
                        onClick={() => setSelectedOutcome(out)}
                        className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                          selectedOutcome === out 
                            ? 'bg-primary-50 border-primary-500 text-primary-500 shadow-sm' 
                            : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {out}
                      </button>
                    ))}
                  </div>

                  {/* Recommendation block based on outcome selection */}
                  {selectedOutcome && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4 animate-fadeIn">
                      {selectedOutcome === 'Purchased' && (
                        <div className="text-xs text-slate-655 space-y-1">
                          <p className="font-bold text-slate-700">✓ Customer converted!</p>
                          <p>We will record a recovered sale of ₹{currentProduct?.sellingPrice.toLocaleString('en-IN')}.</p>
                        </div>
                      )}

                      {selectedOutcome === 'Still Interested' && (
                        <div className="space-y-3">
                          <div className="text-xs text-slate-600">
                            <p className="font-bold text-slate-700">QuickR recommends another follow-up.</p>
                            <p className="mt-0.5">Reason: Customer is still interested but has not purchased.</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {['Tomorrow', '3 days', 'Next week'].map(d => (
                              <button
                                key={d}
                                onClick={() => setRescheduleDate(d)}
                                className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                                  rescheduleDate === d 
                                    ? 'bg-white border-primary-500 text-primary-500 shadow-sm' 
                                    : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                                }`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedOutcome === 'Not Interested' && (
                        <div className="text-xs text-slate-600">
                          <p className="font-bold text-slate-700">Close the enquiry.</p>
                          <p className="mt-0.5">QuickR will close this follow-up and mark purchase status as Didn't Purchase.</p>
                        </div>
                      )}

                      {selectedOutcome === 'No Response' && (
                        <div className="space-y-3">
                          <div className="text-xs text-slate-600">
                            <p className="font-bold text-slate-750">No response received.</p>
                            <p className="mt-0.5">Recommended: Follow up again in 3 days.</p>
                          </div>
                          <div className="flex gap-3">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                              <input 
                                type="radio" 
                                checked={noResponseOption === true}
                                onChange={() => setNoResponseOption(true)} 
                                className="text-primary-500 w-4 h-4"
                              />
                              Schedule Follow-up
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                              <input 
                                type="radio" 
                                checked={noResponseOption === false}
                                onChange={() => setNoResponseOption(false)}
                                className="text-primary-500 w-4 h-4"
                              />
                              Don't Follow Up
                            </label>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-2 border-t border-slate-200/50">
                        <button
                          onClick={handleOutcomeConfirm}
                          className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm"
                        >
                          Confirm Action
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side Queue & Today's Progress sidebar */}
        <div className="lg:col-span-4 space-y-6 text-left">
          
          {/* Today's Progress Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Today's Progress</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                <span className="text-2xl font-black text-slate-700 block">{workQueue.length}</span>
                <span className="text-[10px] font-semibold text-slate-400">To Do</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                <span className="text-2xl font-black text-slate-700 block">{sessionCompleted}</span>
                <span className="text-[10px] font-semibold text-slate-400">Completed</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50">
                <span className="text-2xl font-black text-slate-700 block">1</span>
                <span className="text-[10px] font-semibold text-slate-400">Snoozed</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 flex items-start justify-between">
                <div>
                  <span className="text-2xl font-black text-slate-700 block">85%</span>
                  <span className="text-[10px] font-semibold text-slate-400">Response Rate</span>
                </div>
                <TrendingUp className="w-4 h-4 text-primary-500 mt-1" />
              </div>
            </div>
          </div>

          {/* Queue list */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Queue ({workQueue.length})</h3>
            <div className="space-y-2">
              {workQueue.map((item, idx) => {
                const customer = customers.find(c => c.id === item.customerId);
                const enquiry = enquiries.find(e => e.id === item.enquiryId);
                const prod = enquiry ? products.find(p => p.id === enquiry.productId) : null;
                const isCurrent = idx === activeQueueIndex;

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveQueueIndex(idx)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between ${
                      isCurrent 
                        ? 'bg-primary-50/50 border-primary-200 shadow-sm' 
                        : 'bg-white border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        isCurrent ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className={`text-xs font-bold ${isCurrent ? 'text-primary-600' : 'text-slate-700'}`}>
                          {customer?.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {prod?.name} • {enquiry?.size}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={enquiry?.interest === 'Interested' ? 'Interested' : 'Maybe'} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RECORD SALE CONFIRMATION MODAL */}
      {isPurchaseModalOpen && currentCustomer && currentProduct && currentEnquiry && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-left space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <h3 className="text-base font-bold text-slate-800">Confirm Purchase Outcome</h3>
              <button 
                onClick={() => setIsPurchaseModalOpen(false)} 
                className="text-slate-400 hover:text-slate-655"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 font-semibold">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="text-slate-800 font-bold">{currentCustomer.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Product:</span>
                <span className="text-slate-800">{currentProduct.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Size:</span>
                <span className="text-slate-800 bg-primary-50 px-2 py-0.5 rounded font-bold">{currentEnquiry.size}</span>
              </div>
              <div className="flex justify-between">
                <span>Price:</span>
                <span className="text-slate-800">₹{currentProduct.sellingPrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span className="text-slate-800">1</span>
              </div>
              <div className="flex justify-between border-t border-slate-50 pt-2 text-sm font-black text-slate-800">
                <span>Total:</span>
                <span>₹{currentProduct.sellingPrice.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3">
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="px-4 py-2 border border-slate-100 rounded-xl text-slate-500 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordSale}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Record Sale
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
