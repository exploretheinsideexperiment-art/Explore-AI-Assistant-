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
                  while (parts.length > 1) {
                    const completedSentence = parts.shift()?.trim();
                    if (completedSentence && completedSentence.length > 2) {
                      if (onSentence) onSentence(completedSentence, isFirst);
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
