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

    return `You are Explore AI Assistant, an advanced cloud-connected IoT AI voice assistant built for ESP32 and ESP32-S3 hardware.
Your primary mission is to help users learn and explore technology, science, networking, electronics, IoT, microcontrollers, programming, history, mathematics, and general knowledge.
Voice Constraint: Keep responses conversational, engaging, and reasonably concise (2-4 sentences max unless detailed explanation is specifically asked) because your text is read aloud through a MAX98357A speaker.
Personality: ${personalityGuide}
Language Requirement: ${langGuide}
${settings.systemPromptAddition ? 'Additional instructions: ' + settings.systemPromptAddition : ''}`;
  }

  public async generateResponse(
    userMessage: string,
    history: ChatMessage[],
    settings: AgentSettings
  ): Promise<{ text: string; searchUsed: boolean; searchQueries?: string[] }> {
    const systemPrompt = this.buildSystemPrompt(settings);

    // 1. If Groq API Key is supplied
    if (settings.groqApiKey && settings.groqApiKey.trim().length > 5) {
      try {
        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ];

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.groqApiKey.trim()}`
          },
          body: JSON.stringify({
            model: settings.groqModel || 'llama-3.3-70b-versatile',
            messages,
            temperature: settings.temperature,
            max_tokens: settings.maxTokens
          })
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return { text: reply.trim(), searchUsed: false };
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn('[AI] Groq API returned error:', errData);
        }
      } catch (err) {
        console.error('[AI] Groq fetch failed, falling back:', err);
      }
    }

    // 2. Intelligent Built-in Assistant Engine (Default / Mock / Interactive)
    // Provides rich, realistic, educational responses about ESP32, electronics, science, and the Explore AI device
    const q = userMessage.toLowerCase();

    if (q.includes('pin') || q.includes('wiring') || q.includes('hardware') || q.includes('inmp441') || q.includes('max98357')) {
      if (settings.language === 'hi-IN') {
        return {
          text: 'Explore AI Assistant me INMP441 Mic ke liye SCK GPIO 14, WS GPIO 15, aur SD GPIO 32 se jude hain. MAX98357A Amplifier ke DIN GPIO 27, BCLK GPIO 26, aur LRC GPIO 25 par connect hota hai.',
          searchUsed: false
        };
      } else if (settings.language === 'hinglish') {
        return {
          text: 'Explore AI Assistant me INMP441 Microphone I2S pins: SCK GPIO 14, WS GPIO 15, aur SD GPIO 32 par connected hai. MAX98357A speaker amp DIN GPIO 27 aur BCLK GPIO 26 use karta hai. Sabhi pins include/pins.h me centralized hain!',
          searchUsed: false
        };
      }
      return {
        text: 'Explore AI Assistant utilizes dedicated I2S buses: The INMP441 microphone connects to SCK (GPIO 14), WS (GPIO 15), and SD (GPIO 32). The MAX98357A audio amplifier connects to BCLK (GPIO 26), LRC (GPIO 25), and DIN (GPIO 27). Check the Hardware tab for the full visual schematic!',
        searchUsed: false
      };
    }

    if (q.includes('wifi') || q.includes('captive') || q.includes('connect') || q.includes('portal') || q.includes('provision')) {
      return {
        text: 'When first powered on without credentials, Explore AI launches an access point named "Explore AI" at 192.168.4.1. Connecting your phone automatically triggers the captive portal to scan 2.4GHz networks and store encrypted credentials in ESP32 NVS flash.',
        searchUsed: false
      };
    }

    if (q.includes('reset') || q.includes('factory')) {
      return {
        text: 'To factory reset your Explore AI hardware, press and hold the physical Reset button (GPIO 4) for 5 seconds. The 128x64 OLED will show a countdown prompt. Once finished, all Wi-Fi and pairing credentials are wiped from NVS.',
        searchUsed: false
      };
    }

    if (q.includes('who are you') || q.includes('what are you') || q.includes('namaste') || q.includes('hello') || q.includes('hi')) {
      if (settings.language === 'hi-IN') {
        return {
          text: 'नमस्ते! मैं Explore AI Assistant हूँ। मैं ESP32 और क्लाउड AI तकनीक पर आधारित आपका पर्सनल वॉइस असिस्टेंट हूँ। आप मुझसे इलेक्ट्रॉनिक्स, प्रोग्रामिंग या सामान्य ज्ञान के बारे में कुछ भी पूछ सकते हैं।',
          searchUsed: false
        };
      } else if (settings.language === 'hinglish') {
        return {
          text: 'Hello! Main Explore AI Assistant hoon, aapka smart cloud-connected voice companion. Aap mujhse science, ESP32 coding, IoT ya kisi bhi topic par sawal pooch sakte hain!',
          searchUsed: false
        };
      }
      return {
        text: 'Greetings! I am Explore AI Assistant, an open-source cloud-connected embedded AI companion. I can help you learn IoT, microcontrollers, physics, coding, or answer any curiosity you have.',
        searchUsed: false
      };
    }

    // Default high-level response
    const topics = [
      `That is an intriguing question about ${userMessage.slice(0, 35)}... In embedded AI and system design, balancing processing between edge microcontrollers like the ESP32 and cloud LLM inference gives you both low latency and deep reasoning capabilities.`,
      `Regarding "${userMessage}": Explore AI Assistant processes this by streaming your audio through I2S to the backend, transforming voice into tokens, and generating responses using ${settings.groqModel || 'Llama 3.3 70B'}!`,
      `Great topic! Whether exploring electronics, science, or software engineering, continuous experimentation is key. You can also configure your custom Groq API key in Agent Settings for unbounded responses.`
    ];

    const randomReply = topics[Math.floor(Math.random() * topics.length)];
    return {
      text: randomReply,
      searchUsed: false
    };
  }
}

export const aiService = AIService.getInstance();
