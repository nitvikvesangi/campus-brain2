import { NextResponse } from 'next/server';
const db = require('@/lib/db');

function rankScore(votes, createdAt) {
  const ageHours = (Date.now() / 1000 - createdAt) / 3600;
  return votes + 1 / Math.pow(ageHours + 2, 0.5);
}

export async function GET(req, { params }) {
  const id = params.id;
  const question = db.prepare(`
    SELECT q.*, u.name as author_name, u.roll_number
    FROM questions q LEFT JOIN users u ON q.user_id = u.id
    WHERE q.id = ?
  `).get(id);
  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const answers = db.prepare(`
    SELECT a.*, u.name as author_name, u.roll_number, u.reputation
    FROM answers a LEFT JOIN users u ON a.user_id = u.id
    WHERE a.question_id = ?
  `).all(id);

  answers.sort((a, b) => {
    if (a.is_ai && !b.is_ai) return -1;
    if (!a.is_ai && b.is_ai) return 1;
    return rankScore(b.votes, b.created_at) - rankScore(a.votes, a.created_at);
  });

  // Find related notes using semantic similarity
  const { generateEmbedding, cosineSimilarity } = require('@/lib/ai');
  const queryEmb = generateEmbedding(question.title + ' ' + question.body + ' ' + (question.tags || '') + ' ' + (question.subject || ''));
  const allNotes = db.prepare('SELECT id, title, subject, unit, summary, key_topics, embedding FROM notes').all();
  const relatedNotes = allNotes.map(n => {
    try {
      const emb = JSON.parse(n.embedding || '[]');
      const score = cosineSimilarity(queryEmb, emb);
      return { ...n, score, key_topics: JSON.parse(n.key_topics || '[]'), embedding: undefined };
    } catch { return null; }
  }).filter(n => n && n.score > 0.25).sort((a, b) => b.score - a.score).slice(0, 3);

  return NextResponse.json({ question: { ...question, embedding: undefined }, answers, relatedNotes });
}

export async function POST(req, { params }) {
  const uid = req.cookies.get('uid')?.value;
  if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const { body } = await req.json();
  if (!body) return NextResponse.json({ error: 'Answer body required' }, { status: 400 });

  db.prepare(`INSERT INTO answers (question_id, user_id, body, is_ai, votes) VALUES (?, ?, ?, 0, 0)`).run(params.id, uid, body);
  db.prepare('UPDATE users SET reputation = reputation + 3 WHERE id = ?').run(uid);
  return NextResponse.json({ ok: true });
}
