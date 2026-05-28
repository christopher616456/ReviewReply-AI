import React, { useState, useEffect } from 'react';
import { UserProfile, BusinessType } from '../types';
import { toast } from 'react-hot-toast';
import { 
  Building, Settings2, UserCheck, ShieldCheck, Mail, Star, 
  Sparkles, Save, Info, Zap
} from 'lucide-react';

interface SettingsPanelProps {
  userProfile: UserProfile | null;
  getAuthToken: () => Promise<string | null>;
  onRefreshProfile: () => void;
  onNavigate: (view: string) => void;
}

export default function SettingsPanel({ userProfile, getAuthToken, onRefreshProfile, onNavigate }: SettingsPanelProps) {
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('restaurant');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setBusinessName(userProfile.business_name || '');
      setBusinessType(userProfile.business_type || 'restaurant');
    }
  }, [userProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      return toast.error('Business name cannot be empty!');
    }

    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setLoading(false);
        return toast.error('Authorization failed.');
      }

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ businessName, businessType })
      });

      if (res.ok) {
        toast.success('Business profile updated successfully!');
        onRefreshProfile(); // Sync profile updates to navbar and triggers
      } else {
        toast.error('Could not save choices.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Network configuration error.');
    } finally {
      setLoading(false);
    }
  };

  const isFree = userProfile?.plan === 'free' || !userProfile?.plan;

  return (
    <div className="max-w-3xl space-y-6">
      
      {/* Configuration Grid */}
      <div className="grid md:grid-cols-3 gap-6 items-start">
        
        {/* Profile Card left */}
        <div className="md:col-span-1 bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold font-display text-lg mx-auto">
            {userProfile?.business_name[0] || 'B'}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">{userProfile?.business_name}</h3>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-400 uppercase tracking-widest text-[9px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100 mt-1">
              {userProfile?.business_type}
            </span>
          </div>

          <div className="border-t border-slate-50 pt-3 space-y-2 text-left">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Account Plan:</div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 bg-slate-50 p-2 rounded-lg">
              <span className="capitalize">{userProfile?.plan} Trial</span>
              {isFree && (
                <button
                  type="button"
                  onClick={() => onNavigate('billing')}
                  className="text-[9px] text-blue-600 font-extrabold hover:underline"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Input Details form right */}
        <div className="md:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm shadow-slate-100">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-1.5 pb-2 border-b border-slate-50">
            <Settings2 className="w-4 h-4 text-slate-400" /> Modify Business Information
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Business Email (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Registrant Email (Read-Only)
              </label>
              <input
                type="email"
                value={userProfile?.email || ''}
                readOnly
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-400 bg-slate-50/80 outline-none select-none"
              />
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" /> Business Brand Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Jaipur Pavilion"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors"
                required
              />
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Primary Business Category
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white transition-colors cursor-pointer"
              >
                <option value="restaurant">Restaurant / Cafe</option>
                <option value="hotel">Hotel / Resort</option>
                <option value="salon">Salon / Spa</option>
                <option value="clinic">Clinic / Hospital</option>
                <option value="other">Other Business Services</option>
              </select>
            </div>

            {/* Save Changes button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-100 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving adjustments...' : 'Save Brand Settings'}</span>
            </button>
          </form>
        </div>

      </div>

      {/* Admin and support banner */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 text-white flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 shrink-0 flex items-center justify-center">
          <Star className="w-5 h-5 text-amber-300 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[10px] text-blue-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Support and SEO Advice
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Responding to customer reviews with contextual SEO keywords can raise your maps query score up by as much as **23%**. Need custom keywords or bulk imports? Get in touch with account managers inside the Pro/Agency plan console.
          </p>
        </div>
      </div>

    </div>
  );
}
