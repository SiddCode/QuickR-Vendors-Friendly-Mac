import React, { useState } from 'react';
import { formatDateIST, formatTimeIST, formatDateTimeIST } from '../utils/date';
import { StatusBadge } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, 
  MapPin, 
  Mail, 
  Phone, 
  Plus, 
  FileText, 
  MessageSquare,
  Heart, 
  CheckSquare, 
  Palette, 
  Clock, 
  Calendar,
  MoreHorizontal,
  Sparkles,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Trash2,
  AlertTriangle,
  Loader2,
  Megaphone
} from 'lucide-react';
import { api } from '../services/api';
import { messageGenerationService } from '../services/messageGenerationService';
import { openWhatsApp } from '../utils/whatsapp';

interface CustomerProfileProps {
  customerId: string;
  setCurrentPage: (page: string) => void;
  setSelectedCustomerId: (id: string) => void;
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({ 
  customerId, 
  setCurrentPage
}) => {
  const { 
    customers, 
    enquiries, 
    followUps, 
    notes, 
    activities, 
    products,
    addNote,
    deleteCustomer,
    shopName
  } = useApp();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'enquiries' | 'followups' | 'campaigns' | 'notes' | 'activity'>('overview');
  const [noteContent, setNoteContent] = useState('');

  // Customer Campaign History State
  const [campaignHistory, setCampaignHistory] = useState<any[]>([]);
  const [loadingCampaignHistory, setLoadingCampaignHistory] = useState(false);

  // AI Intelligence State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    leadLevel: 'HOT' | 'WARM' | 'COLD' | 'LOW_PRIORITY';
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
    recommendedAction: string;
    recommendedTiming: 'TODAY' | 'TOMORROW' | 'WITHIN_3_DAYS' | 'WAIT' | 'NO_FOLLOW_UP';
  } | null>(null);

  // AI Sales Opportunity State
  const [oppLoading, setOppLoading] = useState(false);
  const [oppError, setOppError] = useState<string | null>(null);
  const [oppResult, setOppResult] = useState<{
    opportunityScore: number;
    leadLevel: 'HOT' | 'WARM' | 'COLD' | 'LOW_PRIORITY';
    recommendedAction: string;
    recommendedTiming: 'TODAY' | 'TOMORROW' | 'WITHIN_3_DAYS' | 'WAIT' | 'NO_FOLLOW_UP';
    reason: string;
  } | null>(null);

  const customer = customers.find(c => c.id === customerId);

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">Customer not found</p>
        <button onClick={() => setCurrentPage('customers')} className="text-primary-500 font-bold mt-4 flex items-center gap-1 mx-auto">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </button>
      </div>
    );
  }

  const customerEnquiries = enquiries.filter(e => e.customerId === customer.id);
  const customerFollowUps = followUps.filter(f => f.customerId === customer.id);
  const customerNotes = notes.filter(n => n.customerId === customer.id);
  const customerActivities = activities.filter(a => a.customerId === customer.id);

  // WhatsApp Offer Permission State
  const [offerPermissionEnabled, setOfferPermissionEnabled] = useState(false);
  const [loadingPermission, setLoadingPermission] = useState(false);
  const [confirmPermissionModal, setConfirmPermissionModal] = useState<'enable' | 'disable' | null>(null);

  React.useEffect(() => {
    if (customer?.id) {
      setLoadingCampaignHistory(true);
      api.getCustomerCampaignHistory(customer.id)
        .then(res => {
          if (res.success) setCampaignHistory(res.history);
        })
        .catch(err => console.error('Failed to load campaign history:', err))
        .finally(() => setLoadingCampaignHistory(false));

      setLoadingPermission(true);
      api.getCustomerOfferPermission(customer.id)
        .then(res => {
          if (res.success) setOfferPermissionEnabled(res.allowWhatsAppOffers);
        })
        .catch(err => console.error('Failed to load offer permission:', err))
        .finally(() => setLoadingPermission(false));
    }
  }, [customer?.id]);

  const handleTogglePermission = async (enable: boolean) => {
    if (!customer?.id) return;
    setLoadingPermission(true);
    try {
      const res = await api.setCustomerOfferPermission(customer.id, enable);
      if (res.success) {
        setOfferPermissionEnabled(res.allowWhatsAppOffers);
        setConfirmPermissionModal(null);
      }
    } catch (err) {
      console.error('Failed to update offer permission:', err);
    } finally {
      setLoadingPermission(false);
    }
  };

  // Quick WhatsApp Recommendation Content
  const pendingFollowUp = customerFollowUps.find(f => f.status === 'ready');
  const whatsAppMessage = pendingFollowUp?.message || messageGenerationService.generateFollowUpQuickMessage(
    customer.name, 
    'Black Shirt', 
    customer.preferences.preferredSize
  );

  const [customMsgText, setCustomMsgText] = useState(whatsAppMessage);

  const handleSendWhatsApp = () => {
    const textToSend = customMsgText || whatsAppMessage;
    if (!textToSend.trim()) return;
    openWhatsApp(customer.phone, textToSend, shopName, customer.name);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    addNote(customer.id, noteContent);
    setNoteContent('');
  };

  return (
    <div className="flex-grow p-4 md:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans">
      {/* Back Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setCurrentPage('customers')} 
          className="text-slate-500 hover:text-slate-700 flex items-center gap-1.5 font-bold text-xs"
        >
          <ArrowLeft className="w-4.5 h-4.5" /> Back to Customers
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete Customer
        </button>
      </div>

      {/* Profile Info Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-50 text-primary-600 font-extrabold text-2xl flex items-center justify-center shrink-0">
            {customer.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{customer.name}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 mt-1 font-medium">
              <a href={`tel:${customer.phone}`} className="flex items-center gap-1 hover:text-primary-600 transition-colors"><Phone className="w-3.5 h-3.5" /> {customer.phone}</a>
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {customer.location}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="flex flex-wrap gap-6 sm:gap-8 text-left text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 pl-0 md:pl-8">
          <div>
            <p className="text-slate-400 font-medium">Customer ID</p>
            <p className="font-bold text-slate-700 mt-0.5">{customer.id}</p>
          </div>
          <div>
            <p className="text-slate-400 font-medium">WhatsApp Offers</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 font-bold text-xs ${
                offerPermissionEnabled ? 'text-emerald-700' : 'text-slate-500'
              }`}>
                {offerPermissionEnabled ? '🟢 Enabled' : '⚪ Not enabled'}
              </span>
              <button
                onClick={() => setConfirmPermissionModal(offerPermissionEnabled ? 'disable' : 'enable')}
                disabled={loadingPermission}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                {offerPermissionEnabled ? '[ Disable Offers ]' : '[ Enable Offers ]'}
              </button>
            </div>
          </div>
          <div>
            <p className="text-slate-400 font-medium">Total Enquiries</p>
            <p className="font-bold text-slate-700 mt-0.5">{customerEnquiries.length}</p>
          </div>
          <div>
            <p className="text-slate-400 font-medium">Customer Status</p>
            <div className="mt-0.5">
              <StatusBadge status={customer.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side Tab Navigation & Content */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-100 gap-6 text-sm font-semibold overflow-x-auto">
            {(['overview', 'enquiries', 'followups', 'campaigns', 'notes', 'activity'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 capitalize transition-all duration-150 relative shrink-0 ${
                  activeTab === tab 
                    ? 'text-primary-500' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab === 'campaigns' ? 'Campaign History' : tab}
                {tab === 'enquiries' && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-primary-50 text-primary-500 rounded text-xs font-bold">
                    {customerEnquiries.length}
                  </span>
                )}
                {tab === 'followups' && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-danger-50 text-danger-500 rounded text-xs font-bold">
                    {customerFollowUps.filter(f => f.status === 'ready').length}
                  </span>
                )}
                {tab === 'campaigns' && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-bold">
                    {campaignHistory.length}
                  </span>
                )}
                {tab === 'notes' && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-bold">
                    {customerNotes.length}
                  </span>
                )}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div className="space-y-6">
            
            {/* Overview / Enquiry History Table */}
            {(activeTab === 'overview' || activeTab === 'enquiries') && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-800">Enquiry History</h3>
                  <button 
                    onClick={() => setCurrentPage('new-enquiry')}
                    className="text-xs font-bold bg-primary-50 text-primary-500 hover:bg-primary-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Enquiry
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-400 font-semibold border-b border-slate-50 pb-2">
                        <th className="py-2.5 text-xs">Date</th>
                        <th className="py-2.5 text-xs">Product</th>
                        <th className="py-2.5 text-xs text-center">Size</th>
                        <th className="py-2.5 text-xs">Price</th>
                        <th className="py-2.5 text-xs text-center">Interest</th>
                        <th className="py-2.5 text-xs text-center">Purchase Status</th>
                        <th className="py-2.5 text-xs text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {customerEnquiries.map(item => {
                        const prod = products.find(p => p.id === item.productId);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3">
                              <p className="font-semibold text-slate-700">
                                {formatDateIST(item.createdAt)}
                              </p>
                              <p className="text-xs text-slate-400">
                                {formatTimeIST(item.createdAt)}
                              </p>
                            </td>
                            <td className="py-3 flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-400 uppercase">
                                {(item.productName || prod?.name || 'U')[0]}
                              </div>
                              <div>
                                <p className="font-bold text-slate-700">{item.productName || prod?.name || 'Unknown'}</p>
                                <p className="text-xs text-slate-400">{item.productCategory || prod?.category || 'Category'}</p>
                              </div>
                            </td>
                            <td className="py-3 text-center">
                              <span className="px-2 py-0.5 bg-primary-50 text-primary-500 rounded text-xs font-bold">
                                {item.size}
                              </span>
                            </td>
                            <td className="py-3 font-semibold text-slate-700">₹{(item.priceAtEnquiry || prod?.sellingPrice || 0).toLocaleString('en-IN')}</td>
                            <td className="py-3 text-center">
                              <StatusBadge status={item.interest === 'Interested' ? 'Interested' : 'Maybe'} />
                            </td>
                            <td className="py-3 text-center">
                              <StatusBadge status={item.purchaseStatus === 'Purchased' ? 'Purchased' : "Didn't purchase"} />
                            </td>
                            <td className="py-3 text-center">
                              <button className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-600">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes List tab */}
            {(activeTab === 'overview' || activeTab === 'notes') && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> Notes
                  </h3>
                </div>

                <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a new note..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="flex-grow bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all duration-150"
                  />
                  <button 
                    type="submit"
                    className="bg-primary-50 hover:bg-primary-100 text-primary-500 font-semibold text-xs px-4 py-2 rounded-xl transition-colors"
                  >
                    + Add Note
                  </button>
                </form>

                <div className="space-y-2">
                  {customerNotes.map(note => (
                    <div key={note.id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-sm text-slate-600">
                      <p className="leading-relaxed">{note.content}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Added on {formatDateTimeIST(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-ups tab */}
            {(activeTab === 'overview' || activeTab === 'followups') && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" /> Follow-ups
                  </h3>
                  <button onClick={() => setCurrentPage('smart-followup')} className="text-xs font-bold text-primary-500 hover:underline">
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {customerFollowUps.map(item => (
                    <div key={item.id} className={`p-4 rounded-xl border ${item.status === 'ready' ? 'bg-danger-50/20 border-danger-100' : 'bg-slate-50 border-slate-100'} flex items-center justify-between`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${item.status === 'ready' ? 'text-danger-500' : 'text-slate-400'}`}>
                            {item.status === 'ready' ? 'Follow up today' : item.status}
                          </span>
                          <span className="text-xs text-slate-400">• Reminder: Black Shirt XL availability</span>
                        </div>
                      </div>
                      {item.status === 'ready' && (
                        <button 
                          onClick={handleSendWhatsApp}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Open WhatsApp
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campaign History tab */}
            {activeTab === 'campaigns' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft font-sans">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-emerald-600" />
                  Campaign History & Response Timeline
                </h3>
                {loadingCampaignHistory ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Loading campaign history...</p>
                ) : campaignHistory.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-400">No promotional campaign activity recorded for this customer yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaignHistory.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-800 text-sm">{item.campaignTitle}</h4>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{item.discount}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-500 text-[11px]">
                          <p><span className="text-slate-400">Sent Status:</span> <strong className="text-slate-700 font-mono">{item.sentStatus}</strong></p>
                          <p><span className="text-slate-400">Method:</span> <strong className="text-slate-700 font-mono">{item.sendingMethod}</strong></p>
                          <p><span className="text-slate-400">Customer Response:</span> <strong className="text-emerald-700">{item.responseType}</strong></p>
                          <p><span className="text-slate-400">Date:</span> <span>{new Date(item.sentAt).toLocaleDateString('en-IN')}</span></p>
                        </div>
                        {item.responseNotes && (
                          <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100 mt-1 italic">
                            "{item.responseNotes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'activity' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
                <h3 className="text-base font-bold text-slate-800 mb-4">Activity Timeline</h3>
                <div className="relative border-l border-slate-100 ml-4 pl-6 space-y-6">
                  {customerActivities.map(act => (
                    <div key={act.id} className="relative">
                      {/* marker */}
                      <div className="absolute -left-[30px] top-1.5 w-3 h-3 rounded-full border-2 border-white bg-primary-500 shadow-sm" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{act.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDateTimeIST(act.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Side Cards */}
        <div className="lg:col-span-4 space-y-6 font-sans">
          
          {/* What QuickR knows card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
            <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">What QuickR knows:</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 text-xs font-semibold text-slate-700">
                <div className="p-2 bg-pink-50 text-pink-500 rounded-lg"><Heart className="w-4 h-4" /></div>
                <span>Interested in &rarr; <span className="font-bold text-slate-800">Formal shirts</span></span>
              </div>
              <div className="flex items-center gap-3.5 text-xs font-semibold text-slate-700">
                <div className="p-2 bg-blue-50 text-blue-500 rounded-lg"><CheckSquare className="w-4 h-4" /></div>
                <span>Preferred size &rarr; <span className="font-bold text-slate-800">XL</span></span>
              </div>
              <div className="flex items-center gap-3.5 text-xs font-semibold text-slate-700">
                <div className="p-2 bg-purple-50 text-purple-500 rounded-lg"><Palette className="w-4 h-4" /></div>
                <span>Preferred colors &rarr; <span className="font-bold text-slate-800">Dark</span></span>
              </div>
              <div className="flex items-center gap-3.5 text-xs font-semibold text-slate-700">
                <div className="p-2 bg-amber-50 text-amber-500 rounded-lg"><Clock className="w-4 h-4" /></div>
                <span>Last purchase &rarr; <span className="font-bold text-slate-800">12 days ago</span></span>
              </div>
            </div>
          </div>

          {/* AI Sales Opportunity Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4 font-sans">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                AI Sales Opportunity
              </h3>
              {oppResult ? (
                <button
                  onClick={async () => {
                    setOppLoading(true);
                    setOppError(null);
                    try {
                      const res = await api.generateSalesOpportunity(customer.id);
                      if (res.success && res.opportunity) {
                        setOppResult(res.opportunity);
                      } else {
                        setOppError(res.error || 'Local AI is currently unavailable.');
                      }
                    } catch (err: any) {
                      setOppError(err.message || 'Local AI is currently unavailable.');
                    } finally {
                      setOppLoading(false);
                    }
                  }}
                  disabled={oppLoading}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${oppLoading ? 'animate-spin' : ''}`} />
                  Refresh Analysis
                </button>
              ) : null}
            </div>

            {!oppResult && !oppLoading && !oppError && (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-slate-500">Calculate AI Sales Opportunity Score & recommended next action.</p>
                <button
                  onClick={async () => {
                    setOppLoading(true);
                    setOppError(null);
                    try {
                      const res = await api.generateSalesOpportunity(customer.id);
                      if (res.success && res.opportunity) {
                        setOppResult(res.opportunity);
                      } else {
                        setOppError(res.error || 'Local AI is currently unavailable.');
                      }
                    } catch (err: any) {
                      setOppError(err.message || 'Local AI is currently unavailable.');
                    } finally {
                      setOppLoading(false);
                    }
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Analyze Opportunity
                </button>
              </div>
            )}

            {oppLoading && (
              <div className="py-6 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-700">Evaluating sales opportunity...</p>
                <p className="text-[10px] text-slate-400">Processing recency, engagement & purchase signals</p>
              </div>
            )}

            {oppError && (
              <div className="space-y-3">
                <div className="p-3 bg-danger-50 border border-danger-100 rounded-xl flex items-center gap-2 text-xs text-danger-700 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{oppError}</span>
                </div>
                <button
                  onClick={async () => {
                    setOppLoading(true);
                    setOppError(null);
                    try {
                      const res = await api.generateSalesOpportunity(customer.id);
                      if (res.success && res.opportunity) {
                        setOppResult(res.opportunity);
                      } else {
                        setOppError(res.error || 'Local AI is currently unavailable.');
                      }
                    } catch (err: any) {
                      setOppError(err.message || 'Local AI is currently unavailable.');
                    } finally {
                      setOppLoading(false);
                    }
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-lg transition-all"
                >
                  Retry Analysis
                </button>
              </div>
            )}

            {oppResult && !oppLoading && (
              <div className="space-y-3.5 text-xs text-slate-700 animate-fadeIn">
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 text-center space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">AI Opportunity Score</span>
                  <div className="text-3xl font-black text-emerald-700">
                    {oppResult.opportunityScore}<span className="text-xs text-emerald-400 font-bold">/100</span>
                  </div>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 font-extrabold text-xs px-2.5 py-1 rounded-md bg-white border border-emerald-200 text-emerald-800 shadow-2xs">
                      {oppResult.leadLevel === 'HOT' && '🔥 HOT LEAD'}
                      {oppResult.leadLevel === 'WARM' && '🟡 WARM LEAD'}
                      {oppResult.leadLevel === 'COLD' && '❄️ COLD LEAD'}
                      {oppResult.leadLevel === 'LOW_PRIORITY' && '⚪ LOW PRIORITY'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Recommended Action</span>
                  <p className="bg-white p-3 rounded-xl border border-slate-100 text-slate-800 font-bold leading-relaxed">
                    {oppResult.recommendedAction}
                  </p>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                  <span className="font-semibold text-slate-400">Timing</span>
                  <span className="font-extrabold text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                    {oppResult.recommendedTiming.replace(/_/g, ' ')}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Reason</span>
                  <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600 leading-relaxed font-medium">
                    {oppResult.reason}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* AI Customer Intelligence Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4 font-sans">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary-500" />
                AI Customer Intelligence
              </h3>
              {aiResult ? (
                <button
                  onClick={async () => {
                    setAiLoading(true);
                    setAiError(null);
                    try {
                      const res = await api.generateCustomerIntelligence(customer.id);
                      if (res.success && res.intelligence) {
                        setAiResult(res.intelligence);
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
                  className="flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
                  Refresh Analysis
                </button>
              ) : null}
            </div>

            {!aiResult && !aiLoading && !aiError && (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-slate-500">Analyze business history & engagement signals using local AI.</p>
                <button
                  onClick={async () => {
                    setAiLoading(true);
                    setAiError(null);
                    try {
                      const res = await api.generateCustomerIntelligence(customer.id);
                      if (res.success && res.intelligence) {
                        setAiResult(res.intelligence);
                      } else {
                        setAiError(res.error || 'Local AI is currently unavailable.');
                      }
                    } catch (err: any) {
                      setAiError(err.message || 'Local AI is currently unavailable.');
                    } finally {
                      setAiLoading(false);
                    }
                  }}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Analyze with AI
                </button>
              </div>
            )}

            {aiLoading && (
              <div className="py-6 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-primary-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-700">Analyzing customer...</p>
                <p className="text-[10px] text-slate-400">Processing recent engagement & enquiry signals</p>
              </div>
            )}

            {aiError && (
              <div className="space-y-3">
                <div className="p-3 bg-danger-50 border border-danger-100 rounded-xl flex items-center gap-2 text-xs text-danger-700 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
                <button
                  onClick={async () => {
                    setAiLoading(true);
                    setAiError(null);
                    try {
                      const res = await api.generateCustomerIntelligence(customer.id);
                      if (res.success && res.intelligence) {
                        setAiResult(res.intelligence);
                      } else {
                        setAiError(res.error || 'Local AI is currently unavailable.');
                      }
                    } catch (err: any) {
                      setAiError(err.message || 'Local AI is currently unavailable.');
                    } finally {
                      setAiLoading(false);
                    }
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-lg transition-all"
                >
                  Retry Analysis
                </button>
              </div>
            )}

            {aiResult && !aiLoading && (
              <div className="space-y-3.5 text-xs text-slate-700 animate-fadeIn">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Lead</span>
                    <span className="font-extrabold text-sm flex items-center gap-1.5 mt-0.5">
                      {aiResult.leadLevel === 'HOT' && <><span className="text-danger-500">🔥</span> HOT</>}
                      {aiResult.leadLevel === 'WARM' && <><span className="text-amber-500">🟡</span> WARM</>}
                      {aiResult.leadLevel === 'COLD' && <><span className="text-blue-500">❄️</span> COLD</>}
                      {aiResult.leadLevel === 'LOW_PRIORITY' && <><span className="text-slate-400">⚪</span> LOW PRIORITY</>}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Confidence</span>
                    <span className="font-bold text-xs text-slate-700 mt-0.5 capitalize">{aiResult.confidence.toLowerCase()}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Why:</span>
                  <p className="bg-white p-3 rounded-xl border border-slate-100 text-slate-700 leading-relaxed font-medium">
                    {aiResult.reason}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Recommended Action:</span>
                  <p className="bg-primary-50/50 p-3 rounded-xl border border-primary-100/50 text-primary-900 font-bold leading-relaxed">
                    {aiResult.recommendedAction}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-50 text-[11px]">
                  <span className="font-semibold text-slate-400">Timing:</span>
                  <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                    {aiResult.recommendedTiming.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* WHAT SHOULD WE DO? Card */}
          {pendingFollowUp && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">WHAT SHOULD WE DO?</h3>
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-danger-500 mt-1.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Follow up today</h4>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Customer showed interest in Black Shirt XL but didn't purchase.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase">Editable WhatsApp Draft</label>
                <textarea 
                  value={customMsgText}
                  onChange={e => setCustomMsgText(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  placeholder="Type WhatsApp message..."
                />
              </div>

              <button 
                onClick={handleSendWhatsApp}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <MessageSquare className="w-4 h-4" /> Open WhatsApp
              </button>
            </div>
          )}

          {/* Quick Actions card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setCurrentPage('new-enquiry')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 text-slate-600 text-xs font-semibold transition-all group"
              >
                <span>Add New Enquiry</span>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </button>
              <button 
                onClick={() => setCurrentPage('smart-followup')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 text-slate-600 text-xs font-semibold transition-all group"
              >
                <span>Schedule Follow-up</span>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </button>
              <button 
                onClick={() => setActiveTab('notes')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 text-slate-600 text-xs font-semibold transition-all group"
              >
                <span>Add Note</span>
                <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </button>
            </div>
          </div>

          {/* Recent activity list */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Recent activity</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-success-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-700">15 May 2025, 10:30 AM</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Enquiry added for Black Shirt (XL)</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-warning-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-700">16 May 2025, 09:15 AM</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Marked as Interested</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-700">16 May 2025, 09:16 AM</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Status updated: Didn't purchase</p>
                </div>
              </div>
            </div>
            <button onClick={() => setActiveTab('activity')} className="text-xs text-primary-500 font-bold hover:underline mt-4 block">
              View all activity &rarr;
            </button>
          </div>

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Delete customer?</h3>
                <p className="text-xs text-slate-400 font-medium">Customer: <strong className="text-slate-700">{customer.name}</strong></p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              This will permanently remove this customer and their enquiries, follow-ups, messages, and activity history from QuickR. Historical sales will be preserved.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (isDeleting) return;
                  setIsDeleting(true);
                  try {
                    const success = await deleteCustomer(customer.id);
                    if (success) {
                      setShowDeleteModal(false);
                      setCurrentPage('customers');
                    }
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Customer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Offer Permission Confirmation Modal */}
      {confirmPermissionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center font-sans">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Megaphone className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-800">
                {confirmPermissionModal === 'enable' ? 'Enable WhatsApp Offers?' : 'Disable WhatsApp Offers?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                {confirmPermissionModal === 'enable'
                  ? `Confirm that ${customer.name} has agreed to receive order updates and occasional offers on WhatsApp.`
                  : `Stop sending promotional WhatsApp offers to ${customer.name}? Customer details, sales, and enquiries will remain intact.`}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={loadingPermission}
                onClick={() => setConfirmPermissionModal(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loadingPermission}
                onClick={() => handleTogglePermission(confirmPermissionModal === 'enable')}
                className={`flex-1 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1 ${
                  confirmPermissionModal === 'enable' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                {loadingPermission ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{confirmPermissionModal === 'enable' ? 'Confirm Enable' : 'Disable'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
