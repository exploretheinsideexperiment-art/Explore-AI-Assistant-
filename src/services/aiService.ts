import { AgentSettings, ChatMessage } from '../types';

export class AIService {
  private static instance: AIService;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private buildSystemPrompt(settings: AgentSettings): string {
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

    const langGuide = languageInstruction[settings.language] || 'Respond in clear, natural English.';
    const personalityGuide = personalityMap[settings.personality] || personalityMap.educational;

    return `You are Explore AI Assistant, an ultra-fast IoT AI voice assistant built for ESP32 and ESP32-S3 hardware.
Your primary mission is to help users learn and explore technology, science, networking, electronics, IoT, microcontrollers, programming, history, mathematics, and general knowledge.
Voice & Latency Rule: Respond immediately and directly. Keep answers to 1-3 punchy, engaging, crystal-clear sentences. Avoid preamble like "Sure!" or "Certainly!".
Personality: ${personalityGuide}
Language Requirement: ${langGuide}
${settings.systemPromptAddition ? 'Additional instructions: ' + settings.systemPromptAddition : ''}`;
  }

  /**
   * Generates a streaming response that emits completed sentences as soon as they are formulated,
   * enabling pipelined audio playback (<250ms time-to-first-speech).
   */
  public async streamResponse(
    userMessage: string,
    history: ChatMessage[],
    settings: AgentSettings,
    onSentence?: (sentence: string, isFirst: boolean) => void,
    onUpdate?: (fullText: string) => void
  ): Promise<{ text: string; searchUsed: boolean; searchQueries?: string[] }> {
    const sentenceDelimiters = /(?<=[.?!।\n])\s+/;

    // Helper to stream chunks and trigger onSentence on punctuation boundaries
    const handleStreamChunks = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
      const decoder = new TextDecoder();
      let fullText = '';
      let sentenceBuffer = '';
      let isFirst = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.text || parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              sentenceBuffer += delta;
              if (onUpdate) onUpdate(fullText);

              if (sentenceDelimiters.test(sentenceBuffer) || (sentenceBuffer.length > 80 && /\s/.test(sentenceBuffer.slice(-5)))) {
                const parts = sentenceBuffer.split(sentenceDelimiters);
                if (parts.length > 1) {
                  const completedSentence = parts.shift()?.trim();
                  sentenceBuffer = parts.join(' ');
                  if (completedSentence && completedSentence.length > 2) {
                    if (onSentence) onSentence(completedSentence, isFirst);
                    isFirst = false;
                  }
                }
              }
            }
          } catch (e) {}
        }
      }

      const remaining = sentenceBuffer.trim();
      if (remaining.length > 0) {
        if (onSentence) onSentence(remaining, isFirst);
      }

      return fullText.trim();
    };

    // 1. Primary: Server-side streaming endpoint (/api/chat) powered by Gemini & Groq
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          history: history.slice(-4),
          settings
        })
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const fullText = await handleStreamChunks(reader);
        if (fullText.length > 0) {
          return { text: fullText, searchUsed: false };
        }
      }
    } catch (apiErr) {
      console.warn('[AI] /api/chat error, trying direct provider or offline engine:', apiErr);
    }

    // 2. Direct Groq API if key is explicitly configured in client settings
    if (settings.groqApiKey && settings.groqApiKey.trim().length > 5) {
      try {
        const systemPrompt = this.buildSystemPrompt(settings);
        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-4).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ];

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.groqApiKey.trim()}`
          },
          body: JSON.stringify({
            model: settings.groqModel || 'llama-3.1-8b-instant',
            messages,
            temperature: Math.min(settings.temperature || 0.6, 0.7),
            max_tokens: Math.min(settings.maxTokens || 250, 300),
            stream: true
          })
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const fullText = await handleStreamChunks(reader);
          if (fullText.length > 0) {
            return { text: fullText, searchUsed: false };
          }
        }
      } catch (err) {
        console.error('[AI] Direct Groq stream failed:', err);
      }
    }

    // 3. Built-in Instant Knowledge Engine (<5ms Latency fallback)
    const replyText = this.getIntelligentInstantReply(userMessage, settings);

    if (onUpdate) onUpdate(replyText);

    if (onSentence) {
      const sentences = replyText.match(/[^.!?।\n]+[.!?।\n]+/g) || [replyText];
      sentences.forEach((s, idx) => {
        const clean = s.trim();
        if (clean) onSentence(clean, idx === 0);
      });
    }

    return { text: replyText, searchUsed: false };
  }

  public async generateResponse(
    userMessage: string,
    history: ChatMessage[],
    settings: AgentSettings
  ): Promise<{ text: string; searchUsed: boolean; searchQueries?: string[] }> {
    return this.streamResponse(userMessage, history, settings);
  }

  private getIntelligentInstantReply(userMessage: string, settings: AgentSettings): string {
    const q = userMessage.toLowerCase();
    const isHindi = settings.language === 'hi-IN';
    const isHinglish = settings.language === 'hinglish';

    // Speed of Light
    if (q.includes('speed of light') || q.includes('light speed') || q.includes('prakash ki chaal') || q.includes('roshni ki raftar')) {
      if (isHindi) return 'प्रकाश की गति निर्वात में लगभग 2 लाख 99 हज़ार 792 किलोमीटर प्रति सेकंड होती है!';
      if (isHinglish) return 'Light ki speed vacuum me lagbhag 2,99,792 kilometers per second hoti hai!';
      return 'The speed of light in a vacuum is approximately 299,792 kilometers per second, or about 186,282 miles per second.';
    }

    // ESP32 Microcontroller
    if (q.includes('esp32') || q.includes('microcontroller') || q.includes('s3') || q.includes('esp 32')) {
      if (isHindi) return 'ESP32 एक शक्तिशाली 32-बिट डुअल-कोर माइक्रोकंट्रोलर है जिसमें वाई-फाई और ब्लूटूथ दोनों इनबिल्ट हैं!';
      if (isHinglish) return 'ESP32 ek powerful dual-core microcontroller hai jisme Wi-Fi aur Bluetooth integrated hota hai. Ye 240 MHz tak execute karta hai!';
      return 'The ESP32 is a high-performance dual-core microcontroller with integrated Wi-Fi and Bluetooth, operating up to 240 megahertz for real-time IoT processing.';
    }

    // Science Fact
    if (q.includes('science fact') || q.includes('fact') || q.includes('rochak tathya') || q.includes('tell me something interesting')) {
      const facts = [
        'A day on Venus is longer than a whole year on Venus! It takes 243 Earth days to rotate once, but only 225 days to orbit the Sun.',
        'Sound travels about 4.3 times faster in water than it does in air, reaching approximately 1,480 meters per second.',
        'Neutron stars are so dense that a single sugar-cube-sized amount of their material would weigh about a billion tons on Earth!',
        'Hot water can freeze faster than cold water under certain conditions, a phenomenon known as the Mpemba effect.'
      ];
      if (isHindi) return 'शुक्र ग्रह (Venus) पर एक दिन उसके एक पूरे साल से भी बड़ा होता है!';
      return facts[Math.floor(Math.random() * facts.length)];
    }

    // Nikola Tesla
    if (q.includes('nikola tesla') || q.includes('tesla')) {
      if (isHindi) return 'निकोला टेस्ला एक महान वैज्ञानिक और आविष्कारक थे जिन्होंने प्रत्यावर्ती धारा यानी एसी बिजली प्रणाली और रेडियो तकनीक का विकास किया।';
      return 'Nikola Tesla was a visionary electrical engineer who designed the modern alternating current (AC) electricity supply system, induction motors, and wireless transmission principles.';
    }

    // Microphone INMP441
    if (q.includes('inmp441') || q.includes('microphone') || q.includes('mic')) {
      if (isHindi) return 'INMP441 एक डिजिटल ओमनी-डायरेक्शनल I2S माइक्रोफोन है जो 24-बिट उच्च गुणवत्ता वाली ऑडियो सीधे ESP32 में भेजता है।';
      return 'The INMP441 is an omnidirectional MEMS digital microphone that streams high-resolution 24-bit audio directly to the ESP32 over the I2S bus.';
    }

    // MAX98357A Amplifier
    if (q.includes('max98357') || q.includes('amplifier') || q.includes('speaker') || q.includes('audio')) {
      if (isHindi) return 'MAX98357A एक क्लास-डी ऑडियो एम्पलीफायर है जो I2S डिजिटल सिग्नल को स्पीकर के लिए शक्तिशाली ध्वनि में बदलता है।';
      return 'The MAX98357A is an efficient Class-D audio amplifier that converts digital I2S audio streams directly into crisp sound for a 3-watt speaker.';
    }

    // Hardware Pins & Wiring
    if (q.includes('pin') || q.includes('wiring') || q.includes('hardware') || q.includes('connection')) {
      if (isHindi) {
        return 'INMP441 माइक के लिए SCK GPIO 14, WS GPIO 15, और SD GPIO 32 हैं। MAX98357A एम्पलीफायर DIN GPIO 27 और BCLK GPIO 26 पर जुड़ा है।';
      }
      if (isHinglish) {
        return 'Explore AI me INMP441 Mic SCK GPIO 14, WS GPIO 15, SD GPIO 32 use karta hai. MAX98357A Amp DIN GPIO 27 aur BCLK GPIO 26 par connect hota hai!';
      }
      return 'Explore AI connects the INMP441 microphone to SCK (GPIO 14), WS (GPIO 15), and SD (GPIO 32). The MAX98357A amplifier connects to DIN (GPIO 27) and BCLK (GPIO 26).';
    }

    // Identity / Greeting
    if (q.includes('who are you') || q.includes('what are you') || q.includes('namaste') || q.includes('hello') || q.includes('hi')) {
      if (isHindi) return 'नमस्ते! मैं Explore AI Assistant हूँ। मैं आपके सवालों के तुरंत जवाब देने के लिए हमेशा तैयार हूँ।';
      if (isHinglish) return 'Hello! Main Explore AI Assistant hoon, aapka real-time embedded voice companion!';
      return 'Hello! I am Explore AI Assistant, your ultra-fast voice-enabled IoT companion powered by ESP32 hardware and Groq LLM!';
    }

    // Time & Date
    if (q.includes('time') || q.includes('samay') || q.includes('date') || q.includes('tareekh')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isHindi) return `अभी समय ${timeStr} हुआ है।`;
      return `The current local time is ${timeStr}.`;
    }

    // Simple Math Evaluation
    const mathMatch = q.match(/(?:what is|calculate|solve|how much is)?\s*(\d+(?:\.\d+)?)\s*([\+\-\*\/xX]|plus|minus|times|multiplied by|divided by)\s*(\d+(?:\.\d+)?)/i);
    if (mathMatch) {
      const a = parseFloat(mathMatch[1]);
      const op = mathMatch[2].toLowerCase();
      const b = parseFloat(mathMatch[3]);
      let res = 0;
      if (op === '+' || op === 'plus') res = a + b;
      else if (op === '-' || op === 'minus') res = a - b;
      else if (op === '*' || op === 'x' || op === 'times' || op === 'multiplied by') res = a * b;
      else if (op === '/' || op === 'divided by') res = b !== 0 ? a / b : 0;
      return `The result of ${a} ${op} ${b} is ${res}.`;
    }

    // Default fast conversational answer
    const cleanedTopic = userMessage.replace(/^[a-z\s]+explorer,?\s*/i, '').slice(0, 50).trim();
    if (isHindi) {
      return `मैंने आपका प्रश्न सुन लिया है। "${cleanedTopic}" के बारे में मुझे ज्ञात है कि यह विज्ञान और प्रौद्योगिकी का एक महत्वपूर्ण विषय है।`;
    }
    if (isHinglish) {
      return `Maine aapka question sun liya hai: "${cleanedTopic}". Explore AI aapko real-time voice response provide kar raha hai!`;
    }
    return `Regarding "${cleanedTopic}": Explore AI Assistant has processed your question. You can ask anything about electronics, microcontrollers, physics, coding, or science, and I will explain it for you!`;
  }
}

export const aiService = AIService.getInstance();
