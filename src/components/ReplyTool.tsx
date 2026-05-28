import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserProfile, ToneType, LanguageType } from '../types';
import { toast } from 'react-hot-toast';
import { 
  Sparkles, Copy, Check, RotateCcw, AlertCircle, Quote, 
  Smile, ShieldCheck, CornerDownLeft, Languages, ClipboardList,
  Mic, MicOff, Loader2, ThumbsUp, ThumbsDown
} from 'lucide-react';

interface ReplyToolProps {
  userProfile: UserProfile | null;
  getAuthToken: () => Promise<string | null>;
  onRefreshProfile: () => void;
  onNavigate: (view: string) => void;
}

const templates = [
  {
    label: 'Positive Feedback',
    text: 'Loved the sushi roll combo and spicy crab salad! The ambient music was lovely, and our waiter Vivek made sure we had everything we needed. Will definitely come back next week!'
  },
  {
    label: 'Critical / Negativity',
    text: 'Terrible check-in experience. They made us wait 40 minutes at the reception even though we booked in advance. The room AC was making a strange humming sound all night.'
  },
  {
    label: 'Mixed Review',
    text: 'Hair salon cut was amazing and the stylist was super professional, but they charged me ₹500 more than what was quoted on their service card. Watch out for hidden fees.'
  }
];

export default function ReplyTool({ userProfile, getAuthToken, onRefreshProfile, onNavigate }: ReplyToolProps) {
  const [reviewText, setReviewText] = useState('');
  const [platform, setPlatform] = useState<'Google' | 'Zomato' | 'TripAdvisor'>('Google');
  const [tone, setTone] = useState<ToneType>('friendly');
  const [language, setLanguage] = useState<LanguageType>('English');
  const [businessNameOverride, setBusinessNameOverride] = useState('');
  const [businessTypeOverride, setBusinessTypeOverride] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [generatedReply, setGeneratedReply] = useState('');
  const [generatedId, setGeneratedId] = useState<string | number | null>(null);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // --- Voice Dictation State & Logic using MediaDevices ---
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [streamObj, setStreamObj] = useState<MediaStream | null>(null);

  // Recording seconds timer counter
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return toast.error('Dictation / microphone permissions are not supported or available on this browser/device.');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStreamObj(stream);
      
      // Determine support MIME formats
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Compile sound clip
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        
        // Stop audio tracks so the recording icon turns off in browser tab
        stream.getTracks().forEach(track => track.stop());
        
        // Convert Blob to base64
        setTranscribing(true);
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Url = reader.result as string;
          // Strip "data:audio/webm;base64," prefix for pure binary payload
          const base64Data = base64Url.split(',')[1];
          
          try {
            const token = await getAuthToken();
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                audio: base64Data,
                mimeType: blob.type
              })
            });
            
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || 'Server transcription failed');
            }
            
            const data = await res.json();
            if (data.text?.trim()) {
              setReviewText((prev) => {
                const glued = prev.trim();
                return glued ? glued + '\n' + data.text : data.text;
              });
              toast.success('Dictation transcribed successfully! 🎙️✨');
            } else {
              toast.error('No speech detected. Please speak closer to your microphone.');
            }
          } catch (err: any) {
            console.error('Transcription error:', err);
            toast.error(err.message || 'Dictation failed. Please check your mic connection or type your review.');
          } finally {
            setTranscribing(false);
          }
        };
      };
      
      setRecorder(mediaRecorder);
      setRecordingSeconds(0);
      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Speak now! 🎙️ Capturing audio...');
    } catch (err: any) {
      console.error('Failed to access microphone stream:', err);
      toast.error('Permission denied or microphone unavailable. Please allow microphone access inside your browser address bar.');
    }
  };

  const stopRecording = () => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    if (streamObj) {
      streamObj.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setRecorder(null);
    setStreamObj(null);
  };

  // Sync profile options on mount/update
  useEffect(() => {
    if (userProfile) {
      setBusinessNameOverride(userProfile.business_name || '');
      setBusinessTypeOverride(userProfile.business_type || 'restaurant');
    }
  }, [userProfile]);

  const handleCopy = () => {
    if (!generatedReply) return;
    navigator.clipboard.writeText(generatedReply);
    setCopied(true);
    toast.success('Reply copied to clipboard!', { id: 'copied-toast' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) {
      return toast.error('Please enter a customer review to analyze.');
    }

    setLoading(true);
    setGeneratedReply('');
    setGeneratedId(null);
    setFeedback(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setLoading(false);
        return toast.error('Your auth session expired. Please sign in again.');
      }

      const res = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reviewText,
          tone,
          language,
          businessName: businessNameOverride,
          businessType: businessTypeOverride,
          platform
        })
      });

      if (res.status === 403) {
        // Enforced Free Tier limit reached
        setShowUpgradeModal(true);
        toast.error('Free trial limit exceeded.');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Review generation failed on server');
      }

      const data = await res.json();
      setGeneratedReply(data.replyText);
      setGeneratedId(data.id || null);
      setFeedback(null);
      toast.success('AI reply drafted successfully! ✨');
      
      // Trigger profile refresh to sync new replies count in sidebar
      onRefreshProfile();
    } catch (err: any) {
      console.error('AI draft error:', err);
      toast.error(err.message || 'Failed to generate reply. Pleat try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setReviewText('');
    setGeneratedReply('');
    setGeneratedId(null);
    setFeedback(null);
  };

  const handleFeedback = async (val: 'up' | 'down') => {
    if (!generatedId) {
      return toast.error('No response draft active to rate.');
    }

    const previousFeedback = feedback;
    const newFeedback = feedback === val ? null : val;
    setFeedback(newFeedback);

    try {
      const token = await getAuthToken();
      if (!token) {
        setFeedback(previousFeedback);
        return toast.error('Please authenticate first.');
      }

      const res = await fetch(`/api/history/${generatedId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ feedback: newFeedback })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit feedback');
      }

      if (newFeedback) {
        toast.success(`Accuracy rated ${newFeedback === 'up' ? 'Thumbs Up' : 'Thumbs Down'}! Thanks for helping us improve. 👍`);
      } else {
        toast.success('Feedback cleared.');
      }
    } catch (err: any) {
      console.error('Feedback submission failed:', err);
      toast.error(err.message || 'Feedback sync failed.');
      setFeedback(previousFeedback);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Welcome banner */}
      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
            Let's Craft the Perfect Response <Smile className="w-5 h-5 text-blue-500" />
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Analyze reviews and generate contextual brand responses in seconds. Choose from templates below to get started immediately.
          </p>
        </div>

        {/* Dynamic templates injector */}
        <div className="flex gap-2 shrink-0">
          {templates.map((tpl, tidx) => (
            <button
              key={tidx}
              onClick={() => {
                setReviewText(tpl.text);
                toast.success(`Loaded ${tpl.label} template.`);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[11px] font-semibold text-slate-600 transition-colors shadow-sm cursor-pointer"
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace split panel */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Input specifications side */}
        <div className="col-span-12 lg:col-span-7 flex flex-col space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Paste Customer Review
            </label>
            
            <form onSubmit={handleGenerate} className="flex-1 flex flex-col space-y-6">
              {/* Input review text area */}
              <div className="flex-1 flex flex-col min-h-[180px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                    Review Details {isRecording && <span className="text-rose-500 animate-pulse ml-1">● live recording</span>}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {/* Voice Dictation Button */}
                    {isRecording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="text-[10px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 animate-pulse hover:bg-rose-100 transition-colors cursor-pointer"
                        title="Stop live dictation"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 block animate-ping mr-0.5"></span>
                        <span>Stop ({formatSeconds(recordingSeconds)})</span>
                      </button>
                    ) : transcribing ? (
                      <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                        transcribing...
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:border-blue-300 transition-all cursor-pointer"
                        title="Dictate with your microphone"
                      >
                        <Mic className="w-3 h-3 text-blue-500 shrink-0" />
                        <span>Dictate Review</span>
                      </button>
                    )}

                    {reviewText.length > 0 && !isRecording && (
                      <button
                        type="button"
                        onClick={handleReset}
                        className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 lowercase flex items-center gap-0.5 hover:underline"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset clean
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative flex-1">
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    disabled={transcribing}
                    placeholder={
                      isRecording 
                        ? "Speak now! Mic is live and capturing your review draft. Click 'Stop' above to analyze."
                        : transcribing
                        ? "Transcribing your voice memo using Gemini AI... please wait."
                        : "Enter the review text from Google, Zomato, or TripAdvisor here..."
                    }
                    maxLength={1500}
                    className={`w-full h-full p-4 rounded-xl resize-none focus:outline-none focus:ring-2 transition-all text-slate-700 min-h-[140px] ${
                      isRecording
                        ? 'bg-rose-50/40 border border-rose-300 focus:ring-rose-500/20'
                        : transcribing
                        ? 'bg-blue-50/20 border-2 border-dashed border-blue-200 text-slate-400'
                        : 'bg-slate-50 border border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  />
                  {isRecording && (
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-2 py-0.5 bg-rose-600 text-white font-mono text-[9px] font-bold tracking-widest uppercase rounded shadow-sm animate-pulse z-20">
                      <span className="w-1 h-1 rounded-full bg-white block animate-ping"></span>
                      <span>mic live</span>
                    </div>
                  )}
                  {transcribing && (
                    <div className="absolute inset-0 bg-white/70 rounded-xl backdrop-blur-xs flex flex-col items-center justify-center space-y-2 z-20">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Ingesting voice memo...</span>
                    </div>
                  )}
                  <div className="absolute right-3.5 bottom-3.5 text-[10px] font-bold text-slate-300">
                    {reviewText.length}/1500
                  </div>
                </div>
              </div>

              {/* Platform indicator buttons */}
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Review Platform</span>
                <div className="grid grid-cols-3 gap-3">
                  {(['Google', 'Zomato', 'TripAdvisor'] as const).map((plt) => (
                    <button
                      key={plt}
                      type="button"
                      onClick={() => setPlatform(plt)}
                      className={`py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        platform === plt
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {plt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Config override specs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display Brand Name</label>
                  <input
                    type="text"
                    value={businessNameOverride}
                    onChange={(e) => setBusinessNameOverride(e.target.value)}
                    placeholder="e.g. Curry House"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category Style</label>
                  <select
                    value={businessTypeOverride}
                    onChange={(e) => setBusinessTypeOverride(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-750 focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="restaurant">Restaurant / Cafe</option>
                    <option value="hotel">Hotel / Lodging</option>
                    <option value="salon">Salon / Spa</option>
                    <option value="clinic">Clinic / Hospital</option>
                    <option value="other">Other Brand Services</option>
                  </select>
                </div>
              </div>

              {/* Tone selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Response Tone</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'friendly', label: 'Friendly & Casual', desc: 'Warm' },
                    { id: 'formal', label: 'Formal & Direct', desc: 'Polite' },
                    { id: 'apologetic', label: 'Apologetic & Pro', desc: 'De-escalate' },
                    { id: 'thankful', label: 'Enthusiastic', desc: 'Appreciative' }
                  ].map((tItem) => (
                    <button
                      key={tItem.id}
                      type="button"
                      onClick={() => setTone(tItem.id as ToneType)}
                      className={`px-3 py-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        tone === tItem.id
                          ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-semibold shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs">{tItem.label}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{tItem.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5 text-slate-400" /> Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageType)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-750 focus:outline-none bg-white cursor-pointer"
                >
                  <option value="English">English (US)</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="Arabic">Arabic (العربية)</option>
                  <option value="Auto-detect">Auto-detect native customer language</option>
                </select>
              </div>

              {/* Submission button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                    <span>Drafting Response...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Generate AI Reply</span>
                  </>
                )}
              </button>

            </form>
          </div>
        </div>

        {/* Output specifications side */}
        <div className="col-span-12 lg:col-span-5 flex flex-col space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full justify-between min-h-[460px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Generated Result
                </label>
                <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase transition-colors ${
                  generatedReply 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {generatedReply ? 'Magic Ready' : 'Awaiting Input'}
                </span>
              </div>
              
              {generatedReply ? (
                <div className="space-y-6">
                  <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 text-slate-700 text-sm leading-relaxed relative min-h-[160px] flex flex-col justify-between">
                    <div>
                      <Quote className="w-8 h-8 text-blue-200/40 absolute top-3 left-3 shrink-0 select-none pointer-events-none" />
                      <div className="relative z-10 pl-3 whitespace-pre-wrap">
                        <motion.div
                          key={generatedReply}
                          initial="hidden"
                          animate="visible"
                          variants={{
                            hidden: { opacity: 0 },
                            visible: {
                              opacity: 1,
                              transition: {
                                staggerChildren: 0.012,
                              },
                            },
                          }}
                          className="inline"
                        >
                          {generatedReply.split(/(\s+)/).map((part, index) => {
                            if (part.trim() === '') {
                              return <span key={index}>{part}</span>;
                            }
                            return (
                              <motion.span
                                key={index}
                                variants={{
                                  hidden: { opacity: 0, y: 3 },
                                  visible: { opacity: 1, y: 0 },
                                }}
                                transition={{ duration: 0.12, ease: "easeOut" }}
                                style={{ display: 'inline-block' }}
                              >
                                {part}
                              </motion.span>
                            );
                          })}
                        </motion.div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-blue-100/30 pt-3.5 mt-4 z-10">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        Rate accuracy:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleFeedback('up')}
                          className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                            feedback === 'up'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700'
                          }`}
                          title="This drafted response is accurate and good."
                        >
                          <ThumbsUp className="w-3 h-3 shrink-0" />
                          <span>Good</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback('down')}
                          className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                            feedback === 'down'
                              ? 'bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-500 hover:text-rose-600'
                          }`}
                          title="This drafted response is poor or incorrect."
                        >
                          <ThumbsDown className="w-3 h-3 shrink-0" />
                          <span>Poor</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleCopy}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 flex items-center justify-center space-x-2 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-5 h-5 text-emerald-400" />
                          <span>Copied to Clipboard</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <span>Copy to Clipboard</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleGenerate}
                      className="w-full py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-500" />
                      <span>Regenerate Response</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3 aspect-[4/3] bg-slate-50/30">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-750">Awaiting Feedback Ingestion</h4>
                    <p className="text-xs text-slate-400 max-w-[240px] mt-1 leading-normal">
                      AI suggestions appear here. Paste details on the left and trigger generation.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt banner footer */}
            <div className="border-t border-slate-100 pt-5 mt-6 flex items-start gap-2.5 text-xs text-slate-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>This draft is optimized to address review points while staying within polite compliance limits. Please proofread before publishing.</span>
            </div>

          </div>

          {/* Quick Tip card from Design HTML */}
          <div className="bg-indigo-600 rounded-2xl p-5 text-white flex items-start space-x-4 shadow-lg shadow-indigo-500/20">
            <div className="p-2 bg-indigo-500 rounded-lg shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold opacity-80 uppercase mb-1 tracking-tight">Pro Tip</p>
              <p className="text-xs leading-normal font-medium text-indigo-100">
                Personalized replies increase your Google Search ranking by up to 20%.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Upgrade modal when limit reached */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 shadow-2xl relative space-y-4">
            
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-800 font-display">Limit Reached on Free Plan</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                You have exhausted all 5 monthly replies included with the free trial. Upgrade to custom plans to continue utilizing AI drafted replies instantly.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold py-3 rounded-xl transition-colors cursor-pointer"
              >
                Close View
              </button>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  onNavigate('billing');
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-3 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                View Premium Plans
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
