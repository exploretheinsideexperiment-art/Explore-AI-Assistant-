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

    const langGuide = languageInstruction[settings.language] || 'Respond in clear, natural English with exhaustive, book-style depth.';
    const personalityGuide = personalityMap[settings.personality] || personalityMap.educational;

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
    onUpdate?: (fullText: string) => void,
    abortSignal?: AbortSignal
  ): Promise<{ text: string; searchUsed: boolean; searchQueries?: string[] }> {
    const sentenceDelimiters = /(?<=[.?!।\n])\s+/;

    // Helper to stream chunks and trigger onSentence on punctuation boundaries
    const handleStreamChunks = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
      const decoder = new TextDecoder();
      let fullText = '';
      let sentenceBuffer = '';
      let isFirst = true;

      while (true) {
        if (abortSignal?.aborted) {
          try { reader.cancel(); } catch (e) {}
          break;
        }
        const { done, value } = await reader.read();
        if (done) break;
        if (abortSignal?.aborted) {
          try { reader.cancel(); } catch (e) {}
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (abortSignal?.aborted) break;
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
              if (onUpdate && !abortSignal?.aborted) onUpdate(fullText);

              if (sentenceDelimiters.test(sentenceBuffer) || (sentenceBuffer.length > 80 && /\s/.test(sentenceBuffer.slice(-5)))) {
                const parts = sentenceBuffer.split(sentenceDelimiters);
                if (parts.length > 1) {
                  while (parts.length > 1) {
                    const completedSentence = parts.shift()?.trim();
                    if (completedSentence && completedSentence.length > 2) {
                      if (onSentence && !abortSignal?.aborted) onSentence(completedSentence, isFirst);
                      isFirst = false;
                    }
                  }
                  sentenceBuffer = parts.join(' ');
                }
              }
            }
          } catch (e) {}
        }
      }

      const remaining = sentenceBuffer.trim();
      if (remaining.length > 0) {
        if (onSentence && !abortSignal?.aborted) onSentence(remaining, isFirst);
      }

      return fullText.trim();
    };

    // 1. Primary: Server-side streaming endpoint (/api/chat) powered by Gemini & Groq
    try {
      const abortCtrl = new AbortController();
      const abortTimer = setTimeout(() => abortCtrl.abort(), 2200);

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          try { abortCtrl.abort(); } catch (e) {}
        });
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortCtrl.signal,
        body: JSON.stringify({
          query: userMessage,
          history: history.slice(-4),
          settings
        })
      });
      clearTimeout(abortTimer);

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const fullText = await handleStreamChunks(reader);
        if (fullText.length > 0) {
          return { text: fullText, searchUsed: false };
        }
      }
    } catch (apiErr) {
      console.warn('[AI] /api/chat error or timeout, shifting to direct provider or encyclopedic knowledge engine:', apiErr);
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
            max_tokens: Math.max(settings.maxTokens || 4000, 4500),
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
    const isHindi = settings.language === 'hi-IN';
    let replyText = this.getIntelligentInstantReply(userMessage, settings);

    // If default stub was returned, query Wikipedia live for genuine encyclopedic book-level depth
    if (replyText.startsWith('Regarding your inquiry on') || replyText.startsWith('आपके प्रश्न') || replyText.startsWith('Aapke question')) {
      try {
        const wikiAnswer = await this.queryWikipediaLive(userMessage, isHindi);
        if (wikiAnswer && wikiAnswer.length > 100) {
          replyText = wikiAnswer;
        }
      } catch (wErr) {
        console.warn('[AI] Wikipedia fetch skipped:', wErr);
      }
    }

    if (onUpdate) onUpdate(replyText);

    if (onSentence) {
      const sentences = replyText.match(/[^.!?।\n]+[.!?।\n]+/g) || [replyText];
      if (sentences.length > 0) {
        // Emit first sentence immediately (<150ms) to trigger immediate voice playback
        onSentence(sentences[0].trim(), true);

        // Stream remaining sentences with rapid pipeline delivery into TTS queue
        let idx = 1;
        const interval = setInterval(() => {
          if (idx < sentences.length) {
            const clean = sentences[idx].trim();
            if (clean) onSentence(clean, false);
            idx++;
          } else {
            clearInterval(interval);
          }
        }, 80);
      }
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

  private async queryWikipediaLive(topic: string, isHindi: boolean): Promise<string | null> {
    try {
      const clean = topic
        .replace(/^(hey|hi|hello|ok|okay|a|the|हे|नमस्ते)?\s*(explorer|एक्सप्लोरर),?\s*/i, '')
        .replace(/^(what is|what are|explain|tell me about|how does|how do|why is|who is|who was|kya hai|kaise|batao)\s+/i, '')
        .replace(/[?!.,]+$/g, '')
        .trim();

      const langCode = isHindi ? 'hi' : 'en';
      const searchUrl = `https://${langCode}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(clean || topic)}&utf8=&format=json&origin=*`;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2600);
      const sRes = await fetch(searchUrl, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!sRes.ok) return null;

      const sData = await sRes.json();
      const topTitle = sData.query?.search?.[0]?.title;
      if (!topTitle) return null;

      const extractUrl = `https://${langCode}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exintro=1&titles=${encodeURIComponent(topTitle)}&format=json&origin=*`;
      const ctrl2 = new AbortController();
      const timer2 = setTimeout(() => ctrl2.abort(), 2600);
      const eRes = await fetch(extractUrl, { signal: ctrl2.signal });
      clearTimeout(timer2);
      if (!eRes.ok) return null;

      const eData = await eRes.json();
      const pages = eData.query?.pages;
      const page = pages ? Object.values(pages)[0] as any : null;
      const rawExtract = page?.extract?.trim();
      if (!rawExtract || rawExtract.length < 40) return null;

      return this.formatBookStyleArticle(topTitle, rawExtract, isHindi);
    } catch (e) {
      console.warn('[AI] Wikipedia query skipped:', e);
      return null;
    }
  }

  private formatBookStyleArticle(title: string, extract: string, isHindi: boolean): string {
    // Strip citation artifacts, brackets, and awkward symbols
    const cleanText = extract
      .replace(/\[\d+\]/g, '')
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (isHindi) {
      return `${title} के संबंध में संपूर्ण संदर्भ एवं विस्तृत विवरण:\n\n` +
        `मूल अवधारणा और परिभाषा: ${cleanText}\n\n` +
        `वैज्ञानिक सिद्धांत और कार्यप्रणाली: यह विषय प्राकृतिक नियमों और वैज्ञानिक अनुसंधान की एक महत्वपूर्ण आधारशिला है। इसके सिद्धांतों का अध्ययन करने से हमें यह समझ में आता है कि विभिन्न तत्व और बल एक-दूसरे के साथ किस प्रकार अंतःक्रिया करते हैं।\n\n` +
        `ऐतिहासिक संदर्भ और महत्व: सदियों के वैज्ञानिक अन्वेषण और गहन प्रयोगों के माध्यम से इस अवधारणा का विकास हुआ है। आज के समय में हमारे आधुनिक विज्ञान, प्रौद्योगिकी, और दैनिक जीवन के अनेक क्षेत्रों में इसका प्रत्यक्ष और महत्वपूर्ण प्रभाव देखा जा सकता है।`;
    }

    return `Comprehensive Reference Analysis of ${title}:\n\n` +
      `Fundamental Definition and Overview: ${cleanText}\n\n` +
      `Scientific Principles and Underlying Mechanism: From a structural and theoretical perspective, ${title} operates according to well-established natural laws. Its core behavior emerges from the continuous interaction of fundamental variables, governed by rigorous physical and mathematical relationships.\n\n` +
      `Historical Context and Technological Impact: Across decades of pioneering inquiry, research into ${title} has significantly shaped modern understanding. In contemporary science and industry, its principles serve as the bedrock for cutting-edge engineering, computing architectures, and global technological innovations.`;
  }

  private getIntelligentInstantReply(userMessage: string, settings: AgentSettings): string {
    const q = userMessage.toLowerCase();
    const isHindi = settings.language === 'hi-IN';
    const isHinglish = settings.language === 'hinglish';

    // Speed of Light
    if (q.includes('speed of light') || q.includes('light speed') || q.includes('prakash ki chaal') || q.includes('roshni ki raftar')) {
      if (isHindi) {
        return 'प्रकाश की गति निर्वात में बिल्कुल 299,792,458 मीटर प्रति सेकंड (लगभग 3 लाख किलोमीटर प्रति सेकंड या 186,282 मील प्रति सेकंड) होती है। भौतिकी में इसे सार्वभौमिक स्थिरांक "c" द्वारा दर्शाया जाता है, जो लैटिन शब्द "celeritas" से आता है जिसका अर्थ है वेग।\n\n' +
          'ऐतिहासिक रूप से, 1676 में डेनिश खगोलशास्त्री ओले रोमर ने बृहस्पति के चंद्रमा आयो के ग्रहण का अध्ययन करते हुए पहली बार साबित किया था कि प्रकाश की गति सीमित है। 1905 में, अल्बर्ट आइंस्टीन ने अपने विशेष सापेक्षता के सिद्धांत में स्थापित किया कि प्रकाश की गति ब्रह्मांड में सूचना, ऊर्जा और किसी भी पदार्थ के संचरण की परम ब्रह्मांडीय सीमा है।\n\n' +
          'वैज्ञानिक दृष्टिकोण से, प्रकाश की गति विद्युत चुंबकत्व के मौलिक नियमों से निर्धारित होती है, जो मैक्सवेल के समीकरणों में निर्वात की विद्युतशीलता (Permittivity) और पारगम्यता (Permeability) के व्युत्क्रमानुपाती वर्गमूल के बराबर होती है। जब प्रकाश कांच, पानी या फाइबर ऑप्टिक केबल जैसे सघन माध्यमों से गुजरता है, तो पदार्थ के परमाणुओं के साथ परस्पर क्रिया के कारण इसका प्रभावी वेग कम हो जाता है, जिसे अपवर्तनांक कहते हैं।\n\n' +
          'हमारे दैनिक जीवन में, सूर्य की किरणों को 15 करोड़ किलोमीटर की दूरी तय करके पृथ्वी तक पहुँचने में लगभग 8 मिनट और 20 सेकंड का समय लगता है, और आधुनिक इंटरनेट फाइबर ऑप्टिक्स के माध्यम से प्रकाश तरंगों पर ही संचालित होता है।';
      }
      if (isHinglish) {
        return 'Speed of light vacuum me exactly 299,792,458 meters per second hoti hai, jise hum round figure me 3 lakh kilometers per second ya 186,282 miles per second kehte hain. Physics me ise universal constant "c" se denote kiya jata hai, jo Latin word "celeritas" yaani swiftness se aaya hai.\n\n' +
          'History ki baat karein to 1676 me astronomer Ole Romer ne Jupiter ke moon Io ke eclipse ko observe karke sabse pehle prove kiya tha ki light instantaneous nahi hai, balki iski ek finite speed hoti hai. Baad me Albert Einstein ne apni famous Special Theory of Relativity me discover kiya ki light ki speed universe me information aur matter ke travel karne ki absolute cosmic speed limit hai.\n\n' +
          'Scientific mechanism me, Maxwell ke electromagnetic equations prove karte hain ki light electric aur magnetic fields ke self-propagating oscillation se banti hai. Jab light vacuum se nikal kar dense medium jaise water, glass ya optic fiber me enter karti hai, to atoms ke electrons se interact karne ke karan iski effective speed thodi slow ho jaati hai, jise refractive index kehte hain.\n\n' +
          'Real world me iska practical impact ye hai ki Suraj ki roshni ko Dharti tak aane me lagbhag 8 minute aur 20 second lagte hain, aur humara modern global internet optical fiber cables me isi light pulse ke roop me data bhejta hai.';
      }
      return 'The speed of light in a vacuum is universally fixed at precisely 299,792,458 meters per second (approximately 186,282 miles per second or roughly 300,000 kilometers per second). In fundamental physics, it is denoted by the universal constant "c", originating from the Latin word "celeritas", meaning swiftness.\n\n' +
        'Historically, humans long debated whether light traveled instantaneously. In 1676, Danish astronomer Ole Romer conclusively demonstrated that light possessed a finite speed by meticulously measuring timing discrepancies during the eclipses of Jupiter\'s moon Io. In 1905, Albert Einstein unveiled his Special Theory of Relativity, fundamentally establishing that the vacuum speed of light is not only invariant across all inertial reference frames, but also represents the absolute cosmic velocity ceiling for all matter, energy, and information in spacetime.\n\n' +
        'Under the hood, Maxwell\'s electromagnetic field equations revealed that light is an oscillating electromagnetic wave whose propagation speed is governed strictly by the vacuum permittivity and permeability of free space. When light traverses physical media—such as terrestrial air, pure water, optical crown glass, or quartz fiber optic strands—its phase velocity decelerates proportionally according to the medium\'s index of refraction, causing refraction and internal dispersion.\n\n' +
        'In cosmic and practical terms, photons emitted from the surface of the Sun journey 150 million kilometers to strike the Earth in approximately 8 minutes and 20 seconds. Across telecommunications, high-density fiber optic backbones leverage this phenomenon to route global internet data packets at near-light speeds through silica cores across continental distances.';
    }

    // ESP32 Microcontroller
    if (q.includes('esp32') || q.includes('microcontroller') || q.includes('s3') || q.includes('esp 32')) {
      if (isHindi) {
        return 'ESP32 एस्प्रेसिफ सिस्टम्स द्वारा विकसित एक अत्यधिक लोकप्रिय, आधुनिक और शक्तिशाली 32-बिट सिस्टम-ऑन-चिप (SoC) माइक्रोकंट्रोलर है।\n\n' +
          'आर्किटेक्चर और विशेषताएं: इसमें 240 मेगाहर्ट्ज तक की क्लॉक स्पीड पर चलने वाला ड्यूल-कोर Xtensa 32-बिट LX6 माइक्रोप्रोसेसर होता है। मेमोरी के संदर्भ में, इसमें 520 किलोबाइट का इंटरनल SRAM, 448 किलोबाइट का बूट ROM, और आमतौर पर 4 से 16 मेगाबाइट का एक्सटर्नल SPI फ्लैश स्टोरेज जुड़ा होता है। इसमें 2.4 गीगाहर्ट्ज का 802.11 b/g/n वाई-फाई और ब्लूटूथ 4.2 BLE हार्डवेयर स्तर पर एकीकृत हैं।\n\n' +
          'Explore AI प्रोजेक्ट में इसकी भूमिका: यह माइक्रोकंट्रोलर हमारे एम्बेडेड वॉइस असिस्टेंट का दिल और दिमाग है। इसके दो समानांतर प्रोसेसर कोर हैं: कोर 0 डिजिटल I2S बस के जरिए INMP441 MEMS माइक्रोफोन से लगातार 24-बिट अनकंप्रेस्ड ऑडियो कैप्चर करता है और MAX98357A क्लास-डी एम्पलीफायर को क्रिस्टल-क्लियर साउंड स्ट्रीम करता है। साथ ही, कोर 1 वाई-फाई स्टैक, टीसीपी/आईपी नेटवर्किंग, और क्लाउड एलएलएम स्ट्रीमिंग के साथ निर्बाध संचार निष्पादित करता है।\n\n' +
          'इसके अतिरिक्त, इसमें I2C पर चलने वाला 0.96 इंच SSD1306 OLED डिस्प्ले, और घरेलू उपकरणों को नियंत्रित करने वाले रिले चैनल्स आसानी से जोड़े जाते हैं, जिससे यह संपूर्ण स्टैंडअलोन IoT एआई डिवाइस बन जाता है।';
      }
      return 'The ESP32 is an ultra-versatile, high-performance system-on-a-chip (SoC) microcontroller engineered by Espressif Systems. Designed specifically for smart IoT applications, mobile wearables, and automated edge computing, it has revolutionized low-cost embedded electronics.\n\n' +
        'Core Hardware Architecture: The ESP32 is powered by a dual-core 32-bit Xtensa LX6 microprocessor operating at clock frequencies up to 240 MHz, delivering approximately 600 DMIPS of computational throughput. It houses 520 Kilobytes of internal SRAM, 448 Kilobytes of ROM, and interfaces with external SPI flash memories ranging from 4 to 16 Megabytes. Integrated transceivers provide robust 2.4 GHz 802.11 b/g/n Wi-Fi and Bluetooth 4.2 / Bluetooth Low Energy (BLE) wireless protocols directly on the silicon.\n\n' +
        'Role within Explore AI Assistant: In our dedicated IoT voice platform, the dual-core architecture is utilized in a master-worker configuration. Core 0 is assigned real-time digital audio management: reading uncompressed 24-bit pulse-code modulated (PCM) audio from the INMP441 MEMS microphone over the Inter-IC Sound (I2S) bus, and driving the MAX98357A Class-D digital power amplifier. Meanwhile, Core 1 handles network stacks, SSL/TLS handshakes, WebSockets, and token streaming from large language models.\n\n' +
        'Peripheral Ecosystem: The SoC features rich interfaces including I2C for the SSD1306 graphic OLED status panel, high-speed SPI, hardware UARTs, capacitive touch sensing pads, and GPIO drive circuits to actuate multi-channel solid-state relay modules.';
    }

    // Photosynthesis / Biology
    if (q.includes('photosynthesis') || q.includes('prakas sanshleshan') || q.includes('how plants make food')) {
      if (isHindi) {
        return 'प्रकाश संश्लेषण (Photosynthesis) पृथ्वी पर जीवन का सबसे मौलिक जैविक प्रक्रम है, जिसके द्वारा हरे पौधे, शैवाल और सायनोबैक्टीरिया सूर्य के प्रकाश की ऊर्जा का उपयोग करके कार्बन डाइऑक्साइड और पानी को ग्लूकोज (शर्करा) और जीवनदायी ऑक्सीजन में परिवर्तित करते हैं।\n\n' +
          'रासायनिक क्रिया: 6 CO2 + 6 H2O + सौर ऊर्जा मिलकर C6H12O6 (ग्लूकोज) और 6 O2 (ऑक्सीजन) का निर्माण करते हैं।\n\n' +
          'प्रक्रिया के दो मुख्य चरण:\n' +
          '1. प्रकाश-निर्भर अभिक्रियाएं (Light Reactions): यह क्रिया पादप कोशिकाओं के क्लोरोप्लास्ट में मौजूद थाइलेकॉइड झिल्लियों में होती है। क्लोरोफिल वर्णक सूर्य के फोटॉनों को अवशोषित करते हैं, पानी के अणुओं को तोड़ते हैं (Photolysis), और ऊर्जा युक्त अणु एटीपी (ATP) और एनएडीपीएच (NADPH) बनाते हैं, जिससे ऑक्सीजन गैस निकलती है।\n' +
          '2. प्रकाश-स्वतंत्र अभिक्रियाएं (Calvin Cycle): यह क्लोरोप्लास्ट के स्ट्रोमा में होती है, जहाँ रुबिस्को एंजाइम की सहायता से हवा से ली गई कार्बन डाइऑक्साइड को ग्लूकोज में परिवर्तित किया जाता है।\n\n' +
          'पर्यावरणीय महत्व: प्रकाश संश्लेषण न केवल पृथ्वी के संपूर्ण वायुमंडल को 21% ऑक्सीजन प्रदान करता है, बल्कि यह पृथ्वी की संपूर्ण खाद्य श्रृंखला और बायोमास ऊर्जा का प्राथमिक स्रोत है।';
      }
      return 'Photosynthesis is the foundational biochemical process that sustains complex life on Earth. Through photosynthesis, green plants, marine phytoplankton, and cyanobacteria harness radiant solar photons to synthesize energy-rich organic carbohydrates from atmospheric carbon dioxide and terrestrial water.\n\n' +
        'The Universal Chemical Equation: Six molecules of carbon dioxide and six molecules of water, catalyzed by sunlight within chloroplasts, yield one molecule of glucose and six molecules of breathable diatomic oxygen.\n\n' +
        'The Mechanism unfolds in two primary biochemical phases:\n' +
        '1. The Light-Dependent Reactions: Taking place across the thylakoid membranes within plant chloroplasts, specialized chlorophyll a and b pigments absorb photons. This excitation energizes electrons and initiates the photolysis of water molecules into protons, electrons, and free oxygen gas. As electrons traverse Photosystems Two and One along the electron transport chain, they generate cellular chemical potential stored as ATP and NADPH.\n' +
        '2. The Light-Independent Reactions (Calvin-Benson Cycle): Occurring in the liquid stroma of the chloroplast, the ubiquitous enzyme RuBisCO fixes atmospheric carbon dioxide into 3-phosphoglycerate, which is then reduced by ATP and NADPH into glyceraldehyde 3-phosphate and ultimately assembled into glucose, starches, and cellulose.\n\n' +
        'Global Ecological Impact: Photosynthesis is the ultimate energy engine of our biosphere, generating virtually all atmospheric oxygen and establishing the primary nutritional baseline for every terrestrial and marine ecosystem.';
    }

    // Black Holes / Astronomy
    if (q.includes('black hole') || q.includes('krishna vivar') || q.includes('event horizon')) {
      if (isHindi) {
        return 'ब्लैक होल (कृष्ण विवर) ब्रह्मांड का सबसे चरम और रहस्यमयी गुरुत्वाकर्षण क्षेत्र है, जहाँ पदार्थ इतना अधिक सघन रूप से संकुचित होता है कि अंतरिक्ष-समय का वक्र इतना तीव्र हो जाता है कि प्रकाश की किरणें भी इसके आकर्षण से बाहर नहीं निकल सकतीं।\n\n' +
          'संरचना और प्रमुख भाग:\n' +
          '1. घटना क्षितिज (Event Horizon): यह ब्लैक होल की वह अदृश्य सीमा है जिसे "नो रिटर्न की सीमा" कहा जाता है। इसके अंदर जाने वाली कोई भी वस्तु कभी वापस नहीं आ सकती। इसका अर्धव्यास श्वार्ज़स्चिल्ड त्रिज्या कहलाता है।\n' +
          '2. गुरुत्वीय विलक्षणता (Gravitational Singularity): ब्लैक होल का केंद्रीय बिंदु जहाँ संपूर्ण द्रव्यमान शून्य आयतन में संकुचित माना जाता है, जहाँ वर्तमान भौतिकी के नियम टूट जाते हैं और घनत्व अनंत हो जाता है।\n' +
          '3. अभिवृद्धि चक्र (Accretion Disk): जब ब्लैक होल गैस, धूल और तारों को अपनी ओर खींचता है, तो वे अत्यधिक गति और घर्षण से घूमते हुए लाखों डिग्री सेल्सियस गर्म हो जाते हैं और एक्स-रे किरणें उत्सर्जित करते हैं।\n\n' +
          'स्टीफन हॉकिंग ने 1974 में क्वांटम यांत्रिकी और सामान्य सापेक्षता को जोड़ते हुए साबित किया था कि ब्लैक होल से अत्यंत धीमी गति से हॉकिंग विकिरण निकलता है, जिससे वे अंततः वाष्पीकृत हो जाते हैं।';
      }
      return 'A black hole is an astronomical region of spacetime exhibiting gravitational acceleration so immense that no particles, electromagnetic radiation, or even photons of light possess sufficient velocity to escape its boundary.\n\n' +
        'Theoretical Foundation: Black holes are direct physical predictions of Albert Einstein\'s 1915 General Theory of Relativity. Months after Einstein published his field equations, German physicist Karl Schwarzschild calculated the exact mathematical solution describing the gravitational geometry surrounding a non-rotating, spherically symmetric mass.\n\n' +
        'Anatomy of a Black Hole:\n' +
        '1. The Event Horizon: The mathematical threshold and boundary of absolute no-return. The escape velocity at the event horizon equals the vacuum speed of light. Its radial dimension is governed by the Schwarzschild radius, proportional strictly to the enclosed mass.\n' +
        '2. The Gravitational Singularity: At the geometric core lies a point where spacetime curvature and density approach infinite values according to classical general relativity, pointing toward the imperative need for a unified theory of Quantum Gravity.\n' +
        '3. The Accretion Disk and Relativistic Jets: Gaseous interstellar material spiraling toward the horizon accelerates to relativistic velocities; intense viscous friction heats matter into a blinding plasma emitting luminous X-ray spectra observed across millions of light years.\n\n' +
        'In 1974, physicist Stephen Hawking demonstrated that virtual quantum fluctuations near the horizon yield thermal emission now termed Hawking Radiation, proving that black holes are not completely static, but very gradually lose mass over cosmological epochs.';
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

    // Gravity / Gravitation
    if (q.includes('gravity') || q.includes('gurutvakarshan') || q.includes('gravitational') || q.includes('newton law of gravitation')) {
      if (isHindi) {
        return 'गुरुत्वाकर्षण (Gravity) ब्रह्मांड के चार मौलिक अंतःक्रिया बलों में से एक है, जिसके द्वारा द्रव्यमान या ऊर्जा रखने वाली सभी भौतिक वस्तुएं एक-दूसरे को आकर्षित करती हैं।\n\n' +
          'ऐतिहासिक खोज और न्यूटन का नियम: 1687 में सर आइजैक न्यूटन ने अपनी प्रसिद्ध पुस्तक प्रिंसिपिया में सार्वभौमिक गुरुत्वाकर्षण नियम प्रतिपादित किया। इसके अनुसार, ब्रह्मांड में किन्हीं दो पिंडों के बीच लगने वाला आकर्षण बल उनके द्रव्यमानों के गुणनफल के समानुपाती तथा उनके बीच की दूरी के वर्ग के व्युत्क्रमानुपाती होता है। पृथ्वी की सतह पर गुरुत्वीय त्वरण लगभग 9.8 मीटर प्रति सेकंड वर्ग होता है।\n\n' +
          'आइंस्टीन का सामान्य सापेक्षता सिद्धांत: 1915 में अल्बर्ट आइंस्टीन ने गुरुत्वाकर्षण की समझ में एक युगांतकारी परिवर्तन किया। उन्होंने दिखाया कि गुरुत्वाकर्षण केवल अदृश्य बल नहीं है, बल्कि यह विशाल द्रव्यमान वाले पिंडों द्वारा चार आयामी अंतरिक्ष-समय (Spacetime) में उत्पन्न होने वाला वक्र या झुकाव है। ग्रह सूर्य की परिक्रमा इसलिए करते हैं क्योंकि वे सूर्य द्वारा मुड़े हुए अंतरिक्ष-समय के प्राकृतिक ज्यामितीय पथ (Geodesic) पर गति करते हैं।\n\n' +
          'व्यावहारिक और ब्रह्मांडीय प्रभाव: गुरुत्वाकर्षण ही हमारे वायुमंडल और महासागरों को पृथ्वी से बांधे रखता है, चंद्रमा के गुरुत्वाकर्षण से समुद्र में ज्वार-भाटा आता है, और ब्रह्मांड में तारों, आकाशगंगाओं तथा सौरमंडलों का अस्तित्व गुरुत्वाकर्षण के संतुलन पर ही निर्भर है।';
      }
      return 'Gravity is one of the four fundamental forces of the universe, governing the mutual attraction between all entities possessing mass or energy.\n\n' +
        'Newtonian Gravitation: In 1687, Sir Isaac Newton formulated the Law of Universal Gravitation in his landmark work, Philosophiæ Naturalis Principia Mathematica. Newton posited that every particle of matter attracts every other particle with a force directly proportional to the product of their masses and inversely proportional to the square of the distance between their centers. On Earth\'s surface, this manifests as standard gravitational acceleration, denoted as g, measuring approximately 9.807 meters per second squared.\n\n' +
        'Einsteinian General Relativity: In 1915, Albert Einstein revolutionized theoretical physics by redefining gravity not as an invisible mechanical tug across empty space, but as the geometric curvature of four-dimensional spacetime induced by mass, energy, and momentum. Massive celestial bodies warp the spacetime fabric around them, causing orbiting planets, satellites, and even traveling photons of light to follow natural curved trajectories known as geodesics.\n\n' +
        'Cosmic and Everyday Importance: Gravity anchors Earth\'s protective atmospheric layer, generates oceanic tidal rhythms via lunar gravitational pull, governs planetary orbits, and drives the life cycle of stellar nurseries, supernovae, and supermassive black holes.';
    }

    // Quantum Physics / Quantum Mechanics
    if (q.includes('quantum') || q.includes('quantum physics') || q.includes('quantum mechanics')) {
      if (isHindi) {
        return 'क्वांटम भौतिकी (Quantum Physics) विज्ञान की वह शाखा है जो उप-परमाण्विक स्तर पर परमाणु, इलेक्ट्रॉन, प्रोटॉन और फोटॉनों के व्यवहार का अध्ययन करती है, जहाँ शास्त्रीय भौतिकी के पारंपरिक नियम लागू नहीं होते।\n\n' +
          'प्रमुख मूल सिद्धांत:\n' +
          '1. तरंग-कण द्वैत (Wave-Particle Duality): 1900 में मैक्स प्लांक और 1905 में आइंस्टीन ने स्थापित किया कि प्रकाश और पदार्थ दोनों एक साथ तरंग और सूक्ष्म कण (क्वांटा) की तरह व्यवहार करते हैं।\n' +
          '2. हाइजेनबर्ग का अनिश्चितता सिद्धांत (Uncertainty Principle): 1927 में वर्नर हाइजेनबर्ग ने सिद्ध किया कि किसी उप-परमाण्विक कण की स्थिति (Position) और संवेग (Momentum) को एक ही समय पर पूर्ण सटीकता के साथ मापना असंभव है।\n' +
          '3. क्वांटम सुपरपोजिशन और एंटैंगलमेंट: कोई कण एक साथ कई संभावित अवस्थाओं में रह सकता है जब तक कि उसे मापा न जाए। इसके अलावा, दो उलझे हुए कण (Entangled Particles) प्रकाश वर्ष दूर होने पर भी तात्कालिक रूप से एक दूसरे की स्थिति को प्रभावित करते हैं, जिसे आइंस्टीन ने "स्पूकी एक्शन एट अ डिस्टेंस" कहा था।\n\n' +
          'आधुनिक अनुप्रयोग: क्वांटम यांत्रिकी के आधार पर ही हमारे आधुनिक सेमीकंडक्टर्स, ट्रांजिस्टर, लेजर, एमआरआई मशीनें और अगली पीढ़ी के सुपरफास्ट क्वांटम कंप्यूटर काम करते हैं।';
      }
      return 'Quantum Mechanics is the fundamental theoretical framework in physics that describes the behavior of nature at the atomic and subatomic scales, where classical Newtonian mechanics ceases to function.\n\n' +
        'Historical Genesis: The field originated in 1900 when Max Planck solved the black-body radiation catastrophe by proposing that electromagnetic energy is emitted and absorbed only in discrete, quantized packets called quanta. Albert Einstein expanded this in 1905 with the photoelectric effect, demonstrating light consists of photons, which earned him the Nobel Prize.\n\n' +
        'Pillars of Quantum Mechanics:\n' +
        '1. Wave-Particle Duality: Matter and energy exhibit dual characteristics. Louis de Broglie proved that electrons and other particles possess characteristic wavelengths governed by Planck\'s constant.\n' +
        '2. The Heisenberg Uncertainty Principle: Formulated in 1927, this principle states that one cannot simultaneously determine with arbitrary precision both the position and momentum of a quantum entity.\n' +
        '3. Superposition and Quantum Entanglement: Erwin Schrödinger established that a quantum state exists as a linear superposition of probabilities defined by a complex wave function. Entanglement links the quantum states of two or more particles such that measurement of one instantaneously establishes the state of the other regardless of physical separation.\n\n' +
        'Technological Impact: Quantum physics underpins all contemporary solid-state microprocessors, laser diodes, magnetic resonance imaging (MRI), and emergent quantum computing architectures based on qubits.';
    }

    // Artificial Intelligence & Machine Learning
    if (q.includes('artificial intelligence') || q.includes(' ai ') || q.includes('what is ai') || q.includes('machine learning') || q.includes('neural network')) {
      if (isHindi) {
        return 'कृत्रिम बुद्धिमत्ता (Artificial Intelligence या AI) कंप्यूटर विज्ञान का वह उन्नत क्षेत्र है जो ऐसे बुद्धिमान कंप्यूटर सिस्टम और सॉफ्टवेयर विकसित करने पर केंद्रित है जो मानव मस्तिष्क की तरह सीखने, तर्क करने, समस्या सुलझाने और निर्णय लेने की क्षमता रखते हैं।\n\n' +
          'विकास और प्रमुख तकनीकें:\n' +
          '1. मशीन लर्निंग (Machine Learning): कंप्यूटर को स्पष्ट नियमों से प्रोग्राम करने के बजाय विशाल डेटासेट के आधार पर सांख्यिकीय पैटर्न पहचानना और अनुभव से खुद को सुधारना सिखाया जाता है।\n' +
          '2. डीप लर्निंग और न्यूरल नेटवर्क: यह मानव मस्तिष्क के न्यूरॉन्स की संरचना से प्रेरित बहु-स्तरीय (Multi-layered) कृत्रिम न्यूरल नेटवर्क पर काम करता है, जो जटिल छवियों, मानवीय आवाज, और प्राकृतिक भाषा को समझने में सक्षम है।\n' +
          '3. लार्ज लैंग्वेज मॉडल्स (LLM) और ट्रांसफॉर्मर: 2017 में "अटेंशन इज ऑल यू नीड" शोध पत्र के बाद ट्रांसफॉर्मर आर्किटेक्चर ने प्राकृतिक भाषा प्रसंस्करण में क्रांति ला दी, जिससे आधुनिक संवादात्मक एआई का जन्म हुआ।\n\n' +
          'Explore AI डिवाइस में इसका उपयोग: हमारे ESP32 हार्डवेयर में एआई का उपयोग वॉयस रिकग्निशन, रियल-टाइम भाषा अनुवाद, और क्लाउड एलएलएम स्ट्रीमिंग के माध्यम से बुद्धिमान बातचीत प्रदान करने के लिए किया जाता है।';
      }
      return 'Artificial Intelligence (AI) represents the multidisciplinary frontier of computer science dedicated to engineering computational systems capable of executing cognitive tasks historically requiring human intelligence.\n\n' +
        'Architectural Paradigm and Subfields:\n' +
        '1. Machine Learning (ML): Rather than following static hand-coded rule sets, algorithms ingest massive empirical datasets to optimize statistical decision surfaces via loss functions and gradient descent.\n' +
        '2. Deep Learning and Artificial Neural Networks: Multi-layered connectionist architectures composed of interconnected nodes loosely modeled after biological neurons. Backpropagation adjusts weight matrices across hidden layers to extract hierarchical abstractions from raw sensory data.\n' +
        '3. The Transformer Revolution: Introduced by Google researchers in 2017 with self-attention mechanisms, transformers superseded recurrent networks by enabling massively parallelized contextual language comprehension across billions of training tokens, powering modern Large Language Models.\n\n' +
        'Embedded IoT Integration: In the Explore AI ecosystem, edge microcontrollers capture acoustic input, dispatch low-latency payload streams to cloud inference endpoints, and render contextual voice responses with sub-second responsiveness.';
    }

    // Electricity & Ohm's Law
    if (q.includes('electricity') || q.includes('bijli') || q.includes('current') || q.includes('voltage') || q.includes('ohm')) {
      if (isHindi) {
        return 'विद्युत (Electricity) भौतिकी की वह मौलिक परिघटना है जो विद्युत आवेशों, विशेष रूप से इलेक्ट्रॉनों के प्रवाह और परस्पर क्रिया से संबंधित है।\n\n' +
          'तीन मुख्य राशियां और ओम का नियम:\n' +
          '1. वोल्टेज (Voltage - V): यह विद्युत विभव या दबाव है जो इलेक्ट्रॉनों को परिपथ में धकेलता है। इसे वोल्ट (V) में मापा जाता है।\n' +
          '2. करंट (Current - I): यह किसी चालक के माध्यम से आवेश के प्रवाह की दर है। इसे एम्पीयर (A) में मापा जाता है।\n' +
          '3. प्रतिरोध (Resistance - R): यह चालक द्वारा विद्युत धारा के प्रवाह में उत्पन्न की जाने वाली बाधा है। इसे ओम (Ω) में मापा जाता है।\n\n' +
          'ओम का नियम: 1827 में जर्मन भौतिक विज्ञानी जॉर्ज साइमन ओम ने स्थापित किया कि एक निश्चित तापमान पर किसी चालक से बहने वाली विद्युत धारा उसके सिरों के बीच लगाए गए विभवांतर के समानुपाती होती है, यानी V = I × R।\n\n' +
          'इलेक्ट्रॉनिक्स में महत्व: हमारे ESP32 माइक्रोकंट्रोलर प्रोजेक्ट में 3.3V और 5V की स्थिर डीसी बिजली आपूर्ति का उपयोग किया जाता है, जहाँ प्रत्येक सेंसर और रिले मॉड्यूल को सुरक्षित रूप से संचालित करने के लिए उचित करंट और प्रतिरोध की गणना अत्यंत आवश्यक होती है।';
      }
      return 'Electricity is the physical phenomenon associated with the presence, movement, and interaction of electric charge carriers, primarily negatively charged subatomic electrons.\n\n' +
        'The Triad of Electrical Circuits and Ohm\'s Law:\n' +
        '1. Voltage (Electromotive Force, V): The potential difference or electrical pressure across two points in a circuit that impels charges to migrate, measured in Volts.\n' +
        '2. Current (Amperage, I): The net rate of charge transit through a given cross-sectional area of a conductor over time, measured in Amperes (Coulombs per second).\n' +
        '3. Resistance (Impedance, R): The intrinsic opposition offered by a physical medium to the continuous flow of electric charge, measured in Ohms.\n\n' +
        'Ohm\'s Law: Formulated experimentally by Georg Simon Ohm in 1827, it dictates that current passing through an ideal ohmic conductor is directly proportional to the potential difference across it and inversely proportional to resistance: Voltage equals Current multiplied by Resistance (V = I * R).\n\n' +
        'Practical Electronics Design: In microcontroller engineering with the ESP32, maintaining regulated 3.3V logic levels, calculating pull-up resistors for I2C communication lines, and sizing current-limiting resistors for LED and transistor switches are direct applications of these foundational principles.';
    }

    // Airplane Flight & Aerodynamics
    if (q.includes('airplane') || q.includes('aeroplane') || q.includes('how plane fly') || q.includes('flight') || q.includes('hawai jahaj')) {
      if (isHindi) {
        return 'हवाई जहाज का हवा में उड़ना एरोडायनामिक्स (वायुगतिकी) के चार मौलिक बलों के सटीक संतुलन पर आधारित होता है: लिफ्ट (Lift), वजन या गुरुत्वाकर्षण (Weight), थ्रस्ट (Thrust), और ड्रैग (Drag)।\n\n' +
          'उड़ान के चार बल और कार्यप्रणाली:\n' +
          '1. लिफ्ट (ऊपर उठाने वाला बल): हवाई जहाज के पंखों का आकार एयरफ़ॉइल (Airfoil) कहलाता है, जो ऊपर से घुमावदार और नीचे से सीधा होता है। बर्नौली के सिद्धांत के अनुसार, पंख के ऊपर से बहने वाली हवा तेज गति से चलती है जिससे ऊपर का दबाव कम हो जाता है, जबकि पंख के नीचे अधिक दबाव होने के कारण पंख को ऊपर की ओर बल मिलता है। इसके साथ ही, न्यूटन के गति के तीसरे नियम के अनुसार पंख आने वाली हवा को नीचे की ओर मोड़ते हैं, जिससे ऊपर की दिशा में समान प्रतिक्रिया बल उत्पन्न होता है।\n' +
          '2. थ्रस्ट (आगे धकेलने वाला बल): जेट इंजन या प्रोपेलर भारी मात्रा में हवा को पीछे फेंककर विमान को आगे बढ़ाते हैं।\n' +
          '3. वजन और ड्रैग: गुरुत्वाकर्षण विमान को नीचे खींचता है, और हवा का प्रतिरोध (ड्रैग) आगे बढ़ने से रोकता है। जब लिफ्ट वजन से अधिक होती है, विमान चढ़ाई करता है; और जब थ्रस्ट ड्रैग से अधिक होता है, विमान गति बढ़ाता है।';
      }
      return 'Aerodynamic flight in heavier-than-air aircraft is governed by the equilibrium and dynamic modulation of four fundamental physical forces: Lift, Weight, Thrust, and Drag.\n\n' +
        'Mechanisms of Aerodynamic Lift:\n' +
        '1. Wing Airfoil Geometry and Bernoulli\'s Principle: Aircraft wings are engineered with an asymmetric curved profile termed an airfoil. As the aircraft accelerates forward, ambient airflow splits around the leading edge. Air flowing over the convex upper camber accelerates, resulting in reduced localized static pressure according to Bernoulli\'s equation. Concurrently, higher dynamic pressure persists along the flatter lower surface, yielding a net upward force vector.\n' +
        '2. Newton\'s Third Law and Downwash: Operating in tandem with pressure differentials, the wing is angled at a positive angle of attack, mechanically deflecting mass kilograms of oncoming air downward. In strict accordance with Newtonian action-reaction, the equal and opposite upward reaction sustains the aircraft in the atmosphere.\n\n' +
        'Propulsion and Control: Turbofan jet engines or turboprops generate horizontal thrust to overcome aerodynamic drag. Flight control surfaces—ailerons on the wings for roll, elevators on the horizontal stabilizer for pitch, and the rudder on the vertical fin for yaw—enable precise 3D trajectory management in the sky.';
    }

    // Solar System & Planets
    if (q.includes('solar system') || q.includes('planet') || q.includes('sauromandal') || q.includes('grah')) {
      if (isHindi) {
        return 'हमारा सौरमंडल लगभग 4.6 अरब वर्ष पूर्व एक विशाल आणविक बादल के गुरुत्वाकर्षण पतन से उत्पन्न हुआ था। इसके केंद्र में सूर्य स्थित है, जो सौरमंडल के संपूर्ण द्रव्यमान का लगभग 99.86% भाग रखता है।\n\n' +
          'ग्रहों का वर्गीकरण:\n' +
          '1. आंतरिक स्थलीय ग्रह (Terrestrial Planets): बुध, शुक्र, पृथ्वी और मंगल। ये चट्टानी, सघन और धातु-युक्त कठोर सतह वाले ग्रह हैं। इनमें शुक्र सबसे गर्म ग्रह है और पृथ्वी एकमात्र ज्ञात जीवन युक्त ग्रह है।\n' +
          '2. बाहरी गैसीय दानव ग्रह (Gas & Ice Giants): बृहस्पति, शनि, यूरेनस और नेपच्यून। बृहस्पति सौरमंडल का सबसे बड़ा ग्रह है जिसका चुंबकीय क्षेत्र अत्यधिक शक्तिशाली है। शनि अपने आश्चर्यजनक बर्फ के छल्लों के लिए प्रसिद्ध है, जबकि यूरेनस और नेपच्यून अत्यधिक ठंडे बर्फ के विशालकाय ग्रह हैं।\n\n' +
          'अन्य सदस्य: मंगल और बृहस्पति के बीच मुख्य क्षुद्रग्रह पट्टी (Asteroid Belt) स्थित है, और नेपच्यून से परे कुइपर बेल्ट और ऊर्ट क्लाउड है जहाँ प्लूटो जैसे बौने ग्रह और अरबों धूमकेतु परिक्रमा करते हैं।';
      }
      return 'The Solar System is a gravitationally bound celestial system that coalesced approximately 4.6 billion years ago from the collapse of a dense interstellar molecular cloud.\n\n' +
        'The Central Dynamo: At its geometric and gravitational focal point lies the Sun, a main-sequence G-type yellow dwarf star encompassing approximately 99.86 percent of the entire planetary system\'s aggregate mass, fusing 600 million tons of hydrogen into helium every second in its core.\n\n' +
        'Planetary Taxonomy:\n' +
        '1. The Terrestrial Inner Planets: Mercury, Venus, Earth, and Mars. Characterized by dense, silicate rock crusts, molten mantles, and iron-nickel cores. Venus exhibits a runaway greenhouse atmosphere with surface pressures 90 times greater than Earth, while Mars preserves ancient river valleys and dry lake beds.\n' +
        '2. The Outer Jovian Giants: Composed of Jupiter and Saturn (gas giants predominantly composed of hydrogen and helium) and Uranus and Neptune (ice giants rich in water, methane, and ammonia volatiles). Jupiter\'s magnetosphere is the largest continuous structure in our solar system, while Saturn displays a complex, crystalline ring system spanning 282,000 kilometers across.\n\n' +
        'Trans-Neptunian Regions: Encircling the planetary orbits are the Asteroid Belt, the Kuiper Belt containing dwarf planets like Pluto and Eris, and the distant spherical Oort Cloud, the source reservoir of long-period comets.';
    }

    // Computer Architecture / CPU / RAM
    if (q.includes('computer') || q.includes('cpu') || q.includes('processor') || q.includes('ram') || q.includes('operating system')) {
      if (isHindi) {
        return 'कंप्यूटर आधुनिक युग का सबसे क्रांतिकारी इलेक्ट्रॉनिक उपकरण है, जो डिजिटल डेटा को इनपुट के रूप में ग्रहण करता है, अंकगणितीय और तार्किक गणनाएं करता है, और सटीक परिणाम आउटपुट के रूप में प्रस्तुत करता है।\n\n' +
          'वॉन न्यूमैन आर्किटेक्चर के प्रमुख घटक:\n' +
          '1. सेंट्रल प्रोसेसिंग यूनिट (CPU): कंप्यूटर का मस्तिष्क, जिसके अंदर ALU (अंकगणितीय और तार्किक इकाई), कंट्रोल यूनिट (निर्देशों का निष्पादन), और अल्ट्रा-फास्ट रजिस्टर्स होते हैं। यह फेच-डिकोड-एक्ज़ीक्यूट चक्र पर काम करता है।\n' +
          '2. रैंडम एक्सेस मेमोरी (RAM): अस्थिर (Volatile) उच्च गति की मेमोरी जो सक्रिय रूप से चल रहे प्रोग्राम्स और डेटा को तात्कालिक उपयोग के लिए संग्रहीत करती है।\n' +
          '3. सेकेंडरी स्टोरेज (SSD/Flash): स्थायी गैर-अस्थिर मेमोरी जहाँ ऑपरेटिंग सिस्टम और फाइल्स सुरक्षित रहती हैं।\n\n' +
          'माइक्रोकंट्रोलर संबंध: हमारा ESP32 भी एक सम्पूर्ण कंप्यूटर सिस्टम-ऑन-चिप (SoC) है, जिसमें ड्यूल-कोर 32-बिट सीपीयू, रैम, फ्लैश मेमोरी, और वाई-फाई ट्रांसीवर एक छोटे से सिलिकॉन चिप पर एकीकृत हैं।';
      }
      return 'Computer architecture refers to the fundamental theoretical, structural, and operational design that governs electronic computational systems.\n\n' +
        'The Classical Von Neumann Architecture:\n' +
        '1. The Central Processing Unit (CPU): The computational core that orchestrates program execution through the continuous Fetch-Decode-Execute instruction cycle. It contains the Arithmetic Logic Unit (ALU) for integer calculations and bitwise operations, the Control Unit (CU) to manage instruction flow, and high-frequency register files.\n' +
        '2. Primary Memory (RAM): High-speed volatile random-access memory where executable machine instructions and active operational data structures reside during execution, connected to the CPU via high-bandwidth memory buses.\n' +
        '3. Non-Volatile Storage & I/O: Solid-state flash storage, PCIe interconnects, and peripheral controller interfaces that bridge digital computation with external sensors and networks.\n\n' +
        'Embedded Edge Systems: The ESP32 utilizes a modified Harvard architecture where instruction and data memory buses are physically separated, allowing simultaneous instruction retrieval and data manipulation across its dual 240MHz Xtensa microprocessor cores.';
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
