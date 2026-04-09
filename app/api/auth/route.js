import { NextResponse } from 'next/server';
const db = require('@/lib/db');

function parseCollegeEmail(email) {
  if (!email || !email.toLowerCase().endsWith('.ac.in')) return null;
  const atIdx = email.indexOf('@');
  if (atIdx === -1) return null;
  const localPart = email.slice(0, atIdx).toUpperCase();
  const domain = email.slice(atIdx + 1).toLowerCase();
  const institution = domain.replace('.ac.in', '').split('.').pop();
  // Try to parse VCE-style format: 1602-24-733-028
  const parts = localPart.split('-');
  let rollNumber = localPart;
  let branch = 'Unknown';
  let year = null;
  if (parts.length === 4) {
    rollNumber = localPart;
    year = parts[1];
    const branchCode = parts[2];
    const branchMap = {
      '733': 'CSE', '735': 'ECE', '736': 'EEE',
      '737': 'Mechanical', '738': 'Civil', '739': 'IT',
      '740': 'Chemical', '741': 'Biomedical'
    };
    branch = branchMap[branchCode] || 'Engineering';
  }
  return { rollNumber, branch, year, institution, email: email.toLowerCase() };
}

export async function POST(req) {
  try {
    const { email, name } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    const parsed = parseCollegeEmail(email.trim());
    if (!parsed) return NextResponse.json({ error: 'Please use your college email (.ac.in)' }, { status: 400 });

    let user = db.prepare('SELECT * FROM users WHERE roll_number = ?').get(parsed.rollNumber);
    if (!user) {
      const displayName = name?.trim() || parsed.rollNumber;
      const result = db.prepare('INSERT INTO users (roll_number, name, branch, email) VALUES (?, ?, ?, ?)').run(
        parsed.rollNumber, displayName, parsed.branch, parsed.email
      );
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    const res = NextResponse.json({ user });
    res.cookies.set('uid', String(user.id), { httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 30 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('uid');
  return res;
}

export async function GET(req) {
  const uid = req.cookies.get('uid')?.value;
  if (!uid) return NextResponse.json({ user: null });
  const user = db.prepare('SELECT id, roll_number, name, branch, reputation, email FROM users WHERE id = ?').get(uid);
  return NextResponse.json({ user });
}