'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Plus, FileText, User, Sparkles, ChevronDown, ChevronUp, Trash2, Share2 } from 'lucide-react';

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [subject, setSubject] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [subject]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/notes?subject=${subject}`);
    const data = await res.json();
    setNotes(data.notes || []);
    setLoading(false);
  }

  const [groups, setGroups] = useState([]);
  const [shareModal, setShareModal] = useState(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/groups').then(r => r.json()).then(d => setGroups((d.groups || []).filter(g => g.is_member)));
  }, []);

  async function shareToGroup(note, groupId) {
    await fetch('/api/groups/' + groupId + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '',
        type: 'note',
        ref_id: note.id,
        ref_title: note.title,
        ref_summary: note.summary,
        ref_subject: note.subject,
      }),
    });
    setShareModal(null);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  }

  async function deleteNote(id) {
    if (!confirm('Delete this note?')) return;
    await fetch('/api/notes?id=' + id, { method: 'DELETE' });
    load();
  }

  const subjects = ['all', ...Array.from(new Set(notes.map(n => n.subject)))];

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notes Library</h1>
            <p className="text-muted text-sm">AI-summarized study material organized by subject.</p>
          </div>
          <Link href="/notes/upload" className="btn"><Plus size={16} /> Upload Note</Link>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {subjects.map(s => (
            <button key={s} onClick={() => setSubject(s)} className={`px-4 py-2 rounded-lg text-sm font-medium border ${subject === s ? 'bg-accent text-white border-accent' : 'bg-panel border-border text-muted hover:text-white'}`}>
              {s === 'all' ? 'All Subjects' : s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-muted text-center py-12">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText size={40} className="mx-auto text-muted mb-3" />
            <div className="text-muted mb-4">No notes yet for this subject.</div>
            <Link href="/notes/upload" className="btn">Upload the first one</Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {notes.map(n => {
              const isOpen = expanded[n.id];
              return (
                <div key={n.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{n.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted mb-3">
                        <span className="px-2 py-0.5 rounded bg-accent/10 text-accent">{n.subject}</span>
                        {n.unit && <span>{n.unit}</span>}
                        <Link href={"/profile/" + n.user_id} onClick={e => e.stopPropagation()} className="flex items-center gap-1 hover:text-accent transition-colors"><User size={12} /> {n.author_name}</Link>
                      </div>
                      <div className="flex items-start gap-2 mb-3">
                        <Sparkles size={14} className="text-accent2 mt-1 flex-shrink-0" />
                        <p className="text-sm text-gray-300 leading-relaxed">{n.summary}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {n.key_topics.map((t, i) => <span key={i} className="tag">{t}</span>)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setExpanded({ ...expanded, [n.id]: !isOpen })} className="btn-ghost text-xs flex items-center gap-1">
                        {isOpen ? <>Hide <ChevronUp size={14} /></> : <>Details <ChevronDown size={14} /></>}
                      </button>
                      <button onClick={() => deleteNote(n.id)} className="btn-ghost text-xs flex items-center gap-1 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                      <button onClick={() => setShareModal(n)} className="btn-ghost text-xs flex items-center gap-1 hover:text-accent">
                        <Share2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-5 pt-5 border-t border-border">
                      <div className="text-xs uppercase tracking-wide text-muted mb-2">AI-Generated Probable Exam Questions</div>
                      <ul className="space-y-1.5">
                        {n.exam_questions.map((q, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-accent2">{i + 1}.</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                      {n.file_url && (
                        <a href={n.file_url} target="_blank" className="inline-flex items-center gap-2 mt-4 text-xs text-accent hover:underline">
                          <FileText size={12} /> View original file
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {shareSuccess && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 text-sm font-medium">
          Shared to group successfully!
        </div>
      )}
      {shareModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-1">Share to Group</h3>
            <p className="text-sm text-muted mb-4">Share "{shareModal.title}" to a study group</p>
            {groups.length === 0 ? (
              <div className="text-sm text-muted">You have not joined any groups yet.</div>
            ) : (
              <div className="space-y-2">
                {groups.map(g => (
                  <button key={g.id} onClick={() => shareToGroup(shareModal, g.id)} className="w-full text-left p-3 rounded-lg bg-panel2 border border-border hover:border-accent/40 transition-colors">
                    <div className="font-medium text-sm">{g.name}</div>
                    {g.subject && <div className="text-xs text-muted">{g.subject}</div>}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShareModal(null)} className="btn-ghost w-full mt-3 text-center">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
