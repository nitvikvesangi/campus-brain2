import { NextResponse } from 'next/server';
const db = require('@/lib/db');

export async function GET(req, { params }) {
  const userId = params.id;
  const user = db.prepare('SELECT id, name, roll_number, branch, reputation, created_at FROM users WHERE id = ?').get(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const notes = db.prepare(`
    SELECT id, title, subject, unit, summary, key_topics, created_at
    FROM notes WHERE user_id = ? ORDER BY created_at DESC
  `).all(userId).map(n => ({ ...n, key_topics: JSON.parse(n.key_topics || '[]') }));

  const questions = db.prepare(`
    SELECT id, title, subject, tags, created_at,
      (SELECT COUNT(*) FROM answers WHERE question_id = questions.id) as answer_count
    FROM questions WHERE user_id = ? AND is_anonymous = 0 ORDER BY created_at DESC
  `).all(userId);

  const answers = db.prepare(`
    SELECT a.id, a.body, a.votes, a.created_at, q.id as question_id, q.title as question_title
    FROM answers a JOIN questions q ON a.question_id = q.id
    WHERE a.user_id = ? AND a.is_ai = 0 ORDER BY a.votes DESC LIMIT 5
  `).all(userId);

  const rank = db.prepare(`
    SELECT COUNT(*) + 1 as rank FROM users WHERE reputation > ?
  `).get(user.reputation);

  return NextResponse.json({ user, notes, questions, answers, rank: rank.rank });
}