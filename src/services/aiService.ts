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
      'en-IN': 'Respond in clear, articulate Indian English with thorough, comprehensive, and detailed explanations.'
    };

    const langGuide = languageInstruction[settings.language] || 'Respond in clear, natural English.';
    const personalityGuide = personalityMap[settings.personality] || personalityMap.educational;

    return `You are Explore AI Assistant, an advanced, highly articulate IoT AI voice assistant built for ESP32 and ESP32-S3 hardware.
Your primary mission is to help users learn, understand, and explore science, technology, networking, electronics, IoT, microcontrollers, programming, history, mathematics, and general knowledge.
CRITICAL ANSWER DEPTH & LENGTH DIRECTIVE:
When the user asks any question, DO NOT give short, brief, or shallow answers. Always provide comprehensive, detailed, informative, and long answers!
Thoroughly explain underlying concepts, architectural mechanisms, key components or stages, real-world examples, and step-by-step clarity. Give a full, deeply satisfying multi-paragraph explanation rather than a truncated summary.
Avoid preambles like "Sure!" or "Certainly!". Jump straight into your comprehensive, informative explanation.
CRITICAL SPOKEN TEXT & CLEAN WORDS DIRECTIVE:
Your answers will be read aloud by an audio text-to-speech voice synthesizer.
Write strictly in clear, natural spoken sentences and paragraphs.
NEVER generate markdown tables (no '|' pipes or '|---|---|' dividers). If comparing or listing items, describe them in fluent spoken sentences.
NEVER use markdown headers with '#' or '##'.
NEVER use raw formatting characters like asterisks, dashed divider lines, backticks, bullet dashes, or ASCII symbols.
Use words instead of symbols and formatting characters, so that only clean words are read aloud.
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
            max_tokens: Math.max(settings.maxTokens || 2000, 2500),
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

    // 3. Built-in Comprehensive Knowledge Engine (Detailed, in-depth long answers)
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
      if (isHindi) {
        return 'प्रकाश की गति निर्वात में बिल्कुल 299,792,458 मीटर प्रति सेकंड (लगभग 3 लाख किलोमीटर प्रति सेकंड) होती है। भौतिकी में इसे सार्वभौमिक स्थिरांक "c" द्वारा दर्शाया जाता है। अल्बर्ट आइंस्टीन के सापेक्षता के सिद्धांत (Theory of Special Relativity) के अनुसार, ब्रह्मांड में किसी भी द्रव्यमान वाले पदार्थ या सूचना के संचरण की यह अधिकतम सीमा है। जब प्रकाश हवा, कांच या पानी जैसे सघन माध्यमों से गुजरता है, तो अपवर्तनांक (Refractive Index) के कारण इसकी गति थोड़ी कम हो जाती है। उदाहरण के लिए, पानी में यह गति लगभग 225,000 किलोमीटर प्रति सेकंड हो जाती है।';
      }
      if (isHinglish) {
        return 'Speed of light vacuum me exactly 299,792 kilometers per second hoti hai, jise round figure me hum 3 lakh kilometers per second kehte hain! Albert Einstein ki Theory of Relativity ke mutabik, universe me koi bhi object jisme mass ho, wo is speed se tezi se travel nahi kar sakta. Suraj ki roshni ko Dharti tak aane me lagbhag 8 minute aur 20 second ka waqt lagta hai.';
      }
      return 'The speed of light in a vacuum is exactly 299,792,458 meters per second (approximately 186,282 miles per second or roughly 300,000 kilometers per second). Denoted by the symbol "c" in Albert Einstein\'s famous equation E = mc², it represents the absolute cosmic speed limit for the transmission of all matter, energy, and information in the universe. When light travels through dense transparent media such as water, glass, or optical fiber, its effective velocity decreases proportionally according to the material\'s refractive index.';
    }

    // ESP32 Microcontroller
    if (q.includes('esp32') || q.includes('microcontroller') || q.includes('s3') || q.includes('esp 32')) {
      if (isHindi) {
        return 'ESP32 एस्प्रेसिफ सिस्टम्स द्वारा निर्मित एक अत्यंत शक्तिशाली और लोकप्रिय 32-बिट माइक्रोकंट्रोलर है। इसमें 240 मेगाहर्ट्ज पर चलने वाला Xtensa ड्यूल-कोर प्रोसेसर, 520 किलोबाइट SRAM, और बिल्ट-इन 2.4 गीगाहर्ट्ज वाई-फाई और ब्लूटूथ 4.2 / BLE शामिल हैं। यह I2S, I2C, SPI, UART, और कैपेसिटिव टच सेंसर्स जैसे समृद्ध परिधीय इंटरफेस का समर्थन करता है। Explore AI में हम इसके ड्यूल-कोर आर्किटेक्चर का उपयोग करते हैं: एक कोर वास्तविक समय में I2S डिजिटल माइक्रोफोन और स्पीकर ऑडियो को प्रोसेस करता है, जबकि दूसरा कोर वाई-फाई नेटवर्किंग और क्लाउड एलएलएम संचार संभालता है।';
      }
      if (isHinglish) {
        return 'ESP32 Espressif Systems ka banaya hua ek flagship dual-core 32-bit microcontroller hai. Isme 240 MHz ki clock speed, integrated Wi-Fi aur Bluetooth LE milta hai. Explore AI Assistant me ye device I2S protocol ke zariye INMP441 digital microphone se clear 24-bit audio capture karta hai, aur MAX98357A amplifier ke zariye speaker par crisp audio play karta hai. Iska ek core audio processing sambhalta hai aur doosra core fast Wi-Fi communication execute karta hai.';
      }
      return 'The ESP32 is a versatile system-on-a-chip (SoC) microcontroller engineered by Espressif Systems. Powered by a dual-core 32-bit Xtensa LX6 microprocessor clocked up to 240 MHz, it integrates 520 KB of internal SRAM and dedicated hardware transceivers for both 2.4 GHz 802.11 b/g/n Wi-Fi and Bluetooth 4.2 / Bluetooth Low Energy. In our Explore AI architecture, the ESP32 utilizes high-speed I2S peripheral interfaces to continuously acquire uncompressed 24-bit digital audio from the INMP441 MEMS microphone, stream voice packets to our AI inference pipeline, and feed synthesized audio directly to the MAX98357A I2S Class-D amplifier.';
    }

    // Science Fact
    if (q.includes('science fact') || q.includes('fact') || q.includes('rochak tathya') || q.includes('tell me something interesting')) {
      if (isHindi) {
        return 'विज्ञान का एक अद्भुत तथ्य: शुक्र ग्रह (Venus) पर एक दिन उसके पूरे एक वर्ष से भी अधिक लंबा होता है! शुक्र ग्रह को अपनी धुरी पर केवल एक चक्कर (रोटेशन) पूरा करने में पृथ्वी के लगभग 243 दिन लगते हैं, जबकि सूर्य के चारों ओर एक परिक्रमा (ऑर्बिट) पूरी करने में केवल 225 पृथ्वी दिन लगते हैं। इसके अतिरिक्त, शुक्र ग्रह हमारे सौरमंडल के अन्य ग्रहों के विपरीत दिशा (पूर्व से पश्चिम) में उल्टा घूमता है, जिसका अर्थ है कि वहाँ सूर्य पश्चिम में उगता है और पूर्व में अस्त होता है!';
      }
      return 'Here is a fascinating astrophysical fact: A single day on Venus is actually longer than an entire Venusian year! It takes Venus approximately 243 Earth days to complete just one single axial rotation, but only 225 Earth days to complete a full orbital revolution around the Sun. Furthermore, Venus possesses a retrograde rotation—meaning it spins clockwise on its axis in the reverse direction compared to most planets in our solar system, causing the Sun to rise in the west and set in the east!';
    }

    // Nikola Tesla
    if (q.includes('nikola tesla') || q.includes('tesla')) {
      if (isHindi) {
        return 'निकोला टेस्ला (1856-1943) एक दूरदर्शी सर्बियाई-अमेरिकी आविष्कारक, इलेक्ट्रिकल और मैकेनिकल इंजीनियर थे। उन्हें आधुनिक अल्टरनेटिंग करंट (AC) विद्युत आपूर्ति प्रणाली, इंडक्शन मोटर, टेस्ला कॉइल, और वायरलेस संचार के मौलिक सिद्धांतों के आविष्कार का जनक माना जाता है। थॉमस एडिसन के डायरेक्ट करंट (DC) के मुकाबले टेस्ला के एसी करंट ने लंबी दूरी तक न्यूनतम ऊर्जा हानि के साथ उच्च वोल्टेज पर बिजली का संचरण संभव बनाया, जिसने दुनिया भर में औद्योगिक क्रांति और आधुनिक बिजली ग्रिड को जन्म दिया।';
      }
      return 'Nikola Tesla (1856–1943) was a Serbian-American inventor, electrical engineer, and mechanical visionary whose breakthrough innovations formed the foundation of the modern electrical age. His crowning technical contribution was the development of polyphase Alternating Current (AC) electrical distribution systems and the AC induction motor, licensed to George Westinghouse during the historic "War of Currents". Tesla\'s designs proved that alternating current could be stepped up to high voltages via transformers for efficient, long-distance transmission with negligible thermal dissipation.';
    }

    // Microphone INMP441
    if (q.includes('inmp441') || q.includes('microphone') || q.includes('mic')) {
      if (isHindi) {
        return 'INMP441 एक अत्याधुनिक, उच्च प्रदर्शन वाला डिजिटल ओमनी-डायरेक्शनल MEMS माइक्रोफोन है। पारंपरिक एनालॉग माइक्रोफोन के विपरीत, INMP441 में माइक्रोफोन कैप्सूल, एनालॉग-टू-डिजिटल कनवर्टर (ADC), और I2S सीरियल डिजिटल इंटरफेस सीधे एक ही सिलिकॉन चिप पर एकीकृत होते हैं। यह 24-बिट डिजिटल सिग्नल सीधे ESP32 को प्रदान करता है, जिससे एनालॉग लाइनों में होने वाले इलेक्ट्रोमैग्नेटिक शोर और वाई-फाई ट्रांसमिशन से होने वाले आरएफ इंटरफेरेंस की समस्या पूरी तरह समाप्त हो जाती है। इसके कनेक्शन में SCK (बिट क्लॉक), WS (वर्ड सेलेक्ट), और SD (सीरियल डेटा) शामिल हैं।';
      }
      return 'The INMP441 is an omnidirectional MEMS (Micro-Electro-Mechanical Systems) digital microphone designed for high-fidelity embedded audio applications. Unlike analog microphones that require external preamplifiers and analog-to-digital converters, the INMP441 contains an integrated low-noise acoustic sensor, an ADC, and an industry-standard Inter-IC Sound (I2S) interface right on the die. It directly outputs a 24-bit PCM digital stream over three dedicated lines: Serial Clock (SCK), Word Select (WS/LRCK), and Serial Data (SD), making it completely immune to Wi-Fi RF noise and ambient electromagnetic hum.';
    }

    // MAX98357A Amplifier
    if (q.includes('max98357') || q.includes('amplifier') || q.includes('speaker') || q.includes('audio')) {
      if (isHindi) {
        return 'MAX98357A मैक्सिम इंटीग्रेटेड द्वारा निर्मित एक उच्च दक्षता वाला डिजिटल I2S इनपुट क्लास-डी ऑडियो एम्पलीफायर है। यह ESP32 से डिजिटल आई2एस ऑडियो डेटा प्राप्त करता है और बिना किसी बाहरी डीएसी (डिजिटल-टू-एनालॉग कनवर्टर) के सीधे 3.2 वॉट तक आउटपुट 4-ओम या 8-ओम स्पीकर को प्रदान करता है। इसकी दक्षता 92% तक होती है, जिससे यह बहुत कम बिजली खपत करता है और गर्म नहीं होता। इसके पिनों में DIN (डेटा इनपुट), BCLK (बिट क्लॉक), और LRC (लेफ्ट-राइट क्लॉक) शामिल हैं।';
      }
      return 'The MAX98357A is an integrated Class-D audio amplifier engineered with a digital Inter-IC Sound (I2S) input. Operating without requiring an external DAC, it accepts uncompressed digital PCM audio straight from the ESP32 and delivers up to 3.2 Watts of continuous audio power into a 4-ohm speaker at 92% efficiency. Its filterless spread-spectrum modulation minimizes electromagnetic radiation and eliminates bulky external LC filters, producing crystal-clear acoustic fidelity with minimal thermal dissipation.';
    }

    // Hardware Pins & Wiring
    if (q.includes('pin') || q.includes('wiring') || q.includes('hardware') || q.includes('connection')) {
      if (isHindi) {
        return 'Explore AI के मानक हार्डवेयर वायरिंग पिन: INMP441 डिजिटल माइक्रोफोन के लिए: SCK को GPIO 14, WS को GPIO 15, और SD को GPIO 32 से जोड़ें। MAX98357A क्लास-डी एम्पलीफायर के लिए: DIN को GPIO 27, BCLK को GPIO 26, और LRC को GPIO 25 से जोड़ें। 0.96 इंच I2C OLED डिस्प्ले के लिए: SDA को GPIO 21 और SCL को GPIO 22 से कनेक्ट करें। 2-चैनल या 4-चैनल रिले मॉड्यूल को GPIO 18 और GPIO 19 से नियंत्रित किया जाता है। सभी मॉड्यूलों का GND और VCC (3.3V / 5V) सामान्य ग्राउंड से जुड़ा होना चाहिए।';
      }
      if (isHinglish) {
        return 'Explore AI Assistant ke official hardware wiring pins: INMP441 Mic ke liye SCK = GPIO 14, WS = GPIO 15, SD = GPIO 32 connect hota hai. MAX98357A Amp ke liye DIN = GPIO 27, BCLK = GPIO 26, LRC = GPIO 25 judta hai. SSD1306 OLED Display ke liye SDA = GPIO 21 aur SCL = GPIO 22 standard I2C bus par hain. Relay channels GPIO 18 aur GPIO 19 par switch kiye jaate hain.';
      }
      return 'Here is the comprehensive hardware pin configuration for the Explore AI smart assistant: For the INMP441 I2S MEMS Microphone, connect SCK (Bit Clock) to GPIO 14, WS (Word Select) to GPIO 15, and SD (Serial Data) to GPIO 32. For the MAX98357A I2S Class-D Amplifier, connect DIN (Data In) to GPIO 27, BCLK (Bit Clock) to GPIO 26, and LRC (Left/Right Clock) to GPIO 25. For the SSD1306 0.96-inch OLED display, connect SDA to GPIO 21 and SCL to GPIO 22. Relay channels are mapped to GPIO 18 and GPIO 19. All modules must share a stable common ground.';
    }

    // Identity / Greeting
    if (q.includes('who are you') || q.includes('what are you') || q.includes('namaste') || q.includes('hello') || q.includes('hi')) {
      if (isHindi) {
        return 'नमस्ते! मैं Explore AI Assistant हूँ, आपका उन्नत, बुद्धिमान और व्यक्तिगत वॉयस साथी। मुझे विशेष रूप से ESP32 और ESP32-S3 माइक्रोकंट्रोलर हार्डवेयर, आईओटी सेंसर्स, और आधुनिक कृत्रिम बुद्धिमत्ता के तालमेल से तैयार किया गया है। आप मुझसे विज्ञान, इलेक्ट्रॉनिक्स, कोडिंग, रोबोटिक्स, गणित, या किसी भी सामान्य ज्ञान के विषय पर गहन और विस्तृत प्रश्न पूछ सकते हैं, और मैं आपको संपूर्ण एवं ज्ञानवर्धक उत्तर प्रदान करूँगा!';
      }
      if (isHinglish) {
        return 'Hello! Main Explore AI Assistant hoon, aapka advanced IoT voice companion. Mujhe ESP32 hardware, I2S digital audio, aur modern AI models ke saath design kiya gaya hai taaki aap electronics, coding, science aur general knowledge ke har sawal ka detailed aur comprehensive answer paa sakein. Poochiye, aap kya seekhna chahte hain!';
      }
      return 'Hello and welcome! I am the Explore AI Assistant, your advanced voice-enabled intelligent companion designed for ESP32 and ESP32-S3 IoT hardware. I am architected to provide thorough, in-depth, and deeply educational explanations across science, microcontroller engineering, electronics, computer programming, physics, and world knowledge. Please ask any question, and I will be delighted to provide a comprehensive, detailed breakdown for you!';
    }

    // Time & Date
    if (q.includes('time') || q.includes('samay') || q.includes('date') || q.includes('tareekh')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (isHindi) {
        return `वर्तमान स्थानीय समय ठीक ${timeStr} है, और आज की तारीख ${dateStr} है। ESP32 हार्डवेयर में समय को वाई-फाई के माध्यम से NTP (नेटवर्क टाइम प्रोटोकॉल) सर्वर से मिलीसेकंड की सटीकता के साथ स्वचालित रूप से सिंक्रनाइज़ किया जाता है।`;
      }
      return `The current local time is ${timeStr}, on ${dateStr}. In our embedded ESP32 runtime, internal real-time clock registers are automatically synchronized against global NTP (Network Time Protocol) servers over Wi-Fi with sub-millisecond precision.`;
    }

    // Simple Math Evaluation
    const mathMatch = q.match(/(?:what is|calculate|solve|how much is)?\s*(\d+(?:\.\d+)?)\s*([\+\-\*\/xX]|plus|minus|times|multiplied by|divided by)\s*(\d+(?:\.\d+)?)/i);
    if (mathMatch) {
      const a = parseFloat(mathMatch[1]);
      const op = mathMatch[2].toLowerCase();
      const b = parseFloat(mathMatch[3]);
      let res = 0;
      let opName = 'added to';
      if (op === '+' || op === 'plus') { res = a + b; opName = 'plus'; }
      else if (op === '-' || op === 'minus') { res = a - b; opName = 'minus'; }
      else if (op === '*' || op === 'x' || op === 'times' || op === 'multiplied by') { res = a * b; opName = 'multiplied by'; }
      else if (op === '/' || op === 'divided by') {
        res = b !== 0 ? a / b : 0;
        opName = 'divided by';
      }
      return `The mathematical calculation of ${a} ${opName} ${b} equals precisely ${res}. In arithmetic terms, performing this operation yields a final value of ${res}. If you need further scientific calculations, algebraic formulas, or unit conversions, feel free to ask!`;
    }

    // Default rich comprehensive answer
    const cleanedTopic = userMessage.replace(/^[a-z\s]+explorer,?\s*/i, '').slice(0, 60).trim();
    if (isHindi) {
      return `आपके प्रश्न "${cleanedTopic}" के संबंध में: यह विषय विज्ञान और तकनीकी अन्वेषण के दृष्टिकोण से अत्यंत महत्वपूर्ण है। इस अवधारणा को समझने के लिए हमें इसके मूल सिद्धांतों, इसके कार्यप्रणाली के घटकों और इसके व्यावहारिक अनुप्रयोगों का अवलोकन करना होता है। आप जिस भी विशिष्ट पहलू पर अधिक गहराई से जानकारी प्राप्त करना चाहते हैं, कृपया मुझे बताएं—मैं आपको प्रत्येक चरण का विस्तृत और संपूर्ण स्पष्टीकरण दूंगा।`;
    }
    if (isHinglish) {
      return `Aapke question "${cleanedTopic}" ke baare me: Ye topic technology aur science ke context me kaafi mahatvapurna hai. Iske underlying principles, functioning mechanism, aur practical hardware applications ko samajhna bahut zaroori hai. Aap iske kisi bhi specific part par aur sawaal pooch sakte hain, aur main aapko poori detail ke saath samjhaunga!`;
    }
    return `Regarding your inquiry on "${cleanedTopic}": This concept involves fundamental principles spanning scientific theory, architectural design, and practical real-world execution. To understand it thoroughly, one must examine the core mechanisms that govern its operation, the individual components that drive its behavior, and how these factors interact under varying conditions. Please let me know which specific dimension you would like to delve deeper into, and I will gladly provide an exhaustive, step-by-step breakdown!`;
  }
}

export const aiService = AIService.getInstance();
