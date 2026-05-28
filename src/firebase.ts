/// <reference types="vite/client" />

// Firebase Client SDK initialization
// Features automatic graceful local storage fallback if API keys are unconfigured
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged as fbOnAuthStateChanged,
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signInWithPopup as fbSignInWithPopup,
} from 'firebase/auth';

import firebaseConfigRaw from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigRaw.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: firebaseConfigRaw.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfigRaw.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: firebaseConfigRaw.appId || import.meta.env.VITE_FIREBASE_APP_ID,
};

const isKeyValid = (key: string | undefined): boolean => {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed === '' || trimmed === 'AIza...') return false;
  if (trimmed.startsWith('YOUR_')) return false;
  if (trimmed.length < 15) return false;
  return true;
};

export const hasFirebaseConfig = isKeyValid(firebaseConfig.apiKey);

let appInstance: any = null;
let authInstance: any = null;
const realGoogleProvider = new GoogleAuthProvider();

if (hasFirebaseConfig) {
  try {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(appInstance);
  } catch (err) {
    console.error('Failed to initialize real Firebase client SDK:', err);
    appInstance = null;
    authInstance = null;
  }
}

// ─── State & Storage definitions for local Mock auth ───────────────────────
const STORAGE_KEY = 'rr_mock_user';
const SESSION_MOCK_FORCE_KEY = 'rr_force_mock_auth';
if (hasFirebaseConfig && localStorage.getItem('rr_firebase_setup_cleared') !== 'true') {
  localStorage.removeItem(SESSION_MOCK_FORCE_KEY);
  localStorage.setItem('rr_firebase_setup_cleared', 'true');
}
let forceMockMode = localStorage.getItem(SESSION_MOCK_FORCE_KEY) === 'true';

const isFirebaseActive = (): boolean => {
  return hasFirebaseConfig && !forceMockMode && !!authInstance;
};

const listeners = new Set<(user: any) => void>();

function notifyListeners() {
  const user = mockAuth.currentUser;
  listeners.forEach((callback) => {
    try {
      callback(user);
    } catch (e) {
      console.error('Mock auth listener error:', e);
    }
  });
}

function activateMockFallback() {
  if (!forceMockMode) {
    console.warn('Real Firebase configuration is throwing credential/API errors. Activating elegant sandbox mock auth fallback.');
    localStorage.setItem(SESSION_MOCK_FORCE_KEY, 'true');
    forceMockMode = true;
    notifyListeners();
  }
}

function createMockUserObject(uid: string, email: string) {
  return {
    uid,
    email,
    displayName: email.split('@')[0],
    emailVerified: true,
    isAnonymous: false,
    phoneNumber: null,
    photoURL: null,
    providerId: 'firebase',
    metadata: {},
    providerData: [],
    tenantId: null,
    refreshToken: 'mock_token',
    delete: async () => {},
    getIdToken: async (forceRefresh?: boolean) => `mock:${email}:${uid}`,
    getIdTokenResult: async (forceRefresh?: boolean) => ({ token: `mock:${email}:${uid}`, claims: {} }),
    reload: async () => {},
    toJSON: () => ({ uid, email }),
  };
}

function getStoredUser() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    return createMockUserObject(parsed.uid, parsed.email);
  } catch (e) {
    return null;
  }
}

const mockAuth = {
  get currentUser() {
    return getStoredUser();
  },
  signOut: async () => {
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners();
  }
};

// ─── Expose standard Firebase interfaces with simulation injection ──────────
export const auth: any = {
  get currentUser() {
    return isFirebaseActive() ? authInstance.currentUser : mockAuth.currentUser;
  },
  signOut: async () => {
    if (isFirebaseActive()) {
      try {
        await authInstance.signOut();
      } catch (err: any) {
        console.warn('Real Firebase signOut failed, activating fallback:', err);
        activateMockFallback();
        await mockAuth.signOut();
      }
    } else {
      await mockAuth.signOut();
    }
  }
};

export const googleProvider: any = hasFirebaseConfig ? realGoogleProvider : { _isMock: true };

export const onAuthStateChanged = (
  _auth: any,
  callback: (user: any) => void
): any => {
  if (isFirebaseActive()) {
    try {
       const unsub = fbOnAuthStateChanged(authInstance, (user) => {
         if (!forceMockMode) {
           callback(user);
         }
       });
       return () => {
         unsub();
       };
    } catch (err) {
       console.error('Real fbOnAuthStateChanged failed, falling back:', err);
       activateMockFallback();
    }
  }
  
  // Local Mock auth monitoring
  listeners.add(callback);
  setTimeout(() => {
    callback(mockAuth.currentUser);
  }, 0);
  return () => {
    listeners.delete(callback);
  };
};

export const signInWithEmailAndPassword = async (
  _auth: any,
  email: string,
  pass: string
): Promise<any> => {
  if (isFirebaseActive()) {
    try {
      return await fbSignInWithEmailAndPassword(authInstance, email, pass) as any;
    } catch (err: any) {
      if (
        err.code === 'auth/api-key-not-valid' ||
        err.code === 'auth/invalid-api-key' ||
        err.message?.includes('api-key-not-valid') ||
        err.message?.includes('invalid-api-key') ||
        err.message?.includes('API key')
      ) {
        activateMockFallback();
        return signInWithEmailAndPassword(_auth, email, pass);
      }
      throw err;
    }
  } else {
    const uid = 'mock_user_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    const mockUserData = { uid, email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUserData));
    notifyListeners();
    return { user: mockAuth.currentUser };
  }
};

export const createUserWithEmailAndPassword = async (
  _auth: any,
  email: string,
  pass: string
): Promise<any> => {
  if (isFirebaseActive()) {
    try {
      return await fbCreateUserWithEmailAndPassword(authInstance, email, pass) as any;
    } catch (err: any) {
      if (
        err.code === 'auth/api-key-not-valid' ||
        err.code === 'auth/invalid-api-key' ||
        err.message?.includes('api-key-not-valid') ||
        err.message?.includes('invalid-api-key') ||
        err.message?.includes('API key')
      ) {
        activateMockFallback();
        return createUserWithEmailAndPassword(_auth, email, pass);
      }
      throw err;
    }
  } else {
    const uid = 'mock_user_' + btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    const mockUserData = { uid, email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUserData));
    notifyListeners();
    return { user: mockAuth.currentUser };
  }
};

export const signInWithPopup = async (
  _auth: any,
  _provider: any
): Promise<any> => {
  if (isFirebaseActive()) {
    try {
      return await fbSignInWithPopup(authInstance, _provider) as any;
    } catch (err: any) {
      if (
        err.code === 'auth/api-key-not-valid' ||
        err.code === 'auth/invalid-api-key' ||
        err.message?.includes('api-key-not-valid') ||
        err.message?.includes('invalid-api-key') ||
        err.message?.includes('API key')
      ) {
        activateMockFallback();
        return signInWithPopup(_auth, _provider);
      }
      throw err;
    }
  } else {
    const email = 'merchant@preview.com';
    const uid = 'mock_google_id';
    const mockUserData = { uid, email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUserData));
    notifyListeners();
    return { user: mockAuth.currentUser };
  }
};

export default appInstance;
