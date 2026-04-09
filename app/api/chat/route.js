import { NextResponse } from 'next/server';
const db = require('@/lib/db');
const { generateChatbotReply, generateEmbedding, cosineSimilarity } = require('@/lib/ai');

export const runtime = 'nodejs';
export const maxDuration = 60;

function ensureChatTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','model')),
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_chat_user_question ON chat_messages(user_id, question_id);
  `);
}

function findRelevantNoteContext(queryText) {
  try {
    const queryEmb = generateEmbedding(queryText);
    const notes = db.prepare('SELECT title, summary, extracted_text, embedding FROM notes LIMIT 100').all();
    const scored = notes.map(n => {
      try {
        const score = cosineSimilarity(queryEmb, JSON.parse(n.embedding || '[]'));
        return { score, text: `${n.title}: ${n.summary || ''}\n${(n.extracted_text || '').slice(0, 2000)}` };
      } catch { return { score: 0, text: '' }; }
    }).filter(n => n.score > 0.05).sort((a, b) => b.score - a.score).slice(0, 3);
    return scored.map(n => n.text).join('\n\n') || null;
  } catch { return null; }
}

export async function GET(req) {
  const uid = req.cookies.get('uid')?.value;
  if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get('question_id');
  if (!questionId) return NextResponse.json({ error: 'question_id required' }, { status: 400 });
  ensureChatTable();
  const messages = db.prepare('SELECT role, content, created_at FROM chat_messages WHERE user_id = ? AND question_id = ? ORDER BY created_at ASC').all(uid, questionId);
  return NextResponse.json({ messages });
}

export async function POST(req) {
  try {
    const uid = req.cookies.get('uid')?.value;
    if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    const { question_id, message } = await req.json();
    if (!question_id || !message?.trim()) return NextResponse.json({ error: 'question_id and message required' }, { status: 400 });
    ensureChatTable();
    const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(question_id);
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    const noteContext = findRelevantNoteContext(question.title + ' ' + question.body + ' ' + message);
    const history = db.prepare('SELECT role, content FROM chat_messages WHERE user_id = ? AND question_id = ? ORDER BY created_at ASC').all(uid, question_id).slice(-10).map(r => ({ role: r.role, parts: [{ text: r.content }] }));
    db.prepare('INSERT INTO chat_messages (user_id, question_id, role, content) VALUES (?, ?, ?, ?)').run(uid, question_id, 'user', message.trim());
    const reply = await generateChatbotReply(question.title, question.body, history, message.trim(), noteContext);
    db.prepare('INSERT INTO chat_messages (user_id, question_id, role, content) VALUES (?, ?, ?, ?)').run(uid, question_id, 'model', reply);
    return NextResponse.json({ reply });
  } catch (e) { console.error('Chat error:', e); return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req) {
  const uid = req.cookies.get('uid')?.value;
  if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get('question_id');
  if (!questionId) return NextResponse.json({ error: 'question_id required' }, { status: 400 });
  ensureChatTable();
  db.prepare('DELETE FROM chat_messages WHERE user_id = ? AND question_id = ?').run(uid, questionId);
  return NextResponse.json({ ok: true });
}
