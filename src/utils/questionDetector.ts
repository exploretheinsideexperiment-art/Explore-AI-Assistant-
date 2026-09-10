/**
 * Question Detection & Ambient Noise Rejection Utility
 * 
 * Filters out:
 * - Ambient room sounds, fan hum, TV chatter, background conversations
 * - Vocal fillers: "uh", "um", "ah", "hmm", "mhm", "cough", etc.
 * - Stray isolated syllables and non-interrogative background noise fragments
 * 
 * Accurately recognizes:
 * - Questions and inquiries in English, Hindi, Hinglish, and regional Indian languages
 * - Direct queries directed at the AI assistant (including wake word addressed queries)
 * - Complete conversational requests or commands
 */

import { wakeWordService } from '../services/wakeWordService';

const PURE_FILLER_NOISE_REGEX = /^(uh|um|er|ah|eh|oh|hmm|mhm|huh|shh|psst|ha|haha|cough|snort|clear|throat|music|applause|laughter|noise|echo|\.+|\?+|,+|!+)+$/i;

const HINDI_FILLER_NOISE_REGEX = /^(हम्म|हाँ|अरे|ऊँ|अच्छा|अं|ओह|हे|सुनो|वाह|छि)+$/i;

const QUESTION_WORDS_REGEX = /\b(what|what's|why|why's|how|how's|who|who's|whom|whose|where|where's|when|when's|which|which's|can\s+you|could\s+you|would\s+you|will\s+you|should\s+i|may\s+i|do\s+you|does|did|is\s+it|is\s+there|are\s+you|are\s+there|tell\s+me|explain|describe|define|calculate|solve|show\s+me|find|search|give\s+me|recommend|suggest|help\s+me|what\s+is|how\s+to|who\s+is|where\s+is|tell\s+me\s+about|meaning\s+of|weather|capital\s+of|president\s+of|prime\s+minister)\b/i;

const HINDI_QUESTION_WORDS_REGEX = /(क्या|कैसे|क्यों|क्यूँ|कहाँ|कब|कौन|कितना|कितनी|कितने|किसका|किसने|किसको|बताओ|बताइए|समझाओ|समझाइए|खोजो|ढूंढो|मतलब|अर्थ|जानकारी|कैसा|कैसी|मौसम|राजधानी)/;

const HINGLISH_QUESTION_WORDS_REGEX = /\b(kya|kaise|kyon|kyu|kahan|kab|kaun|kitna|kitni|kitne|kiska|batao|bataiye|samjhao|khojo|matlab|arth|bata)\b/i;

const REGIONAL_QUESTION_WORDS_REGEX = /(কি|কেন|কিভাবে|কোথায়|কখন|কে|বলুন|என்ன|எப்படி|ஏன்|எங்கே|யார்|சொல்லுங்கள்|ఏమిటి|ఎలా|ఎందుకు|ఎక్కడ|ఎవరు|చెప్పండి|എന്താണ്)/;

const STANDALONE_VALID_WORDS = new Set([
  'why', 'what', 'who', 'how', 'when', 'where', 'help', 'stop', 'pause', 'resume',
  'क्यों', 'क्या', 'कैसे', 'कब', 'कहाँ', 'कौन', 'मदद', 'रुको', 'चुप', 'सुनो'
]);

export interface QuestionCheckResult {
  isQuestion: boolean;
  isNoise: boolean;
  cleanQuery: string;
  reason: string;
}

export function evaluateSpeechInput(rawTranscript: string): QuestionCheckResult {
  const trimmed = (rawTranscript || '').trim();

  // 1. Empty or virtually empty transcripts
  if (!trimmed || trimmed.length < 2) {
    return {
      isQuestion: false,
      isNoise: true,
      cleanQuery: '',
      reason: 'Empty or sub-minimum transcript'
    };
  }

  // 2. Check for explicit wake word phrases (e.g. "Hey Explorer, what is...")
  const wakeCheck = wakeWordService.parseWakeWord(trimmed);
  const candidateText = wakeCheck.hasWakeWord && wakeCheck.cleanedQuery
    ? wakeCheck.cleanedQuery.trim()
    : trimmed;

  // If only wake word was spoken (e.g. "Hey Explorer")
  if (wakeCheck.hasWakeWord && wakeCheck.isWakeOnly) {
    return {
      isQuestion: true,
      isNoise: false,
      cleanQuery: '',
      reason: 'Wake word awakening'
    };
  }

  // 3. Filter out purely ambient filler sounds / noise artifacts
  if (PURE_FILLER_NOISE_REGEX.test(candidateText) || HINDI_FILLER_NOISE_REGEX.test(candidateText)) {
    return {
      isQuestion: false,
      isNoise: true,
      cleanQuery: candidateText,
      reason: 'Filler sound or vocal artifact'
    };
  }

  // Split into words
  const words = candidateText.split(/\s+/).filter(w => w.length > 0);

  // 4. Single word evaluation:
  // Most background noise fragments are single isolated words (e.g. "the", "table", "ah", "car")
  if (words.length === 1) {
    const singleWord = words[0].toLowerCase().replace(/[.,?!।]/g, '');
    if (STANDALONE_VALID_WORDS.has(singleWord) || candidateText.endsWith('?')) {
      return {
        isQuestion: true,
        isNoise: false,
        cleanQuery: candidateText,
        reason: 'Valid single-word interrogative'
      };
    }
    // Otherwise single isolated words are almost always background noise
    return {
      isQuestion: false,
      isNoise: true,
      cleanQuery: candidateText,
      reason: 'Single isolated word without question context (ambient noise)'
    };
  }

  // 5. Check for explicit question mark
  if (candidateText.includes('?') || candidateText.includes('؟')) {
    return {
      isQuestion: true,
      isNoise: false,
      cleanQuery: candidateText,
      reason: 'Contains question mark'
    };
  }

  // 6. Check for English interrogative and inquiry keywords
  if (QUESTION_WORDS_REGEX.test(candidateText)) {
    return {
      isQuestion: true,
      isNoise: false,
      cleanQuery: candidateText,
      reason: 'Matched English interrogative phrase'
    };
  }

  // 7. Check for Hindi / Hinglish / Regional Indian question words
  if (
    HINDI_QUESTION_WORDS_REGEX.test(candidateText) ||
    HINGLISH_QUESTION_WORDS_REGEX.test(candidateText) ||
    REGIONAL_QUESTION_WORDS_REGEX.test(candidateText)
  ) {
    return {
      isQuestion: true,
      isNoise: false,
      cleanQuery: candidateText,
      reason: 'Matched Indic interrogative phrase'
    };
  }

  // 8. If wake word was included, treat any subsequent phrase >= 2 words as intentional
  if (wakeCheck.hasWakeWord && words.length >= 2) {
    return {
      isQuestion: true,
      isNoise: false,
      cleanQuery: candidateText,
      reason: 'Addressed directly via wake word'
    };
  }

  // 9. Conversational requests with standard sentence structures (>= 3 words and length >= 12 chars)
  // e.g. "I want to know about moon", "Tell a story", "Good morning explorer"
  if (words.length >= 3 && candidateText.length >= 12) {
    return {
      isQuestion: true,
      isNoise: false,
      cleanQuery: candidateText,
      reason: 'Substantial conversational sentence'
    };
  }

  // 10. Anything else (e.g. 2 stray words picked up from TV like "blue door" or "fifteen percent") is ignored
  return {
    isQuestion: false,
    isNoise: true,
    cleanQuery: candidateText,
    reason: 'Ambient non-question background speech'
  };
}
