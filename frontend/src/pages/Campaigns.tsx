import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { 
  Megaphone, 
  Plus, 
  Users, 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  Image as ImageIcon, 
  Video as VideoIcon,
  Filter,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  ShoppingCart,
  Calendar,
  Clock,
  BarChart3,
  Search,
  SkipForward,
  RefreshCw
} from 'lucide-react';

interface CampaignsProps {
  setCurrentPage?: (page: string) => void;
  initialSelectedCustomerIds?: string[];
}

export const Campaigns: React.FC<CampaignsProps> = ({ setCurrentPage, initialSelectedCustomerIds }) => {
  const { products, shopName } = useApp();
  const { language } = useLanguage();
  const isTa = language === 'ta';

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'create'>(initialSelectedCustomerIds && initialSelectedCustomerIds.length > 0 ? 'create' : 'list');

  // Campaign Analytics Summary state for List Page
  const [analyticsSummaries, setAnalyticsSummaries] = useState<Record<string, any>>({});
  const [selectedAnalyticsModal, setSelectedAnalyticsModal] = useState<any | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // WhatsApp Provider Connection state
  const [providerStatus, setProviderStatus] = useState<any>(null);
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [confirmSendCampaign, setConfirmSendCampaign] = useState<any | null>(null);

  // Manual WhatsApp Modal state
  const [manualModalCampaign, setManualModalCampaign] = useState<any | null>(null);
  const [manualTargets, setManualTargets] = useState<any[]>([]);
  const [manualIndex, setManualIndex] = useState(0);
  const [loadingManualTargets, setLoadingManualTargets] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [manualNotice, setManualNotice] = useState<string | null>(null);

  // Recipient Search & Filter state for Wizard Modal
  const [recipientFilter, setRecipientFilter] = useState<'ALL' | 'PENDING' | 'SENT' | 'SKIPPED'>('ALL');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [skipConfirmTarget, setSkipConfirmTarget] = useState<any | null>(null);

  // Customer Response Modal state
  const [responseModalCampaign, setResponseModalCampaign] = useState<any | null>(null);
  const [responseTargetCustomer, setResponseTargetCustomer] = useState<any | null>(null);
  const [selectedResponseType, setSelectedResponseType] = useState<string>('INTERESTED');
  const [responseNotes, setResponseNotes] = useState<string>('');
  const [scheduledFollowUpDate, setScheduledFollowUpDate] = useState<string>(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Multi-step Create Form State
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Offer Details
  const [title, setTitle] = useState(initialSelectedCustomerIds && initialSelectedCustomerIds.length > 0 ? 'Customer Re-Engagement Offer' : '');
  const [description, setDescription] = useState(initialSelectedCustomerIds && initialSelectedCustomerIds.length > 0 ? 'Special offer for returning customers' : '');
  const [discountType, setDiscountType] = useState<'Percentage' | 'Fixed Amount'>('Percentage');
  const [discountValue, setDiscountValue] = useState<string>('20');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().substring(0, 10);
  });

  // Media state
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'none'>('none');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>('');
  const [tempMediaRef, setTempMediaRef] = useState<string>('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Step 2: Customer Targeting state
  const [filterType, setFilterType] = useState<string>('all_eligible');
  const [eligibleCustomers, setEligibleCustomers] = useState<any[]>([]);
  const [ineligibleCustomers, setIneligibleCustomers] = useState<any[]>([]);
  const [selectedCustIds, setSelectedCustIds] = useState<string[]>(initialSelectedCustomerIds || []);
  const [loadingTargeting, setLoadingTargeting] = useState(false);

  // Feedback Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submittingCampaign, setSubmittingCampaign] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const [list, pStatus, summariesRes] = await Promise.all([
        api.getCampaigns(),
        api.getWhatsAppProviderStatus(),
        api.getCampaignAnalyticsSummary()
      ]);
      setCampaigns(list);
      setProviderStatus(pStatus);
      if (summariesRes.success) {
        const sumMap: Record<string, any> = {};
        summariesRes.summaries.forEach((s: any) => {
          sumMap[s.campaignId] = s;
        });
        setAnalyticsSummaries(sumMap);
      }
    } catch (err: any) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAnalytics = async (campaignId: string) => {
    setLoadingAnalytics(true);
    setErrorMsg(null);
    try {
      const res = await api.getCampaignAnalytics(campaignId);
      if (res.success) {
        setSelectedAnalyticsModal(res.analytics);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load campaign analytics.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleConfirmSend = async (campaign: any) => {
    if (!campaign) return;
    setSendingCampaignId(campaign.id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.sendCampaign(campaign.id);
      if (res.success) {
        setSuccessMsg(isTa ? `பிரச்சாரம் அனுப்பப்பட்டது. நிலைப் புள்ளிவிவரங்கள்: அனுப்பப்பட்டவை (${res.summary.sent}), தவறினவை (${res.summary.failed}), தவிர்க்கப்பட்டவை (${res.summary.skipped}).` : `Campaign process complete. Sent: ${res.summary.sent}, Failed: ${res.summary.failed}, Skipped: ${res.summary.skipped}. Status: ${res.status}.`);
        setConfirmSendCampaign(null);
        fetchCampaigns();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send campaign via WhatsApp.');
    } finally {
      setSendingCampaignId(null);
    }
  };

  const handleOpenManualCampaign = async (campaign: any) => {
    setLoadingManualTargets(true);
    setErrorMsg(null);
    try {
      const res = await api.getManualCampaignTargets(campaign.id);
      if (res.success && res.targets.length > 0) {
        setManualTargets(res.targets);
        setManualModalCampaign(campaign);
        setManualNotice(null);
        
        // Find first PENDING target index (Resume Campaign logic)
        const firstPendingIdx = res.targets.findIndex((t: any) => t.status === 'PENDING');
        setManualIndex(firstPendingIdx !== -1 ? firstPendingIdx : 0);
      } else {
        setErrorMsg(isTa ? 'அனுப்ப தகுதியான வாடிக்கையாளர்கள் இல்லை.' : 'No eligible customers found with valid phone and marketing consent for manual WhatsApp sending.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load manual targets.');
    } finally {
      setLoadingManualTargets(false);
    }
  };

  const handleOpenWhatsAppLink = (link: string) => {
    window.open(link, '_blank');
    setManualNotice(isTa ? 'வாட்ஸ்அப் திறக்கப்பட்டது. செய்தியை சரிபார்த்து வாட்ஸ்அப்பில் அனுப்பு என்பதை அழுத்தவும்.' : 'WhatsApp opened. Please review the message and press Send in WhatsApp.');
  };

  const handleMarkManualSent = async () => {
    if (!manualModalCampaign || manualTargets.length === 0) return;
    const currentTarget = manualTargets[manualIndex];
    try {
      await api.markManualRecipientSent(manualModalCampaign.id, currentTarget.id);
      
      // Update local status
      const updatedTargets = [...manualTargets];
      updatedTargets[manualIndex] = { ...currentTarget, status: 'MANUAL_SENT' };
      setManualTargets(updatedTargets);

      // Find next PENDING customer
      const nextPendingIdx = updatedTargets.findIndex((t: any, idx: number) => idx > manualIndex && t.status === 'PENDING');

      if (nextPendingIdx !== -1) {
        setManualIndex(nextPendingIdx);
        setManualNotice(null);
        setCopiedMessage(false);
      } else if (manualIndex < updatedTargets.length - 1) {
        setManualIndex(manualIndex + 1);
        setManualNotice(null);
        setCopiedMessage(false);
      } else {
        setSuccessMsg(isTa ? 'அனைத்து தேர்ந்தெடுக்கப்பட்ட வாடிக்கையாளர்களுக்கான கைமுறை வாட்ஸ்அப் பணி முடிந்தது.' : 'Manual WhatsApp campaign workflow completed for all selected customers.');
        setManualModalCampaign(null);
        fetchCampaigns();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to mark recipient as sent.');
    }
  };

  const handleSkipCustomer = async (target: any) => {
    if (!manualModalCampaign || !target) return;
    try {
      await api.skipManualRecipient(manualModalCampaign.id, target.id);
      
      const updatedTargets = [...manualTargets];
      const targetIdx = updatedTargets.findIndex(t => t.id === target.id);
      if (targetIdx !== -1) {
        updatedTargets[targetIdx] = { ...target, status: 'SKIPPED' };
        setManualTargets(updatedTargets);
      }

      setSkipConfirmTarget(null);

      // Move to next pending customer if current target was skipped
      const nextPendingIdx = updatedTargets.findIndex((t: any, idx: number) => idx > manualIndex && t.status === 'PENDING');
      if (nextPendingIdx !== -1) {
        setManualIndex(nextPendingIdx);
      }
      fetchCampaigns();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to skip recipient.');
    }
  };

  const handleRecordCustomerResponse = async () => {
    if (!responseModalCampaign || !responseTargetCustomer) return;
    setSubmittingResponse(true);
    setErrorMsg(null);
    try {
      if (selectedResponseType === 'PURCHASED') {
        // Redirect to Billing page with customer pre-filled
        if (typeof setCurrentPage === 'function') {
          setCurrentPage('billing');
        }
        setResponseModalCampaign(null);
        return;
      }

      const res = await api.recordCampaignResponse(
        responseModalCampaign.id,
        responseTargetCustomer.id,
        selectedResponseType,
        responseNotes,
        scheduledFollowUpDate,
        `Campaign follow-up: ${responseModalCampaign.title}`
      );

      if (res.success) {
        setSuccessMsg(isTa ? 'வாடிக்கையாளர் பதில் பதிவு செய்யப்பட்டது மற்றும் தேவைப்படும் இடங்களில் விசாரணை/தொடர்நடவடிக்கை உருவாக்கப்பட்டது.' : `Customer response (${selectedResponseType}) recorded. Created Enquiry: ${res.enquiryId || 'N/A'}, Follow-up: ${res.followUpId || 'N/A'}.`);
        setResponseModalCampaign(null);
        setResponseTargetCustomer(null);
        fetchCampaigns();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record customer response.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Handle Media Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const isVid = file.type.startsWith('video/') || file.name.endsWith('.mp4');
    const isImg = file.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp'].some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isVid && !isImg) {
      setErrorMsg(isTa ? 'ஆதரிக்கப்படாத கோப்பு வகை. JPG, PNG, WEBP அல்லது MP4 வீடியோ மட்டுமே அனுமதிக்கப்படும்.' : 'Unsupported file type. Only JPG, PNG, WEBP images and MP4 videos are allowed.');
      return;
    }

    const maxImg = 10 * 1024 * 1024;
    const maxVid = 25 * 1024 * 1024;

    if (isImg && file.size > maxImg) {
      setErrorMsg(isTa ? 'படத்தின் அளவு 10MB க்கு மிகாமல் இருக்க வேண்டும்.' : 'Image file size exceeds allowed 10MB limit.');
      return;
    }
    if (isVid && file.size > maxVid) {
      setErrorMsg(isTa ? 'வீடியோவின் அளவு 25MB க்கு மிகாமல் இருக்க வேண்டும்.' : 'Video file size exceeds allowed 25MB limit.');
      return;
    }

    setUploadingMedia(true);
    try {
      const res = await api.uploadCampaignMedia(file, isVid ? 'video' : 'image');
      if (res.success) {
        setMediaFile(file);
        setMediaType(isVid ? 'video' : 'image');
        setMediaPreviewUrl(URL.createObjectURL(file));
        setTempMediaRef(res.temporaryMediaReference);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Media upload failed.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreviewUrl('');
    setTempMediaRef('');
    setMediaType('none');
  };

  // Step 1 Validation & Proceed to Step 2
  const handleProceedToTargeting = async () => {
    setErrorMsg(null);
    if (!title.trim()) {
      return setErrorMsg(isTa ? 'சலுகைத் தலைப்பு தேவை.' : 'Offer title is required.');
    }
    const val = Number(discountValue);
    if (isNaN(val) || val <= 0) {
      return setErrorMsg(isTa ? 'செல்லுபடியாகும் தள்ளுபடி மதிப்பை உள்ளிடவும்.' : 'Enter a valid positive discount value.');
    }
    if (discountType === 'Percentage' && val > 100) {
      return setErrorMsg(isTa ? 'சதவீத தள்ளுபடி 100% க்கு மேல் இருக்கக்கூடாது.' : 'Percentage discount cannot exceed 100%.');
    }
    if (!startDate || !endDate) {
      return setErrorMsg(isTa ? 'தொடக்க மற்றும் முடிவு தேதிகள் தேவை.' : 'Start and end dates are required.');
    }
    if (new Date(endDate) < new Date(startDate)) {
      return setErrorMsg(isTa ? 'முடிவு தேதி தொடக்க தேதிக்கு முன் இருக்கக்கூடாது.' : 'End date cannot be before start date.');
    }

    setLoadingTargeting(true);
    try {
      const firstProdId = selectedProductIds.length > 0 ? selectedProductIds[0] : undefined;
      const res = await api.getTargetingCustomers(filterType, firstProdId);
      if (res.success) {
        setEligibleCustomers(res.eligibleCustomers);
        setIneligibleCustomers(res.ineligibleCustomers);
        setSelectedCustIds(res.eligibleCustomers.map(c => c.id));
        setStep(2);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch customer list.');
    } finally {
      setLoadingTargeting(false);
    }
  };

  // Step 2 Filter change
  const handleFilterChange = async (newFilter: string) => {
    setFilterType(newFilter);
    setLoadingTargeting(true);
    try {
      const firstProdId = selectedProductIds.length > 0 ? selectedProductIds[0] : undefined;
      const res = await api.getTargetingCustomers(newFilter, firstProdId);
      if (res.success) {
        setEligibleCustomers(res.eligibleCustomers);
        setIneligibleCustomers(res.ineligibleCustomers);
        setSelectedCustIds(res.eligibleCustomers.map(c => c.id));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update targeting.');
    } finally {
      setLoadingTargeting(false);
    }
  };

  // Toggle individual customer selection
  const toggleCustSelection = (id: string) => {
    if (selectedCustIds.includes(id)) {
      setSelectedCustIds(selectedCustIds.filter(x => x !== id));
    } else {
      setSelectedCustIds([...selectedCustIds, id]);
    }
  };

  // Select all eligible
  const selectAllEligible = () => {
    setSelectedCustIds(eligibleCustomers.map(c => c.id));
  };

  // Finalize & Create Campaign
  const handleSaveCampaign = async () => {
    setSubmittingCampaign(true);
    setErrorMsg(null);
    try {
      const payload = {
        title,
        description,
        discountType,
        discountValue: Number(discountValue),
        productIds: selectedProductIds,
        startDate,
        endDate,
        mediaType,
        temporaryMediaReference: tempMediaRef,
        selectedCustomerIds: selectedCustIds,
        targetAudienceType: filterType,
        status: 'READY'
      };

      const res = await api.createCampaign(payload);
      if (res.success) {
        setSuccessMsg(isTa ? 'பிரச்சார சலுகை வெற்றிகரமாக உருவாக்கப்பட்டது (தயார் நிலை).' : 'Campaign offer created successfully (Status: READY).');
        fetchCampaigns();
        setTimeout(() => {
          setViewMode('list');
          setStep(1);
          setSuccessMsg(null);
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save campaign.');
    } finally {
      setSubmittingCampaign(false);
    }
  };

  const activeProducts = products.filter(p => p.isActive);
  const selectedProductsNames = activeProducts
    .filter(p => selectedProductIds.includes(p.id))
    .map(p => p.name)
    .join(', ') || (isTa ? 'அனைத்து பொருட்கள்' : 'General Store Products');

  const discountFormatted = discountType === 'Percentage' ? `${discountValue}%` : `₹${discountValue}`;

  return (
    <div className="flex-grow p-4 md:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans text-left">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isTa ? 'சலுகைகள் மற்றும் பிரச்சாரங்கள்' : 'Offers & Campaigns'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isTa ? 'வாடிக்கையாளர்களை இலக்காகக் கொண்ட தள்ளுபடி சலுகைகளை உருவாக்கி நிர்வகிக்கவும்' : 'Targeted promotional campaign creation, product selection & message previews'}
            </p>
          </div>
        </div>

        {viewMode === 'list' && (
          <button
            onClick={() => { setViewMode('create'); setStep(1); setErrorMsg(null); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{isTa ? '+ சலுகையை உருவாக்கு' : '+ Create Offer'}</span>
          </button>
        )}
      </div>

      {/* WhatsApp Provider Connection Status Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-soft flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className={`w-3 h-3 rounded-full ${providerStatus?.configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <div>
            <span className="font-bold text-slate-800">
              WhatsApp Business Cloud API: {' '}
              <span className={providerStatus?.configured ? 'text-emerald-600' : 'text-amber-600 font-bold'}>
                {providerStatus?.configured ? 'CONFIGURED (Official API Ready)' : 'NOT CONFIGURED'}
              </span>
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {providerStatus?.configured 
                ? `Phone Number ID: ${providerStatus.phoneNumberId} • Template: ${providerStatus.templateName}` 
                : 'Configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in backend .env to enable Cloud API sending.'}
            </p>
          </div>
        </div>
      </div>

      {/* Global Feedback */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* VIEW MODE: LIST CAMPAIGNS */}
      {viewMode === 'list' && (
        <div className="space-y-4 font-sans">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center space-y-4 shadow-soft">
              <Megaphone className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-700">No campaigns yet</h3>
                <p className="text-xs text-slate-400 mt-1">Create your first offer to reach your customers.</p>
              </div>
              <button
                onClick={() => { setViewMode('create'); setStep(1); }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                + Create Offer
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        c.status === 'READY' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                        c.status === 'PARTIALLY_COMPLETED' ? 'bg-amber-100 text-amber-800' :
                        c.status === 'FAILED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.status}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{c.title}</h3>
                      <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                        {c.discountType === 'Percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                      </p>
                      {c.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.eligibleCustomerCount || 0} Target Customers</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{c.id}</span>
                    </div>

                    {/* Lightweight Analytics Summary for Card */}
                    {(() => {
                      const summary = analyticsSummaries[c.id];
                      return summary ? (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 grid grid-cols-4 gap-1 text-center text-[10px]">
                          <div>
                            <span className="text-slate-400 block">Sent</span>
                            <strong className="text-slate-800 font-bold">{summary.sentCustomers}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Resp</span>
                            <strong className="text-indigo-600 font-bold">{summary.responseCount}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Sales</span>
                            <strong className="text-emerald-600 font-bold">{summary.salesCount}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Revenue</span>
                            <strong className="text-slate-900 font-bold">₹{summary.revenue.toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <button
                      onClick={() => handleViewAnalytics(c.id)}
                      disabled={loadingAnalytics}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>View Analytics</span>
                    </button>

                    {c.status === 'READY' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setConfirmSendCampaign(c)}
                          className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-all flex items-center justify-center gap-1"
                        >
                          <Megaphone className="w-3.5 h-3.5" />
                          <span>Send via API</span>
                        </button>
                        <button
                          onClick={() => handleOpenManualCampaign(c)}
                          disabled={loadingManualTargets}
                          className="py-2 px-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[11px] rounded-xl shadow-xs transition-all flex items-center justify-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Open WhatsApp</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CAMPAIGN ANALYTICS MODAL */}
      {selectedAnalyticsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-slate-100 shadow-2xl space-y-6 text-left font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Campaign Analytics: {selectedAnalyticsModal.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Discount: <strong className="text-indigo-600">{selectedAnalyticsModal.discount}</strong> • Status: <strong className="text-slate-700">{selectedAnalyticsModal.status}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedAnalyticsModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Targeted</span>
                <span className="text-lg font-extrabold text-slate-800 mt-1 block">{selectedAnalyticsModal.targetedCustomers}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Messages Sent</span>
                <span className="text-lg font-extrabold text-slate-800 mt-1 block">{selectedAnalyticsModal.sentCustomers}</span>
              </div>
              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100">
                <span className="text-[11px] font-bold text-indigo-600 block uppercase tracking-wider">Responses</span>
                <span className="text-lg font-extrabold text-indigo-900 mt-1 block">{selectedAnalyticsModal.responseCount}</span>
              </div>
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100">
                <span className="text-[11px] font-bold text-emerald-600 block uppercase tracking-wider">Revenue</span>
                <span className="text-lg font-extrabold text-emerald-900 mt-1 block">₹{selectedAnalyticsModal.revenue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Performance & Rates */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Performance Metrics</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Response Rate</span>
                  <span className="text-base font-extrabold text-indigo-600 mt-0.5 block">{selectedAnalyticsModal.responseRate}%</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Purchase Rate</span>
                  <span className="text-base font-extrabold text-emerald-600 mt-0.5 block">{selectedAnalyticsModal.purchaseRate}%</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-semibold">Average Sale Value</span>
                  <span className="text-base font-extrabold text-slate-800 mt-0.5 block">₹{selectedAnalyticsModal.averageSaleValue.toLocaleString('en-IN')}</span>
                </div>
              </div>
              
              {selectedAnalyticsModal.roi !== null ? (
                <div className="bg-emerald-100/60 p-3 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-between">
                  <span>Campaign ROI (Cost: ₹{selectedAnalyticsModal.campaignCost.toLocaleString('en-IN')})</span>
                  <span className="text-sm font-extrabold">{selectedAnalyticsModal.roi}%</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">Campaign cost not configured • ROI: Not available</p>
              )}
            </div>

            {/* Response Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Response Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center">
                  <span className="font-medium text-slate-700">Interested</span>
                  <strong className="font-bold text-slate-900">{selectedAnalyticsModal.interestedCount}</strong>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center">
                  <span className="font-medium text-slate-700">Wants Info</span>
                  <strong className="font-bold text-slate-900">{selectedAnalyticsModal.moreInformationCount}</strong>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center">
                  <span className="font-medium text-slate-700">Visit Shop</span>
                  <strong className="font-bold text-slate-900">{selectedAnalyticsModal.visitShopCount}</strong>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center">
                  <span className="font-medium text-slate-700">Not Interested</span>
                  <strong className="font-bold text-slate-900">{selectedAnalyticsModal.notInterestedCount}</strong>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center">
                  <span className="font-medium text-slate-700">Purchased Response</span>
                  <strong className="font-bold text-emerald-700">{selectedAnalyticsModal.purchasedResponseCount}</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                  <span className="font-medium text-slate-400">No Response State</span>
                  <strong className="font-bold text-slate-500">{selectedAnalyticsModal.noResponseCount}</strong>
                </div>
              </div>
            </div>

            {/* Sending Method Breakdown */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">Sending Method Breakdown</h4>
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Manual WhatsApp</span>
                  <strong className="text-slate-800">{selectedAnalyticsModal.manualSentCustomers}</strong>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Official API</span>
                  <strong className="text-slate-800">{selectedAnalyticsModal.apiSentCustomers}</strong>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Skipped</span>
                  <strong className="text-slate-800">{selectedAnalyticsModal.skippedCustomers}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL WHATSAPP SENDING WIZARD MODAL */}
      {manualModalCampaign && manualTargets.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-slate-100 shadow-2xl space-y-5 text-left font-sans max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-emerald-600" />
                  Manual WhatsApp Sending: {manualModalCampaign.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Customer {manualIndex + 1} of {manualTargets.length} • No API credentials required
                </p>
              </div>
              <button
                onClick={() => setManualModalCampaign(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campaign Progress Bar */}
            {(() => {
              const sentCount = manualTargets.filter(t => t.status === 'MANUAL_SENT' || t.status === 'SENT').length;
              const skippedCount = manualTargets.filter(t => t.status === 'SKIPPED').length;
              const completedCount = sentCount + skippedCount;
              const progressPct = Math.round((completedCount / manualTargets.length) * 100);
              const remainingCount = manualTargets.length - completedCount;

              return (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Campaign Progress</span>
                    <span className="text-indigo-600">{completedCount} / {manualTargets.length} completed ({progressPct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>Sent: <strong className="text-slate-700">{sentCount}</strong></span>
                    <span>Remaining: <strong className="text-slate-700">{remainingCount}</strong></span>
                    <span>Skipped: <strong className="text-slate-700">{skippedCount}</strong></span>
                  </div>
                </div>
              );
            })()}

            {/* Recipient Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
              <div className="flex border border-slate-200 rounded-xl p-0.5 bg-slate-50 text-[11px] font-bold w-full sm:w-auto">
                {(['ALL', 'PENDING', 'SENT', 'SKIPPED'] as const).map(flt => {
                  const count = flt === 'ALL' ? manualTargets.length :
                                flt === 'PENDING' ? manualTargets.filter(t => t.status === 'PENDING').length :
                                flt === 'SENT' ? manualTargets.filter(t => t.status === 'MANUAL_SENT' || t.status === 'SENT').length :
                                manualTargets.filter(t => t.status === 'SKIPPED').length;
                  return (
                    <button
                      key={flt}
                      onClick={() => setRecipientFilter(flt)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        recipientFilter === flt ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {flt} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={recipientSearch}
                  onChange={e => setRecipientSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Filtered Recipient Selection List if searching or filtering */}
            {(recipientFilter !== 'ALL' || recipientSearch) && (
              <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-100 rounded-2xl p-2 bg-slate-50">
                {manualTargets
                  .filter(t => {
                    const matchesFilter = recipientFilter === 'ALL' ? true :
                      recipientFilter === 'PENDING' ? t.status === 'PENDING' :
                      recipientFilter === 'SENT' ? (t.status === 'MANUAL_SENT' || t.status === 'SENT') :
                      t.status === 'SKIPPED';
                    const matchesSearch = t.name.toLowerCase().includes(recipientSearch.toLowerCase()) || t.phone.includes(recipientSearch);
                    return matchesFilter && matchesSearch;
                  })
                  .map(t => {
                    const originalIdx = manualTargets.findIndex(orig => orig.id === t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => setManualIndex(originalIdx)}
                        className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          manualIndex === originalIdx ? 'bg-indigo-50 border-indigo-300 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-slate-800">{t.name} ({t.maskedPhone})</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          t.status === 'MANUAL_SENT' ? 'bg-emerald-100 text-emerald-800' :
                          t.status === 'SKIPPED' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Current Target Info Card */}
            {(() => {
              const target = manualTargets[manualIndex];
              if (!target) return <p className="text-xs text-slate-400 text-center py-4">No recipient selected.</p>;

              return (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{target.name}</h4>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{target.maskedPhone}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      target.status === 'MANUAL_SENT' ? 'bg-emerald-100 text-emerald-800' :
                      target.status === 'SKIPPED' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {target.status}
                    </span>
                  </div>

                  {target.status === 'MANUAL_SENT' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold flex items-center justify-between">
                      <span>Message already marked as sent for this customer.</span>
                      <button
                        onClick={() => handleOpenWhatsAppLink(target.waDeepLink)}
                        className="text-xs font-bold text-amber-900 underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Send Again
                      </button>
                    </div>
                  )}

                  {/* Personalized Message Preview & Copy */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Personalized Message Preview:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(target.personalizedMessage);
                          setCopiedMessage(true);
                          setTimeout(() => setCopiedMessage(false), 2000);
                        }}
                        className="text-indigo-600 hover:underline flex items-center gap-1 font-bold text-[11px]"
                      >
                        {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedMessage ? 'Copied!' : 'Copy Message'}</span>
                      </button>
                    </div>
                    <div className="bg-emerald-950 p-4 rounded-2xl text-emerald-100 text-[11px] font-mono leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {target.personalizedMessage}
                    </div>
                  </div>

                  {/* Notice Banner */}
                  {manualNotice && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{manualNotice}</span>
                    </div>
                  )}

                  {/* Action Step Controls */}
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => handleOpenWhatsAppLink(target.waDeepLink)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>1. Open WhatsApp for {target.name}</span>
                    </button>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={handleMarkManualSent}
                        className="py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Mark Sent & Next</span>
                      </button>

                      <button
                        onClick={() => setSkipConfirmTarget(target)}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <SkipForward className="w-4 h-4 text-slate-500" />
                        <span>Skip Customer</span>
                      </button>

                      <button
                        onClick={() => {
                          setResponseModalCampaign(manualModalCampaign);
                          setResponseTargetCustomer(target);
                          setSelectedResponseType('INTERESTED');
                        }}
                        className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Responded</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* SKIP CUSTOMER CONFIRMATION MODAL */}
      {skipConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4 text-center font-sans">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
              <SkipForward className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Skip Customer?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Skip <strong>{skipConfirmTarget.name}</strong> from this campaign? The customer will remain in your Customer directory.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSkipConfirmTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSkipCustomer(skipConfirmTarget)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER RESPONSE MODAL */}
      {responseModalCampaign && responseTargetCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-100 shadow-2xl space-y-5 text-left font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  Record Customer Response
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Customer: <strong className="text-slate-700">{responseTargetCustomer.name}</strong> • Campaign: <strong className="text-slate-700">{responseModalCampaign.title}</strong>
                </p>
              </div>
              <button
                onClick={() => { setResponseModalCampaign(null); setResponseTargetCustomer(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <label className="block font-bold text-slate-700 mb-2">What happened?</label>
              <div className="space-y-2">
                {[
                  { id: 'INTERESTED', label: 'Interested (Creates Enquiry)', icon: CheckCircle },
                  { id: 'MORE_INFORMATION', label: 'Wants More Information (Creates Enquiry & Follow-up)', icon: MessageSquare },
                  { id: 'VISIT_SHOP', label: 'Wants to Visit Shop (Creates High-Priority Follow-up)', icon: Calendar },
                  { id: 'NOT_INTERESTED', label: 'Not Interested', icon: X },
                  { id: 'PURCHASED', label: 'Purchased (Opens Billing Flow)', icon: ShoppingCart },
                  { id: 'NO_RESPONSE', label: 'No Response', icon: Clock }
                ].map(item => (
                  <label key={item.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedResponseType === item.id ? 'bg-indigo-50/70 border-indigo-500 font-bold text-indigo-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="responseType"
                        value={item.id}
                        checked={selectedResponseType === item.id}
                        onChange={() => setSelectedResponseType(item.id)}
                        className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>{item.label}</span>
                    </div>
                    <item.icon className={`w-4 h-4 ${selectedResponseType === item.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                  </label>
                ))}
              </div>

              {['MORE_INFORMATION', 'VISIT_SHOP'].includes(selectedResponseType) && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <label className="block font-bold text-slate-700">Scheduled Follow-up Date</label>
                  <input
                    type="date"
                    value={scheduledFollowUpDate}
                    onChange={e => setScheduledFollowUpDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Customer requested price for bulk order"
                  value={responseNotes}
                  onChange={e => setResponseNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setResponseModalCampaign(null); setResponseTargetCustomer(null); }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={submittingResponse}
                onClick={handleRecordCustomerResponse}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{submittingResponse ? 'Saving...' : (selectedResponseType === 'PURCHASED' ? 'Continue to Billing' : 'Save Response')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM & SEND MODAL */}
      {confirmSendCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-100 shadow-2xl space-y-4 text-left font-sans">
            <h3 className="text-lg font-bold text-slate-800">
              Confirm & Send Campaign via WhatsApp?
            </h3>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <p><span className="text-slate-400">Campaign Title:</span> <strong className="text-slate-800">{confirmSendCampaign.title}</strong></p>
              <p><span className="text-slate-400">Target Audience:</span> <strong className="text-emerald-700">{confirmSendCampaign.eligibleCustomerCount || 0} Eligible Customers</strong></p>
              <p><span className="text-slate-400">Discount:</span> <strong className="text-indigo-600">{confirmSendCampaign.discountType === 'Percentage' ? `${confirmSendCampaign.discountValue}%` : `₹${confirmSendCampaign.discountValue}`} OFF</strong></p>
              <p><span className="text-slate-400">Media Attached:</span> <span className="text-slate-700 font-bold uppercase">{confirmSendCampaign.mediaType}</span></p>
            </div>

            {!providerStatus?.configured && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold">
                ⚠️ Official Meta WhatsApp Cloud API credentials are NOT configured in .env. Attempting to send will return provider configuration error.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmSendCampaign(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={sendingCampaignId === confirmSendCampaign.id}
                onClick={() => handleConfirmSend(confirmSendCampaign)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>{sendingCampaignId === confirmSendCampaign.id ? 'Sending...' : 'Confirm & Send'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE: CREATE OFFER MULTI-STEP */}
      {viewMode === 'create' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-soft space-y-6">
          {/* Step Progress Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-xs font-bold">
            <div className="flex items-center gap-6">
              <span className={`flex items-center gap-1.5 ${step === 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                <span className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-xs">1</span>
                1. Offer Details & Media
              </span>
              <span className={`flex items-center gap-1.5 ${step === 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
                <span className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-xs">2</span>
                2. Customer Targeting
              </span>
              <span className={`flex items-center gap-1.5 ${step === 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                <span className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-xs">3</span>
                3. Message Preview
              </span>
            </div>
            <button
              onClick={() => setViewMode('list')}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              Cancel
            </button>
          </div>

          {/* STEP 1: OFFER DETAILS & MEDIA */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Offer Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Weekend Special 20% OFF"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Special weekend offer on selected men's apparel"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Discount Type *</label>
                      <select
                        value={discountType}
                        onChange={e => setDiscountType(e.target.value as any)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Percentage">Percentage (%)</option>
                        <option value="Fixed Amount">Fixed Amount (₹)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Discount Value *</label>
                      <input
                        type="number"
                        placeholder="e.g. 20"
                        value={discountValue}
                        onChange={e => setDiscountValue(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Select Applicable Product(s)</label>
                    <select
                      multiple
                      value={selectedProductIds}
                      onChange={e => {
                        const opts = Array.from(e.target.selectedOptions, option => option.value);
                        setSelectedProductIds(opts);
                      }}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 h-28"
                    >
                      {activeProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (₹{p.sellingPrice})</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">Hold Ctrl/Cmd to select multiple products, or leave empty for general store offer.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Media Upload & Temporary Storage Card */}
                <div className="space-y-4 border-l border-slate-100 pl-0 md:pl-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-indigo-500" />
                      Campaign Media (Temporary Upload)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Upload temporary image (JPG, PNG, WEBP ≤10MB) or video (MP4 ≤25MB). Media is NOT stored in MongoDB.
                    </p>
                  </div>

                  {mediaPreviewUrl ? (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-48 flex items-center justify-center p-2">
                        {mediaType === 'video' ? (
                          <video src={mediaPreviewUrl} controls className="max-h-44 rounded-xl" />
                        ) : (
                          <img src={mediaPreviewUrl} alt="Campaign Media Preview" className="max-h-44 object-contain rounded-xl" />
                        )}
                        <button
                          onClick={removeMedia}
                          className="absolute top-3 right-3 p-1.5 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">{mediaFile?.name}</span>
                        <button
                          onClick={removeMedia}
                          className="text-rose-600 font-bold hover:underline"
                        >
                          Replace Media
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-center gap-3 text-slate-400">
                        <ImageIcon className="w-8 h-8" />
                        <VideoIcon className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Click to upload campaign media</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Images (JPG, PNG, WEBP) or Videos (MP4)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4"
                        onChange={handleFileChange}
                        disabled={uploadingMedia}
                        className="hidden"
                        id="campaign-media-input"
                      />
                      <label
                        htmlFor="campaign-media-input"
                        className="inline-block px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-xs hover:bg-slate-100 transition-colors"
                      >
                        {uploadingMedia ? 'Uploading...' : 'Browse File'}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={handleProceedToTargeting}
                  disabled={loadingTargeting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <span>{loadingTargeting ? 'Fetching Customers...' : 'Continue to Customer Targeting'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CUSTOMER TARGETING */}
          {step === 2 && (
            <div className="space-y-6 text-xs font-sans">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-700">Filter Target Segment:</span>
                  <select
                    value={filterType}
                    onChange={e => handleFilterChange(e.target.value)}
                    className="p-2 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all_eligible">All Eligible Customers</option>
                    <option value="product_buyers">Previous Buyers of Selected Product</option>
                    <option value="enquiry_customers">Customers with Enquiries</option>
                    <option value="followup_customers">Customers with Active Follow-ups</option>
                  </select>
                </div>

                <button
                  onClick={selectAllEligible}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Select All Eligible ({eligibleCustomers.length})
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Eligible Customers Column */}
                <div className="space-y-3">
                  <h4 className="font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Eligible Customers ({eligibleCustomers.length})
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                    {eligibleCustomers.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-4 text-center">No eligible customers found for this segment.</p>
                    ) : (
                      eligibleCustomers.map(c => (
                        <label key={c.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-50">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={selectedCustIds.includes(c.id)}
                              onChange={() => toggleCustSelection(c.id)}
                              className="text-indigo-600 focus:ring-indigo-500 rounded w-4 h-4"
                            />
                            <div>
                              <span className="font-bold text-slate-800 block">{c.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">{c.maskedPhone}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Eligible</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Ineligible Customers Column */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <X className="w-4 h-4 text-slate-400" />
                    Not Eligible / Excluded ({ineligibleCustomers.length})
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50 opacity-75">
                    {ineligibleCustomers.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-4 text-center">No excluded customers.</p>
                    ) : (
                      ineligibleCustomers.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                          <div>
                            <span className="font-bold text-slate-600 block">{c.name}</span>
                            <span className="text-[10px] text-slate-400">{c.reason}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Ineligible</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedCustIds.length === 0}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <span>Continue to Message Preview ({selectedCustIds.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: MESSAGE PREVIEW */}
          {step === 3 && (
            <div className="space-y-6 text-xs font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campaign Overview Summary */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider">Campaign Overview</h4>
                  <div className="space-y-2">
                    <p><span className="text-slate-400">Title:</span> <strong className="text-slate-800">{title}</strong></p>
                    <p><span className="text-slate-400">Discount:</span> <strong className="text-indigo-600">{discountFormatted} OFF</strong></p>
                    <p><span className="text-slate-400">Applicable Products:</span> <span className="text-slate-700">{selectedProductsNames}</span></p>
                    <p><span className="text-slate-400">Validity:</span> <span className="text-slate-700">{startDate} to {endDate}</span></p>
                    <p><span className="text-slate-400">Media Attached:</span> <span className="text-slate-700 font-bold uppercase">{mediaType}</span></p>
                    <p><span className="text-slate-400">Selected Target Audience:</span> <strong className="text-emerald-700">{selectedCustIds.length} Customers</strong></p>
                  </div>
                </div>

                {/* WhatsApp Message Preview Card */}
                <div className="bg-emerald-950 p-6 rounded-2xl text-emerald-100 space-y-3 shadow-md border border-emerald-800 font-mono text-[11px] leading-relaxed">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold border-b border-emerald-800 pb-2">
                    <span>WHATSAPP MESSAGE TEMPLATE PREVIEW</span>
                    <span>VARIABLE TEMPLATE</span>
                  </div>

                  <p className="whitespace-pre-wrap">
                    🎉 <strong className="text-white">Special Offer from {"{{ShopName}}"}!</strong>
                    {"\n\n"}
                    Hi <strong className="text-emerald-300">{"{{CustomerName}}"}</strong>,
                    {"\n\n"}
                    Get <strong className="text-yellow-300">{discountFormatted} OFF</strong> on <strong className="text-white">{selectedProductsNames}</strong>!
                    {"\n\n"}
                    Offer valid from <strong className="text-white">{startDate}</strong> until <strong className="text-white">{endDate}</strong>.
                    {"\n\n"}
                    Contact us at <strong className="text-white">{shopName}</strong> to place your order or learn more!
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Back to Customer Targeting
                </button>
                <button
                  disabled={submittingCampaign}
                  onClick={handleSaveCampaign}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{submittingCampaign ? 'Saving Campaign...' : 'Save Campaign (Status: READY)'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
