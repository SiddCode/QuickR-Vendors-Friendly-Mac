import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { User as UserIcon, Store, Mail, Phone, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [requestedPlan, setRequestedPlan] = useState('Standard');
  const [message, setMessage] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !shopName.trim() || !phone.trim() || !email.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api.submitSubscriptionRequest({
        name,
        shopName,
        phone,
        email,
        requestedPlan,
        message
      });

      if (res.success) {
        setSubmittedMessage(res.message);
      } else {
        setError('Submission failed. Please check your information and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 font-sans text-slate-100 relative overflow-hidden">
      {/* Glow graphics */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-accent-blue/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-5 relative z-10">
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo className="h-9 w-auto" />
          <h1 className="text-xl font-bold text-white tracking-tight mt-1">Start Using QuickR</h1>
          <p className="text-xs text-slate-400">Tell us about your business and our team will contact you about QuickR access.</p>
        </div>

        {submittedMessage ? (
          <div className="bg-slate-800/80 p-6 rounded-2xl border border-emerald-500/30 text-center space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Request Submitted Successfully</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {submittedMessage}
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Our team will review your business request and contact you to discuss QuickR subscription and pricing.
              </p>
            </div>
            <button
              onClick={onSwitchToLogin}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 bg-danger-500/10 border border-danger-500/30 rounded-xl text-danger-400 text-xs font-medium text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Name *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Rahul Kumar"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Shop Name *</label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Rahul Fashion Boutique"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="rahul@gmail.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Interested Plan</label>
                <select
                  value={requestedPlan}
                  onChange={e => setRequestedPlan(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-all"
                >
                  <option value="Starter">Starter (Small Clothing Shops)</option>
                  <option value="Standard">Standard (Growing Retail Outlets)</option>
                  <option value="Enterprise">Enterprise (Multi-Branch Chains)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Message / Notes</label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    placeholder="Tell us about your daily customer enquiries or store location..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50 mt-2 text-sm"
              >
                {isSubmitting ? 'Submitting Request...' : 'Request QuickR Access'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </>
        )}

        <div className="pt-3 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Already have an active QuickR shop?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary-400 font-bold hover:underline ml-1"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
