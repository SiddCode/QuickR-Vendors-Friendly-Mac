import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { ShieldCheck, ArrowLeft, Globe, Lock, Info } from 'lucide-react';

interface PrivacyNoticeProps {
  setCurrentPage?: (page: string) => void;
}

export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({ setCurrentPage }) => {
  const { language, setLanguage } = useLanguage();
  const [noticeData, setNoticeData] = useState<any>(null);

  useEffect(() => {
    api.getPrivacyNotice().then(setNoticeData).catch(console.error);
  }, []);

  const isTa = language === 'ta';

  return (
    <div className="flex-grow p-4 md:p-8 space-y-6 overflow-y-auto max-w-5xl mx-auto w-full font-sans text-left">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
        <div className="flex items-center gap-3">
          {setCurrentPage && (
            <button
              onClick={() => setCurrentPage('privacy')}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary-600" />
              <h1 className="text-xl font-bold text-slate-800">
                {isTa ? 'தனியுரிமை மற்றும் தரவு பாதுகாப்பு அறிவிப்பு' : 'Privacy & Data Protection Notice'}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isTa ? 'பதிப்பு 1.0 • நடைமுறை தேதி: 18 ஆகஸ்ட் 2026' : 'Version 1.0 • Effective Date: 18 Aug 2026'}
            </p>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
          <Globe className="w-4 h-4 text-slate-400 ml-1" />
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              language === 'en' ? 'bg-white text-primary-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('ta')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              language === 'ta' ? 'bg-white text-primary-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            தமிழ்
          </button>
        </div>
      </div>

      {/* Legal Review Caution Note */}
      <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {isTa
            ? 'DPDP-சார்ந்த தொழில்நுட்ப தனியுரிமை கட்டுப்பாடுகள் செயல்படுத்தப்பட்டுள்ளன; சட்டப்பூர்வ மதிப்பாய்வு இன்னும் தேவைப்படுகிறது.'
            : 'DPDP-oriented technical privacy controls implemented; legal review is still required before full public deployment.'}
        </p>
      </div>

      {/* Main Content Sections */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-soft space-y-8 text-sm text-slate-600 leading-relaxed">
        
        {/* Section 1: Introduction */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary-500" />
            {isTa ? '1. அறிமுகம் மற்றும் நோக்கம்' : '1. Introduction & Purpose'}
          </h2>
          <p>
            {isTa
              ? 'QuickR உங்கள் தனிப்பட்ட மற்றும் வணிகத் தரவைப் பாதுகாப்பதில் உறுதியாக உள்ளது. இந்த தனியுரிமை அறிவிப்பு, உங்கள் கடை மற்றும் வாடிக்கையாளர் தரவை நாங்கள் எவ்வாறு சேகரிக்கிறோம், செயலாக்குகிறோம் மற்றும் பாதுகாக்கிறோம் என்பதை விளக்குகிறது.'
              : 'QuickR is committed to respecting data privacy and protecting personal information. This Privacy Notice explains how personal data is collected, processed, and safeguarded within the QuickR application environment.'}
          </p>
        </section>

        {/* Section 2: Data Collected */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">
            {isTa ? '2. சேகரிக்கப்படும் தரவு வகைகள்' : '2. Categories of Data Collected'}
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong>{isTa ? 'கடை உரிமையாளர் & பணியாளர் தரவு:' : 'Shop Owner & Staff Data:'}</strong> {isTa ? 'பெயர், மின்னஞ்சல் முகவரி, தொடர்பு எண்.' : 'Name, email address, contact phone number, credentials hash.'}</li>
            <li><strong>{isTa ? 'கடை விவரங்கள்:' : 'Shop Profile Information:'}</strong> {isTa ? 'கடையின் பெயர், முகவரி, தொடர்பு விவரங்கள்.' : 'Shop name, location address, vendor contact numbers.'}</li>
            <li><strong>{isTa ? 'வாடிக்கையாளர் பதிவுகள்:' : 'Customer CRM Records:'}</strong> {isTa ? 'பெயர், தொலைபேசி எண், விசாரணைகள், விருப்பங்கள்.' : 'Name, phone number, enquiry notes, follow-up preferences, purchase history.'}</li>
          </ul>
        </section>

        {/* Section 3: Purpose of Processing */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">
            {isTa ? '3. தரவு செயலாக்க நோக்கங்கள்' : '3. Purposes of Data Processing'}
          </h2>
          <p className="text-xs">
            {isTa
              ? 'ஸ்மார்ட் வாடிக்கையாளர் பின்தொடர்தல், பில்லிங், எக்செல் அறிக்கைகள் மற்றும் வாட்ஸ்அப் தொடர்புகள் உள்ளிட்ட முக்கிய சேவைகளை வழங்க மட்டுமே தரவு பயன்படுத்தப்படுகிறது.'
              : 'Data is processed strictly to provide core QuickR services, including CRM management, smart follow-up reminders, bill generation, Excel business reports, and manual WhatsApp customer communications.'}
          </p>
        </section>

        {/* Section 4: Data Retention & Security */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">
            {isTa ? '4. தரவு சேமிப்பு மற்றும் பாதுகாப்பு' : '4. Data Retention & Security Controls'}
          </h2>
          <p className="text-xs">
            {isTa
              ? `தரவு பாதுகாப்பான முறையில் சேமிக்கப்படுகிறது. உள்ளமைக்கப்பட்ட தரவு தக்கவைப்பு காலம்: ${noticeData?.retentionConfigDays || 180} நாட்கள்.`
              : `Personal data is protected using role-based access control and multi-shop database isolation. Configured retention period: ${noticeData?.retentionConfigDays || 180} days for inactive records.`}
          </p>
        </section>

        {/* Section 5: Data Subject Rights */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-800">
            {isTa ? '5. உங்கள் உரிமைகள்' : '5. Data Rights & Controls'}
          </h2>
          <p className="text-xs">
            {isTa
              ? 'உங்கள் தரவைப் பார்க்கவும், பதிவிறக்கவும், ஒப்புதலைத் திரும்பப் பெறவும், கணக்கை நீக்கவும் தனியுரிமை டாஷ்போர்டு மூலமாக உரிமைகள் வழங்கப்படுகின்றன.'
              : 'Authenticated users can inspect personal data, export structured JSON records, update/correct profile information, manage consent, and request account deletion via the Privacy & Data Dashboard.'}
          </p>
        </section>

        {/* Section 6: Grievances & Contact */}
        <section className="space-y-2 border-t border-slate-100 pt-4">
          <h2 className="text-base font-bold text-slate-800">
            {isTa ? '6. புகார் தீர்வு மற்றும் தொடர்பு' : '6. Grievance Redressal & Contact'}
          </h2>
          <p className="text-xs">
            {isTa
              ? 'தனியுரிமை தொடர்பான கேள்விகள் அல்லது புகார்களுக்கு, dpo@quickr.com என்ற மின்னஞ்சல் முகவரியைத் தொடர்பு கொள்ளவும் அல்லது தனியுரிமை கோரிக்கையைச் சமர்ப்பிக்கவும்.'
              : 'For privacy inquiries, grievances, or access requests, please submit a formal Privacy Request via Settings or contact our Data Protection Office at:'}
          </p>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-mono text-xs font-bold text-primary-600 inline-block">
            {noticeData?.dpoContact || 'dpo@quickr.com'}
          </div>
        </section>

      </div>
    </div>
  );
};
