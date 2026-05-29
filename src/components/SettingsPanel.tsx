import React, { useState, useEffect } from 'react';
import { UserProfile, BusinessType } from '../types';
import { toast } from 'react-hot-toast';
import { 
  Building, Settings2, UserCheck, ShieldCheck, Mail, Star, 
  Sparkles, Save, Info, Zap, Code, Copy, Check, Eye, EyeOff, Globe, Key, Lock, RefreshCw
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
  const [customApiKey, setCustomApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedAPI, setCopiedAPI] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setBusinessName(userProfile.business_name || '');
      setBusinessType(userProfile.business_type || 'restaurant');
      setCustomApiKey(userProfile.custom_api_key || '');
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
        toast.success('Brand settings updated successfully!');
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

  const handleRegenerateKey = async () => {
    if (!window.confirm('Are you sure you want to REGENERATE your Review Reply AI API Key? Any external systems or dashboards using your old key will stop working immediately.')) {
      return;
    }

    setRegenerating(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setRegenerating(false);
        return toast.error('Authorization session expired.');
      }

      const res = await fetch('/api/profile/regenerate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setCustomApiKey(data.customApiKey);
        toast.success('Brand developer credential regenerated!');
        onRefreshProfile();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to regenerate credentials.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not execute credentials regeneration.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyEmbed = () => {
    const embedCode = `<iframe src="${window.location.origin}/?embed=true#dashboard" width="100%" height="650" style="border:none; border-radius:16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    toast.success('Widget Embed Code copied!');
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  const handleCopyAPI = () => {
    const apiCode = `fetch('${window.location.origin}/api/generate-reply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${customApiKey || "rr_live_YOUR_KEY"}'
  },
  body: JSON.stringify({
    reviewText: 'The food was amazing, but service was slow.',
    tone: 'friendly',
    language: 'English',
    businessName: '${businessName || "My Restaurant"}',
    businessType: '${businessType || "restaurant"}'
  })
})
.then(res => res.json())
.then(console.log);`;
    navigator.clipboard.writeText(apiCode);
    setCopiedAPI(true);
    toast.success('Developer API code copied!');
    setTimeout(() => setCopiedAPI(false), 2000);
  };

  const isFree = userProfile?.plan === 'free' || !userProfile?.plan;

  return (
    <div className="max-w-4xl space-y-8">
      
      {/* Configuration Grid */}
      <div className="grid md:grid-cols-3 gap-6 items-start">
        
        {/* Profile Card left */}
        <div className="md:col-span-1 bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold font-display text-lg mx-auto">
            {userProfile?.business_name?.[0] || 'B'}
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
            <Settings2 className="w-4 h-4 text-slate-400" /> Modify Settings & Keys
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

            {/* Review Reply AI API Key Section */}
            {isFree ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Review Reply AI API Key</h4>
                    <p className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1.5 rounded-full border border-amber-100 inline-block">Starter / Pro Upgrade Needed</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Our system generates a proprietary, zero-error Review Reply AI Key for your brand, allowing full programmatic querying. There is no free tier available for API Key usage.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('billing')}
                  className="w-full bg-slate-950 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                  <span>Upgrade Plan to Unlock API Key</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-emerald-600 font-extrabold">
                    <Key className="w-3.5 h-3.5" /> Review Reply AI API Key (Active)
                  </span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-extrabold uppercase border border-emerald-100">
                    Paid Account Tier
                  </span>
                </label>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={customApiKey || 'rr_live_generating_sec_key...'}
                      readOnly
                      className="w-full border border-slate-205 rounded-xl pl-4 pr-10 py-2.5 text-xs font-mono text-slate-700 bg-slate-50/50 outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    disabled={regenerating}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 md:px-4 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer text-xs font-bold shrink-0"
                    title="Regenerate API Credential"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${regenerating ? 'animate-spin' : ''}`} />
                    <span>Rotate</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  Pass this proprietary credential inside the Bearer authorization header to secure programmatics integration directly into custom CRM templates, dashboards, or websites.
                </p>
              </div>
            )}

            {/* Save Changes button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-100 disabled:opacity-50 cursor-pointer text-center"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving adjustments...' : 'Save Brand Settings'}</span>
            </button>
          </form>
        </div>

      </div>

      {/* Website Integration & Developer Hub */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm shadow-slate-100 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <Code className="w-4 h-4 text-blue-600" /> Integrate into Your Own Website
          </h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Easily deploy this AI review generation platform directly inside your custom dashboard, admin portal, CRM, or client web console in less than 2 minutes. We support direct zero-error embedding and API-level backend queries.
          </p>
        </div>

        {/* Integration Options Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Option A: iframe embedded widget */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-500" /> Option 1: Embedded Iframe Widget
              </span>
              <button
                type="button"
                onClick={handleCopyEmbed}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                {copiedEmbed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEmbed ? 'Copied' : 'Copy HTML'}</span>
              </button>
            </div>
            
            <p className="text-[11px] text-slate-500 leading-normal">
              Insert this lightweight iframe code snippet onto any HTML page, CMS platform (WordPress, Webflow, Shopify), or internal workspace to load a borderless, polished generation utility.
            </p>

            <div className="bg-slate-900 rounded-lg p-3 text-[10px] font-mono text-slate-300 overflow-x-auto select-all max-h-24">
              &lt;iframe src="{window.location.origin}/?embed=true#dashboard" width="100%" height="650" style="border:none; border-radius:16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);"&gt;&lt;/iframe&gt;
            </div>
            
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span>Fully responsive widget automatically styled for clean mobile rendering.</span>
            </div>
          </div>

          {/* Option B: Direct Developer API Call */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Code className="w-4 h-4 text-blue-500" /> Option 2: Back-end API Connection
              </span>
              <button
                type="button"
                onClick={handleCopyAPI}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                {copiedAPI ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAPI ? 'Copied' : 'Copy JS Snippet'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              Directly query the reply generation endpoint from your servers/dashboards by supplying your custom Review Reply AI API key in the authorization header.
            </p>

            <div className="bg-slate-900 rounded-lg p-3 text-[9px] font-mono text-slate-300 overflow-x-auto select-all max-h-24 leading-normal">
              {`// Post Request example
fetch('${window.location.origin}/api/generate-reply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${customApiKey || "rr_live_YOUR_KEY"}'
  },
  body: JSON.stringify({
    reviewText: "Great service!"
  })
})`}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              <span>Accepts customized tones, languages, and custom sign-offs out-of-the-box.</span>
            </div>
          </div>

        </div>
      </div>

      {/* Admin and support banner */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 text-white flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 shrink-0 flex items-center justify-center">
          <Star className="w-5 h-5 text-amber-300 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[10px] text-blue-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 animate-bounce" /> Support and SEO Advice
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Responding to customer reviews with contextual SEO keywords can raise your maps query score up by as much as **23%**. Need custom keywords or bulk imports? Get in touch with account managers inside the Pro/Agency plan console.
          </p>
        </div>
      </div>

    </div>
  );
}
