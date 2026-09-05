import React, { useState } from 'react';
import { AgentSettings, GroqModel, SearchEngine, PersonalityMode, VoiceMode, VoiceGender } from '../types';
import { SUPPORTED_LANGUAGES, AVAILABLE_VOICES } from '../data/languagesAndVoices';
import { ttsService } from '../services/ttsService';
import { Key, Sparkles, Search, Sliders, Volume2, Globe, Cpu, Check, AlertCircle, Eye, EyeOff, ShieldCheck, Play, Square, User } from 'lucide-react';

interface AgentSettingsViewProps {
  settings: AgentSettings;
  onSaveSettings: (newSettings: AgentSettings) => void;
}

export const AgentSettingsView: React.FC<AgentSettingsViewProps> = ({
  settings,
  onSaveSettings
}) => {
  const [formData, setFormData] = useState<AgentSettings>(settings);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showSearchKey, setShowSearchKey] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleGenderChange = (gender: VoiceGender) => {
    const defaultVoice = gender === 'Male' ? 'madhur' : 'swara';
    const currentMatchesGender = AVAILABLE_VOICES.some(v => v.gender === gender && v.id === formData.voice);
    const chosenVoice = currentMatchesGender ? formData.voice : defaultVoice;
    const updated: AgentSettings = {
      ...formData,
      voiceGender: gender,
      voice: chosenVoice
    };
    setFormData(updated);
    onSaveSettings(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleSelectVoice = (voiceId: string) => {
    const matched = AVAILABLE_VOICES.find(v => v.id === voiceId);
    const updatedGender = matched ? matched.gender : formData.voiceGender;
    const updated: AgentSettings = {
      ...formData,
      voice: voiceId,
      voiceGender: updatedGender
    };
    setFormData(updated);
    onSaveSettings(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handlePreviewVoice = (overrideGender?: VoiceGender) => {
    if (isPlayingPreview) {
      ttsService.stop();
      setIsPlayingPreview(false);
      return;
    }

    const testGender = overrideGender || formData.voiceGender || 'Female';
    const activeVoice = overrideGender
      ? (overrideGender === 'Male' ? 'madhur' : 'swara')
      : formData.voice;

    const testSettings: AgentSettings = {
      ...formData,
      voiceGender: testGender,
      voice: activeVoice
    };

    setIsPlayingPreview(true);
    const sampleText = testGender === 'Male'
      ? (formData.language.startsWith('hi') || formData.language === 'hinglish' || formData.language === 'bho-IN'
          ? 'नमस्ते! यह पुरुष आवाज़ (मधुर) का परीक्षण है। एक्सप्लोर एआई पूरी तरह तैयार है।'
          : 'Hello! This is a test of the Male Voice engine. Explore AI is ready to assist you.')
      : (formData.language.startsWith('hi') || formData.language === 'hinglish' || formData.language === 'bho-IN'
          ? 'नमस्ते! यह महिला आवाज़ (स्वरा) का परीक्षण है। एक्सप्लोर एआई आपकी सहायता के लिए तैयार है।'
          : 'Hello! This is a test of the Female Voice engine. Explore AI is ready to assist you.');

    ttsService.speak(
      sampleText,
      testSettings,
      () => setIsPlayingPreview(true),
      () => setIsPlayingPreview(false)
    );
  };

  const groqModels: { id: GroqModel; name: string; tag: string; description: string }[] = [
    {
      id: 'openai/gpt-oss-120b',
      name: 'openai/gpt-oss-120b',
      tag: 'Massive Reasoning',
      description: 'OpenAI 120B open-weights model hosted on Groq LPU with extensive parametric knowledge and deep reasoning.'
    },
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      tag: 'Recommended',
      description: 'State-of-the-art open weights model with deep reasoning and STEM knowledge.'
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      tag: 'Ultra Fast',
      description: 'Sub-100ms first-token latency, optimal for natural back-and-forth voice chat.'
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B 32k',
      tag: 'High Context',
      description: 'Mixture of experts architecture with 32k context window.'
    },
    {
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B IT',
      tag: 'Efficient',
      description: 'Google DeepMind open model with high factual accuracy.'
    }
  ];

  const searchEngines: { id: SearchEngine; name: string; desc: string }[] = [
    { id: 'built-in', name: 'Built-in / DuckDuckGo Grounding', desc: 'Zero configuration, automatic search grounding' },
    { id: 'tavily', name: 'Tavily Search API', desc: 'AI-optimized search snippets and real-time facts' },
    { id: 'serper', name: 'Serper (Google Search API)', desc: 'Fast Google search API' },
    { id: 'google', name: 'Google Custom Search Engine', desc: 'Official Google Programmable Search JSON API' }
  ];

  const personalityModes: { id: PersonalityMode; label: string; desc: string }[] = [
    { id: 'educational', label: 'Educational', desc: 'Guides users through IoT, science, and math with clear intuitive explanations' },
    { id: 'friendly', label: 'Friendly', desc: 'Warm, encouraging, and conversational like an engaging companion' },
    { id: 'professional', label: 'Professional', desc: 'Concise, structured, objective, and straight to the point' },
    { id: 'technical', label: 'Technical', desc: 'Precise hardware pinouts, register details, code snippets, and schematics' },
    { id: 'general', label: 'General', desc: 'Balanced everyday general knowledge assistant' }
  ];

  const voiceModes: { id: VoiceMode; label: string; desc: string }[] = [
    { id: 'wake_word', label: 'Wake Word ("Hey Explorer")', desc: 'Always-on hands-free: Say "Hey Explorer" + your question for instant response' },
    { id: 'push_to_talk', label: 'Push-to-Talk', desc: 'Press button to listen, release to process and speak' },
    { id: 'continuous', label: 'Continuous Conversation', desc: 'Automatic Voice Activity Detection (VAD) loop' }
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Explore AI Agent Settings</h3>
            <p className="text-xs text-slate-400">
              Configure your Groq API key, model selection, search grounding, voice parameters, and languages.
            </p>
          </div>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>Settings synchronized!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8 mt-6">
        {/* Section 1: Groq API Key & Model Configuration */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>1. Groq Inference Engine & Models</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Groq API Key
              </label>
              <div className="relative">
                <input
                  type={showGroqKey ? 'text' : 'password'}
                  value={formData.groqApiKey}
                  onChange={(e) => setFormData({ ...formData, groqApiKey: e.target.value })}
                  placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey(!showGroqKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Your Groq key is held client-side and sent directly to Groq's low-latency inference endpoint.</span>
              </p>
            </div>

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Choose Groq Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {groqModels.map((model) => (
                  <label
                    key={model.id}
                    className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                      formData.groqModel === model.id
                        ? 'bg-cyan-500/10 border-cyan-500/60 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="groqModel"
                          checked={formData.groqModel === model.id}
                          onChange={() => setFormData({ ...formData, groqModel: model.id })}
                          className="accent-cyan-400"
                        />
                        <span className="text-xs font-bold text-white">{model.name}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                        {model.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 ml-5 leading-relaxed">
                      {model.description}
                    </p>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Realtime Search API Key & Search Engine */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Search className="w-4 h-4 text-cyan-400" />
            <span>2. Real-time Search Grounding</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Search Engine Provider
                </label>
                <select
                  value={formData.searchEngine}
                  onChange={(e) => setFormData({ ...formData, searchEngine: e.target.value as SearchEngine })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  {searchEngines.map((se) => (
                    <option key={se.id} value={se.id}>
                      {se.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Search API Key (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showSearchKey ? 'text' : 'password'}
                    value={formData.searchApiKey}
                    onChange={(e) => setFormData({ ...formData, searchApiKey: e.target.value })}
                    placeholder="tvly-xxx or serper-xxx"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSearchKey(!showSearchKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showSearchKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              When configured, Explore AI can look up live news, weather, stock prices, or recent documentation before voicing replies.
            </p>
          </div>
        </div>

        {/* Section 3: Indian & Global Languages */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>3. Language Selection (13+ Supported)</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  type="button"
                  key={lang.code}
                  onClick={() => setFormData({ ...formData, language: lang.code })}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col ${
                    formData.language === lang.code
                      ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <span className="text-xs font-bold text-white">{lang.name}</span>
                  <span className="text-[11px] text-cyan-300 font-medium">{lang.nativeName}</span>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">{lang.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Voice Gender, Persona & Audio Tuning */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>4. Voice Gender, Persona & Audio Tuning</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePreviewVoice(formData.voiceGender || 'Female')}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {isPlayingPreview ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400 animate-pulse" />
                    <span>Stop Preview</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                    <span>Test Current Voice ({formData.voiceGender || 'Female'})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-6">
            {/* Primary Voice Gender Tabs (Separated Female & Male) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Select Voice Engine
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Switch between completely separated Female and Male speech synthesizers
                  </p>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${
                  formData.voiceGender === 'Male'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700/50'
                    : 'bg-rose-950 text-rose-300 border-rose-700/50'
                }`}>
                  Active: {formData.voiceGender === 'Male' ? '👨 Male Voice' : '👩 Female Voice'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Dedicated Female Voice Card */}
                <div
                  onClick={() => handleGenderChange('Female')}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all relative overflow-hidden ${
                    (formData.voiceGender || 'Female') === 'Female'
                      ? 'bg-gradient-to-br from-rose-950/40 to-slate-900 border-rose-500 ring-2 ring-rose-500/30 shadow-lg shadow-rose-950/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg ${
                        (formData.voiceGender || 'Female') === 'Female'
                          ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        👩
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">Female Voice</span>
                          {(formData.voiceGender || 'Female') === 'Female' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-rose-300/90 font-medium">
                          Natural, Warm & Multilingual
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-3 leading-relaxed">
                    Higher frequency range with smooth intonation. Optimized for natural conversational warmth in Hindi, English, and regional dialects.
                  </p>

                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Default: <strong className="text-white">Swara</strong> (Hindi / Eng)
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenderChange('Female');
                        handlePreviewVoice('Female');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <Play className="w-3 h-3 fill-rose-400 text-rose-400" />
                      <span>Test Female</span>
                    </button>
                  </div>
                </div>

                {/* 2. Dedicated Male Voice Card */}
                <div
                  onClick={() => handleGenderChange('Male')}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all relative overflow-hidden ${
                    formData.voiceGender === 'Male'
                      ? 'bg-gradient-to-br from-cyan-950/40 to-slate-900 border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-950/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg ${
                        formData.voiceGender === 'Male'
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        👨
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">Male Voice</span>
                          {formData.voiceGender === 'Male' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-cyan-300/90 font-medium">
                          Deep, Resonant Baritone
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-3 leading-relaxed">
                    Resonant baritone acoustic model with authoritative cadence. Features calibrated deep pitch for clear male vocal articulation.
                  </p>

                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Default: <strong className="text-white">Madhur</strong> (Hindi / Eng)
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenderChange('Male');
                        handlePreviewVoice('Male');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <Play className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                      <span>Test Male</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Separated Voice Model Personas (Filtered by Chosen Engine) */}
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold text-slate-200">
                  {formData.voiceGender === 'Male' ? '👨 Male Voice Models' : '👩 Female Voice Models'}
                </label>
                <span className="text-[11px] text-slate-400">
                  Click any model to apply instantly
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {AVAILABLE_VOICES.filter(v => v.gender === (formData.voiceGender || 'Female')).map((voice) => (
                  <button
                    type="button"
                    key={voice.id}
                    onClick={() => handleSelectVoice(voice.id)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      formData.voice === voice.id
                        ? formData.voiceGender === 'Male'
                          ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400/40'
                          : 'bg-rose-500/20 border-rose-400 text-white shadow-md shadow-rose-500/10 ring-1 ring-rose-400/40'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{voice.name.split('(')[0]}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 font-mono border border-slate-800">
                          {voice.provider}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {voice.accent}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {voice.id}
                      </span>
                      {formData.voice === voice.id && (
                        <span className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Personality Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Personality Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {personalityModes.map((pm) => (
                  <label
                    key={pm.id}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      formData.personality === pm.id
                        ? 'bg-cyan-500/10 border-cyan-500/60 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <input
                      type="radio"
                      name="personality"
                      checked={formData.personality === pm.id}
                      onChange={() => setFormData({ ...formData, personality: pm.id })}
                      className="accent-cyan-400 mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">{pm.label}</div>
                      <div className="text-[10px] text-slate-400 leading-snug mt-0.5">{pm.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Voice Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Voice Trigger Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {voiceModes.map((vm) => (
                  <label
                    key={vm.id}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      formData.voiceMode === vm.id
                        ? 'bg-cyan-500/10 border-cyan-500/60 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <input
                      type="radio"
                      name="voiceMode"
                      checked={formData.voiceMode === vm.id}
                      onChange={() => setFormData({ ...formData, voiceMode: vm.id })}
                      className="accent-cyan-400 mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">{vm.label}</div>
                      <div className="text-[10px] text-slate-400 leading-snug mt-0.5">{vm.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Voice speed & pitch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-900">
              <div>
                <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                  <span>Speaking Rate</span>
                  <span className="font-mono text-cyan-300">{formData.voiceSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.1"
                  value={formData.voiceSpeed}
                  onChange={(e) => setFormData({ ...formData, voiceSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                  <span>Voice Pitch</span>
                  <span className="font-mono text-cyan-300">{formData.voicePitch}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.1"
                  value={formData.voicePitch}
                  onChange={(e) => setFormData({ ...formData, voicePitch: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="submit"
            className="py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Save & Apply Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
