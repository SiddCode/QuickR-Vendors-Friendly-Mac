import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';

export const Automation: React.FC = () => {
  return (
    <div className="flex-grow p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans animate-fadeIn">
      <div>
        <h2 className="text-xl font-bold text-slate-800">AI Automation Settings</h2>
        <p className="text-xs text-slate-400">Configure smart templates, automatic follow-up intervals, and agent rules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Active Workflows</h3>
            
            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex gap-3">
                  <div className="p-2 bg-primary-50 text-primary-500 rounded-lg h-9 w-9 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Smart Recommendation Engine</h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Auto-triggers follow-up alerts when customer signals high purchase intent without closing.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-success-50 text-success-600 rounded text-[10px] font-bold">Active</span>
              </div>

              <div className="flex items-start justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex gap-3">
                  <div className="p-2 bg-primary-50 text-primary-500 rounded-lg h-9 w-9 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">WhatsApp Template Auto-generation</h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Generates tailor-made shop reminders referencing item names, sizes, and colors automatically.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-success-50 text-success-600 rounded text-[10px] font-bold">Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Automation Metrics</h3>
          <div className="space-y-4 text-xs font-semibold text-slate-600">
            <div className="flex justify-between">
              <span>Automated Followups:</span>
              <span className="text-slate-850">12 Scheduled</span>
            </div>
            <div className="flex justify-between">
              <span>AI Message Templates:</span>
              <span className="text-slate-850">8 Active</span>
            </div>
            <div className="flex justify-between">
              <span>Est. Hours Saved:</span>
              <span className="text-primary-500 font-bold">4.5 Hours/Week</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
