import React from 'react';
import { UserProfile } from '../types';
import { Sparkles, Calendar, Zap } from 'lucide-react';

interface DashboardHeaderProps {
  currentView: string;
  userProfile: UserProfile | null;
  onNavigate: (view: string) => void;
}

export default function DashboardHeader({ currentView, userProfile, onNavigate }: DashboardHeaderProps) {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    history: 'History',
    billing: 'Subscription',
    settings: 'Settings'
  };

  const used = userProfile?.replies_used ?? 0;
  const limit = userProfile?.replies_limit ?? 5;
  const isUnlimited = typeof limit === 'string' || limit >= 999999;
  const remaining = isUnlimited ? 'unlimited' : `${Math.max(0, limit - used)} replies remaining`;
  const planLabel = userProfile?.plan && userProfile.plan !== 'free' ? `${userProfile.plan} Plan` : 'Trial Plan';

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 select-none">
      
      {/* Title & Greeter */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {titles[currentView] || 'Control Panel'}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Good morning, <span className="text-blue-600 font-semibold">{userProfile?.business_name || 'My Business'}</span>
        </p>
      </div>

      {/* Control statistics & Avatar */}
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{planLabel}</p>
          <p className="text-sm font-medium text-slate-700">{remaining}</p>
        </div>
        <div 
          onClick={() => onNavigate('settings')}
          className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white ring-1 ring-slate-200 flex items-center justify-center font-bold text-slate-700 capitalize shrink-0 shadow-sm cursor-pointer hover:bg-slate-300 transition-colors"
          title="Account Settings"
        >
          {userProfile?.business_name?.[0] || 'B'}
        </div>
      </div>

    </header>
  );
}
