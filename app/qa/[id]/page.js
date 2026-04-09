'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ArrowUp, ArrowDown, Sparkles, User, EyeOff, Bot, Send, Trash2, ChevronDown, ChevronUp, Lock, ArrowLeft } from 'lucide-react';

export default function QuestionDetail() {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [relatedNotes, setRelatedNotes] = useState([]);
  const chatBottomRef = useRef(null);

  useEffect(() => { loadQuestion(); }, [id]);
  useEffect(() => { if (chatOpen && chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, chatOpen]);
  useEffect(() => { if (chatOpen && !chatInitialized) loadChatHistory(); }, [chatOpen]);

  async function loadQuestion() {
    const r = await fetch(`/api/questions/${id}`);
    const d = await r.json();
    setQuestion(d.question);
    setAnswers(d.answers || []);
    setRelatedNotes(d.relatedNotes || []);
  }

  async function loadChatHistory() {
    try {
      const r = await fetch(`/api/chat?question_id=${id}`);
      const d = await r.json();
      if (d.messages) setChatMessages(d.messages.map(m => ({ role: m.role, text: m.content })));
      setChatInitialized(true);
    } catch { setChatInitialized(true); }
  }

  async function vote(answer_id, value) {
    await fetch('/api/questions/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer_id, value }) });
    loadQuestion();
  }

  async function submitAnswer(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    await fetch(`/api/questions/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
    setBody(''); setLoading(false); loadQuestion();
  }

  async function sendChat(e) {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question_id: id, message: userMsg }) });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'model', text: data.reply || 'Sorry, something went wrong.' }]);
    } catch { setChatMessages(prev => [...prev, { role: 'model', text: 'Network error. Please try again.' }]); }
    finally { setChatLoading(false); }
  }

  async function clearChat() {
    if (!confirm('Clear your private chat history for this question?')) return;
    await fetch(`/api/chat?question_id=${id}`, { method: 'DELETE' });
    setChatMessages([]); setChatInitialized(false);
  }

  if (!question) return <><Navbar /><div className="p-6 text-muted">Loading...</div></>;

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto p-6">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-muted hover:text-white mb-4 text-sm">
          <ArrowLeft size={16} /> Back to Q&A
        </button>
        <div className="card p-6 mb-6">
          <h1 className="text-2xl font-bold mb-3">{question.title}</h1>
          <p className="text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap prose prose-invert">{question.body}</p>
          <div className="flex items-center gap-3 text-xs text-muted">
            {question.subject && <span className="tag">{question.subject}</span>}
            {(question.tags || '').split(',').filter(Boolean).map((t, i) => <span key={i} className="text-muted">#{t.trim()}</span>)}
            <span className="flex items-center gap-1">{question.is_anonymous ? <><EyeOff size={12} /> Anonymous</> : <><User size={12} /> {question.author_name}</>}</span>
          </div>
        </div>

        <div className="card mb-6 overflow-hidden">
          <button onClick={() => setChatOpen(!chatOpen)} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Bot size={16} color="white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm flex items-center gap-2">Private AI Tutor <span className="flex items-center gap-1 text-xs text-muted font-normal"><Lock size={10} /> Only you can see this</span></div>
                <div className="text-xs text-muted">Ask follow-up questions about this topic</div>
              </div>
            </div>
            {chatOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
          </button>
          {chatOpen && (
            <div className="border-t border-border">
              <div className="h-72 overflow-y-auto p-4 space-y-3 bg-black/20">
                {chatMessages.length === 0 && !chatLoading && (
                  <div className="text-center text-muted text-sm py-8">
                    <Bot size={28} className="mx-auto mb-2 opacity-40" />
                    <div>Ask me anything about this topic.</div>
                    <div className="text-xs mt-1 opacity-60">This conversation is private — only you can see it.</div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-accent text-white rounded-br-sm' : 'bg-panel2 border border-border text-gray-200 rounded-bl-sm'}`}>
                      {msg.role === 'model' && <div className="flex items-center gap-1.5 mb-1.5 text-xs text-accent2"><Sparkles size={10} /> AI Tutor</div>}
                      <span className="whitespace-pre-wrap prose prose-invert">{msg.text}</span>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-panel2 border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-muted"><Sparkles size={12} className="animate-pulse text-accent2" /> Thinking...</div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <input className="input text-sm py-2" placeholder="Ask a follow-up question..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat(e)} disabled={chatLoading} />
                <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading} className="btn px-3 py-2"><Send size={16} /></button>
                {chatMessages.length > 0 && <button onClick={clearChat} className="btn-ghost px-3 py-2 text-muted hover:text-red-400"><Trash2 size={16} /></button>}
              </div>
            </div>
          )}
        </div>

        <div className="mb-3 text-sm text-muted uppercase tracking-wide">{answers.length} Answer{answers.length !== 1 ? 's' : ''} — ranked by votes & recency</div>
        <div className="space-y-4 mb-6">
          {answers.map(a => (
            <div key={a.id} className={`card p-5 ${a.is_ai ? 'glow-border' : ''}`}>
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1 min-w-[32px]">
                  <button onClick={() => vote(a.id, 1)} className="p-1 rounded hover:bg-panel2 text-muted hover:text-green-400 transition-colors"><ArrowUp size={18} /></button>
                  <div className={`font-bold text-lg ${a.votes > 0 ? 'text-green-400' : a.votes < 0 ? 'text-red-400' : ''}`}>{a.votes}</div>
                  <button onClick={() => vote(a.id, -1)} className="p-1 rounded hover:bg-panel2 text-muted hover:text-red-400 transition-colors"><ArrowDown size={18} /></button>
                </div>
                <div className="flex-1">
                  {a.is_ai && <div className="flex items-center gap-2 mb-2"><span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-accent to-accent2 text-white text-xs font-semibold flex items-center gap-1"><Sparkles size={10} /> AI Answer</span><span className="text-xs text-muted">Instant baseline — use the AI Tutor above for follow-ups</span></div>}
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap prose prose-invert">{a.body}</p>
                  {!a.is_ai && <div className="text-xs text-muted mt-3 flex items-center gap-2"><User size={12} />{a.author_name || 'Anonymous'}{a.reputation != null && a.user_id && <span className="text-accent2">⚡{a.reputation}</span>}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {relatedNotes.length > 0 && (
          <div className="card p-5 mb-6">
            <div className="text-xs uppercase tracking-wide text-muted mb-3 flex items-center gap-2">
              <span>📚</span> Related Notes
            </div>
            <div className="space-y-2">
              {relatedNotes.map(n => (
                <a key={n.id} href="/notes" className="block p-3 rounded-lg bg-panel2 border border-border hover:border-accent/40 transition-colors">
                  <div className="font-medium text-sm">{n.title}</div>
                  <div className="text-xs text-muted mt-0.5">{n.subject}{n.unit ? ' · ' + n.unit : ''}</div>
                  {n.summary && <div className="text-xs text-muted mt-1 line-clamp-2">{n.summary}</div>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(n.key_topics || []).slice(0, 4).map((t, i) => (
                      <span key={i} className="tag">{t}</span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={submitAnswer} className="card p-5">
          <div className="text-xs uppercase tracking-wide text-muted mb-2">Your Answer</div>
          <textarea className="input min-h-[100px]" placeholder="Share your knowledge..." value={body} onChange={e => setBody(e.target.value)} />
          <button className="btn mt-3" disabled={loading}>{loading ? 'Posting...' : 'Post Answer'}</button>
        </form>
      </div>
    </>
  );
}
