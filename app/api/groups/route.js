import { NextResponse } from 'next/server';
const db = require('@/lib/db');

export async function GET(req) {
  const uid = req.cookies.get('uid')?.value;
  const groups = db.prepare(`
    SELECT g.*, u.name as creator_name,
      COUNT(DISTINCT gm.user_id) as member_count,
      CASE WHEN EXISTS(SELECT 1 FROM group_members WHERE group_id = g.id AND user_id = ?) THEN 1 ELSE 0 END as is_member
    FROM study_groups g
    LEFT JOIN users u ON g.creator_id = u.id
    LEFT JOIN group_members gm ON gm.group_id = g.id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all(uid || 0);
  return NextResponse.json({ groups });
}

export async function POST(req) {
  try {
    const uid = req.cookies.get('uid')?.value;
    if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    const { name, description, subject } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Group name required' }, { status: 400 });
    const result = db.prepare('INSERT INTO study_groups (name, description, subject, creator_id) VALUES (?, ?, ?, ?)').run(name.trim(), description || '', subject || '', uid);
    db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)').run(result.lastInsertRowid, uid);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}