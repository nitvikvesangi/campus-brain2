'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Users, Plus, BookOpen, MessageSquare, X } from 'lucide-react';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => { load(); }, []);

  async function load() {
    const r = await fetch('/api/groups');
    const d = await r.json();
    setGroups(d.groups || []);
  }

  async function createGroup(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, subject }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.id) { setShow(false); setName(''); setDescription(''); setSubject(''); load(); router.push('/groups/' + data.id); }
  }

  async function toggleJoin(e, groupId) {
    e.stopPropagation();
    await fetch('/api/groups/' + groupId, { method: 'POST' });
    load();
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Users size={24} className="text-accent" /> Study Groups</h1>
            <p className="text-muted text-sm mt-1">Join or create groups to study together and share resources.</p>
          </div>
          <button onClick={() => setShow(true)} className="btn"><Plus size={16} /> Create Group</button>
        </div>

        {show && (
          <form onSubmit={createGroup} className="card p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Create New Group</h3>
              <button type="button" onClick={() => setShow(false)} className="text-muted hover:text-white"><X size={18} /></button>
            </div>
            <input className="input" placeholder="Group name *" value={name} onChange={e => setName(e.target.value)} required />
            <textarea className="input min-h-[80px]" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
            <select className="input" value={subject} onChange={e => setSubject(e.target.value)}>
              <option value="">All Subjects</option>
              <option>Operating Systems</option>
              <option>Database Systems</option>
              <option>Computer Networks</option>
              <option>Data Structures</option>
              <option>Algorithms</option>
              <option>Machine Learning</option>
              <option>Compiler Design</option>
            </select>
            <div className="flex gap-2">
              <button className="btn" disabled={loading}>{loading ? 'Creating...' : 'Create & Join'}</button>
              <button type="button" onClick={() => setShow(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        )}

        <div className="grid gap-4">
          {groups.length === 0 && (
            <div className="card p-12 text-center">
              <Users size={40} className="mx-auto text-muted mb-3" />
              <div className="text-muted mb-4">No study groups yet. Create the first one!</div>
            </div>
          )}
          {groups.map(g => (
            <div key={g.id} onClick={() => g.is_member && router.push('/groups/' + g.id)} className={`card p-5 ${g.is_member ? 'cursor-pointer hover:border-accent/40' : ''} transition-colors`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{g.name}</h3>
                    {g.subject && <span className="tag">{g.subject}</span>}
                  </div>
                  {g.description && <p className="text-sm text-muted mb-3">{g.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1"><Users size={12} /> {g.member_count} members</span>
                    <span>Created by {g.creator_name}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <button
                    onClick={(e) => toggleJoin(e, g.id)}
                    className={g.is_member ? 'btn-ghost text-sm' : 'btn text-sm'}
                  >
                    {g.is_member ? 'Leave' : 'Join'}
                  </button>
                  {g.is_member && (
                    <span className="text-xs text-accent">Click to open chat →</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}