export interface WakeWordResult {
  hasWakeWord: boolean;
  rawText: string;
  cleanedQuery: string;
  isWakeOnly: boolean;
  matchedPhrase?: string;
}

export class WakeWordService {
  private static instance: WakeWordService;
  private audioCtx: AudioContext | null = null;

  private constructor() {}

  public static getInstance(): WakeWordService {
    if (!WakeWordService.instance) {
      WakeWordService.instance = new WakeWordService();
    }
    return WakeWordService.instance;
  }

  /**
   * Plays a crisp, futuristic 2-tone chime via Web Audio API to signal wake-word activation
   */
  public playWakeChime(): void {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      // Snappy two-tone energetic chime: 659.25 Hz (E5) jumping to 1046.5 Hz (C6)
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.setValueAtTime(1046.5, now + 0.07);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.5, now + 0.07); // light high harmonic

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now + 0.07);
      osc1.stop(now + 0.16);
      osc2.stop(now + 0.16);
    } catch (e) {
      console.warn('[WakeWord] Chime audio playback skipped:', e);
    }
  }

  /**
   * Plays a gentle descending chime when the microphone turns off
   */
  public playSleepChime(): void {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      // Pitch: descending A5 (880 Hz) to D5 (587.33 Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880.0, now);
      osc.frequency.setValueAtTime(587.33, now + 0.1);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      // AudioContext fallback
    }
  }

  /**
   * Analyzes speech transcript for "Hey Explorer", "Hi Explorer", "Hello Explorer" patterns
   * in English, Hindi, and Hinglish.
   */
  public parseWakeWord(transcript: string): WakeWordResult {
    const text = transcript.trim();
    if (!text) {
      return { hasWakeWord: false, rawText: text, cleanedQuery: '', isWakeOnly: false };
    }

    // Explicit wake greetings: "hey explorer", "hi explorer", "hello explorer", "ok explorer", etc.
    const greetingWakeRegex = /(?:^|\b)(hey|hay|hi|hello|ok|okay|a|the|हे|नमस्ते|सुनो|अरे|ऐ)[,\s!?-]+(explorer|xplorer|explore|explorers|explore\s*ai|एक्सप्लोरर|एक्स्प्लोरर|इक्स्प्लोरर)\b[\s,:.!?-]*/i;

    // Direct address at the beginning: "Explorer, what is..." or "Explore AI, what is..."
    const directWakeRegex = /^(?:explorer|xplorer|explore\s*ai|एक्सप्लोरर|एक्स्प्लोरर)[\s,:.!?-]*/i;

    let matched = text.match(greetingWakeRegex);
    let matchedIndex = 0;
    let matchedLength = 0;

    if (matched && matched.index !== undefined) {
      matchedIndex = matched.index;
      matchedLength = matched[0].length;
    } else {
      matched = text.match(directWakeRegex);
      if (matched && matched.index !== undefined) {
        matchedIndex = matched.index;
        matchedLength = matched[0].length;
      }
    }

    if (!matched) {
      return {
        hasWakeWord: false,
        rawText: text,
        cleanedQuery: text,
        isWakeOnly: false
      };
    }

    // Extract remainder after the wake phrase
    const remainder = text.slice(matchedIndex + matchedLength).trim();
    
    // Clean leading punctuation
    const cleanedQuery = remainder.replace(/^[,:;!?-]+\s*/, '').trim();

    return {
      hasWakeWord: true,
      rawText: text,
      cleanedQuery,
      isWakeOnly: cleanedQuery.length === 0,
      matchedPhrase: matched[0].trim()
    };
  }
}

export const wakeWordService = WakeWordService.getInstance();
