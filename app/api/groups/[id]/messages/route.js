import { NextResponse } from 'next/server';
const db = require('@/lib/db');

export async function GET(req, { params }) {
  const uid = req.cookies.get('uid')?.value;
  if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const isMember = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(params.id, uid);
  if (!isMember) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  const messages = db.prepare(`
    SELECT m.*, u.name as author_name, u.roll_number
    FROM group_messages m LEFT JOIN users u ON m.user_id = u.id
    WHERE m.group_id = ? ORDER BY m.created_at ASC
  `).all(params.id);
  return NextResponse.json({ messages });
}

export async function POST(req, { params }) {
  try {
    const uid = req.cookies.get('uid')?.value;
    if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    const isMember = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(params.id, uid);
    if (!isMember) return NextResponse.json({ error: 'Join the group first' }, { status: 403 });
    const { message, type, ref_id, ref_title, ref_summary, ref_subject } = await req.json();
    if (!message?.trim() && !ref_id) return NextResponse.json({ error: 'Message required' }, { status: 400 });
    const finalMessage = message?.trim() || '';
    const metadata = ref_id ? JSON.stringify({ type, ref_id, ref_title, ref_summary, ref_subject }) : null;
    db.prepare('INSERT INTO group_messages (group_id, user_id, message, metadata) VALUES (?, ?, ?, ?)').run(params.id, uid, finalMessage, metadata);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}