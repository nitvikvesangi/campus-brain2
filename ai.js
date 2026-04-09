const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey) {
  try { genAI = new GoogleGenerativeAI(apiKey); } catch (e) { console.error('Gemini init failed', e); }
}

function cleanJSON(raw) {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

async function callGemini(prompt) {
  if (!genAI) return null;
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

function fallbackSummary(text) {
  if (!text || text.length < 50) return { summary: text || 'No content to summarize.', topics: [], questions: [] };
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
  const summary = sentences.slice(0, 4).join(' ');
  const words = text.toLowerCase().match(/\b[a-z]{5,}\b/g) || [];
  const freq = {};
  const stop = new Set(['which','where','there','their','about','these','those','would','could','should','being','because','through','during','between','before','after','while','within','without','other','another','first','second','third']);
  words.forEach(w => { if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1; });
  const topics = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);
  return {
    summary,
    topics,
    questions: [
      'Explain the key concepts discussed in this material.',
      'What are the main applications of ' + (topics[0] || 'these concepts') + '?',
      'Compare and contrast ' + (topics[0] || 'X') + ' and ' + (topics[1] || 'Y') + '.',
      'What are the limitations of the approach described?',
    ],
  };
}

async function generateNoteIntelligence(text) {
  const truncated = (text || '').slice(0, 14000);
  if (!genAI) return fallbackSummary(truncated);
  const prompt = `You are an academic assistant. Analyze the following study material.
Respond ONLY with a single valid JSON object, no markdown, no code fences, no explanation before or after.
Use exactly this structure:
{
  "summary": "A clear 4-6 sentence summary of the material",
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "questions": ["exam question 1", "exam question 2", "exam question 3", "exam question 4", "exam question 5"]
}

Study material:
"""
${truncated}
"""`;
  try {
    const raw = await callGemini(prompt);
    if (!raw) return fallbackSummary(truncated);
    const parsed = JSON.parse(cleanJSON(raw));
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 8) : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 6) : [],
    };
  } catch (e) {
    console.error('Gemini note intelligence failed:', e.message);
    return fallbackSummary(truncated);
  }
}

async function generateAnswerForQuestion(title, body) {
  const fallback = 'Start by revisiting the core definitions in your notes, then look at worked examples. Break the problem into smaller parts and combine results.';
  if (!genAI) return fallback;
  try {
    const prompt = `You are a knowledgeable academic tutor helping an engineering student. Give a clear, accurate, educational answer (6-10 sentences). Be specific with definitions, examples, and steps. Do not use generic advice.

Question: ${title}
Details: ${body || 'no additional details'}

Answer:`;
    const raw = await callGemini(prompt);
    return raw || fallback;
  } catch (e) {
    console.error('Gemini answer failed:', e.message);
    return fallback;
  }
}

async function generateChatbotReply(questionTitle, questionBody, history, userMessage, noteContext) {
  const fallback = 'I could not generate a response. Please try again.';
  if (!genAI) return fallback;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    let prompt = '';

    if (noteContext && noteContext.trim().length > 50) {
      prompt += "The following are the student's actual uploaded study notes. Base your answer STRICTLY on these notes. Do not invent information not present in these notes.\n\n";
      prompt += '=== STUDENT NOTES START ===\n' + noteContext + '\n=== STUDENT NOTES END ===\n\n';
    }

    prompt += 'Question context: ' + questionTitle + '\n';
    if (questionBody) prompt += 'Details: ' + questionBody + '\n';

    if (history && history.length > 0) {
      prompt += '\nPrevious conversation:\n';
      history.slice(-6).forEach(h => {
        prompt += (h.role === 'user' ? 'Student: ' : 'Tutor: ') + (h.parts && h.parts[0] ? h.parts[0].text : '') + '\n';
      });
    }

    prompt += '\nStudent now asks: ' + userMessage + '\n\n';
    prompt += 'Answer as a knowledgeable tutor. If student notes are provided above, reference them directly and specifically. Be concise and accurate.';

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.error('Gemini chatbot failed:', e.message);
    return fallback;
  }
}

function generateEmbedding(text) {
  const dim = 256;
  const vec = new Array(dim).fill(0);
  if (!text) return vec;
  const stop = new Set(['the','and','for','are','but','not','you','all','any','can','its','was','has','had','him','his','her','they','this','that','with','from','have','been','were','will','when','then','than','into','also','each','more','most','some','such','over','just','very','much','many','well','even','both','here','does','our','who','now','new','way','use','used','may']);
  const tokens = text.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
  for (const tok of tokens) {
    if (stop.has(tok)) continue;
    let h1 = 0;
    for (let i = 0; i < tok.length; i++) h1 = Math.imul(31, h1) + tok.charCodeAt(i) | 0;
    vec[Math.abs(h1) % dim] += 1.0;
    let h2 = 0x811c9dc5;
    for (let i = 0; i < tok.length; i++) { h2 ^= tok.charCodeAt(i); h2 = Math.imul(h2, 0x01000193) | 0; }
    vec[Math.abs(h2) % dim] += 0.7;
  }
  for (let i = 0; i < tokens.length - 1; i++) {
    if (stop.has(tokens[i]) || stop.has(tokens[i+1])) continue;
    const bigram = tokens[i] + '_' + tokens[i+1];
    let h = 0;
    for (let j = 0; j < bigram.length; j++) h = Math.imul(31, h) + bigram.charCodeAt(j) | 0;
    vec[Math.abs(h) % dim] += 1.5;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

module.exports = { generateNoteIntelligence, generateAnswerForQuestion, generateChatbotReply, generateEmbedding, cosineSimilarity };
