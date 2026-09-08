import { AgentSettings, VoiceGender } from '../types';

export class TTSService {
  private static instance: TTSService;
  private isSpeaking: boolean = false;
  private synth: SpeechSynthesis | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.refreshVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.refreshVoices();
        };
      }
    }
  }

  public static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  public refreshVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    try {
      const v = this.synth.getVoices();
      if (v && v.length > 0) {
        this.cachedVoices = v;
      }
    } catch (e) {
      console.warn('[TTS] Failed to query getVoices:', e);
    }
    return this.cachedVoices;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.cachedVoices.length === 0) {
      this.refreshVoices();
    }
    return this.cachedVoices;
  }

  private queueCount: number = 0;
  private streamIsActive: boolean = false;
  private onQueueAllEndCallback?: () => void;
  private watchdogTimer?: any;

  private startWatchdog() {
    if (this.watchdogTimer) return;
    this.watchdogTimer = setInterval(() => {
      if (this.synth && this.synth.speaking && this.synth.paused) {
        try {
          this.synth.resume();
        } catch (e) {}
      }
    }, 4000);
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = undefined;
    }
  }

  /**
   * Thoroughly sanitizes text so speech synthesis reads ONLY pure spoken words.
   * Strips out markdown tables (|---|---|), pipes (|), hashes (#), divider dashes,
   * bullets, code blocks, URLs, and non-spoken formatting symbols.
   */
  public static cleanTextForSpeech(rawText: string): string {
    if (!rawText || typeof rawText !== 'string') return '';

    let text = rawText;

    // 1. Remove markdown code blocks completely: ```lang ... ```
    text = text.replace(/```[\s\S]*?```/g, ' ');

    // 2. Remove markdown images: ![alt](url)
    text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');

    // 3. Convert markdown links: [label](url) -> label
    text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

    // 4. Remove plain URLs: https://... or http://...
    text = text.replace(/https?:\/\/\S+/gi, ' ');

    // 5. Remove markdown table delimiter / divider rows like |---|---| or |:---|---:| or +---+---+
    text = text.replace(/^\s*\|?[-:| ]+\|?\s*$/gm, ' ');

    // 6. Handle table rows: replace pipes '|' with a natural pause (comma or space)
    // For example: "| Speed | 240 MHz |" -> "Speed, 240 MHz"
    text = text.replace(/\|/g, ', ');

    // 7. Remove markdown horizontal rules (---, ***, ___, ===)
    text = text.replace(/^\s*[-*_=\s]{3,}\s*$/gm, ' ');

    // 8. Remove markdown headers syntax (### Title -> Title, # -> space)
    text = text.replace(/#{1,6}\s*/g, ' ');

    // 9. Remove bullet point markers at start of lines (*, -, +, •, ‣, ⁃)
    text = text.replace(/(^|\n)\s*[-*+•‣⁃]\s+/g, '$1 ');

    // 10. Replace common symbols with spoken words or spaces
    text = text
      .replace(/&/g, ' and ')
      .replace(/@/g, ' at ')
      .replace(/%/g, ' percent ')
      .replace(/°C/g, ' degrees Celsius ')
      .replace(/°F/g, ' degrees Fahrenheit ')
      .replace(/°/g, ' degrees ')
      .replace(/\$/g, ' dollars ')
      .replace(/₹/g, ' rupees ')
      .replace(/=/g, ' equals ')
      .replace(/\+/g, ' plus ')
      .replace(/\//g, ' ')
      .replace(/\\/g, ' ');

    // 11. Remove all formatting symbols, brackets, braces, quotes, etc.
    // Specifically targets: # * _ ` ~ ^ < > [ ] { } ( ) " ' « »
    text = text.replace(/[*_#`~^<>[\]{}()"'«»]/g, ' ');

    // 12. Remove standalone hyphens / dashes (preserve intra-word hyphens like "real-time")
    text = text.replace(/--+/g, ' ');
    text = text.replace(/(^|\s)-+(\s|$)/g, '$1 $2');

    // 13. Remove emojis and miscellaneous non-verbal symbols
    text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');

    // 14. Clean up multiple punctuation marks: e.g. ",,", "..", "?!", ",."
    text = text.replace(/[,;:]\s*[,;:]+/g, ',');
    text = text.replace(/\.{2,}/g, '.');
    text = text.replace(/[!]{2,}/g, '!');
    text = text.replace(/[?]{2,}/g, '?');
    text = text.replace(/\s+([,.;!?])/g, '$1');

    // 15. Normalize spaces and trim
    text = text.replace(/\s+/g, ' ').trim();

    // 16. If text contains no letters or digits, return empty string
    if (!/[a-zA-Z0-9\u0900-\u0DFF]/.test(text)) {
      return '';
    }

    return text;
  }

  private createUtterance(text: string, settings: AgentSettings): SpeechSynthesisUtterance | null {
    const cleanedText = TTSService.cleanTextForSpeech(text);
    if (!cleanedText) {
      return null;
    }

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    const requestedGender: VoiceGender = settings.voiceGender || 'Female';

    // Natural human conversational rate (default 1.0; no artificial robotic acceleration)
    const baseSpeed = settings.voiceSpeed || 1.0;
    utterance.rate = Math.min(Math.max(baseSpeed, 0.85), 1.15);

    // Detect language code
    const langMap: Record<string, string> = {
      'hi-IN': 'hi-IN',
      'hinglish': 'hi-IN',
      'bho-IN': 'hi-IN',
      'bn-IN': 'bn-IN',
      'mr-IN': 'mr-IN',
      'ta-IN': 'ta-IN',
      'te-IN': 'te-IN',
      'gu-IN': 'gu-IN',
      'kn-IN': 'kn-IN',
      'ml-IN': 'ml-IN',
      'pa-IN': 'pa-IN',
      'ur-PK': 'ur',
      'en-IN': 'en-IN'
    };
    utterance.lang = langMap[settings.language] || 'en-US';

    const voices = this.getVoices();
    const langPrefix = utterance.lang.slice(0, 2).toLowerCase();

    // Comprehensive male voice keyword identifiers across Windows, Edge, Mac, Android, Chrome, Linux
    const isVoiceMale = (name: string): boolean => {
      const n = name.toLowerCase();
      return n.includes('male') || 
             n.includes('guy') || 
             n.includes('christopher') ||
             n.includes('madhur') || 
             n.includes('ravi') || 
             n.includes('david') || 
             n.includes('george') || 
             n.includes('adam') || 
             n.includes('mark') || 
             n.includes('james') ||
             n.includes('rohan') || 
             n.includes('kabir') || 
             n.includes('daniel') ||
             n.includes('alex') || 
             n.includes('fred') || 
             n.includes('rishi') ||
             n.includes('thomas') || 
             n.includes('oliver') || 
             n.includes('arthur') || 
             n.includes('aaron') || 
             n.includes('hemant') || 
             n.includes('tarun') || 
             n.includes('prashant') || 
             n.includes('sean') || 
             n.includes('gordon') ||
             n.includes('nathan') ||
             n.includes('evan') ||
             n.includes('male_1') || 
             n.includes('#male');
    };

    const isVoiceFemale = (name: string): boolean => {
      const n = name.toLowerCase();
      return n.includes('female') || 
             n.includes('natural') && (n.includes('jenny') || n.includes('aria') || n.includes('swara') || n.includes('neerja')) ||
             n.includes('swara') || 
             n.includes('neerja') || 
             n.includes('jenny') ||
             n.includes('aria') ||
             n.includes('zira') || 
             n.includes('samantha') || 
             n.includes('kavya') || 
             n.includes('priya') || 
             n.includes('rachel') || 
             n.includes('bella') ||
             n.includes('ananya') || 
             n.includes('victoria') || 
             n.includes('karen') || 
             n.includes('moira') || 
             n.includes('fiona') || 
             n.includes('tessa') || 
             n.includes('sangeeta') || 
             n.includes('kalpana') || 
             n.includes('google हिन्दी') || 
             n.includes('serena') ||
             n.includes('ava') ||
             n.includes('zoe') ||
             n.includes('#female');
    };

    // Calculate naturalness score for human-like timbre vs robotic synthesizers
    const scoreVoiceQuality = (voice: SpeechSynthesisVoice): number => {
      const n = voice.name.toLowerCase();
      let score = 0;

      // Top-Tier Human Neural / Natural voices (Edge, Chrome, Windows 11, macOS, Android)
      if (n.includes('online (natural)') || n.includes('natural')) score += 200;
      if (n.includes('neural2') || n.includes('wavenet') || n.includes('neural')) score += 180;
      if (n.includes('enhanced') || n.includes('premium') || n.includes('studio')) score += 160;
      if (n.includes('google')) score += 140;
      if (n.includes('siri') || n.includes('apple')) score += 130;

      // Human name priorities
      if (n.includes('swara') || n.includes('madhur') || n.includes('neerja') || n.includes('kabir')) score += 90;
      if (n.includes('jenny') || n.includes('guy') || n.includes('aria') || n.includes('christopher')) score += 80;

      // Heavily penalize legacy robotic desktop/linux synthesizers
      if (
        n.includes('desktop') ||
        n.includes('espeak') ||
        n.includes('mbrola') ||
        n.includes('festival') ||
        n.includes('flite') ||
        n.includes('compact') ||
        n.includes('synthesizer') ||
        n.includes('speech-dispatcher')
      ) {
        score -= 300;
      }

      // Language match priority
      if (voice.lang.toLowerCase() === utterance.lang.toLowerCase()) score += 80;
      else if (voice.lang.toLowerCase().startsWith(langPrefix)) score += 50;
      else if (voice.lang.toLowerCase().startsWith('en')) score += 20;

      return score;
    };

    // Filter candidate voices by requested gender
    let candidateVoices = voices.filter(v => {
      if (requestedGender === 'Male') {
        return isVoiceMale(v.name);
      } else {
        return isVoiceFemale(v.name) || !isVoiceMale(v.name);
      }
    });

    if (candidateVoices.length === 0) {
      candidateVoices = voices;
    }

    // Sort to prioritize the most natural, human-sounding neural voice available
    candidateVoices.sort((a, b) => scoreVoiceQuality(b) - scoreVoiceQuality(a));

    const bestVoice = candidateVoices[0] || null;
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // Preserve native human vocal pitch (1.0).
    // Avoid artificial pitch scaling (like 0.65 or 0.82) which introduces metallic robotic timbre!
    const userConfiguredPitch = typeof settings.voicePitch === 'number' && settings.voicePitch > 0
      ? settings.voicePitch
      : 1.0;

    utterance.pitch = userConfiguredPitch;

    return utterance;
  }

  /**
   * Start a fresh streaming speech session (cancels prior speech and resets queue)
   */
  public startStreamingSession(onAllEnd?: () => void): void {
    if (!this.synth) return;
    if (this.synth.speaking || this.synth.pending) {
      this.synth.cancel();
    }
    if (this.synth.paused) {
      this.synth.resume();
    }
    this.queueCount = 0;
    this.streamIsActive = true;
    this.isSpeaking = false;
    this.onQueueAllEndCallback = onAllEnd;
    this.startWatchdog();
  }

  /**
   * Signals that the AI text stream has finished generating all sentences.
   * If all enqueued sentences have completed, onAllEnd will be triggered.
   */
  public finishStreamingSession(): void {
    this.streamIsActive = false;
    if (this.queueCount <= 0) {
      this.isSpeaking = false;
      this.stopWatchdog();
      if (this.onQueueAllEndCallback) {
        const cb = this.onQueueAllEndCallback;
        this.onQueueAllEndCallback = undefined;
        cb();
      }
    }
  }

  /**
   * Enqueues a single sentence for immediate or seamless sequential playback
   */
  public enqueueSentence(
    sentence: string,
    settings: AgentSettings,
    onFirstStart?: () => void
  ): void {
    if (!this.synth) return;
    const clean = sentence.trim();
    if (!clean) return;

    if (this.synth.paused) {
      this.synth.resume();
    }

    const utterance = this.createUtterance(clean, settings);
    if (!utterance) {
      // If no speakable words and queue is empty and stream finished, complete
      if (this.queueCount <= 0 && !this.streamIsActive && this.onQueueAllEndCallback) {
        const cb = this.onQueueAllEndCallback;
        this.onQueueAllEndCallback = undefined;
        this.isSpeaking = false;
        this.stopWatchdog();
        cb();
      }
      return;
    }
    this.queueCount++;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onFirstStart) onFirstStart();
    };

    utterance.onend = () => {
      this.queueCount = Math.max(0, this.queueCount - 1);
      // Only signal all finished if queue is empty AND stream has finished generating!
      if (this.queueCount <= 0 && !this.streamIsActive) {
        this.queueCount = 0;
        this.isSpeaking = false;
        this.stopWatchdog();
        if (this.onQueueAllEndCallback) {
          const cb = this.onQueueAllEndCallback;
          this.onQueueAllEndCallback = undefined;
          cb();
        }
      }
    };

    utterance.onerror = (e: any) => {
      // Chrome fires canceled/interrupted if new speech begins, which is normal
      if (e?.error !== 'canceled' && e?.error !== 'interrupted') {
        console.warn('[TTS] Speech queue error:', e);
      }
      this.queueCount = Math.max(0, this.queueCount - 1);
      if (this.queueCount <= 0 && !this.streamIsActive) {
        this.queueCount = 0;
        this.isSpeaking = false;
        this.stopWatchdog();
        if (this.onQueueAllEndCallback) {
          const cb = this.onQueueAllEndCallback;
          this.onQueueAllEndCallback = undefined;
          cb();
        }
      }
    };

    // Small delay ensures Chrome has finished resetting audio hardware after cancel
    setTimeout(() => {
      try {
        if (this.synth) {
          if (this.synth.paused) {
            this.synth.resume();
          }
          this.synth.speak(utterance);
        }
      } catch (err) {
        console.warn('[TTS] Speech synthesis speak exception:', err);
      }
    }, 20);
  }

  public speak(
    text: string,
    settings: AgentSettings,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (!this.synth) {
      if (onStart) onStart();
      setTimeout(() => { if (onEnd) onEnd(); }, 2000);
      return;
    }

    // Cancel any currently playing speech and unpause audio
    this.synth.cancel();
    if (this.synth.paused) {
      this.synth.resume();
    }

    const utterance = this.createUtterance(text, settings);
    if (!utterance) {
      if (onEnd) onEnd();
      return;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('[TTS] Speech synthesis error:', e);
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    this.synth.speak(utterance);
  }

  public stop(): void {
    this.streamIsActive = false;
    this.queueCount = 0;
    this.onQueueAllEndCallback = undefined;
    this.stopWatchdog();
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
  }

  public getSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const ttsService = TTSService.getInstance();
