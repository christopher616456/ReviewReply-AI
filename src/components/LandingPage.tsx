import React, { useState } from 'react';
import { PRICING_PLANS, IS_BETA } from '../types';
import { Sparkles, Check, ArrowRight, Star, MessageSquareCode, ShieldCheck, Languages, Zap, Smartphone, ArrowDown } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const demoReviews = [
    {
      author: 'Aarav Mehta',
      rating: 5,
      platform: 'Google',
      text: 'The food was absolutely divine, especially the paneer tikka! Service was a bit slow but the staff was extremely polite. Will definitely visit again.',
      reply: 'Hi Aarav! Thank you so much for the 5-star review! We are absolutely thrilled to hear you loved our paneer tikka. We appreciate your feedback regarding the service pacing; our culinary team is hot on adjusting to keep things speedy. We cannot wait to welcome you back again soon! Warm regards, The Curry House Team.'
    },
    {
      author: 'Sarah Jenkins',
      rating: 2,
      platform: 'TripAdvisor',
      text: 'Extremely noisy restaurant and they got our order wrong twice. Took forever to get the bill. Disappointed.',
      reply: 'Hello Sarah, We are deeply sorry that your visit did not meet expectations and for the mix-up with your orders. Providing an accurate and relaxing meal is our top priority, and we clearly fell short during your visit. We would love the opportunity to make this right. Please reach out to us at contact@curryhouse.com. Sincerely, The Curry House Management.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-blue-200">
              RR
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-slate-800">ReviewReply AI</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate('login')}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate('signup')}
              className="bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all px-4 py-2 rounded-xl shadow-sm shadow-blue-100"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Supercharged by Gemini 3.5 Flash AI</span>
        </div>
        <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.1]">
          Never Ignore a Customer Review Again
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Instantly generate warm, personal, professional human-sounding replies to all Google, Zomato, and TripAdvisor reviews. Save of hours of manual work.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('signup')}
            className="w-full sm:w-auto bg-blue-600 text-white font-medium hover:bg-blue-700 px-8 py-3.5 rounded-xl text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95 duration-100"
          >
            Start Replying Free
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#demo"
            className="w-full sm:w-auto border border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-50 px-8 py-3.5 rounded-xl text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            See Live Demo
          </a>
        </div>

        {/* Floating review count micro detail */}
        <div className="mt-12 text-slate-500 text-xs flex items-center justify-center gap-6">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Done in 3 seconds</span>
          <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> 5.0 Star Ratings on average</span>
          <span className="flex items-center gap-1.5"><Languages className="w-4 h-4 text-blue-500" /> Supports multiple languages</span>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-16 bg-white border-y border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Transform Angry Grubs & Happy Praise in Seconds
            </h2>
            <p className="mt-3 text-slate-600">
              Watch ReviewReply AI analyze customer reviews to generate appropriate tone-controlled, context-guided replies immediately.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {demoReviews.map((item, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-sm text-slate-700">
                        {item.author[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-800">{item.author}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          Posted on <span className="font-medium text-slate-600">{item.platform}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < item.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-100 italic rounded-xl p-4 text-slate-700 text-sm leading-relaxed mb-6">
                    "{item.text}"
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" /> AI Draft suggestion
                  </div>
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-slate-800 text-sm leading-relaxed font-sans">
                    {item.reply}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits section */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Why Successful Managers Choose Us
          </h2>
          <p className="mt-3 text-slate-600">
            Keep your customer satisfaction metrics flying high, respond within minutes, and optimize localized SEO searches easily.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:translate-y-[-4px] transition-transform duration-200">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-display font-semibold text-lg text-slate-900">Real-time Tone Adjustments</h3>
            <p className="mt-2 text-slate-500 text-sm leading-relaxed">
              Choose from Friendly, Formal, Thankful, or Apologetic tones depending on customer feedback sentiment.
            </p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:translate-y-[-4px] transition-transform duration-200">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
              <Languages className="w-6 h-6" />
            </div>
            <h3 className="font-display font-semibold text-lg text-slate-900">Multi-language Magic</h3>
            <p className="mt-2 text-slate-500 text-sm leading-relaxed">
              De-escalate negative remarks or say thank you in English, Tamil, Hindi, Arabic, or auto-detect native review tongue.
            </p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:translate-y-[-4px] transition-transform duration-200">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-6">
              <MessageSquareCode className="w-6 h-6" />
            </div>
            <h3 className="font-display font-semibold text-lg text-slate-900">SEO Keyword Boosting</h3>
            <p className="mt-2 text-slate-500 text-sm leading-relaxed">
              Naturally injects your brand or menu offerings into responses, raising search rankings on portals effortlessly.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-slate-900 text-white py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
              Fair, Transparent Pricing
            </h2>
            <p className="mt-4 text-slate-400 text-base sm:text-lg">
              Generate precise responses without breaking the bank. Get started today.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 inline-flex items-center gap-1.5 bg-slate-800 p-1 rounded-full border border-slate-700">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${
                  billingCycle === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Plan
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors flex items-center gap-1 ${
                  billingCycle === 'annual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Annual Save ~30%
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {PRICING_PLANS.map((plan) => {
              const annualPrice = plan.priceINRAnnual;
              const monthlyPrice = plan.priceINR;
              const isFree = plan.id === 'free';
              const isAnnual = billingCycle === 'annual';
              const priceToDisplay = isFree ? 0 : (isAnnual ? Math.floor(annualPrice / 12) : monthlyPrice);

              return (
                <div
                  key={plan.id}
                  className={`bg-slate-800/80 rounded-2xl p-6 border ${
                    plan.popular ? 'border-blue-500 relative ring-2 ring-blue-500/20' : 'border-slate-700'
                  } flex flex-col justify-between`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-6 translate-y-[-50%] bg-blue-600 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                    <p className="mt-2 text-slate-400 text-xs leading-relaxed min-h-[32px]">
                      {plan.description}
                    </p>

                    <div className="mt-6 flex items-baseline">
                      <span className="text-3xl font-extrabold font-display">₹{priceToDisplay}</span>
                      <span className="text-slate-400 text-sm ml-1.5">/ month</span>
                    </div>
                    {isAnnual && !isFree && (
                      <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                        Billed ₹{annualPrice} annually
                      </div>
                    )}

                    <div className="mt-6 space-y-3 min-h-[160px]">
                      {plan.features.map((feat, fidx) => (
                        <div key={fidx} className="flex items-start text-xs text-slate-300">
                          <Check className="w-4 h-4 text-blue-400 shrink-0 mr-2 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('signup')}
                    className={`mt-8 w-full py-3 px-4 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/10'
                        : 'border border-slate-700 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    Select Plan
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-900 text-slate-500 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm">
              RR
            </div>
            <span className="font-display font-semibold text-slate-300 text-base">ReviewReply AI</span>
          </div>
          <div className="text-xs">
            © 2026 ReviewReply AI. Fully configured production build container. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
