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
    educational: 'You are an inspiring mentor and educator who explains complex technical concepts simply with real-world analogies.',
    friendly: 'You are warm, empathetic, approachable, and encouraging like a helpful friend.',
    professional: 'You are concise, direct, objective, and structured.',
    technical: 'You are an expert embedded systems and software engineer providing precise architectural details, pinouts, and code snippets.',
    general: 'You are a versatile, polite, and helpful personal assistant.'
  };

  const languageInstruction: Record<string, string> = {
    'hi-IN': 'Respond strictly in clear, natural Hindi (Devanagari script or clean formal Hindi).',
    'hinglish': 'Respond in natural Hinglish (conversational Hindi written in Roman English alphabet with common English technical terms).',
    'bho-IN': 'Respond warmly in authentic Bhojpuri language.',
    'bn-IN': 'Respond in natural Bengali (Bangla script).',
    'mr-IN': 'Respond in natural Marathi (मराठी).',
    'ta-IN': 'Respond in natural Tamil (தமிழ்).',
    'te-IN': 'Respond in natural Telugu (తెలుగు).',
    'gu-IN': 'Respond in natural Gujarati (ગુજરાતી).',
    'kn-IN': 'Respond in natural Kannada (ಕನ್ನಡ).',
    'ml-IN': 'Respond in natural Malayalam (മലയാളം).',
    'pa-IN': 'Respond in natural Punjabi (ਪੰਜਾਬੀ).',
    'ur-PK': 'Respond in natural Urdu (اردو).',
    'en-IN': 'Respond in clear Indian English with concise phrasing suitable for voice synthesis.'
  };

  const lang = settings?.language || 'en-US';
  const langGuide = languageInstruction[lang] || 'Respond in clear, natural English.';
  const personalityGuide = personalityMap[settings?.personality] || personalityMap.educational;

  return `You are Explore AI Assistant, an ultra-fast IoT voice assistant for ESP32 hardware and curious minds.
Mission: Answer user questions clearly, accurately, and enthusiastically about science, technology, mathematics, general knowledge, electronics, microcontrollers, and everyday questions.
Voice Rule: Provide a direct, natural spoken response in 1 to 3 engaging, punchy sentences (ideal for speech synthesis). Never say preambles like "Sure!", "Certainly!", or "As an AI". Answer the question directly!
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
          max_tokens: Math.min(settings.maxTokens || 250, 300),
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
          maxOutputTokens: 300
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
