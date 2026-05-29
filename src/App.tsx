import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { auth, onAuthStateChanged } from './firebase';
import type { User } from 'firebase/auth';

import LandingPage from './components/LandingPage';
import AuthLayout from './components/AuthLayout';
import Sidebar from './components/Sidebar';
import DashboardHeader from './components/DashboardHeader';
import ReplyTool from './components/ReplyTool';
import HistoryList from './components/HistoryList';
import BillingManager from './components/BillingManager';
import SettingsPanel from './components/SettingsPanel';
import { UserProfile } from './types';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [configOnServer, setConfigOnServer] = useState<any>(null);
  const [appLoading, setAppLoading] = useState<boolean>(true);

  // Getter token helper for child component APIs
  const getAuthToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken(true);
    } catch (e) {
      console.error('Failed to fetch Firebase fresh ID Token:', e);
      return null;
    }
  };

  // Fetch API service metadata
  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        setConfigOnServer(await res.json());
      }
    } catch (e) {
      console.warn('Backend config offline or missing:', e);
    }
  };

  // Retrieve user business status
  const fetchUserProfile = async (user: User) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/usage', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile({
          id: data.id,
          email: data.email,
          business_name: data.business_name,
          business_type: data.business_type,
          plan: data.plan,
          replies_used: data.replies_used,
          replies_limit: data.replies_limit,
          custom_api_key: data.custom_api_key,
        });
      } else {
        console.warn('Could not retrieve database user status.');
      }
    } catch (e) {
      console.error('Profile query failed:', e);
    }
  };

  // Establish state triggers
  useEffect(() => {
    fetchConfig();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchUserProfile(user);
        const hash = window.location.hash.replace('#', '');
        setCurrentView(
          ['dashboard', 'history', 'billing', 'settings'].includes(hash) 
            ? hash 
            : 'dashboard'
        );
      } else {
        setUserProfile(null);
        const hash = window.location.hash.replace('#', '');
        setCurrentView(
          ['landing', 'login', 'signup'].includes(hash) 
            ? hash 
            : 'landing'
        );
      }
      setAppLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Monitor location hashes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      const validViews = firebaseUser
        ? ['dashboard', 'history', 'billing', 'settings']
        : ['landing', 'login', 'signup'];
      if (validViews.includes(hash)) {
        setCurrentView(hash);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [firebaseUser]);

  const handleNavigate = (view: string) => {
    window.location.hash = view;
    setCurrentView(view);
  };

  const handleAuthSuccess = (user: User, profile: UserProfile) => {
    setFirebaseUser(user);
    setUserProfile(profile);
    handleNavigate('dashboard');
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setFirebaseUser(null);
      setUserProfile(null);
      toast.success('Logged out successfully.');
      handleNavigate('landing');
    } catch (e) {
      toast.error('Logout request failed.');
    }
  };

  const handleAlert = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      toast.success(msg);
    } else {
      toast.error(msg);
    }
  };

  const refreshProfileData = async () => {
    if (auth.currentUser) {
      await fetchUserProfile(auth.currentUser);
    }
  };

  if (appLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold tracking-widest uppercase text-slate-400 flex items-center gap-1.5 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Initializing ReviewReply AI...
        </div>
      </div>
    );
  }

  // Serving public visitors
  if (!firebaseUser || ['landing', 'login', 'signup'].includes(currentView)) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col select-none">
        <Toaster position="top-right" reverseOrder={false} />
        {currentView === 'landing' && (
          <LandingPage onNavigate={handleNavigate} />
        )}
        {(currentView === 'login' || currentView === 'signup') && (
          <AuthLayout
            initialMode={currentView as 'login' | 'signup'}
            onAuthSuccess={handleAuthSuccess}
            onNavigate={handleNavigate}
            onAlert={handleAlert}
          />
        )}
      </main>
    );
  }

  // Serving signed-in business operators
  const isEmbed = window.location.search.includes('embed=true') || window.location.hash.includes('embed=true');

  if (isEmbed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-4 overflow-y-auto">
        <Toaster position="top-right" reverseOrder={false} />
        <ReplyTool
          userProfile={userProfile}
          getAuthToken={getAuthToken}
          onRefreshProfile={refreshProfileData}
          onNavigate={handleNavigate}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      <Toaster position="top-right" reverseOrder={false} />
      
      {/* Left Navigation Rails */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        userProfile={userProfile}
        onLogout={handleLogout}
      />

      {/* Main Control Panel Dashboard container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <DashboardHeader
          currentView={currentView}
          userProfile={userProfile}
          onNavigate={handleNavigate}
        />

        <main className="flex-1 p-8">
          {currentView === 'dashboard' && (
            <ReplyTool
              userProfile={userProfile}
              getAuthToken={getAuthToken}
              onRefreshProfile={refreshProfileData}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'history' && (
            <HistoryList getAuthToken={getAuthToken} />
          )}

          {currentView === 'billing' && (
            <BillingManager
              userProfile={userProfile}
              getAuthToken={getAuthToken}
              onRefreshProfile={refreshProfileData}
            />
          )}

          {currentView === 'settings' && (
            <SettingsPanel
              userProfile={userProfile}
              getAuthToken={getAuthToken}
              onRefreshProfile={refreshProfileData}
              onNavigate={handleNavigate}
            />
          )}
        </main>
      </div>

    </div>
  );
}
