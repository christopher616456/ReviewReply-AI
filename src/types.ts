export type BusinessType = 'restaurant' | 'hotel' | 'salon' | 'clinic' | 'other';
export type PlanType = 'free' | 'starter' | 'pro' | 'agency';
export type ToneType = 'friendly' | 'formal' | 'apologetic' | 'thankful';
export type LanguageType = 'English' | 'Tamil' | 'Hindi' | 'Arabic' | 'Auto-detect';

export interface UserProfile {
  id: string;
  email: string;
  business_name: string;
  business_type: BusinessType;
  plan: PlanType;
  replies_used: number;
  replies_limit: number;
  razorpay_customer_id?: string;
  razorpay_subscription_id?: string;
  custom_api_key?: string;
  created_at?: string;
}

export interface ReviewHistoryItem {
  id: string;
  user_id: string;
  review_text: string;
  reply_text: string;
  tone: ToneType;
  language: LanguageType;
  created_at: string;
  feedback?: 'up' | 'down' | null;
}

export interface PricingPlan {
  id: PlanType;
  name: string;
  priceINR: number;
  priceINRBeta: number;
  priceINRAnnual: number;
  repliesLimit: number | 'Unlimited';
  description: string;
  features: string[];
  popular?: boolean;
}

export const IS_BETA = true;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free Trial',
    priceINR: 0,
    priceINRBeta: 0,
    priceINRAnnual: 0,
    repliesLimit: 5,
    description: 'Perfect for exploring AI reply generation.',
    features: [
      '5 free replies per month',
      'AI tone and language control',
      'Instant copy to clipboard',
      'History archive (last 5 items)'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    priceINR: 149,
    priceINRBeta: 99,
    priceINRAnnual: 990,
    repliesLimit: 100,
    description: 'Great for single shops and growing businesses.',
    features: [
      '100 premium replies per month',
      'Full brand tone memory',
      'Multi-language capabilities',
      'Unlimited history storage',
      'Email support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Marketer',
    priceINR: 399,
    priceINRBeta: 249,
    priceINRAnnual: 2490,
    repliesLimit: 999999, // Infinite / Unlimited representations
    description: 'Supercharge response frequency.',
    features: [
      'Unlimited replies',
      'Priority AI speed',
      'Advance apology frameworks',
      'Full history & reports',
      'Priority chat support'
    ],
    popular: true
  },
  {
    id: 'agency',
    name: 'Agency Scale',
    priceINR: 999,
    priceINRBeta: 699,
    priceINRAnnual: 6990,
    repliesLimit: 999999,
    description: 'For managing multiple business locations.',
    features: [
      'Unlimited replies',
      'Manage up to 50 brands',
      'Bulk CSV upload',
      'Custom branding',
      'Dedicated account manager'
    ]
  }
];
