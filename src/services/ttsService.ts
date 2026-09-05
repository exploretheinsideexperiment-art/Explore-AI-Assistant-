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
  private onQueueAllEndCallback?: () => void;

  private createUtterance(text: string, settings: AgentSettings): SpeechSynthesisUtterance {
    const cleanedText = text
      .replace(/[*_#`~[\]]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    const requestedGender: VoiceGender = settings.voiceGender || 'Female';

    // Snappy speech rate: default ~1.12x for quick responsive voice assistant feel
    const baseSpeed = settings.voiceSpeed || 1.0;
    utterance.rate = Math.max(1.06, baseSpeed * 1.10);

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

    // Comprehensive male voice keyword identifiers across Windows, Mac, Android, Linux
    const isVoiceMale = (name: string): boolean => {
      const n = name.toLowerCase();
      return n.includes('male') || 
             n.includes('madhur') || 
             n.includes('ravi') || 
             n.includes('david') || 
             n.includes('george') || 
             n.includes('guy') || 
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
             n.includes('male_1') || 
             n.includes('#male');
    };

    const isVoiceFemale = (name: string): boolean => {
      const n = name.toLowerCase();
      return n.includes('female') || 
             n.includes('swara') || 
             n.includes('neerja') || 
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
             n.includes('#female');
    };

    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (requestedGender === 'Male') {
      selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix) && isVoiceMale(v.name)) || null;
      if (!selectedVoice) {
        selectedVoice = voices.find(v => (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en')) && isVoiceMale(v.name)) || null;
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => isVoiceMale(v.name)) || null;
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix)) || null;
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      const isActuallyMaleVoice = selectedVoice ? isVoiceMale(selectedVoice.name) : false;
      const basePitch = settings.voicePitch && settings.voicePitch !== 1.0 ? settings.voicePitch : 1.0;
      utterance.pitch = isActuallyMaleVoice ? basePitch * 0.82 : basePitch * 0.65;
    } else {
      selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix) && (isVoiceFemale(v.name) || !isVoiceMale(v.name))) || null;
      if (!selectedVoice) {
        selectedVoice = voices.find(v => isVoiceFemale(v.name)) || null;
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix)) || null;
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      const basePitch = settings.voicePitch && settings.voicePitch !== 1.0 ? settings.voicePitch : 1.0;
      utterance.pitch = basePitch * 1.06;
    }

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
    this.isSpeaking = false;
    this.onQueueAllEndCallback = onAllEnd;
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
    this.queueCount++;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onFirstStart) onFirstStart();
    };

    utterance.onend = () => {
      this.queueCount = Math.max(0, this.queueCount - 1);
      if (this.queueCount <= 0) {
        this.queueCount = 0;
        this.isSpeaking = false;
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
      if (this.queueCount <= 0) {
        this.queueCount = 0;
        this.isSpeaking = false;
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
    this.queueCount = 0;
    this.onQueueAllEndCallback = undefined;
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
