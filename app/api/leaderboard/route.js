import { NextResponse } from 'next/server';
const db = require('@/lib/db');

export async function GET() {
  const topContributors = db.prepare(`
    SELECT u.id, u.name, u.roll_number, u.branch, u.reputation,
      COUNT(DISTINCT n.id) as note_count,
      COUNT(DISTINCT q.id) as question_count,
      COUNT(DISTINCT a.id) as answer_count
    FROM users u
    LEFT JOIN notes n ON n.user_id = u.id
    LEFT JOIN questions q ON q.user_id = u.id
    LEFT JOIN answers a ON a.user_id = u.id AND a.is_ai = 0
    GROUP BY u.id
    ORDER BY u.reputation DESC
    LIMIT 20
  `).all();
  return NextResponse.json({ leaderboard: topContributors });
}