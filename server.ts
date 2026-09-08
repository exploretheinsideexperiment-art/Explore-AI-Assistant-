import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGemini: !!process.env.GEMINI_API_KEY,
    hasGroq: !!process.env.GROQ_API_KEY
  });
});

function buildSystemPrompt(settings: any): string {
  const personalityMap: Record<string, string> = {
    educational: 'You are an inspiring mentor, scientist, and encyclopedic author who explains complex concepts with great depth, rigorous principles, and real-world analogies.',
    friendly: 'You are warm, empathetic, approachable, and encouraging like a helpful, deeply knowledgeable friend.',
    professional: 'You are authoritative, comprehensive, objective, and structured like a university reference text.',
    technical: 'You are an expert embedded systems and software engineer providing precise architectural details, pinouts, and deep code explanations.',
    general: 'You are a versatile, polite, and deeply knowledgeable personal assistant.'
  };

  const languageInstruction: Record<string, string> = {
    'hi-IN': 'Respond strictly in clear, natural Hindi (Devanagari script or formal Hindi) with complete, book-style depth and comprehensive explanations.',
    'hinglish': 'Respond in natural Hinglish (conversational Hindi written in Roman English alphabet with common English technical terms) with thorough, multi-paragraph book-style depth.',
    'bho-IN': 'Respond warmly in authentic Bhojpuri language with full, thorough explanations.',
    'bn-IN': 'Respond in natural Bengali (Bangla script) with rich, book-style detailed explanations.',
    'mr-IN': 'Respond in natural Marathi (मराठी) with comprehensive, textbook-quality detail.',
    'ta-IN': 'Respond in natural Tamil (தமிழ்) with thorough, detailed explanations.',
    'te-IN': 'Respond in natural Telugu (తెలుగు) with comprehensive, book-style depth.',
    'gu-IN': 'Respond in natural Gujarati (ગુજરાતી) with detailed explanations.',
    'kn-IN': 'Respond in natural Kannada (ಕನ್ನಡ) with thorough, multi-paragraph explanations.',
    'ml-IN': 'Respond in natural Malayalam (മലയാളം) with deep, comprehensive detail.',
    'pa-IN': 'Respond in natural Punjabi (ਪੰਜਾਬੀ) with rich, detailed explanations.',
    'ur-PK': 'Respond in natural Urdu (اردو) with comprehensive book-style explanations.',
    'en-IN': 'Respond in clear, articulate Indian English with thorough, comprehensive, and exhaustive book-style explanations.'
  };

  const lang = settings?.language || 'en-US';
  const langGuide = languageInstruction[lang] || 'Respond in clear, natural English with exhaustive, book-style depth.';
  const personalityGuide = personalityMap[settings?.personality] || personalityMap.educational;

  return `You are Explore AI Assistant, an advanced, highly knowledgeable IoT AI voice companion and encyclopedic tutor.
MISSION & CORE PHILOSOPHY:
Your mission is to provide rich, deeply educational, accurate, and exhaustive explanations across science, technology, physics, electronics, microcontrollers (ESP32, ESP32-S3), programming, history, mathematics, biology, astronomy, and general knowledge.

CRITICAL DIRECTIVE - COMPREHENSIVE BOOK-STYLE IN-DEPTH ANSWERS:
When the user asks ANY question, you MUST answer in FULL DETAIL, EXACTLY LIKE A REFERENCE BOOK OR TEXTBOOK CHAPTER!
- Never provide brief, shallow, truncated, or superficial 1-2 sentence replies.
- Treat every question as a comprehensive learning journey. Provide an in-depth, multi-paragraph explanation covering:
  1. Foundational Definition & Core Concept: Clear, formal introduction to the subject and its fundamental laws or principles.
  2. Historical Context & Origins: When, how, and by whom the concept or technology was discovered, invented, or theorized.
  3. Deep Scientific / Engineering Mechanism: Step-by-step breakdown of how it works under the hood, including physical laws, architecture, components, or mathematics.
  4. Real-World Applications & Examples: Concrete examples, industrial use-cases, and everyday analogies that solidify understanding.
  5. Advanced Insights & Summary: Modern developments, future trajectory, and key takeaways.
- Provide a deeply satisfying, long, multi-paragraph narrative that leaves no question unanswered.

CRITICAL SPOKEN TEXT & CLEAN WORDS DIRECTIVE:
Your answers will be read aloud by an audio text-to-speech voice synthesizer.
- Write strictly in clear, natural spoken sentences and flowing paragraphs.
- NEVER generate markdown tables (no pipes '|' or divider lines). If comparing or listing items, describe them in fluent spoken sentences.
- NEVER use markdown headers with hashes (#, ##, ###).
- NEVER use raw formatting characters like asterisks (**bold**), dashed divider lines, backticks, bullet dashes (- or *), or ASCII symbols.
- Use words instead of symbols and formatting characters, so that only clean, beautiful words are read aloud.
- Jump straight into the substantive explanation without generic preambles like "Sure!" or "Certainly!".

Personality: ${personalityGuide}
Language Requirement: ${langGuide}
${settings?.systemPromptAddition ? 'Additional instructions: ' + settings.systemPromptAddition : ''}`;
}

// Server-side streaming AI endpoint
app.post('/api/chat', async (req, res) => {
  const { query, history = [], settings = {} } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const systemPrompt = buildSystemPrompt(settings);
  const groqApiKey = settings.groqApiKey || process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  // 1. Try Groq if available (sub-200ms latency)
  if (groqApiKey && groqApiKey.trim().length > 5) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-4).map((m: any) => ({ role: m.role, content: m.content })),
        { role: 'user', content: query.trim() }
      ];

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey.trim()}`
        },
        body: JSON.stringify({
          model: settings.groqModel || 'llama-3.1-8b-instant',
          messages,
          temperature: Math.min(settings.temperature || 0.6, 0.7),
          max_tokens: Math.max(settings.maxTokens || 4000, 4500),
          stream: true
        })
      });

      if (groqRes.ok && groqRes.body) {
        const reader = groqRes.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') {
              res.write('data: [DONE]\n\n');
              return res.end();
            }

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
              }
            } catch (e) {}
          }
        }
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    } catch (groqErr) {
      console.warn('[Server] Groq request failed, falling back to Gemini:', groqErr);
    }
  }

  // 2. Try Gemini 3.8 Flash via @google/genai
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const contents = [
        ...history.slice(-4).map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        {
          role: 'user',
          parts: [{ text: query.trim() }]
        }
      ];

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
          maxOutputTokens: Math.max(settings.maxTokens || 4000, 5000)
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (geminiErr) {
      console.error('[Server] Gemini request failed:', geminiErr);
    }
  }

  // 3. Fallback built-in reply if external keys fail
  const fallback = `Explore AI received: "${query.trim()}". The IoT audio assistant is active and operational.`;
  res.write(`data: ${JSON.stringify({ text: fallback })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Explore AI Assistant running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
