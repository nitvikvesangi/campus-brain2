import { NextResponse } from 'next/server';
const db = require('@/lib/db');
const { generateEmbedding, cosineSimilarity } = require('@/lib/ai');

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const subject = searchParams.get('subject');
  const mode = searchParams.get('mode') || 'hybrid';

  if (!q) return NextResponse.json({ notes: [], questions: [] });

  const queryEmb = generateEmbedding(q);

  let noteRows = db.prepare(`
    SELECT n.*, u.name as author_name, u.roll_number FROM notes n LEFT JOIN users u ON n.user_id = u.id
    ${subject && subject !== 'all' ? 'WHERE n.subject = ?' : ''}
  `).all(...(subject && subject !== 'all' ? [subject] : []));

  noteRows = noteRows.map(n => {
    const haystack = (n.title + ' ' + n.subject + ' ' + (n.tags||'') + ' ' + (n.summary||'') + ' ' + (n.extracted_text||'')).toLowerCase();
    const keywordScore = haystack.includes(q.toLowerCase()) ? 1 : 0;
    let semScore = 0;
    try {
      const emb = JSON.parse(n.embedding || '[]');
      semScore = cosineSimilarity(queryEmb, emb);
    } catch {}
    let score = 0;
    if (mode === 'keyword') score = keywordScore;
    else if (mode === 'semantic') score = semScore;
    else score = keywordScore * 0.6 + semScore * 0.4;
    return { ...n, score, key_topics: n.key_topics ? JSON.parse(n.key_topics) : [], embedding: undefined };
  }).filter(n => n.score > 0.02).sort((a,b) => b.score - a.score).slice(0, 10);

  let qRows = db.prepare(`
    SELECT q.*, u.name as author_name, u.roll_number,
      (SELECT COUNT(*) FROM answers WHERE question_id = q.id) as answer_count
    FROM questions q LEFT JOIN users u ON q.user_id = u.id
  `).all();

  qRows = qRows.map(qr => {
    const haystack = (qr.title + ' ' + qr.body + ' ' + (qr.tags||'')).toLowerCase();
    const kw = haystack.includes(q.toLowerCase()) ? 1 : 0;
    let sem = 0;
    try { sem = cosineSimilarity(queryEmb, JSON.parse(qr.embedding || '[]')); } catch {}
    const score = mode === 'keyword' ? kw : mode === 'semantic' ? sem : kw * 0.6 + sem * 0.4;
    return { ...qr, score, embedding: undefined };
  }).filter(r => r.score > 0.02).sort((a,b) => b.score - a.score).slice(0, 10);

  return NextResponse.json({ notes: noteRows, questions: qRows, mode });
}
