import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { 
  ShieldCheck, 
  Download, 
  Trash2, 
  CheckCircle, 
  FileText, 
  AlertCircle, 
  MessageSquare
} from 'lucide-react';

interface PrivacyDashboardProps {
  setCurrentPage: (page: string) => void;
}

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({ setCurrentPage }) => {
  const { language } = useLanguage();
  const isTa = language === 'ta';

  // Data states
  const [consentHistory, setConsentHistory] = useState<any[]>([]);
  const [privacyRequests, setPrivacyRequests] = useState<any[]>([]);
  const [myData, setMyData] = useState<any>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'consent' | 'requests' | 'data'>('overview');
  const [shopActivities, setShopActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [cleaningRetention, setCleaningRetention] = useState(false);
  const [_loading, setLoading] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState<string | null>(null);
  const [msgError, setMsgError] = useState<string | null>(null);

  const fetchShopActivities = async () => {
    setLoadingActivities(true);
    try {
      const res = await api.getShopActivitySecurity();
      if (res.success) {
        setShopActivities(res.activities);
      }
    } catch (err: any) {
      console.error('Failed to load shop activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleRunRetentionCleanup = async () => {
    setCleaningRetention(true);
    setMsgSuccess(null);
    setMsgError(null);
    try {
      const res = await api.runRetentionCleanup();
      if (res.success) {
        setMsgSuccess(isTa ? `தொழில்நுட்ப பதிவுகள் நீக்கப்பட்டன (${res.deletedTechnicalLogsCount}).` : `Safe retention cleanup complete: ${res.deletedTechnicalLogsCount} old technical logs removed.`);
      }
    } catch (err: any) {
      setMsgError(err.message || 'Cleanup failed.');
    } finally {
      setCleaningRetention(false);
    }
  };

  // New Privacy Request form state
  const [reqType, setReqType] = useState('access');
  const [reqDesc, setReqDesc] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

  // Account deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fetchPrivacyInfo = async () => {
    setLoading(true);
    setMsgError(null);
    try {
      const [consents, reqs, data] = await Promise.all([
        api.getConsentHistory(),
        api.getPrivacyRequests(),
        api.getMyData()
      ]);
      setConsentHistory(consents);
      setPrivacyRequests(reqs);
      setMyData(data);
    } catch (err: any) {
      setMsgError(err.message || 'Failed to load privacy settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacyInfo();
  }, []);

  const handleWithdrawConsent = async (purpose: string) => {
    setMsgError(null);
    setMsgSuccess(null);
    try {
      const res = await api.withdrawConsent(purpose);
      if (res.success) {
        setMsgSuccess(isTa ? 'ஒப்புதல் வெற்றிகரமாக திரும்பப் பெறப்பட்டது.' : `Consent for ${purpose} successfully withdrawn.`);
        fetchPrivacyInfo();
      }
    } catch (err: any) {
      setMsgError(err.message || 'Failed to withdraw consent.');
    }
  };

  const handleGrantConsent = async (purpose: string) => {
    setMsgError(null);
    setMsgSuccess(null);
    try {
      const res = await api.grantConsent(purpose);
      if (res.success) {
        setMsgSuccess(isTa ? 'ஒப்புதல் வெற்றிகரமாக வழங்கப்பட்டது.' : `Consent for ${purpose} granted.`);
        fetchPrivacyInfo();
      }
    } catch (err: any) {
      setMsgError(err.message || 'Failed to grant consent.');
    }
  };

  const handleExportData = async () => {
    setMsgError(null);
    setMsgSuccess(null);
    try {
      const blob = await api.exportMyData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quickr-my-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setMsgSuccess(isTa ? 'தனிப்பட்ட தரவு வெற்றிகரமாக பதிவிறக்கம் செய்யப்பட்டது.' : 'Personal data JSON exported successfully.');
    } catch (err: any) {
      setMsgError(err.message || 'Export failed.');
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDesc.trim()) return;
    setSubmittingReq(true);
    setMsgError(null);
    setMsgSuccess(null);
    try {
      const res = await api.createPrivacyRequest(reqType, reqDesc);
      if (res.success) {
        setMsgSuccess(isTa ? 'தனியுரிமை கோரிக்கை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது.' : 'Privacy request submitted successfully.');
        setReqDesc('');
        fetchPrivacyInfo();
      }
    } catch (err: any) {
      setMsgError(err.message || 'Failed to submit request.');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setDeletingAccount(true);
    setMsgError(null);
    try {
      const res = await api.deleteAccount(deleteConfirmText);
      if (res.success) {
        alert(isTa ? 'உங்கள் கணக்கு முடக்கப்பட்டு தரவு அநாமதேயமாக்கப்பட்டது.' : 'Your account has been deactivated and personal data anonymized.');
        window.location.reload();
      }
    } catch (err: any) {
      setMsgError(err.message || 'Account deletion failed.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="flex-grow p-4 md:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans text-left">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isTa ? 'தனியுரிமை மற்றும் தரவு பாதுகாப்பு' : 'Privacy & Data Controls'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isTa ? 'DPDP-சார்ந்த தனிப்பட்ட தரவு கட்டுப்பாடுகள் மற்றும் ஒப்புதல் நிர்வாகம்' : 'DPDP-oriented personal data controls, consent history & privacy requests'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage('privacy-notice')}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-4 h-4 text-primary-500" />
            {isTa ? 'தனியுரிமை அறிவிப்பைப் பார்க்கவும்' : 'View Privacy Notice'}
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {msgSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{msgSuccess}</span>
        </div>
      )}

      {msgError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{msgError}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-100 gap-6 text-sm font-semibold overflow-x-auto">
        {[
          { id: 'overview', label: isTa ? 'மேலோட்டம்' : 'Overview' },
          { id: 'activity', label: isTa ? 'செயல்பாடு & பாதுகாப்பு' : 'Activity & Security' },
          { id: 'consent', label: isTa ? 'ஒப்புதல் நிர்வாகம்' : 'Consent Preferences' },
          { id: 'requests', label: isTa ? 'தனியுரிமை கோரிக்கைகள்' : 'Privacy Requests' },
          { id: 'data', label: isTa ? 'என் தரவு & கணக்கு' : 'My Data & Account' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === 'activity') fetchShopActivities();
            }}
            className={`pb-3 transition-all duration-150 relative shrink-0 ${
              activeTab === tab.id
                ? 'text-primary-600 font-bold border-b-2 border-primary-500'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 0: ACTIVITY & SECURITY (SHOP OWNER ONLY) */}
      {activeTab === 'activity' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4 font-sans">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                {isTa ? 'கடை செயல்பாடு மற்றும் பாதுகாப்பு வரலாறு' : 'Shop Activity & Security Logs'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isTa ? 'உங்கள் கடையின் பயனர்களின் சமீபத்திய உள்நுழைவு, வெளியேற்றம் மற்றும் பாதுகாப்பு நிகழ்வுகள்.' : 'Recent login, logout, password changes & privacy actions for your shop.'}
              </p>
            </div>
            <button
              onClick={fetchShopActivities}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200"
            >
              Refresh Logs
            </button>
          </div>

          {loadingActivities ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading audit logs...</div>
          ) : shopActivities.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No activity logged for this shop yet.</div>
          ) : (
            <div className="space-y-2">
              {shopActivities.map(item => (
                <div key={item.id} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 uppercase tracking-wider block">
                      {item.action}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {item.ipAddress} • {item.userAgent}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-medium block">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
          
          {/* Card 1: My Personal Data */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-500" />
              {isTa ? 'என் தனிப்பட்ட தரவு' : 'My Personal Data'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isTa ? 'QuickR சேமித்துள்ள உங்கள் தனிப்பட்ட கணக்கு விவரங்களைப் பார்க்கவும் அல்லது பதிவிறக்கம் செய்யவும்.' : 'Inspect personal account records or download a structured JSON file of your data.'}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setActiveTab('data')}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors text-center"
              >
                {isTa ? 'தரவைப் பார்க்கவும்' : 'View My Data'}
              </button>
              <button
                onClick={handleExportData}
                className="w-full py-2 px-3 bg-primary-50 hover:bg-primary-100 text-primary-600 text-xs font-bold rounded-xl border border-primary-100 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {isTa ? 'தரவைப் பதிவிறக்கு' : 'Download My Data (.json)'}
              </button>
            </div>
          </div>

          {/* Card 2: Consent Preferences */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              {isTa ? 'ஒப்புதல் அமைப்புகள்' : 'Consent Preferences'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isTa ? 'சேவை மற்றும் விளம்பரத் தொடர்புகளுக்கான ஒப்புதல் வரலாற்றை நிர்வகிக்கவும்.' : 'Review given notice versions and toggle optional marketing/analytics consent.'}
            </p>
            <button
              onClick={() => setActiveTab('consent')}
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
            >
              {isTa ? 'ஒப்புதல் வரலாறு' : 'Manage Consent'}
            </button>
          </div>

          {/* Card 3: Privacy Requests & Grievance */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-500" />
              {isTa ? 'தனியுரிமை கோரிக்கைகள்' : 'Privacy Requests & Grievance'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isTa ? 'தரவு திருத்தம், நீக்கம் அல்லது தனியுரிமை புகார்களைச் சமர்ப்பிக்கவும்.' : 'Submit requests for correction, erasure, or privacy grievances.'}
            </p>
            <button
              onClick={() => setActiveTab('requests')}
              className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
            >
              {isTa ? 'கோரிக்கையைச் சமர்ப்பிக்கவும்' : 'Submit Request'}
            </button>
          </div>

        </div>
      )}

      {/* TAB 2: CONSENT PREFERENCES */}
      {activeTab === 'consent' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {isTa ? 'செயலில் உள்ள ஒப்புதல்கள்' : 'Active Consent Preferences'}
            </h3>
            
            <div className="space-y-3">
              {/* Service Consent (Required) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-slate-800 block">
                    {isTa ? 'சேவை செயலாக்க ஒப்புதல் (அவசியம்)' : 'Essential Service Consent (Required)'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isTa ? 'கடை பில்லிங் மற்றும் பின்தொடர்தல் சேவைகளை வழங்க அவசியம்.' : 'Required for core CRM, invoicing, and follow-up management.'}
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg shrink-0">
                  {isTa ? 'செயலில் உள்ளது' : 'Active (Required)'}
                </span>
              </div>

              {/* Marketing Consent (Optional Toggle) */}
              {(() => {
                const mkt = consentHistory.find(c => c.purpose === 'marketing');
                const isMktActive = mkt ? mkt.status === 'active' : true;
                return (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">
                        {isTa ? 'விளம்பரத் தொடர்புகள் ஒப்புதல்' : 'Marketing & Promotional Communications'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {isTa ? 'புதிய அம்சங்கள் மற்றும் விளம்பரச் செய்திகளைப் பெற.' : 'Receive update notifications and promotional messages from QuickR.'}
                      </span>
                    </div>
                    {isMktActive ? (
                      <button
                        onClick={() => handleWithdrawConsent('marketing')}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors shrink-0"
                      >
                        {isTa ? 'ஒப்புதலைத் திரும்பப் பெறு' : 'Turn Off / Withdraw'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGrantConsent('marketing')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors shrink-0"
                      >
                        {isTa ? 'ஒப்புதல் அளிக்கவும்' : 'Enable Consent'}
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Consent Audit Log */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {isTa ? 'ஒப்புதல் வரலாறு' : 'Consent Audit History'}
            </h3>
            <div className="space-y-2">
              {consentHistory.map(item => (
                <div key={item.id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-medium">
                  <div>
                    <span className="font-bold text-slate-700 uppercase mr-2">{item.purpose}</span>
                    <span className="text-slate-400">Notice v{item.noticeVersion}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {item.status}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(item.consentedAt || item.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRIVACY REQUESTS & GRIEVANCE */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
          {/* Submit New Request Form */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {isTa ? 'புதிய தனியுரிமை கோரிக்கை' : 'Submit Privacy Request'}
            </h3>
            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  {isTa ? 'கோரிக்கை வகை' : 'Request Type'}
                </label>
                <select
                  value={reqType}
                  onChange={e => setReqType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 font-medium"
                >
                  <option value="access">Access Personal Data</option>
                  <option value="correction">Data Correction</option>
                  <option value="erasure">Erasure / Deletion</option>
                  <option value="consent">Consent Inquiry</option>
                  <option value="grievance">Privacy Grievance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  {isTa ? 'விளக்கம்' : 'Description'}
                </label>
                <textarea
                  required
                  rows={4}
                  value={reqDesc}
                  onChange={e => setReqDesc(e.target.value)}
                  placeholder={isTa ? 'உங்கள் தனியுரிமைக் கோரிக்கையை சுருக்கமாக விவரிக்கவும்...' : 'Describe your request or privacy concern...'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReq}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {submittingReq ? (isTa ? 'சமர்ப்பிக்கிறது...' : 'Submitting...') : (isTa ? 'கோரிக்கையைச் சமர்ப்பி' : 'Submit Privacy Request')}
              </button>
            </form>
          </div>

          {/* User Request History */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {isTa ? 'என் கோரிக்கைகள் பட்டியல்' : 'My Submitted Requests'}
            </h3>
            {privacyRequests.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No privacy requests submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {privacyRequests.map(r => (
                  <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary-600 uppercase">{r.requestType}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-slate-700 font-medium">{r.description}</p>
                    {r.adminNotes && (
                      <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                        Admin Note: {r.adminNotes}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      ID: {r.id} • Submitted: {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MY DATA & ACCOUNT */}
      {activeTab === 'data' && (
        <div className="space-y-6 font-sans">
          {/* Personal Data Card */}
          {myData && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                {isTa ? 'கணக்கு மற்றும் கடை தரவு' : 'Account & Associated Shop Records'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <p className="font-bold text-slate-700 mb-1">User Account PII</p>
                  <p><span className="text-slate-400">ID:</span> {myData.account.userId}</p>
                  <p><span className="text-slate-400">Name:</span> {myData.account.name}</p>
                  <p><span className="text-slate-400">Email:</span> {myData.account.email}</p>
                  <p><span className="text-slate-400">Role:</span> {myData.account.role}</p>
                </div>
                {myData.shop && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <p className="font-bold text-slate-700 mb-1">Shop Profile Information</p>
                    <p><span className="text-slate-400">Custom ID:</span> {myData.shop.shopId}</p>
                    <p><span className="text-slate-400">Name:</span> {myData.shop.name}</p>
                    <p><span className="text-slate-400">Phone:</span> {myData.shop.phone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Storage Efficiency & Retention Cleanup */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary-500" />
              {isTa ? 'சேமிப்பு திறமை மற்றும் தரவு தக்கவைப்பு துப்புரவு' : 'Storage Efficiency & Safe Retention Cleanup'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isTa ? '180 நாட்களுக்கு மேற்பட்ட பழைய தொழில்நுட்ப பதிவுகள் மற்றும் பயன்படாத தரவுகளை பாதுகாப்பாக நீக்கவும்.' : 'Perform a safe retention cleanup of technical logs older than the configured retention period (180 days). Active business data (customers, products, sales) will not be deleted.'}
            </p>
            <button
              disabled={cleaningRetention}
              onClick={handleRunRetentionCleanup}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
            >
              {cleaningRetention ? (isTa ? 'சுத்தம் செய்கிறது...' : 'Cleaning Up...') : (isTa ? 'தொழில்நுட்ப பதிவுகளை சுத்தம் செய்' : 'Run Storage Retention Cleanup')}
            </button>
          </div>

          {/* Danger Zone: Account Deletion */}
          <div className="bg-rose-50/50 border border-rose-200 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-rose-600" />
              {isTa ? 'கணக்கு நீக்கம் (Danger Zone)' : 'Account Deletion (Danger Zone)'}
            </h3>
            <p className="text-xs text-rose-700 leading-relaxed">
              {isTa ? 'கணக்கு நீக்கம் உங்கள் கணக்கை முடக்கும் மற்றும் தனிப்பட்ட தரவை அநாமதேயமாக்கும்.' : 'Deleting your account deactivates login access and anonymizes personal identifying information in compliance with QuickR retention policies.'}
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              {isTa ? 'என் கணக்கை நீக்கு' : 'Delete My Account'}
            </button>
          </div>
        </div>
      )}

      {/* ACCOUNT DELETION CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 text-left">
            <h3 className="text-lg font-bold text-slate-800">
              {isTa ? 'கணக்கு நீக்கத்தை உறுதிப்படுத்தவும்' : 'Confirm Account Deletion'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isTa ? 'தொடர "DELETE" என டைப் செய்யவும்:' : 'This action will anonymize your personal information. Please type DELETE to confirm:'}
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-rose-500"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || deletingAccount}
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {deletingAccount ? 'Processing...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
