import React, { useState, useEffect } from 'react';
import { ReviewHistoryItem } from '../types';
import { toast } from 'react-hot-toast';
import { 
  Search, Calendar, Copy, Check, Trash2, Smile, MessagesSquare, 
  ChevronDown, ChevronUp, Clock, Filter, Sparkles, Languages,
  ThumbsUp, ThumbsDown
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
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
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
