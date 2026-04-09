import { NextResponse } from 'next/server';
const db = require('@/lib/db');

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const subject = searchParams.get('subject');
  let rows;
  if (subject && subject !== 'all') {
    rows = db.prepare(`
      SELECT n.*, u.name as author_name, u.roll_number
      FROM notes n LEFT JOIN users u ON n.user_id = u.id
      WHERE n.subject = ? ORDER BY n.created_at DESC
    `).all(subject);
  } else {
    rows = db.prepare(`
      SELECT n.*, u.name as author_name, u.roll_number
      FROM notes n LEFT JOIN users u ON n.user_id = u.id
      ORDER BY n.created_at DESC
    `).all();
  }
  const notes = rows.map(r => ({
    ...r,
    key_topics: r.key_topics ? JSON.parse(r.key_topics) : [],
    exam_questions: r.exam_questions ? JSON.parse(r.exam_questions) : [],
    embedding: undefined,
    user_id: r.user_id,
  }));
  return NextResponse.json({ notes });
}

export async function DELETE(req) {
  try {
    const uid = req.cookies.get('uid')?.value;
    if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Note ID required' }, { status: 400 });
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (note.user_id && note.user_id != uid) return NextResponse.json({ error: 'Not yours' }, { status: 403 });
    db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    db.prepare('UPDATE users SET reputation = reputation - 10 WHERE id = ?').run(uid);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}