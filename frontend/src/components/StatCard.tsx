import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  theme: 'blue' | 'yellow' | 'green';
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, theme }) => {
  const themeStyles = {
    blue: {
      border: 'border-b-4 border-b-primary-500',
      iconBg: 'bg-primary-50 text-primary-500',
    },
    yellow: {
      border: 'border-b-4 border-b-warning-500',
      iconBg: 'bg-warning-50 text-warning-500',
    },
    green: {
      border: 'border-b-4 border-b-success-500',
      iconBg: 'bg-success-50 text-success-500',
    }
  };

  return (
    <div className={`bg-white p-3.5 sm:p-6 rounded-2xl border border-slate-100/80 shadow-soft flex items-center gap-3 sm:gap-6 ${themeStyles[theme].border} transition-all duration-200 hover:-translate-y-0.5 min-w-0`}>
      <div className={`p-2.5 sm:p-4 rounded-full ${themeStyles[theme].iconBg} shrink-0`}>
        <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0">
        <h3 className="text-lg sm:text-3xl font-extrabold text-slate-800 tracking-tight truncate">{value}</h3>
        <p className="text-xs sm:text-sm font-medium text-slate-400 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
};
