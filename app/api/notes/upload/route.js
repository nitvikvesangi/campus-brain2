import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
const db = require('@/lib/db');
const { generateNoteIntelligence, generateEmbedding } = require('@/lib/ai');

export const runtime = 'nodejs';
export const maxDuration = 60;

async function extractPDF(buffer) {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer, { max: 0 });
    const text = (data.text || '').replace(/\x00/g, '').trim();
    if (text.length > 50) return text;
  } catch (e) { console.error('pdf-parse failed:', e.message); }
  try {
    const str = buffer.toString('latin1');
    const texts = [];
    const btEtRe = /BT([\s\S]*?)ET/g;
    let m;
    while ((m = btEtRe.exec(str)) !== null) {
      const strRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
      let sm;
      while ((sm = strRe.exec(m[1])) !== null) {
        const decoded = sm[1].replace(/\\n/g,'\n').replace(/\\r/g,'\r').replace(/\\t/g,'\t').replace(/\\\(/g,'(').replace(/\\\)/g,')').replace(/\\\\/g,'\\');
        if (decoded.trim().length > 1) texts.push(decoded);
      }
    }
    const result = texts.join(' ').replace(/\s+/g, ' ').trim();
    if (result.length > 50) return result;
  } catch (e) { console.error('PDF manual extraction failed:', e.message); }
  return '';
}

async function extractImageText(buffer, mimeType) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return '';
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([{ inlineData: { data: buffer.toString('base64'), mimeType } }, 'Extract ALL text from this image exactly as written. Include headings, bullet points, equations, and diagram descriptions. Output plain text only.']);
    return result.response.text().trim();
  } catch (e) { console.error('Image OCR failed:', e.message); return ''; }
}

export async function POST(req) {
  try {
    const uid = req.cookies.get('uid')?.value;
    if (!uid) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    const formData = await req.formData();
    const file = formData.get('file');
    const title = formData.get('title')?.toString().trim();
    const subject = formData.get('subject')?.toString().trim();
    const unit = formData.get('unit')?.toString().trim() || '';
    const tags = formData.get('tags')?.toString().trim() || '';
    const pastedText = formData.get('text')?.toString().trim() || '';
    if (!title || !subject) return NextResponse.json({ error: 'Title and subject are required' }, { status: 400 });
    let extractedText = pastedText;
    let fileUrl = '';
    let extractionMethod = 'pasted text';
    if (file && typeof file === 'object' && file.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await writeFile(path.join(uploadsDir, safeName), buffer);
      fileUrl = `/uploads/${safeName}`;
      const nameLower = file.name.toLowerCase();
      if (nameLower.endsWith('.pdf')) {
        const pdfText = await extractPDF(buffer);
        if (pdfText.length > 30) { extractedText = pdfText + (pastedText ? '\n\n' + pastedText : ''); extractionMethod = 'pdf'; }
        else { extractionMethod = 'pdf-fallback'; }
      } else if (nameLower.match(/\.(txt|md|csv)$/i)) {
        extractedText = buffer.toString('utf-8') + (pastedText ? '\n\n' + pastedText : ''); extractionMethod = 'text-file';
      } else if (nameLower.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        const mimeMap = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif' };
        const ext = nameLower.split('.').pop();
        const ocrText = await extractImageText(buffer, mimeMap[ext] || 'image/jpeg');
        if (ocrText.length > 30) { extractedText = ocrText + (pastedText ? '\n\n' + pastedText : ''); extractionMethod = 'ocr'; }
      }
    }
    if (!extractedText || extractedText.trim().length < 20) {
      extractedText = [title, subject, unit, tags, pastedText].filter(Boolean).join('. ') + '. No text content could be extracted — analysis based on metadata only.';
      extractionMethod = 'metadata-only';
    }
    console.log(`Extraction: ${extractionMethod}, length: ${extractedText.length}`);
    const ai = await generateNoteIntelligence(extractedText);
    const embedding = generateEmbedding([title, subject, unit, tags, ai.summary, extractedText.slice(0, 2000)].join(' '));
    const result = db.prepare(`INSERT INTO notes (user_id, title, subject, unit, tags, file_url, extracted_text, summary, key_topics, exam_questions, embedding) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uid, title, subject, unit, tags, fileUrl, extractedText.slice(0, 50000), ai.summary, JSON.stringify(ai.topics), JSON.stringify(ai.questions), JSON.stringify(embedding));
    db.prepare('UPDATE users SET reputation = reputation + 10 WHERE id = ?').run(uid);
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ note: { ...note, key_topics: JSON.parse(note.key_topics || '[]'), exam_questions: JSON.parse(note.exam_questions || '[]'), embedding: undefined, extraction_method: extractionMethod } });
  } catch (e) { console.error('Upload error:', e); return NextResponse.json({ error: e.message }, { status: 500 }); }
}
