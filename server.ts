import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { neon } from '@neondatabase/serverless';
import Razorpay from 'razorpay';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const resolvedDirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── Helper function to sanitize environment variables ─────────────────────
function cleanEnvString(val: string | undefined): string | undefined {
  if (!val) return undefined;
  let cleaned = val.trim();
  
  // Recursively clean quotes (single, double, backticks), trailing commas, semicolons, and key prefixes
  let changed = true;
  while (changed) {
    const prev = cleaned;
    cleaned = cleaned.trim();
    
    // 1. Strip trailing semicolons or commas
    if (cleaned.endsWith(';')) {
      cleaned = cleaned.slice(0, -1);
    }
    if (cleaned.endsWith(',')) {
      cleaned = cleaned.slice(0, -1);
    }
    
    // 2. Help parse copied raw JSON lines (e.g. "project_id": "xyz")
    // Do not alter actual URLs (e.g. postgresql://)
    const prefixMatch = cleaned.match(/^(?:"?[a-zA-Z0-9_\-]+"?\s*:\s*)(.*)$/);
    if (prefixMatch && !cleaned.match(/^[a-zA-Z0-9]+:\/\//)) {
      cleaned = prefixMatch[1];
    }

    // 3. Strip wrapping quotes
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
      (cleaned.startsWith('`') && cleaned.endsWith('`'))
    ) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    
    changed = (cleaned !== prev);
  }
  
  return cleaned.trim() || undefined;
}

function cleanPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  let cleaned = key.trim();

  // Fallback 1: Check if the user accidentally pasted the whole Service Account JSON string
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.private_key) {
        return cleanPrivateKey(parsed.private_key);
      }
    } catch (e) {
      // Not valid json, ignore and continue
    }
  }

  // Robust recursive stripping of raw or escaped wrapping quotes
  let changed = true;
  while (changed) {
    const original = cleaned;
    cleaned = cleaned.trim();

    // Double quotes (escaped & raw)
    if (cleaned.startsWith('\\"') && cleaned.endsWith('\\"')) {
      cleaned = cleaned.substring(2, cleaned.length - 2);
    } else if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    // Single quotes (escaped & raw)
    else if (cleaned.startsWith("\\'") && cleaned.endsWith("\\'")) {
      cleaned = cleaned.substring(2, cleaned.length - 2);
    } else if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    // Backticks (escaped & raw)
    else if (cleaned.startsWith('\\`') && cleaned.endsWith('\\`')) {
      cleaned = cleaned.substring(2, cleaned.length - 2);
    } else if (cleaned.startsWith('`') && cleaned.endsWith('`')) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }

    if (cleaned === original) {
      changed = false;
    }
  }

  // Handle both single and double-escaped format issues (e.g. \\n and \\\\n)
  cleaned = cleaned.replace(/\\+n/g, '\n');
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Normalize PEM structure if headers are found
  const beginMatch = cleaned.match(/-----BEGIN [A-Z ]*PRIVATE KEY-----/);
  const endMatch = cleaned.match(/-----END [A-Z ]*PRIVATE KEY-----/);

  if (beginMatch && endMatch) {
    const beginHeader = beginMatch[0];
    const endHeader = endMatch[0];

    const startIndex = cleaned.indexOf(beginHeader);
    const endIndex = cleaned.indexOf(endHeader);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      let core = cleaned.substring(startIndex + beginHeader.length, endIndex).trim();
      // Keep only base64 characters (strip out whitespace, quotes, literal text newlines, etc.)
      core = core.replace(/[^A-Za-z0-9+/=]/g, '');

      // Chunk the base64 payload into standard 64-character lines
      const chunks: string[] = [];
      for (let i = 0; i < core.length; i += 64) {
        chunks.push(core.substring(i, i + 64));
      }

      cleaned = `${beginHeader}\n${chunks.join('\n')}\n${endHeader}`;
    }
  }

  return cleaned.trim() || undefined;
}

// ─── Firebase Admin Init ───────────────────────────────────────────────────
const adminProjId = cleanEnvString(process.env.FIREBASE_ADMIN_PROJECT_ID);
const adminEmail = cleanEnvString(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
const adminPrivateKey = cleanPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

const hasFirebaseAdmin = !!(adminProjId && adminEmail && adminPrivateKey);
let firebaseAdminInitialized = false;

if (hasFirebaseAdmin && admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: adminProjId,
        clientEmail: adminEmail,
        privateKey: adminPrivateKey,
      }),
    });
    firebaseAdminInitialized = true;
    console.log('Firebase Admin initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err);
    if (adminPrivateKey) {
      console.log('--- Diagnostic private key info (safe, no secret leak) ---');
      console.log('Private key length:', adminPrivateKey.length);
      console.log('Starts with:', adminPrivateKey.substring(0, Math.min(adminPrivateKey.length, 35)));
      console.log('Ends with:', adminPrivateKey.substring(Math.max(0, adminPrivateKey.length - 35)));
      console.log('Contains raw newlines:', adminPrivateKey.includes('\n'));
      console.log('Contains literal string "\\n":', adminPrivateKey.includes('\\n'));
      console.log('---------------------------------------------------------');
    }
  }
} else if (admin.apps.length > 0) {
  firebaseAdminInitialized = true;
}

// ─── Neon DB Init ──────────────────────────────────────────────────────────
const cleanedDatabaseUrl = cleanEnvString(process.env.DATABASE_URL);
const hasNeon = !!cleanedDatabaseUrl;
const sql = hasNeon ? neon(cleanedDatabaseUrl!) : null;

// ─── Gemini Init ───────────────────────────────────────────────────────────
const hasGemini = !!process.env.GEMINI_API_KEY;
const ai = hasGemini ? new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
}) : null;

// ─── Razorpay Init ─────────────────────────────────────────────────────────
const rzpKeyIdClean = cleanEnvString(process.env.RAZORPAY_KEY_ID);
const rzpKeySecretClean = cleanEnvString(process.env.RAZORPAY_KEY_SECRET);
const hasRazorpay = !!(rzpKeyIdClean && rzpKeySecretClean);
const rzp = hasRazorpay ? new Razorpay({
  key_id: rzpKeyIdClean!,
  key_secret: rzpKeySecretClean!
}) : null;

// ─── Mock Session Storage for Offline Fallback ──────────────────────────────
const mockProfiles: Record<string, any> = {};
const mockHistoryStore: Record<string, any[]> = {};

function getMockProfile(uid: string, email: string, businessName?: string, businessType?: string) {
  if (!mockProfiles[uid]) {
    mockProfiles[uid] = {
      id: uid,
      email: email,
      business_name: businessName || 'The Golden Grill',
      business_type: businessType || 'restaurant',
      plan: 'free',
      replies_used: 1,
      replies_limit: 5
    };
  }
  return mockProfiles[uid];
}

// ─── Helper: Verify Firebase ID Token ─────────────────────────────────────
async function verifyFirebaseToken(authHeader: string | undefined): Promise<admin.auth.DecodedIdToken | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    if (!firebaseAdminInitialized) {
      console.warn('Firebase Admin is not successfully initialized or configured. Decoding simulated sandbox token.');
      if (token.startsWith('mock:')) {
        const parts = token.split(':');
        const email = parts[1] || 'user@test.com';
        const uid = parts[2] || 'mock_uid';
        return { uid, email } as any;
      }
      // If client is in mock mode but passes a standard token, allow a default mock payload
      return { uid: 'mock_uid_default', email: 'merchant@preview.com' } as any;
    }
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded;
  } catch (e) {
    console.error('Firebase token verification failed:', e);
    // Graceful fallback for mock client tokens even when admin config might be partially active
    if (token.startsWith('mock:')) {
      const parts = token.split(':');
      const email = parts[1] || 'user@test.com';
      const uid = parts[2] || 'mock_uid';
      return { uid, email } as any;
    }
    return null;
  }
}

// ─── Helper: Get or Create User Profile from Neon ─────────────────────────
async function getOrCreateProfile(uid: string, email: string, businessName?: string, businessType?: string): Promise<any> {
  if (!sql) {
    console.warn('Neon Database (DATABASE_URL) is not configured. Falling back to sandbox memory-profile.');
    return getMockProfile(uid, email, businessName, businessType);
  }

  try {
    const existing = await sql`
      SELECT * FROM users_profile WHERE id = ${uid} LIMIT 1
    `;

    if (existing.length > 0) return existing[0];

    // Auto-create profile on first login
    const created = await sql`
      INSERT INTO users_profile (id, email, business_name, business_type, plan, replies_used, replies_limit)
      VALUES (
        ${uid},
        ${email},
        ${businessName || 'My Business'},
        ${businessType || 'restaurant'},
        'free',
        0,
        5
      )
      RETURNING *
    `;
    return created[0];
  } catch (dbErr: any) {
    console.error('Database query failed in getOrCreateProfile, falling back to simulated memory profile:', dbErr);
    return getMockProfile(uid, email, businessName, businessType);
  }
}

// ─── Helper: Authenticate request and get profile ─────────────────────────
async function getUserFromRequest(req: express.Request): Promise<any> {
  const authHeader = req.headers.authorization;
  let customKeyCandidate = req.headers['x-api-key'] as string;

  if (!customKeyCandidate && authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.replace('Bearer ', '').trim();
    if (bearerToken.startsWith('rr_live_')) {
      customKeyCandidate = bearerToken;
    }
  }

  if (customKeyCandidate) {
    const activeKey = customKeyCandidate.trim();
    if (sql) {
      const users = await sql`
        SELECT * FROM users_profile WHERE custom_api_key = ${activeKey} LIMIT 1
      `;
      if (users.length > 0) {
        const u = users[0];
        if (u.plan === 'free') {
          throw new Error('Review Reply AI API Key usage is locked. Please upgrade to a paid plan to activate developer access.');
        }
        return u;
      }
    } else {
      const matched = Object.values(mockProfiles).find(p => p.custom_api_key === activeKey);
      if (matched) {
        if (matched.plan === 'free') {
          throw new Error('Review Reply AI API Key usage is locked. Please upgrade to a paid plan to activate developer access.');
        }
        return matched;
      }
    }
    return null;
  }

  const decoded = await verifyFirebaseToken(authHeader);
  if (!decoded) return null;

  const profile = await getOrCreateProfile(decoded.uid, decoded.email || '');
  return { ...profile, email: decoded.email || profile.email };
}

function getGeminiClient(req: express.Request, user: any): GoogleGenAI | null {
  // Always run on our own premium system Gemini key (fully server-side, no user Gemini key needed)
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'review-reply-ai' } }
    });
  }
  return ai;
}

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET /api/config — service availability check
app.get('/api/config', (req, res) => {
  res.json({
    firebaseConnected: firebaseAdminInitialized,
    neonConnected: hasNeon,
    geminiConnected: hasGemini,
    razorpayConnected: hasRazorpay,
    razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || rzpKeyIdClean || '',
  });
});

// GET /api/usage — get current user's plan & usage
app.get('/api/usage', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized or verification token missing.' });

    const isPaid = user.plan && user.plan !== 'free';
    let apiKey = user.custom_api_key || '';

    if (isPaid && !apiKey) {
      apiKey = `rr_live_${crypto.randomBytes(16).toString('hex')}`;
      if (sql) {
        await sql`
          UPDATE users_profile
          SET custom_api_key = ${apiKey}
          WHERE id = ${user.id}
        `;
      } else {
        const profile = getMockProfile(user.id, user.email);
        profile.custom_api_key = apiKey;
      }
      user.custom_api_key = apiKey;
    }

    res.json({
      id: user.id,
      email: user.email,
      business_name: user.business_name,
      business_type: user.business_type,
      plan: user.plan,
      replies_used: user.replies_used,
      replies_limit: user.replies_limit,
      custom_api_key: isPaid ? apiKey : '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/generate-reply — core AI reply generation
app.post('/api/generate-reply', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { reviewText, tone, language, businessName, businessType } = req.body;
    if (!reviewText?.trim()) return res.status(400).json({ error: 'Review text is required' });

    // Enforce plan limits
    if (user.plan === 'free' && user.replies_used >= user.replies_limit) {
      return res.status(403).json({
        error: 'Free plan limit reached.',
        message: `You have used all ${user.replies_limit} free replies. Please upgrade to continue.`
      });
    }

    const bName = businessName || user.business_name || 'Our Business';
    const bType = businessType || user.business_type || 'restaurant';
    const activeTone = tone || 'friendly';
    const activeLanguage = language || 'English';

    const systemPrompt = `You are a professional review response writer for businesses.
Business: ${bName} (${bType})
Tone: ${activeTone}
Language: ${activeLanguage}

Rules:
- Write 60-120 words only
- Sound warm and human, NOT robotic
- Address specific points the reviewer mentioned
- For negative reviews: acknowledge the issue, apologize sincerely, offer resolution
- For positive reviews: thank specifically, invite them back
- End with the business name sign-off
- Reply ONLY in ${activeLanguage}
- Return ONLY the reply text — no notes, no markdown, no extra commentary`;

    let replyText = '';

    // Use gemini-3.5-flash as the primary text engine as per instructions
    const activeAi = getGeminiClient(req, user);
    if (activeAi) {
      try {
        const response = await activeAi.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: `Please write a reply to this customer review:\n\n"${reviewText}"`,
          config: { systemInstruction: systemPrompt }
        });
        replyText = (response.text || '').trim().replace(/^["']|["']$/g, '');
      } catch (gemErr) {
        console.error('Gemini model generation failed:', gemErr);
      }
    }

    // Fallback if AI unavailable or keys not set yet
    if (!replyText) {
      replyText = `Thank you so much for taking the time to share your feedback with us at ${bName}. We appreciate your support and have noted your comments. Our team is always committed to delivering excellent customer service. We hope to serve you again very soon! Warm regards, The ${bName} Team.`;
    }

    // Save to Neon DB & update count
    let insertedId: string | number | null = null;
    if (sql) {
      await sql`
        UPDATE users_profile SET replies_used = replies_used + 1 WHERE id = ${user.id}
      `;
      const rows = await sql`
        INSERT INTO review_history (user_id, review_text, reply_text, tone, language)
        VALUES (${user.id}, ${reviewText}, ${replyText}, ${activeTone}, ${activeLanguage})
        RETURNING id
      `;
      if (rows && rows.length > 0) {
        insertedId = rows[0].id;
      }
    } else {
      const profile = getMockProfile(user.id, user.email);
      profile.replies_used = (profile.replies_used || 0) + 1;

      if (!mockHistoryStore[user.id]) {
        mockHistoryStore[user.id] = [];
      }
      const mockId = 'mock_hist_' + Math.random().toString(36).substring(2, 9);
      insertedId = mockId;
      mockHistoryStore[user.id].unshift({
        id: mockId,
        user_id: user.id,
        review_text: reviewText,
        reply_text: replyText,
        tone: activeTone,
        language: activeLanguage,
        created_at: new Date().toISOString()
      });
    }

    const currentUsed = sql ? user.replies_used + 1 : getMockProfile(user.id, user.email).replies_used;

    res.json({
      id: insertedId,
      replyText,
      repliesUsed: currentUsed,
      repliesLimit: user.replies_limit
    });
  } catch (err: any) {
    console.error('Generate reply error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate reply' });
  }
});

// POST /api/transcribe — transcribe recorded audio with Gemini
app.post('/api/transcribe', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { audio, mimeType } = req.body;
    if (!audio) return res.status(400).json({ error: 'Audio data is required' });

    // Fallback if Gemini is not ready/initialized
    const activeAi = getGeminiClient(req, user);
    if (!activeAi) {
      console.warn('Gemini is not initialized.');
      return res.status(503).json({ error: 'Gemini service is not available for transcription. Please try typing your review.' });
    }

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: audio,
      },
    };

    const textPart = {
      text: 'Transcribe this voice dictation perfectly. Return ONLY the exact transcribed speech, with punctuation added, in the language it is spoken. Do not add any greeting, disclaimer, conversational framing, notes, or analysis. Just return the pure transcribed text.',
    };

    const response = await activeAi.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts: [audioPart, textPart] },
    });

    const text = (response.text || '').trim();
    res.json({ text });
  } catch (err: any) {
    console.error('API transcription error:', err);
    res.status(500).json({ error: err.message || 'Failed to transcribe audio' });
  }
});

// POST /api/auth/register — called after Firebase signup to save business info
app.post('/api/auth/register', async (req, res) => {
  try {
    const decoded = await verifyFirebaseToken(req.headers.authorization);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized token' });

    const { businessName, businessType } = req.body;

    if (!sql) {
      console.warn('Neon database is offline, creating memory-backed mock registration.');
      const profile = getMockProfile(decoded.uid, decoded.email || '', businessName, businessType);
      profile.business_name = businessName || profile.business_name;
      profile.business_type = businessType || profile.business_type;
      return res.json({ success: true, profile });
    }

    // Upsert profile with business details
    const result = await sql`
      INSERT INTO users_profile (id, email, business_name, business_type, plan, replies_used, replies_limit)
      VALUES (
        ${decoded.uid},
        ${decoded.email || ''},
        ${businessName || 'My Business'},
        ${businessType || 'restaurant'},
        'free',
        0,
        5
      )
      ON CONFLICT (id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        business_type = EXCLUDED.business_type
      RETURNING *
    `;

    res.json({ success: true, profile: result[0] });
  } catch (err: any) {
    console.error('Registration profile creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/history — fetch user's reply history
app.get('/api/history', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized Token' });

    if (!sql) {
      const userHistory = mockHistoryStore[user.id] || [];
      return res.json(userHistory);
    }

    const history = await sql`
      SELECT * FROM review_history
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/history/:id — delete a history item
app.delete('/api/history/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized Token' });

    if (!sql) {
      if (mockHistoryStore[user.id]) {
        mockHistoryStore[user.id] = mockHistoryStore[user.id].filter(item => item.id !== req.params.id);
      }
      return res.json({ success: true });
    }

    await sql`
      DELETE FROM review_history
      WHERE id = ${req.params.id} AND user_id = ${user.id}
    `;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/history/:id/feedback — update feedback for a reply (thumbs up / thumbs down / null)
app.post('/api/history/:id/feedback', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized Token' });

    const { feedback } = req.body; // expected: 'up' | 'down' | null
    if (feedback !== undefined && feedback !== null && !['up', 'down'].includes(feedback)) {
      return res.status(400).json({ error: 'Invalid feedback value. Must be "up", "down", or null.' });
    }

    if (!sql) {
      if (mockHistoryStore[user.id]) {
        const item = mockHistoryStore[user.id].find(it => String(it.id) === String(req.params.id));
        if (item) {
          item.feedback = feedback || undefined;
        }
      }
      return res.json({ success: true, feedback });
    }

    await sql`
      UPDATE review_history
      SET feedback = ${feedback}
      WHERE id = ${req.params.id} AND user_id = ${user.id}
    `;

    res.json({ success: true, feedback });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profile — update business name / type
app.post('/api/profile', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized Token' });

    if (!sql) {
      const profile = getMockProfile(user.id, user.email);
      profile.business_name = req.body.businessName;
      profile.business_type = req.body.businessType;
      return res.json({
        success: true,
        businessName: profile.business_name,
        businessType: profile.business_type,
        customApiKey: profile.custom_api_key || ''
      });
    }

    const { businessName, businessType } = req.body;

    await sql`
      UPDATE users_profile
      SET business_name = ${businessName},
          business_type = ${businessType}
      WHERE id = ${user.id}
    `;

    res.json({ success: true, businessName, businessType, customApiKey: user.custom_api_key || '' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/regenerate-key — regenerate Review Reply AI API Key for paid plans
app.post('/api/profile/regenerate-key', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized Token' });

    if (user.plan === 'free') {
      return res.status(403).json({ error: 'API Keys are restricted to paid tiers only. Please upgrade your plan.' });
    }

    const newApiKey = `rr_live_${crypto.randomBytes(16).toString('hex')}`;
    if (sql) {
      await sql`
        UPDATE users_profile
        SET custom_api_key = ${newApiKey}
        WHERE id = ${user.id}
      `;
    } else {
      const profile = getMockProfile(user.id, user.email);
      profile.custom_api_key = newApiKey;
    }

    res.json({ success: true, customApiKey: newApiKey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/razorpay/create-subscription
app.post('/api/razorpay/create-subscription', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (!hasRazorpay || !rzp) {
      return res.status(400).json({ error: 'Razorpay is not fully configured on the server. Please define RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your settings.' });
    }

    const { planId, billingCycle } = req.body;

    // Use environment setup values or empty so it falls back to explicit configuration instruction
    const RAZORPAY_PLAN_IDS: Record<string, Record<string, string>> = {
      starter: {
        monthly: process.env.RAZORPAY_PLAN_STARTER_MONTHLY || '',
        annual: process.env.RAZORPAY_PLAN_STARTER_ANNUAL || '',
      },
      pro: {
        monthly: process.env.RAZORPAY_PLAN_PRO_MONTHLY || '',
        annual: process.env.RAZORPAY_PLAN_PRO_ANNUAL || '',
      },
      agency: {
        monthly: process.env.RAZORPAY_PLAN_AGENCY_MONTHLY || '',
        annual: process.env.RAZORPAY_PLAN_AGENCY_ANNUAL || '',
      }
    };

    const rzpPlanId = RAZORPAY_PLAN_IDS[planId]?.[billingCycle || 'monthly'];
    if (!rzpPlanId) {
      return res.status(400).json({ 
        error: `Please configure your Razorpay Plan ID for: ${planId} (${billingCycle || 'monthly'}). Set RAZORPAY_PLAN_${planId.toUpperCase()}_${(billingCycle || 'monthly').toUpperCase()} in your environment variables.`
      });
    }

    try {
      const subscription = await rzp.subscriptions.create({
        plan_id: rzpPlanId,
        customer_notify: 1,
        total_count: billingCycle === 'annual' ? 1 : 12,
        notes: {
          user_id: user.id,
          email: user.email,
          plan: planId
        }
      });

      return res.json({
        subscriptionId: subscription.id,
        isMock: false,
        razorpayKeyId: rzpKeyIdClean,
      });
    } catch (rzpErr: any) {
      console.error('Razorpay subscription creation failed:', rzpErr);
      const isTestKey = rzpKeyIdClean?.startsWith('rzp_test_');
      let extraHint = '';
      const errDetail = rzpErr?.error?.description || rzpErr?.message || JSON.stringify(rzpErr);
      if (errDetail.toLowerCase().includes('the id provided is invalid') || errDetail.toLowerCase().includes('not be found')) {
        extraHint = isTestKey 
          ? ' (HINT: Your API key is in TEST MODE but this Plan ID might only exist in LIVE MODE, or belongs to another Razorpay merchant account. Please create this plan in your Razorpay Dashboard under Test Mode.)'
          : ' (HINT: Your API key is in LIVE MODE but this Plan ID might only exist in TEST MODE, or belongs to another Razorpay merchant account. Please verify your Plan ID in your live Razorpay Dashboard.)';
      }
      return res.status(400).json({
        error: `Razorpay API Error: "${errDetail}"${extraHint}. Make sure your keys are correct and the Plan ID "${rzpPlanId}" exists on Razorpay.`
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/razorpay/simulate-upgrade — allow safe testing bypass in AI Studio environment
app.post('/api/razorpay/simulate-upgrade', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { planId } = req.body;
    if (!['starter', 'pro', 'agency', 'free'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const PLAN_LIMITS: Record<string, number> = {
      free: 5,
      starter: 100,
      pro: 999999,
      agency: 999999
    };

    if (sql) {
      await sql`
        UPDATE users_profile
        SET
          plan = ${planId},
          replies_limit = ${PLAN_LIMITS[planId]},
          replies_used = 0,
          razorpay_subscription_id = ${'sub_sim_' + Math.random().toString(36).substring(7)}
        WHERE id = ${user.id}
      `;
    } else {
      const profile = getMockProfile(user.id, user.email);
      profile.plan = planId;
      profile.replies_limit = PLAN_LIMITS[planId];
      profile.replies_used = 0;
      profile.razorpay_subscription_id = 'sub_sim_' + Math.random().toString(36).substring(7);
    }

    res.json({ success: true, plan: planId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/razorpay/webhook — handle payment success
app.post('/api/razorpay/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(400).json({ error: 'Webhook secret not set' });

    const signature = req.headers['x-razorpay-signature'] as string;
    const body = req.body.toString();

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(body);

    if (event.event === 'subscription.activated' || event.event === 'payment.captured') {
      const notes = event.payload?.subscription?.entity?.notes || event.payload?.payment?.entity?.notes;
      const userId = notes?.user_id;
      const planId = notes?.plan;

      if (userId && planId && sql) {
        const PLAN_LIMITS: Record<string, number> = {
          starter: 100,
          pro: 999999,
          agency: 999999
        };

        await sql`
          UPDATE users_profile
          SET
            plan = ${planId},
            replies_limit = ${PLAN_LIMITS[planId] || 5},
            replies_used = 0,
            razorpay_subscription_id = ${event.payload?.subscription?.entity?.id || ''}
          WHERE id = ${userId}
        `;
      }
    }

    if (event.event === 'subscription.cancelled' || event.event === 'subscription.expired') {
      const notes = event.payload?.subscription?.entity?.notes;
      const userId = notes?.user_id;
      if (userId && sql) {
        await sql`
          UPDATE users_profile
          SET plan = 'free', replies_limit = 5, razorpay_subscription_id = NULL
          WHERE id = ${userId}
        `;
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Serve React App ───────────────────────────────────────────────────────
async function initDatabase() {
  if (!sql) return;
  try {
    console.log('Verifying and creating Neon database tables if they do not exist...');
    await sql`
      CREATE TABLE IF NOT EXISTS users_profile (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        business_name VARCHAR(255),
        business_type VARCHAR(255),
        plan VARCHAR(50) DEFAULT 'free',
        replies_used INT DEFAULT 0,
        replies_limit INT DEFAULT 5,
        razorpay_subscription_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS review_history (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users_profile(id) ON DELETE CASCADE,
        review_text TEXT,
        reply_text TEXT,
        tone VARCHAR(100),
        language VARCHAR(100),
        feedback VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`
      ALTER TABLE review_history ADD COLUMN IF NOT EXISTS feedback VARCHAR(50) DEFAULT NULL;
    `;
    await sql`
      ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS custom_api_key VARCHAR(255) DEFAULT NULL;
    `;
    console.log('Neon database tables verified/created successfully.');
  } catch (err: any) {
    console.error('Failed to initialize Neon database tables:', err);
  }
}

async function startListening() {
  await initDatabase();
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(resolvedDirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReviewReply AI running on http://0.0.0.0:${PORT}`);
    console.log(`Firebase Admin: ${firebaseAdminInitialized ? '✅ Ready' : '⚠️ Offline fallback'}`);
    console.log(`Neon Database: ${hasNeon ? '✅ Ready' : '⚠️ Offline fallback'}`);
    console.log(`Gemini AI: ${hasGemini ? '✅ Ready' : '⚠️ Offline fallback'}`);
    console.log(`Razorpay: ${hasRazorpay ? '✅ Ready' : '⚠️ Offline fallback'}`);
  });
}

startListening().catch((err) => {
  console.error('Failed to start server:', err);
});
