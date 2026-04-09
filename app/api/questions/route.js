import { NextResponse } from 'next/server';
const db = require('@/lib/db');
const { generateAnswerForQuestion, generateEmbedding } = require('@/lib/ai');

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const rows = db.prepare(`
    SELECT q.*, u.name as author_name, u.roll_number,
      (SELECT COUNT(*) FROM answers WHERE question_id = q.id) as answer_count
    FROM questions q LEFT JOIN users u ON q.user_id = u.id
    ORDER BY q.created_at DESC
  `).all();
  const questions = rows.map(r => ({ ...r, embedding: undefined }));
  return NextResponse.json({ questions });
}

export async function POST(req) {
  try {
    const uid = req.cookies.get('uid')?.value;
    if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

    const { title, body, subject, tags, is_anonymous } = await req.json();
    if (!title || !body) return NextResponse.json({ error: 'Title and body required' }, { status: 400 });

    const embedding = generateEmbedding(title + ' ' + body + ' ' + (tags || ''));
    const result = db.prepare(`INSERT INTO questions (user_id, title, body, subject, tags, is_anonymous, embedding) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      uid, title, body, subject || '', tags || '', is_anonymous ? 1 : 0, JSON.stringify(embedding)
    );

    const aiAnswer = await generateAnswerForQuestion(title, body);
    db.prepare(`INSERT INTO answers (question_id, user_id, body, is_ai, votes) VALUES (?, NULL, ?, 1, 0)`).run(result.lastInsertRowid, aiAnswer);

    db.prepare('UPDATE users SET reputation = reputation + 5 WHERE id = ?').run(uid);

    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e) {
    console.error('Question create error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const uid = req.cookies.get('uid')?.value;
    if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Question ID required' }, { status: 400 });
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    if (!q) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (q.user_id && q.user_id != uid) return NextResponse.json({ error: 'Not yours' }, { status: 403 });
    db.prepare('DELETE FROM answers WHERE question_id = ?').run(id);
    db.prepare('DELETE FROM questions WHERE id = ?').run(id);
    db.prepare('UPDATE users SET reputation = reputation - 5 WHERE id = ?').run(uid);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}