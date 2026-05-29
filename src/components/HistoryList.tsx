import React, { useState, useEffect } from 'react';
import { ReviewHistoryItem } from '../types';
import { toast } from 'react-hot-toast';
import { 
  Search, Calendar, Copy, Check, Trash2, Smile, MessagesSquare, 
  ChevronDown, ChevronUp, Clock, Filter, Sparkles, Languages,
  ThumbsUp, ThumbsDown, Download, Share2, Twitter, Linkedin, Facebook, Mail, Link
} from 'lucide-react';

interface HistoryListProps {
  getAuthToken: () => Promise<string | null>;
}

export default function HistoryList({ getAuthToken }: HistoryListProps) {
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTone, setSelectedTone] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch('/api/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else {
        toast.error('Could not load history.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to connect to history server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.share-container-btn') && !target.closest('.share-dropdown-menu')) {
        setActiveShareId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Successfully copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this item from your history archive?')) {
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setHistory(prev => prev.filter(item => item.id !== id));
        toast.success('Reply deleted successfully.');
      } else {
        toast.error('Failed to delete history item.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during deletion.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleHistoryFeedback = async (id: string, val: 'up' | 'down') => {
    const item = history.find(it => it.id === id);
    if (!item) return;

    const previousFeedback = item.feedback;
    const newFeedback = item.feedback === val ? null : val;

    // Optimistically update
    setHistory(prev => prev.map(it => String(it.id) === String(id) ? { ...it, feedback: newFeedback } : it));

    try {
      const token = await getAuthToken();
      if (!token) {
        setHistory(prev => prev.map(it => String(it.id) === String(id) ? { ...it, feedback: previousFeedback } : it));
        return toast.error('Please authenticate first.');
      }

      const res = await fetch(`/api/history/${id}/feedback`, {
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
        toast.success(`Rated ${newFeedback === 'up' ? 'Thumbs Up' : 'Thumbs Down'}!`);
      } else {
        toast.success('Rating cleared.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Feedback sync failed.');
      setHistory(prev => prev.map(it => String(it.id) === String(id) ? { ...it, feedback: previousFeedback } : it));
    }
  };

  const handleDownloadCSV = () => {
    if (filteredHistory.length === 0) {
      toast.error('No history records to download.');
      return;
    }

    try {
      // CSV escaping: double quotes need to be doubled, values with comma/quotes/newlines wrapped in double quotes
      const escapeCSV = (val: string) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        str = str.replace(/"/g, '""');
        if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
          str = `"${str}"`;
        }
        return str;
      };

      const headers = ['ID', 'Tone', 'Language', 'Customer Review', 'AI Reply', 'Feedback Rating', 'Created At'];
      const rows = filteredHistory.map(item => [
        item.id,
        item.tone,
        item.language || 'English',
        item.review_text,
        item.reply_text,
        item.feedback || 'None',
        item.created_at || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `reply_history_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Reply history exported to CSV successfully! 📊');
    } catch (err: any) {
      console.error('CSV Export Error:', err);
      toast.error('Could not generate CSV file.');
    }
  };

  // Search & Filter computation
  const filteredHistory = history.filter(item => {
    const textMatch = 
      item.review_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reply_text.toLowerCase().includes(searchQuery.toLowerCase());
    
    const toneMatch = selectedTone === 'all' || item.tone === selectedTone;
    
    return textMatch && toneMatch;
  });

  return (
    <div className="space-y-6">
      
      {/* Search and Filters bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm shadow-slate-100 select-none">
        
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews or replies by keyword..."
            className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Tone Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0 justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Tone Filter:</span>
          </div>
          <select
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium text-slate-600 shrink-0 cursor-pointer"
          >
            <option value="all">All Tones</option>
            <option value="friendly">Friendly</option>
            <option value="formal">Formal</option>
            <option value="apologetic">Apologetic</option>
            <option value="thankful">Thankful</option>
          </select>

          <button
            onClick={handleDownloadCSV}
            disabled={filteredHistory.length === 0}
            className={`flex items-center gap-1.5 border text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm select-none ${
              filteredHistory.length > 0
                ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-500/10'
                : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-60'
            }`}
            title={filteredHistory.length > 0 ? "Download currently active history as CSV" : "No history records to export"}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export CSV</span>
          </button>
        </div>

      </div>

      {/* Main lists */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="w-24 h-4 bg-slate-100 rounded" />
                <div className="w-16 h-4 bg-slate-100 rounded" />
              </div>
              <div className="w-3/4 h-3 bg-slate-100 rounded" />
              <div className="w-2/3 h-3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredHistory.length > 0 ? (
        <div className="space-y-4">
          {filteredHistory.map((item) => {
            const isExpanded = expandedId === item.id;
            const dateStr = item.created_at
              ? new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Unknown date';

            return (
              <div 
                key={item.id} 
                className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm shadow-slate-100 flex flex-col justify-between hover:border-slate-200 transition-colors"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded">
                      {item.tone}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-300" /> {dateStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleHistoryFeedback(item.id, 'up')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        item.feedback === 'up'
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 hover:text-slate-800 text-slate-400'
                      }`}
                      title="Mark as accurate response"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleHistoryFeedback(item.id, 'down')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        item.feedback === 'down'
                          ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 hover:text-rose-600 text-slate-400'
                      }`}
                      title="Mark as inaccurate response"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveShareId(activeShareId === item.id ? null : item.id);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer share-container-btn ${
                          activeShareId === item.id 
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                            : 'bg-slate-50 hover:bg-slate-100 hover:text-slate-800 text-slate-500'
                        }`}
                        title="Share reply on social media"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {activeShareId === item.id && (
                        <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/80 p-1.5 z-50 text-left share-dropdown-menu">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2.5 py-1 mb-1">
                            Share Article
                          </p>
                          
                          <a
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this AI-generated customer review reply! ✨\n\n"${item.reply_text.slice(0, 150)}${item.reply_text.length > 150 ? '...' : ''}"`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Twitter className="w-3.5 h-3.5 text-sky-500 fill-sky-500/15" />
                            <span>Share on X / Twitter</span>
                          </a>

                          <a
                            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://ai.studio/build')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Linkedin className="w-3.5 h-3.5 text-blue-600 fill-blue-600/15" />
                            <span>Share on LinkedIn</span>
                          </a>

                          <a
                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://ai.studio/build')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Facebook className="w-3.5 h-3.5 text-blue-800 fill-blue-800/15" />
                            <span>Share on Facebook</span>
                          </a>

                          <a
                            href={`mailto:?subject=${encodeURIComponent("AI Customer Review Reply Drafted")}&body=${encodeURIComponent(`Hi,\n\nI want to share this AI-generated response draft for customer review reviews.\n\nCustomer Review:\n"${item.review_text}"\n\nGenerated AI Reply:\n"${item.reply_text}"`)}`}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span>Share via Email</span>
                          </a>

                          <button
                            onClick={() => {
                              handleCopy(item.id, `Review: "${item.review_text}"\nReply: "${item.reply_text}"`);
                              setActiveShareId(null);
                            }}
                            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                          >
                            <Link className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Copy Shareable Text</span>
                          </button>

                          {typeof navigator !== 'undefined' && navigator.share && (
                            <button
                              onClick={async () => {
                                try {
                                  await navigator.share({
                                    title: 'AI Drafted Customer Review Reply',
                                    text: `Review: "${item.review_text}"\nAI Response: "${item.reply_text}"`,
                                    url: window.location.origin
                                  });
                                  toast.success('Shared successfully!');
                                } catch (err) {
                                  console.log('User cancelled or native share failed', err);
                                }
                                setActiveShareId(null);
                              }}
                              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer text-left border-t border-slate-50 mt-1 pt-1.5"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>System Native Share</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleCopy(item.id, item.reply_text)}
                      className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 hover:text-slate-800 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                      title="Copy response drafted"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 hover:text-red-700 text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub Body - Review pasting */}
                <div className="grid md:grid-cols-2 gap-6 items-start">
                  
                  {/* Left: Review Text */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Review</div>
                    <p className={`text-slate-600 text-xs italic leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100 ${
                      !isExpanded && item.review_text.length > 180 ? 'line-clamp-3' : ''
                    }`}>
                      "{item.review_text}"
                    </p>
                    {item.review_text.length > 180 && (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="text-[10px] font-semibold text-blue-600 flex items-center gap-0.5 hover:underline"
                      >
                        {isExpanded ? (
                          <>Collapse <ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <>Read entire review <ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Right: AI Reply Text */}
                  <div className="space-y-1.5 bg-blue-50/20 border border-blue-50 p-5 rounded-xl">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-500" /> AI generated Response
                    </div>
                    <p className="text-slate-800 text-xs leading-relaxed font-sans font-medium">
                      {item.reply_text}
                    </p>
                    <div className="text-[9px] font-semibold text-slate-400 flex items-center gap-1 pt-1.5 border-t border-slate-100 mt-2">
                      <Languages className="w-3.5 h-3.5 text-slate-300" /> Output written in <span className="font-semibold text-slate-600">{item.language || 'English'}</span>
                    </div>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center select-none flex flex-col items-center justify-center space-y-4 shadow-sm shadow-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <MessagesSquare className="w-6 h-6" />
          </div>
          <div className="max-w-xs space-y-1">
            <h4 className="text-sm font-semibold text-slate-800">No Records Found</h4>
            <p className="text-xs text-slate-400 leading-normal">
              Any generated review replies will appear listed here in historical archive logs.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
