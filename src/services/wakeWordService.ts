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
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      // Pitch: D5 (587.33 Hz) jumping to A5 (880.00 Hz)
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.setValueAtTime(880.0, now + 0.12);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, now + 0.12); // subtle harmonic sparkle

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now + 0.12);
      osc1.stop(now + 0.28);
      osc2.stop(now + 0.28);
    } catch (e) {
      console.warn('[WakeWord] Chime audio playback skipped:', e);
    }
  }

  /**
   * Analyzes speech transcript for "Hey Explorer" patterns in English, Hindi, and Hinglish.
   */
  public parseWakeWord(transcript: string): WakeWordResult {
    const text = transcript.trim();
    if (!text) {
      return { hasWakeWord: false, rawText: text, cleanedQuery: '', isWakeOnly: false };
    }

    // Regex pattern matching "Hey Explorer", "Hey Explore", "Ok Explorer", "Hello Explorer", "Hey Xplorer",
    // with optional punctuation after greeting (e.g. "Hey, Explorer"), and Hindi equivalents
    const wakeRegex = /^(?:(?:hey|hay|hi|hello|ok|okay|अरे|हे|सुनो|ऐ)[,\s!?-]+)?(?:explorer|explore|explorers|xplorer|xplore|axplorer|इक्स्प्लोरर|एक्सप्लोरर|एक्सप्लोर|एक्स्प्लोरर)[\s,:.!?-]*/i;
    const generalWakeRegex = /(?:(?:hey|hay|hi|hello|ok|okay|अरे|हे|सुनो|ऐ)[,\s!?-]+)?(?:explorer|explore|explorers|xplorer|xplore|axplorer|इक्स्प्लोरर|एक्सप्लोरर|एक्सप्लोर|एक्स्प्लोरर)[\s,:.!?-]*/i;

    let matched = text.match(wakeRegex);
    let matchedIndex = 0;
    let matchedLength = 0;

    if (matched && matched[0].trim().length > 0) {
      matchedIndex = matched.index || 0;
      matchedLength = matched[0].length;
    } else {
      // Check if wake word occurred anywhere in the spoken phrase
      const midMatch = text.match(generalWakeRegex);
      if (midMatch && midMatch.index !== undefined && midMatch[0].trim().length > 0) {
        matched = midMatch;
        matchedIndex = midMatch.index;
        matchedLength = midMatch[0].length;
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
