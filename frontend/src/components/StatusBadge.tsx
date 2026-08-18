import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyles = (statusVal: string) => {
    const s = statusVal.toLowerCase().trim();

    // Priority & Status mappings from designs
    if (s === 'follow-up' || s === 'high' || s === "didn't purchase") {
      return 'bg-red-50 text-red-500 border border-red-100';
    }
    if (s === 'enquiry' || s === 'medium' || s === 'maybe') {
      return 'bg-amber-50 text-amber-500 border border-amber-100';
    }
    if (s === 're-engage' || s === 'low' || s === 'purchased' || s === 'interested' || s === 'active') {
      return 'bg-emerald-50 text-emerald-500 border border-emerald-100';
    }
    if (s === 'pending') {
      return 'bg-slate-100 text-slate-500 border border-slate-200';
    }
    if (s === 'inactive' || s === 'not now') {
      return 'bg-slate-50 text-slate-400 border border-slate-100';
    }
    
    // Default fallback
    return 'bg-blue-50 text-blue-500 border border-blue-100';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg ${getStyles(status)}`}>
      {status}
    </span>
  );
};
