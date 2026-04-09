'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Trophy, BookOpen, MessageSquare, Zap, Medal } from 'lucide-react';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(d => {
      setData(d.leaderboard || []);
      setLoading(false);
    });
  }, []);

  const medals = ['🥇', '🥈', '🥉'];
  const topThree = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy size={32} className="text-amber-400" />
            <h1 className="text-3xl font-bold gradient-text">Leaderboard</h1>
            <Trophy size={32} className="text-amber-400" />
          </div>
          <p className="text-muted text-sm">Top contributors ranked by reputation. Earn points by sharing notes, answering questions, and helping peers.</p>
        </div>

        {loading ? (
          <div className="text-muted text-center py-12">Loading...</div>
        ) : (
          <>
            {topThree.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[topThree[1], topThree[0], topThree[2]].filter(Boolean).map((user, i) => {
                  const actualRank = topThree.indexOf(user);
                  const podiumColors = ['bg-gradient-to-b from-amber-400 to-amber-600', 'bg-gradient-to-b from-slate-400 to-slate-600', 'bg-gradient-to-b from-orange-600 to-orange-800'];
                  const podiumHeights = ['h-44', 'h-36', 'h-32'];
                  const podiumIndex = actualRank;
                  return (
                    <div key={user.id} className="flex flex-col items-center">
                      <div className="text-3xl mb-2">{medals[actualRank]}</div>
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-white font-bold text-xl mb-2">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="font-bold text-sm text-center mb-1">{user.name}</div>
                      <div className="text-xs text-muted mb-2">{user.roll_number}</div>
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Zap size={14} />
                        {user.reputation}
                      </div>
                      <div className={`w-full ${podiumColors[podiumIndex]} ${podiumHeights[podiumIndex]} rounded-t-lg mt-3 flex items-center justify-center text-white font-bold text-2xl`}>
                        {actualRank + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="card overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-5 py-3 text-xs text-muted uppercase tracking-wide border-b border-border">
                <div className="col-span-1">Rank</div>
                <div className="col-span-4">Student</div>
                <div className="col-span-2 text-center">Reputation</div>
                <div className="col-span-2 text-center">Notes</div>
                <div className="col-span-2 text-center">Answers</div>
                <div className="col-span-1 text-center">Qs</div>
              </div>
              {data.map((user, i) => (
                <div key={user.id} className={`grid grid-cols-12 gap-2 px-5 py-4 items-center border-b border-border/50 hover:bg-white/5 transition-colors ${i < 3 ? 'bg-accent/5' : ''}`}>
                  <div className="col-span-1 font-bold text-lg">
                    {i < 3 ? medals[i] : <span className="text-muted text-sm">{i + 1}</span>}
                  </div>
                  <div className="col-span-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link href={"/profile/" + user.id} className="font-semibold text-sm hover:text-accent transition-colors">{user.name}</Link>
                        <div className="text-xs text-muted">{user.roll_number} · {user.branch}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="flex items-center justify-center gap-1 font-bold text-amber-400">
                      <Zap size={13} />{user.reputation}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="flex items-center justify-center gap-1 text-sm text-accent">
                      <BookOpen size={12} />{user.note_count}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="flex items-center justify-center gap-1 text-sm text-accent2">
                      <MessageSquare size={12} />{user.answer_count}
                    </span>
                  </div>
                  <div className="col-span-1 text-center text-sm text-muted">{user.question_count}</div>
                </div>
              ))}
              {data.length === 0 && (
                <div className="text-center text-muted py-12">No contributors yet. Be the first!</div>
              )}
            </div>

            <div className="mt-6 card p-5">
              <div className="text-xs uppercase tracking-wide text-muted mb-3">How to earn reputation</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { action: 'Upload a note', points: '+10', color: 'text-green-400' },
                  { action: 'Ask a question', points: '+5', color: 'text-blue-400' },
                  { action: 'Post an answer', points: '+3', color: 'text-purple-400' },
                  { action: 'Receive upvote', points: '+1', color: 'text-amber-400' },
                ].map((item, i) => (
                  <div key={i} className="bg-panel2 rounded-lg p-3 text-center">
                    <div className={`text-xl font-bold ${item.color}`}>{item.points}</div>
                    <div className="text-xs text-muted mt-1">{item.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}