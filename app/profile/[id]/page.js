'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { BookOpen, MessageSquare, Zap, ArrowLeft, Trophy, User, ThumbsUp } from 'lucide-react';

export default function ProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('notes');

  useEffect(() => {
    fetch('/api/profile/' + id).then(r => r.json()).then(d => setData(d));
  }, [id]);

  if (!data || !data.user) return <><Navbar /><div className="p-6 text-muted">Loading...</div></>;

  const { user, notes, questions, answers, rank } = data;

  const stats = [
    { label: 'Reputation', value: user.reputation, icon: Zap, color: 'text-amber-400' },
    { label: 'Global Rank', value: '#' + rank, icon: Trophy, color: 'text-accent' },
    { label: 'Notes', value: notes.length, icon: BookOpen, color: 'text-purple-400' },
    { label: 'Questions', value: questions.length, icon: MessageSquare, color: 'text-cyan-400' },
  ];

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-muted hover:text-white mb-4 text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="card p-6 mb-6 glow-border">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <div className="text-muted text-sm mt-1">{user.roll_number} · {user.branch}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {stats.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="bg-panel2 rounded-xl p-3 text-center border border-border">
                      <div className={`text-2xl font-bold ${s.color} flex items-center justify-center gap-1`}>
                        <Icon size={16} />{s.value}
                      </div>
                      <div className="text-xs text-muted mt-1">{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {['notes', 'questions', 'answers'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border capitalize ${tab === t ? 'bg-accent text-white border-accent' : 'bg-panel border-border text-muted hover:text-white'}`}>
              {t} {t === 'notes' ? '(' + notes.length + ')' : t === 'questions' ? '(' + questions.length + ')' : '(' + answers.length + ')'}
            </button>
          ))}
        </div>

        {tab === 'notes' && (
          <div className="space-y-3">
            {notes.length === 0 && <div className="text-muted text-center py-8">No notes uploaded yet.</div>}
            {notes.map(n => (
              <div key={n.id} className="card p-4">
                <h3 className="font-semibold">{n.title}</h3>
                <div className="text-xs text-muted mt-1 mb-2">{n.subject}{n.unit ? ' · ' + n.unit : ''}</div>
                {n.summary && <p className="text-sm text-gray-300 line-clamp-2">{n.summary}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {n.key_topics.slice(0, 5).map((t, i) => <span key={i} className="tag">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'questions' && (
          <div className="space-y-3">
            {questions.length === 0 && <div className="text-muted text-center py-8">No questions asked yet.</div>}
            {questions.map(q => (
              <div key={q.id} onClick={() => router.push('/qa/' + q.id)} className="card p-4 cursor-pointer hover:border-accent/40 transition-colors">
                <h3 className="font-semibold">{q.title}</h3>
                <div className="text-xs text-muted mt-1">{q.subject || 'General'} · {q.answer_count} answers</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'answers' && (
          <div className="space-y-3">
            {answers.length === 0 && <div className="text-muted text-center py-8">No answers posted yet.</div>}
            {answers.map(a => (
              <div key={a.id} onClick={() => router.push('/qa/' + a.question_id)} className="card p-4 cursor-pointer hover:border-accent/40 transition-colors">
                <div className="text-xs text-muted mb-2">Answer to: <span className="text-accent">{a.question_title}</span></div>
                <p className="text-sm text-gray-300 line-clamp-3">{a.body}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
                  <ThumbsUp size={11} /> {a.votes} votes
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}