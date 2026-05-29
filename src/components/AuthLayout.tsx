import React, { useState } from 'react';
import { auth, googleProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from '../firebase';
import type { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { Sparkles, Mail, Lock, Store, ArrowRight, Chrome, ChevronLeft } from 'lucide-react';

interface AuthLayoutProps {
  initialMode: 'login' | 'signup';
  onAuthSuccess: (user: User, profile: UserProfile) => void;
  onNavigate: (view: string) => void;
  onAlert: (msg: string, type: 'success' | 'error') => void;
}

export default function AuthLayout({ initialMode, onAuthSuccess, onNavigate, onAlert }: AuthLayoutProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('restaurant');
  const [loading, setLoading] = useState(false);

  // After auth, register business details with backend
  const registerProfile = async (user: User, bName: string, bType: string): Promise<UserProfile> => {
    const token = await user.getIdToken();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ businessName: bName, businessType: bType })
    });
    if (!res.ok) {
      const errRes = await res.json().catch(() => ({}));
      throw new Error(errRes.error || 'Failed to register profile on central server');
    }
    const data = await res.json();
    return {
      id: user.uid,
      email: user.email || '',
      business_name: data.profile.business_name,
      business_type: data.profile.business_type,
      plan: data.profile.plan,
      replies_used: data.profile.replies_used,
      replies_limit: data.profile.replies_limit,
    };
  };

  // Fetch existing profile for login
  const fetchProfile = async (user: User): Promise<UserProfile> => {
    const token = await user.getIdToken();
    const res = await fetch('/api/usage', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      // If fetching fails because database profile doesn't exist, register auto profile instead
      return await registerProfile(user, 'My Business', 'restaurant');
    }
    const data = await res.json();
    return {
      id: data.id,
      email: data.email,
      business_name: data.business_name,
      business_type: data.business_type,
      plan: data.plan,
      replies_used: data.replies_used,
      replies_limit: data.replies_limit,
    };
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return onAlert('Email and password are required.', 'error');
    if (password.length < 6) return onAlert('Password must be at least 6 characters.', 'error');

    setLoading(true);
    try {
      let user: User;

      if (mode === 'signup') {
        if (!businessName.trim()) {
          setLoading(false);
          return onAlert('Business name is required.', 'error');
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        user = cred.user;
        const profile = await registerProfile(user, businessName, businessType);
        onAlert('Account created successfully! Welcome 🎉', 'success');
        onAuthSuccess(user, profile);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
        const profile = await fetchProfile(user);
        onAlert('Logged in successfully!', 'success');
        onAuthSuccess(user, profile);
      }
    } catch (err: any) {
      console.error('Email authentication exception:', err);
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'Email already registered. Please log in.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
        'auth/invalid-credential': 'Invalid email or password.',
      };
      onAlert(messages[err.code] || err.message || 'Authentication failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if new user (no profile yet) or existing
      const token = await user.getIdToken();
      const res = await fetch('/api/usage', { headers: { 'Authorization': `Bearer ${token}` } });

      let profile: UserProfile;
      if (res.ok) {
        const data = await res.json();
        profile = {
          id: data.id,
          email: data.email,
          business_name: data.business_name,
          business_type: data.business_type,
          plan: data.plan,
          replies_used: data.replies_used,
          replies_limit: data.replies_limit,
        };
      } else {
        // New Google user — create profile
        profile = await registerProfile(user, user.displayName || 'My Business', 'restaurant');
      }

      onAlert('Signed in with Google!', 'success');
      onAuthSuccess(user, profile);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        onAlert(err.message || 'Google sign-in failed.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Back to Home Action */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to website
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-200">
            RR
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 font-display">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {mode === 'signup'
            ? 'Start responding to customer reviews in seconds'
            : 'Sign in to access your AI reply dashboard'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-100 shadow-xl shadow-slate-100 sm:rounded-2xl sm:px-10">
          
          {/* Email/Password Form */}
          <form className="space-y-5" onSubmit={handleEmailAuth}>
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-slate-400" /> Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. The Gourmet Spoon"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-slate-50/50"
                  required={mode === 'signup'}
                />
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Business Category
                </label>
                <select
                  value={businessType}
                  onChange={e => setBusinessType(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-white cursor-pointer"
                >
                  <option value="restaurant">Restaurant / Cafe</option>
                  <option value="hotel">Hotel / Resort</option>
                  <option value="salon">Salon / Spa</option>
                  <option value="clinic">Clinic / Medical care</option>
                  <option value="other">Other Business Services</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="manager@mybusiness.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-slate-50/50"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Password
                </label>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-slate-50/50"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-medium hover:bg-blue-700 py-3.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 flex items-center justify-center gap-1.5 shadow-md shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {mode === 'signup' ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Separator */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-500 uppercase font-semibold tracking-wider text-[10px]">
                  or connect via
                </span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <div className="mt-5">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full border border-slate-200 bg-white hover:bg-slate-50 font-medium text-slate-700 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <Chrome className="w-4 h-4 text-red-500" />
                Sign in with Google
              </button>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-slate-500 font-medium">
            {mode === 'signup' ? 'Already have an account? ' : "Don't have a login yet? "}
            <button
              onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
            >
              {mode === 'signup' ? 'Sign In' : 'Create Account'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
