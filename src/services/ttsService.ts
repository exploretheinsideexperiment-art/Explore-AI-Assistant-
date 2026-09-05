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

    // Cancel any currently playing speech
    this.synth.cancel();

    // Clean text of markdown artifacts
    const cleanedText = text
      .replace(/[*_#`~[\]]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    const requestedGender: VoiceGender = settings.voiceGender || 'Female';

    // Base rate and pitch
    utterance.rate = settings.voiceSpeed || 1.0;

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
      // 1. Try to find a male voice for the target language (e.g., Hindi or Indian English male)
      selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix) && isVoiceMale(v.name)) || null;

      // 2. If no male voice for that specific language, find an Indian English male voice or general English male voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en')) && isVoiceMale(v.name)) || null;
      }

      // 3. If still no male voice found, find ANY male voice in the browser
      if (!selectedVoice) {
        selectedVoice = voices.find(v => isVoiceMale(v.name)) || null;
      }

      // 4. If no male voice exists at all on this system (e.g. some devices only install one default voice),
      // pick the best language voice BUT drastically drop the pitch to 0.65 to generate an unmistakable male baritone!
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix)) || null;
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Explicit masculine pitch: if system voice is known male, pitch 0.82 is great.
      // If voice is female or generic, pitch 0.65 lowers fundamental frequency from 220Hz into ~120Hz male range!
      const isActuallyMaleVoice = selectedVoice ? isVoiceMale(selectedVoice.name) : false;
      const basePitch = settings.voicePitch && settings.voicePitch !== 1.0 ? settings.voicePitch : 1.0;
      utterance.pitch = isActuallyMaleVoice ? basePitch * 0.82 : basePitch * 0.65;
      utterance.rate = (settings.voiceSpeed || 1.0) * 0.94; // slightly deeper cadence
    } else {
      // Requested Female Voice
      // 1. Match target language and female voice
      selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix) && (isVoiceFemale(v.name) || !isVoiceMale(v.name))) || null;

      // 2. Match any female voice in the browser
      if (!selectedVoice) {
        selectedVoice = voices.find(v => isVoiceFemale(v.name)) || null;
      }

      // 3. Fallback to target language
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix)) || null;
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      const basePitch = settings.voicePitch && settings.voicePitch !== 1.0 ? settings.voicePitch : 1.0;
      utterance.pitch = basePitch * 1.06;
      utterance.rate = settings.voiceSpeed || 1.0;
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
