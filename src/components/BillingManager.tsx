import React, { useState, useEffect } from 'react';
import { PRICING_PLANS, IS_BETA, UserProfile } from '../types';
import { toast } from 'react-hot-toast';
import { 
  Check, ArrowRight, Sparkles, CreditCard, HelpCircle, AlertCircle, 
  ShieldCheck, ArrowDown, ClipboardCheck, Zap, Activity 
} from 'lucide-react';

interface BillingManagerProps {
  userProfile: UserProfile | null;
  getAuthToken: () => Promise<string | null>;
  onRefreshProfile: () => void;
}

export default function BillingManager({ userProfile, getAuthToken, onRefreshProfile }: BillingManagerProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [backendConfig, setBackendConfig] = useState<any>(null);

  // Dynamic Razorpay SDK injector on mount
  useEffect(() => {
    fetchConfig();

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => console.warn('Could not load Razorpay SDK. Fallback mode active.');
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        setBackendConfig(await res.json());
      }
    } catch (e) {
      console.warn('Backend config fetch failed in BillingManager:', e);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') {
      return toast.error('You are currently on the Free Trial plan.');
    }

    setLoadingPlan(planId);
    try {
      const token = await getAuthToken();
      if (!token) {
        setLoadingPlan(null);
        return toast.error('Please authenticate first.');
      }

      // Check if Razorpay is configured on backend
      const rzpConnected = backendConfig?.razorpayConnected;
      const rzpKeyId = backendConfig?.razorpayKeyId;

      if (!rzpConnected || !rzpKeyId) {
        setLoadingPlan(null);
        return toast.error(
          'Razorpay keys are not configured on your server yet. Please set your "RAZORPAY_KEY_ID" and "RAZORPAY_KEY_SECRET" in your settings, along with plan IDs like "RAZORPAY_PLAN_STARTER_MONTHLY".'
        );
      }

      if (!(window as any).Razorpay) {
        setLoadingPlan(null);
        return toast.error('Razorpay checkout SDK is not fully loaded. Please verify your connection or reload the page.');
      }

      // Create subscription order via backend
      const res = await fetch('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId, billingCycle })
      });

      let data: any;
      try {
        data = await res.json();
      } catch (err) {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create subscription on Razorpay server');
      }

      const orderData = data;

      // Launch Razorpay overlay widget
      const options = {
        key: rzpKeyId,
        subscription_id: orderData.subscriptionId,
        name: 'ReviewReply AI',
        description: `Upgrade to ${planId} (${billingCycle})`,
        image: 'https://img.icons8.com/color/120/crystal-oscillator.png',
        handler: function (response: any) {
          toast.success('Subscription completed successfully! Verifying payment...');
          setTimeout(() => {
            onRefreshProfile();
          }, 3000);
        },
        prefill: {
          email: userProfile?.email || 'manager@mybusiness.com',
        },
        theme: {
          color: '#2563eb'
        }
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.open();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Payment initiation failed.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleSimulateUpgrade = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const token = await getAuthToken();
      if (!token) {
        setLoadingPlan(null);
        return toast.error('Please authenticate first.');
      }

      const res = await fetch('/api/razorpay/simulate-upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Simulated upgrade failed');
      }

      toast.success(`Sandbox mock upgrade to ${planId.toUpperCase()} completed! 🎉`);
      onRefreshProfile();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Simulation failed.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const isFree = userProfile?.plan === 'free' || !userProfile?.plan;

  return (
    <div className="space-y-6">
      
      {/* Upper header controls */}
      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-display font-bold text-base text-slate-800 flex items-center gap-1.5 animate-pulse">
            <Zap className="w-5 h-5 text-blue-500" /> Unlock Premium AI Content
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Choose a plan that fits your business frequency. You can switch plans or cancel subscriptions at any time immediately.
          </p>
        </div>

        {/* Toggle billing cycle */}
        <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              billingCycle === 'monthly' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Monthly Tiers
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              billingCycle === 'annual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Annual Tiers
            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold uppercase shrink-0">
              Save ~30%
            </span>
          </button>
        </div>
      </div>

      {/* Grid of plans */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRICING_PLANS.map((plan) => {
          const isCurrent = userProfile?.plan === plan.id;
          const isAnnual = billingCycle === 'annual';
          const annualPrice = plan.priceINRAnnual;
          const monthlyPrice = plan.priceINR;
          const displayPrice = plan.id === 'free' ? 0 : (isAnnual ? Math.floor(annualPrice / 12) : monthlyPrice);

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                isCurrent 
                  ? 'border-blue-600 ring-2 ring-blue-500/15 relative z-10' 
                  : 'border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 right-6 translate-y-[-50%] bg-blue-600 text-[10px] text-white font-extrabold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 select-none">
                  <Activity className="w-3.5 h-3.5 animate-spin" /> Active subscription
                </div>
              )}

              <div>
                {/* Information */}
                <div>
                  <h3 className="text-base font-bold text-slate-800 font-display">{plan.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed min-h-[36px] mt-1.5">{plan.description}</p>
                </div>

                {/* Price Display */}
                <div className="mt-5 border-b border-slate-50 pb-5">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-extrabold font-display">₹{displayPrice}</span>
                    <span className="text-slate-400 text-xs ml-1.5">/ month</span>
                  </div>
                  {isAnnual && plan.id !== 'free' && (
                    <div className="text-[10px] text-emerald-600 font-bold mt-1.5">
                      Billed ₹{annualPrice} annually
                    </div>
                  )}
                </div>

                {/* Features list */}
                <div className="mt-5 space-y-3 shrink-0 min-h-[160px]">
                  {plan.features.map((feat, fidx) => (
                    <div key={fidx} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                      <Check className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <button
                disabled={isCurrent || loadingPlan !== null}
                onClick={() => handleUpgrade(plan.id)}
                className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                    : 'border border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                {loadingPlan === plan.id ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isCurrent ? (
                  <>
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                    <span>Selected Plan</span>
                  </>
                ) : (
                  <>
                    <span>{plan.id === 'free' ? 'Default Choice' : 'Select Plan'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
              {!isCurrent && plan.id !== 'free' && (
                <button
                  type="button"
                  onClick={() => handleSimulateUpgrade(plan.id)}
                  className="w-full mt-2 py-2 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-50 rounded-lg transition-all cursor-pointer text-center select-none"
                >
                  ⚡ Sandbox Simulated Upgrade (Direct Bypass)
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Security reassurance banner */}
      <div className="bg-slate-50 border border-slate-200 px-6 py-4 rounded-xl flex items-center justify-between text-xs text-slate-500 font-medium select-none">
        <span className="flex items-center gap-1.5 text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-500shrink-0" /> Razorpay 256-bit Secure TLS encryption check
        </span>
        <span className="hidden sm:inline-block">24/7 billing help: support@reviewreply.ai</span>
      </div>

    </div>
  );
}
