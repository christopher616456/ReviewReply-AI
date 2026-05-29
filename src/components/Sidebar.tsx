import React from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { LayoutDashboard, History, CreditCard, Settings, LogOut, Sparkles, AlertCircle } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export default function Sidebar({ currentView, onNavigate, userProfile, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Generate Reply', icon: LayoutDashboard },
    { id: 'history', name: 'History', icon: History },
    { id: 'billing', name: 'Subscription', icon: CreditCard },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  // Calculate usage percentages
  const used = userProfile?.replies_used ?? 0;
  const limit = userProfile?.replies_limit ?? 5;
  const isUnlimited = typeof limit === 'string' || limit >= 999999;
  const percentage = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0 select-none">
      
      {/* Upper Logo & Nav Container */}
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/20">
            RR
          </div>
          <span className="font-semibold text-lg tracking-tight text-white">ReviewReply AI</span>
        </div>

        {/* Dynamic Navigation */}
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-left cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Consumption Meter and User signout */}
      <div className="p-4 mt-auto mb-4 space-y-4">
        
        {/* Usage Box */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Usage</span>
            <span className="text-xs font-bold text-white">
              {isUnlimited ? 'unlimited' : `${used}/${limit}`}
            </span>
          </div>

          {!isUnlimited && (
            <div className="space-y-1.5">
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {used >= limit && (
                <div className="text-[10px] text-rose-400 font-semibold flex items-center gap-1 leading-normal">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Free replies exhausted
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
            Upgrade to Pro for unlimited replies and priority AI.
          </p>
          <button 
            onClick={() => onNavigate('billing')}
            className="w-full mt-3 py-2 bg-slate-100 text-slate-900 rounded-lg text-xs font-bold hover:bg-white transition-all shadow-sm cursor-pointer"
          >
            Upgrade Now
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs capitalize shrink-0 shadow-sm">
              {userProfile?.email[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-[11px] font-semibold text-white truncate max-w-[125px]">
                {userProfile?.business_name || 'My Business'}
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[125px]">
                {userProfile?.email || 'user@email.com'}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Log Out"
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </aside>
  );
}
