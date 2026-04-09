import { NextResponse } from 'next/server';
const db = require('@/lib/db');

export async function POST(req, { params }) {
  try {
    const uid = req.cookies.get('uid')?.value;
    if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    const groupId = params.id;
    const existing = db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, uid);
    if (existing) {
      db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, uid);
      return NextResponse.json({ action: 'left' });
    } else {
      db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').run(groupId, uid);
      return NextResponse.json({ action: 'joined' });
    }
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}