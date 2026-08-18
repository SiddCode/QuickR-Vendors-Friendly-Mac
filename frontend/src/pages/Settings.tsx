import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Store, Languages, Copy, Check, Loader2, ArrowRightLeft, Edit2, Save, X, Phone, ShieldCheck, ChevronRight } from 'lucide-react';
import { api } from '../services/api';

interface SettingsProps {
  setCurrentPage?: (page: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ setCurrentPage }) => {
  const { updateShopProfile } = useApp();
  const { language, setLanguage, t } = useLanguage();

  // Translation State
  const [direction, setDirection] = useState<'en-to-ta' | 'ta-to-en'>('en-to-ta');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Real Shop Profile State
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [shopNameInput, setShopNameInput] = useState('');
  const [contactPhoneInput, setContactPhoneInput] = useState('');
  const [originalShopName, setOriginalShopName] = useState('');
  const [originalContactPhone, setOriginalContactPhone] = useState('');
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrMsg, setProfileErrMsg] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const data = await api.getShopProfile();
      setShopNameInput(data.name || '');
      setContactPhoneInput(data.phone || '');
      setOriginalShopName(data.name || '');
      setOriginalContactPhone(data.phone || '');
    } catch (err) {
      console.error('Failed to load shop profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg(null);
    setProfileErrMsg(null);

    if (!shopNameInput.trim()) {
      setProfileErrMsg('Shop name cannot be empty.');
      return;
    }

    if (!contactPhoneInput.trim()) {
      setProfileErrMsg('Contact phone number is required.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateShopProfile({
        name: shopNameInput.trim(),
        phone: contactPhoneInput.trim()
      });
      setOriginalShopName(shopNameInput.trim());
      setOriginalContactPhone(contactPhoneInput.trim());
      setIsEditingProfile(false);
      setProfileSuccessMsg('Profile updated successfully.');
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      setProfileErrMsg(err.message || 'Failed to update shop profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelProfileEdit = () => {
    setShopNameInput(originalShopName);
    setContactPhoneInput(originalContactPhone);
    setIsEditingProfile(false);
    setProfileErrMsg(null);
  };

  const handleTranslate = async () => {
    const textToTranslate = inputText.trim();
    if (!textToTranslate) return;

    setIsTranslating(true);
    setErrorMessage(null);
    setTranslatedText('');

    try {
      if (direction === 'en-to-ta') {
        const lower = textToTranslate.toLowerCase();
        let result = textToTranslate;
        
        const dictionary: Record<string, string> = {
          'hello': 'வணக்கம்',
          'welcome': 'நல்வரவு',
          'thank you': 'நன்றி',
          'good morning': 'காலை வணக்கம்',
          'good evening': 'மாலை வணக்கம்',
          'how are you': 'எப்படி இருக்கிறீர்கள்',
          'price': 'விலை',
          'discount': 'தள்ளுபடி',
          'total': 'மொத்தம்',
          'available': 'இருப்பில் உள்ளது',
          'stock': 'இருப்பு',
          'order': 'ஆர்டர்',
          'customer': 'வாடிக்கையாளர்'
        };

        if (dictionary[lower]) {
          result = dictionary[lower];
        } else {
          result = `[தமிழ்] ${textToTranslate}`;
        }
        setTranslatedText(result);
      } else {
        const dictionary: Record<string, string> = {
          'வணக்கம்': 'Hello',
          'நன்றி': 'Thank you',
          'காலை வணக்கம்': 'Good morning',
          'விலை': 'Price',
          'தள்ளுபடி': 'Discount',
          'மொத்தம்': 'Total',
          'ஆர்டர்': 'Order'
        };

        let result = textToTranslate;
        if (dictionary[textToTranslate.trim()]) {
          result = dictionary[textToTranslate.trim()];
        } else {
          result = textToTranslate.replace(/^\[தமிழ்\]\s*/i, '');
        }
        setTranslatedText(result);
      }
    } catch (err: any) {
      setErrorMessage('Unable to translate right now. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-grow p-4 sm:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-slate-800">{t('nav.settings')}</h2>
        <p className="text-xs text-slate-400">Manage your authenticated shop profile and language preferences</p>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-soft max-w-2xl space-y-6">
        {/* Real Shop Profile Section */}
        <div className="flex items-start gap-4 pb-6 border-b border-slate-100">
          <Store className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-4 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Shop Profile</h3>
                <p className="text-xs text-slate-400">Your official store identity used across QuickR & WhatsApp messaging</p>
              </div>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-primary-50 text-slate-700 hover:text-primary-600 text-xs font-bold rounded-xl transition-all border border-slate-200"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              )}
            </div>

            {profileSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl">
                {profileSuccessMsg}
              </div>
            )}

            {profileErrMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold rounded-xl">
                {profileErrMsg}
              </div>
            )}

            {loadingProfile ? (
              <div className="py-4 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary-600" /> Loading shop profile...
              </div>
            ) : isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Shop Name *</label>
                    <input
                      type="text"
                      required
                      value={shopNameInput}
                      onChange={e => setShopNameInput(e.target.value)}
                      placeholder="Sidd Clothes"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone *</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={contactPhoneInput}
                        onChange={e => setContactPhoneInput(e.target.value)}
                        placeholder="9876543210"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-8 pr-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelProfileEdit}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Shop Name</label>
                  <p className="text-sm font-bold text-slate-800">{originalShopName || '—'}</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Phone</label>
                  <p className="text-sm font-mono font-bold text-slate-700">{originalContactPhone || '—'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Language & Translation Section */}
        <div className="flex items-start gap-3 sm:gap-4">
          <Languages className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-4 min-w-0">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Language & Translation</h3>
              <p className="text-xs text-slate-400">Translate messages between English and Tamil.</p>
            </div>

            {/* Interface Language Preference */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Interface Language</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${language === 'en' ? 'bg-primary-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('ta')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${language === 'ta' ? 'bg-primary-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                  தமிழ் (Tamil)
                </button>
              </div>
            </div>

            {/* Translator Tool */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Translation Direction</label>
                <button
                  onClick={() => {
                    setDirection(prev => prev === 'en-to-ta' ? 'ta-to-en' : 'en-to-ta');
                    setInputText('');
                    setTranslatedText('');
                  }}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Switch
                </button>
              </div>

              {/* Direction Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDirection('en-to-ta')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${direction === 'en-to-ta' ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-xs' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                  English → Tamil
                </button>
                <button
                  onClick={() => setDirection('ta-to-en')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${direction === 'ta-to-en' ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-xs' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                  Tamil → English
                </button>
              </div>

              {/* Text Input */}
              <div>
                <textarea
                  rows={3}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={direction === 'en-to-ta' ? 'Enter English text...' : 'Enter Tamil text...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-primary-500 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Translate Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating || !inputText.trim()}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    'Translate'
                  )}
                </button>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-danger-50 border border-danger-100 rounded-xl text-xs font-semibold text-danger-600">
                  {errorMessage}
                </div>
              )}

              {/* Translated Result Box */}
              {translatedText && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Translated Text</span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 whitespace-pre-wrap select-all">
                    {translatedText}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Privacy & Data Protection Card */}
        <div className="flex items-start gap-4 pt-6 border-t border-slate-100">
          <ShieldCheck className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Privacy & Data Controls</h3>
              <p className="text-xs text-slate-400">Manage consent preferences, download personal data JSON, and submit privacy requests</p>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => setCurrentPage && setCurrentPage('privacy')}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <span>Open Privacy Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage && setCurrentPage('privacy-notice')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Privacy Notice
              </button>
            </div>
          </div>
        </div>

        {/* Activity & Security Section (Shop Owner Only) */}
        <div className="flex items-start gap-4 pt-6 border-t border-slate-100">
          <ShieldCheck className="w-5 h-5 text-violet-600 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-3 min-w-0">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Activity & Security</h3>
              <p className="text-xs text-slate-400">Shop audit logs for logins, logouts, security changes & privacy actions</p>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => setCurrentPage && setCurrentPage('privacy')}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <span>View Activity & Security Logs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
