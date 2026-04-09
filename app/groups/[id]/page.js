'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ArrowLeft, Send, Users, FileText, MessageSquare } from 'lucide-react';

export default function GroupChatPage() {
  const { id } = useParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => setCurrentUser(d.user));
    loadGroup();
    loadMessages();
    pollRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [id]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadGroup() {
    const r = await fetch('/api/groups');
    const d = await r.json();
    const g = (d.groups || []).find(g => g.id == id);
    if (g) setGroup(g);
  }

  async function loadMessages() {
    try {
      const r = await fetch('/api/groups/' + id + '/messages');
      if (r.status === 403) { router.push('/groups'); return; }
      const d = await r.json();
      setMessages(d.messages || []);
    } catch {}
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    await fetch('/api/groups/' + id + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input.trim() }),
    });
    setInput('');
    setSending(false);
    loadMessages();
  }

  function formatTime(ts) {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function renderMessage(msg, isMe) {
    let meta = null;
    try { if (msg.metadata) meta = JSON.parse(msg.metadata); } catch {}

    return (
      <div className="flex flex-col gap-1">
        {msg.message && <div>{msg.message}</div>}
        {meta && (
          <div className="mt-1 p-3 rounded-lg bg-black/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              {meta.type === 'note' ? <FileText size={12} className="text-accent" /> : <MessageSquare size={12} className="text-accent2" />}
              <span className="text-xs font-semibold text-accent">{meta.type === 'note' ? 'Shared Note' : 'Shared Question'}</span>
              {meta.ref_subject && <span className="tag text-xs">{meta.ref_subject}</span>}
            </div>
            <div className="font-medium text-sm">{meta.ref_title}</div>
            {meta.ref_summary && <div className="text-xs text-muted mt-1 line-clamp-2">{meta.ref_summary}</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/groups')} className="text-muted hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-lg">{group?.name || 'Loading...'}</h1>
            <div className="text-xs text-muted flex items-center gap-1">
              <Users size={11} /> {group?.member_count || 0} members {group?.subject ? '· ' + group.subject : ''}
            </div>
          </div>
        </div>

        <div className="card overflow-hidden flex flex-col" style={{ height: '65vh' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted text-sm py-12">No messages yet. Say hello!</div>
            )}
            {messages.map((msg, i) => {
              const isMe = currentUser && msg.user_id == currentUser.id;
              const showName = i === 0 || messages[i-1].user_id !== msg.user_id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {showName && !isMe && (
                      <div className="text-xs text-accent2 mb-1 ml-1">{msg.author_name} · {msg.roll_number}</div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-accent text-white rounded-br-sm' : 'bg-panel2 border border-border text-gray-200 rounded-bl-sm'}`}>
                      {renderMessage(msg, isMe)}
                    </div>
                    <div className="text-xs text-muted mt-1 mx-1">{formatTime(msg.created_at)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <input
              className="input text-sm py-2"
              placeholder="Type a message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(e)}
              disabled={sending}
            />
            <button onClick={sendMessage} disabled={!input.trim() || sending} className="btn px-3 py-2">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}