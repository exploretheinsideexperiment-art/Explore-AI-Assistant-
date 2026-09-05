import { LanguageOption, VoiceOption, AgentSettings } from '../types';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN' },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English (India)', speechCode: 'en-IN' },
  { code: 'hinglish', name: 'Hinglish', nativeName: 'हिंग्लिश (Hindi + English)', speechCode: 'hi-IN' },
  { code: 'bho-IN', name: 'Bhojpuri', nativeName: 'भोजपुरी', speechCode: 'hi-IN' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', speechCode: 'bn-IN' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', speechCode: 'mr-IN' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', speechCode: 'ta-IN' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', speechCode: 'te-IN' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', speechCode: 'gu-IN' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechCode: 'kn-IN' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', speechCode: 'ml-IN' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', speechCode: 'pa-IN' },
  { code: 'ur-PK', name: 'Urdu', nativeName: 'اردو', speechCode: 'ur-PK' }
];

export const AVAILABLE_VOICES: VoiceOption[] = [
  // Female Voices
  { id: 'swara', name: 'Swara (Natural & Expressive)', gender: 'Female', accent: 'Hindi / Indian English', provider: 'Groq/Edge' },
  { id: 'neerja', name: 'Neerja (Calm & Professional)', gender: 'Female', accent: 'Indian English', provider: 'Groq/Edge' },
  { id: 'rachel', name: 'Rachel (Warm & Clear)', gender: 'Female', accent: 'International English', provider: 'Groq/Edge' },
  { id: 'bella', name: 'Bella (Soft & Educational)', gender: 'Female', accent: 'International English', provider: 'ElevenLabs' },
  { id: 'ananya', name: 'Ananya (Vibrant & Friendly)', gender: 'Female', accent: 'Indian / Multilingual', provider: 'WebSpeech' },

  // Male Voices
  { id: 'madhur', name: 'Madhur (Deep & Authoritative)', gender: 'Male', accent: 'Hindi / Indian English', provider: 'Groq/Edge' },
  { id: 'rohan', name: 'Rohan (Clear & Energetic)', gender: 'Male', accent: 'Indian English', provider: 'Groq/Edge' },
  { id: 'adam', name: 'Adam (Expressive & Narrative)', gender: 'Male', accent: 'International English', provider: 'ElevenLabs' },
  { id: 'kabir', name: 'Kabir (Warm & Conversational)', gender: 'Male', accent: 'Hindi / Indian English', provider: 'WebSpeech' },
  { id: 'george', name: 'George (Academic & Articulate)', gender: 'Male', accent: 'International English', provider: 'Groq/Edge' }
];

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  llmProvider: 'groq',
  groqApiKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  searchApiKey: '',
  searchEngine: 'built-in',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  personality: 'educational',
  language: 'en-IN',
  voiceGender: 'Female',
  voice: 'swara',
  voiceSpeed: 1.0,
  voicePitch: 1.0,
  voiceMode: 'push_to_talk',
  systemPromptAddition: '',
  temperature: 0.6,
  maxTokens: 500
};
