import React, { useState } from 'react';
import { 
  AgentSettings, 
  GroqModel, 
  SearchEngine, 
  PersonalityMode, 
  VoiceMode, 
  VoiceGender,
  LLMProvider 
} from '../types';
import { SUPPORTED_LANGUAGES, AVAILABLE_VOICES, DEFAULT_AGENT_SETTINGS } from '../data/languagesAndVoices';
import { ttsService } from '../services/ttsService';
import { aiService } from '../services/aiService';
import { 
  Key, 
  Sparkles, 
  Search, 
  Sliders, 
  Volume2, 
  Globe, 
  Cpu, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Play, 
  Square, 
  User,
  Bot,
  Zap,
  Mic,
  Radio,
  Download,
  Upload,
  RotateCcw,
  MessageSquare,
  Power,
  Layers,
  SlidersHorizontal,
  Settings2,
  Tv,
  HelpCircle
} from 'lucide-react';

interface AgentSettingsViewProps {
  settings: AgentSettings;
  onSaveSettings: (newSettings: AgentSettings) => void;
}

type SettingsSection = 
  | 'all'
  | 'llm'
  | 'voice'
  | 'trigger'
  | 'language'
  | 'personality'
  | 'search'
  | 'relays'
  | 'oled'
  | 'tester';

export const AgentSettingsView: React.FC<AgentSettingsViewProps> = ({
  settings,
  onSaveSettings
}) => {
  const [formData, setFormData] = useState<AgentSettings>(settings);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showSearchKey, setShowSearchKey] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>('all');
  const [importJsonModalOpen, setImportJsonModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Live in-settings testing playground state
  const [testQuery, setTestQuery] = useState('Explain how an ESP32 I2S microphone captures sound.');
  const [testOutput, setTestOutput] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const updateSetting = <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => {
    const updated = { ...formData, [key]: value };
    setFormData(updated);
    onSaveSettings(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

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

  // Quick Preset Handlers
  const applyPreset = (presetName: 'fast' | 'tutor' | 'smartHome' | 'hindi') => {
    let preset: Partial<AgentSettings> = {};
    if (presetName === 'fast') {
      preset = {
        llmProvider: 'groq',
        groqModel: 'llama-3.1-8b-instant',
        voiceMode: 'push_to_talk',
        temperature: 0.5,
        maxTokens: 1000,
        voiceSpeed: 1.1,
        streamPipelining: true,
        personality: 'general'
      };
    } else if (presetName === 'tutor') {
      preset = {
        llmProvider: 'groq',
        groqModel: 'llama-3.3-70b-versatile',
        personality: 'educational',
        temperature: 0.6,
        maxTokens: 3500,
        searchAutoGrounding: true,
        streamPipelining: true
      };
    } else if (presetName === 'smartHome') {
      preset = {
        personality: 'professional',
        relayVoiceControl: true,
        relayVoiceFeedback: true,
        temperature: 0.3,
        maxTokens: 800,
        voiceSpeed: 1.05
      };
    } else if (presetName === 'hindi') {
      preset = {
        language: 'hi-IN',
        autoLanguageDetect: true,
        personality: 'friendly',
        voiceGender: 'Female',
        voice: 'swara',
        voiceSpeed: 0.95
      };
    }

    const updated = { ...formData, ...preset };
    setFormData(updated);
    onSaveSettings(updated);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all agent functions and parameters to default values?')) {
      setFormData(DEFAULT_AGENT_SETTINGS);
      onSaveSettings(DEFAULT_AGENT_SETTINGS);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(formData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `explore-ai-agent-settings-${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  const handleImportJson = () => {
    try {
      setImportError(null);
      const parsed = JSON.parse(importJsonText);
      const merged: AgentSettings = { ...DEFAULT_AGENT_SETTINGS, ...parsed };
      setFormData(merged);
      onSaveSettings(merged);
      setImportJsonModalOpen(false);
      setImportJsonText('');
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (e: any) {
      setImportError(`Invalid JSON format: ${e.message}`);
    }
  };

  const handleRunLiveTest = async () => {
    if (!testQuery.trim() || isTesting) return;
    setIsTesting(true);
    setTestOutput('Formulating response with configured agent parameters...');
    try {
      const res = await aiService.streamResponse(
        testQuery,
        [],
        formData,
        (sentence, isFirst) => {
          if (isFirst) {
            ttsService.startStreamingSession();
          }
          ttsService.enqueueSentence(sentence, formData);
        },
        (full) => {
          setTestOutput(full);
        }
      );
      setTestOutput(res.text);
      ttsService.finishStreamingSession();
    } catch (e: any) {
      setTestOutput(`Error testing agent: ${e.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const groqModels: { id: GroqModel; name: string; tag: string; description: string }[] = [
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
      id: 'openai/gpt-oss-120b',
      name: 'OpenAI GPT-OSS 120B',
      tag: 'Massive Reasoning',
      description: '120B parameter reasoning model hosted on Groq LPUs for comprehensive textbook depth.'
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B 32k',
      tag: 'High Context',
      description: 'Mixture of experts architecture with 32k token context window.'
    },
    {
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B IT',
      tag: 'Efficient',
      description: 'Google DeepMind open model with high factual accuracy.'
    }
  ];

  const geminiModels: { id: string; name: string; tag: string; desc: string }[] = [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Next-Gen', desc: 'Google next-gen flagship fast multimodal model' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tag: 'High Speed', desc: 'Ultra-low latency reasoning and encyclopedic knowledge' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tag: 'Deep Thinking', desc: 'Complex code generation, schematics, and math proofs' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: 'High Throughput', desc: 'Balanced responsive generation for real-time applications' }
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
    { id: 'push_to_talk', label: 'Push-to-Talk', desc: 'Hold button/mic to speak, release to formulate and vocalize reply' },
    { id: 'wake_word', label: 'Wake Word ("Hey Explorer")', desc: 'Always-on hands-free: Say the wake word + question for instant activation' },
    { id: 'continuous', label: 'Continuous Conversation', desc: 'Automatic Voice Activity Detection (VAD) loop with automatic turn-taking' }
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl max-w-5xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Agent Settings & Function Configurator</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                All Functions Configurable
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Customize LLM engines, voices, acoustic rates, triggers, languages, search grounding, and smart home relay automation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedNotice && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-fadeIn">
              <Check className="w-4 h-4" />
              <span>All Settings Saved!</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportJson}
            title="Export configuration JSON"
            className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={() => setImportJsonModalOpen(true)}
            title="Import configuration JSON"
            className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            title="Reset to factory defaults"
            className="p-2 rounded-xl bg-slate-850 hover:bg-rose-950/40 border border-slate-750 hover:border-rose-700/50 text-slate-400 hover:text-rose-300 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200">1-Click Functional Presets:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset('fast')}
            className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <span>⚡ Ultra-Fast Voice Chat</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('tutor')}
            className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <span>📚 STEM & Encyclopedic Tutor</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('smartHome')}
            className="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <span>🏠 Smart Home Relay Hub</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('hindi')}
            className="px-2.5 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 border border-amber-800/60 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <span>🇮🇳 Hindi/Hinglish Companion</span>
          </button>
        </div>
      </div>

      {/* Function Categories Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800">
        {[
          { id: 'all', label: 'All Functions', icon: <Layers className="w-3.5 h-3.5" /> },
          { id: 'llm', label: 'AI Engine & Models', icon: <Cpu className="w-3.5 h-3.5" /> },
          { id: 'voice', label: 'Voice & Synthesizer', icon: <Volume2 className="w-3.5 h-3.5" /> },
          { id: 'trigger', label: 'Triggers & VAD', icon: <Mic className="w-3.5 h-3.5" /> },
          { id: 'language', label: 'Languages', icon: <Globe className="w-3.5 h-3.5" /> },
          { id: 'personality', label: 'Personality', icon: <Bot className="w-3.5 h-3.5" /> },
          { id: 'search', label: 'Search Grounding', icon: <Search className="w-3.5 h-3.5" /> },
          { id: 'relays', label: 'Relay Automation', icon: <Power className="w-3.5 h-3.5" /> },
          { id: 'oled', label: 'OLED Display', icon: <Tv className="w-3.5 h-3.5" /> },
          { id: 'tester', label: 'Live Test Lab', icon: <Play className="w-3.5 h-3.5 text-cyan-400" /> }
        ].map(cat => (
          <button
            type="button"
            key={cat.id}
            onClick={() => setActiveSection(cat.id as SettingsSection)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
              activeSection === cat.id
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: AI Brain, Inference Provider & Model Parameters */}
        {(activeSection === 'all' || activeSection === 'llm') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>1. AI Brain, Inference Engine & Hyperparameters</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Active Provider: <strong className="text-cyan-300 uppercase">{formData.llmProvider}</strong>
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
              {/* Provider Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Primary Inference Provider
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      formData.llmProvider === 'groq'
                        ? 'bg-cyan-500/15 border-cyan-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <input
                      type="radio"
                      name="llmProvider"
                      checked={formData.llmProvider === 'groq'}
                      onChange={() => updateSetting('llmProvider', 'groq')}
                      className="accent-cyan-400 mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Groq LPU Engine</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                          &lt;200ms
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Sub-second token throughput on dedicated Language Processing Units. Optimal for live voice conversation.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      formData.llmProvider === 'gemini'
                        ? 'bg-cyan-500/15 border-cyan-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <input
                      type="radio"
                      name="llmProvider"
                      checked={formData.llmProvider === 'gemini'}
                      onChange={() => updateSetting('llmProvider', 'gemini')}
                      className="accent-cyan-400 mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Google Gemini</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                          Reasoning
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Gemini 3.8 / 2.5 Flash flagship multimodal reasoning, deep knowledge, and textbook-style encyclopedic answers.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      formData.llmProvider === 'auto'
                        ? 'bg-cyan-500/15 border-cyan-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <input
                      type="radio"
                      name="llmProvider"
                      checked={formData.llmProvider === 'auto'}
                      onChange={() => updateSetting('llmProvider', 'auto')}
                      className="accent-cyan-400 mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Auto-Hybrid Fallback</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 font-mono">
                          Redundant
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Attempts ultra-fast Groq LPU first; automatically falls back to Google Gemini if keys or limits expire.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* API Keys Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Groq API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Groq API Key
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">console.groq.com</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showGroqKey ? 'text' : 'password'}
                      value={formData.groqApiKey}
                      onChange={(e) => setFormData({ ...formData, groqApiKey: e.target.value })}
                      placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGroqKey(!showGroqKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showGroqKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Gemini API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Gemini API Key (Optional Override)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">aistudio.google.com</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={formData.geminiApiKey || ''}
                      onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                      placeholder="AIzaSy... (leave blank to use server key)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Model Selectors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Groq Model Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Select Groq Model Architecture
                  </label>
                  <div className="space-y-2">
                    {groqModels.map(model => (
                      <label
                        key={model.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          formData.groqModel === model.id
                            ? 'bg-cyan-500/10 border-cyan-500/60 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <input
                          type="radio"
                          name="groqModel"
                          checked={formData.groqModel === model.id}
                          onChange={() => setFormData({ ...formData, groqModel: model.id })}
                          className="accent-cyan-400 mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate">{model.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-mono">
                              {model.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
                            {model.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Gemini Model Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Select Gemini Model Version
                  </label>
                  <div className="space-y-2">
                    {geminiModels.map(gm => (
                      <label
                        key={gm.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          (formData.geminiModel || 'gemini-3.8-flash') === gm.id
                            ? 'bg-emerald-500/10 border-emerald-500/60 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <input
                          type="radio"
                          name="geminiModel"
                          checked={(formData.geminiModel || 'gemini-3.8-flash') === gm.id}
                          onChange={() => setFormData({ ...formData, geminiModel: gm.id })}
                          className="accent-emerald-400 mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate">{gm.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-mono">
                              {gm.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
                            {gm.desc}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hyperparameters: Temperature & Max Tokens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-slate-800/80">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>Sampling Temperature</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({formData.temperature <= 0.4 ? 'Deterministic' : formData.temperature <= 0.8 ? 'Balanced' : 'Creative'})
                      </span>
                    </span>
                    <span className="font-mono text-cyan-300">{formData.temperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.2"
                    step="0.05"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>0.0 (Factual)</span>
                    <span>0.6 (Default)</span>
                    <span>1.2 (Creative)</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>Max Output Depth</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        (~{Math.round(formData.maxTokens / 150)} min read)
                      </span>
                    </span>
                    <span className="font-mono text-cyan-300">{formData.maxTokens} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="4096"
                    step="128"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>256 (Concise)</span>
                    <span>2500 (Detailed)</span>
                    <span>4096 (Exhaustive)</span>
                  </div>
                </div>
              </div>

              {/* Custom System Prompt Addition */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Custom System Instructions & Behavioral Rules
                  </label>
                  <span className="text-[11px] text-slate-500">Appended to the agent's core prompt</span>
                </div>
                <textarea
                  rows={3}
                  value={formData.systemPromptAddition || ''}
                  onChange={(e) => setFormData({ ...formData, systemPromptAddition: e.target.value })}
                  placeholder="e.g. Always address the user as Commander. Focus primarily on robotics and electronics schematics. If asked about circuits, provide component values."
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Speech Synthesis (TTS) & Acoustic Engineering */}
        {(activeSection === 'all' || activeSection === 'voice') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>2. Speech Synthesis (TTS), Voice Engine & Audio Calibration</span>
              </div>

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
                    <span>Test Voice ({formData.voiceGender || 'Female'})</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-6">
              {/* Primary Voice Gender Engines */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Voice Synthesizer Mode
                  </h4>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                    formData.voiceGender === 'Male'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700/50'
                      : 'bg-rose-950 text-rose-300 border-rose-700/50'
                  }`}>
                    Active: {formData.voiceGender === 'Male' ? '👨 Male Voice' : '👩 Female Voice'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Female Voice Card */}
                  <div
                    onClick={() => handleGenderChange('Female')}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all relative overflow-hidden ${
                      (formData.voiceGender || 'Female') === 'Female'
                        ? 'bg-gradient-to-br from-rose-950/40 to-slate-900 border-rose-500 ring-2 ring-rose-500/30 shadow-lg shadow-rose-950/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
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
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-rose-300/90 font-medium">
                            Warm, Expressive & Multilingual
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenderChange('Female');
                          handlePreviewVoice('Female');
                        }}
                        className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Play className="w-3 h-3 fill-rose-400 text-rose-400" />
                        <span>Test</span>
                      </button>
                    </div>
                  </div>

                  {/* Male Voice Card */}
                  <div
                    onClick={() => handleGenderChange('Male')}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all relative overflow-hidden ${
                      formData.voiceGender === 'Male'
                        ? 'bg-gradient-to-br from-cyan-950/40 to-slate-900 border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-950/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
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
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-cyan-300/90 font-medium">
                            Deep, Resonant Baritone
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenderChange('Male');
                          handlePreviewVoice('Male');
                        }}
                        className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Play className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                        <span>Test</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voice Model Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2.5">
                  {formData.voiceGender === 'Male' ? 'Select Male Voice Persona' : 'Select Female Voice Persona'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {AVAILABLE_VOICES.filter(v => v.gender === (formData.voiceGender || 'Female')).map((voice) => (
                    <button
                      type="button"
                      key={voice.id}
                      onClick={() => handleSelectVoice(voice.id)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        formData.voice === voice.id
                          ? formData.voiceGender === 'Male'
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md'
                            : 'bg-rose-500/20 border-rose-400 text-white shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
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

              {/* Audio Calibrations: Speed, Pitch, Volume */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-3 border-t border-slate-800/80">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                    <span>Speaking Rate</span>
                    <span className="font-mono text-cyan-300">{formData.voiceSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.5"
                    step="0.05"
                    value={formData.voiceSpeed}
                    onChange={(e) => setFormData({ ...formData, voiceSpeed: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>0.6x Slow</span>
                    <span>1.0x Normal</span>
                    <span>1.5x Fast</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                    <span>Voice Pitch</span>
                    <span className="font-mono text-cyan-300">{formData.voicePitch.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.05"
                    value={formData.voicePitch}
                    onChange={(e) => setFormData({ ...formData, voicePitch: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>0.7x Deeper</span>
                    <span>1.0x Natural</span>
                    <span>1.3x Higher</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                    <span>Audio Volume</span>
                    <span className="font-mono text-cyan-300">{Math.round((formData.voiceVolume || 1.0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.05"
                    value={formData.voiceVolume || 1.0}
                    onChange={(e) => setFormData({ ...formData, voiceVolume: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>20%</span>
                    <span>100%</span>
                    <span>150%</span>
                  </div>
                </div>
              </div>

              {/* Streaming Sentence Pipelining Toggle */}
              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">
                    Sentence-Pipelined Low-Latency Audio Streaming
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Begins speaking the first formulated sentence within 250ms while subsequent sentences are generated.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.streamPipelining !== false}
                  onChange={(e) => updateSetting('streamPipelining', e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Voice Interaction Modes, Wake Word & VAD */}
        {(activeSection === 'all' || activeSection === 'trigger') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span>3. Voice Trigger Modes, Wake Word & Recognition Dynamics</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
              {/* Primary Microphone Option Selection (Click-to-Ask vs Always-On) */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-2.5">
                  Microphone Activation Behavior
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Option 1: Click to Ask */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition relative overflow-hidden ${
                      (formData.micOption || 'click_to_ask') === 'click_to_ask'
                        ? 'bg-cyan-500/10 border-cyan-400 ring-1 ring-cyan-500/40 text-white shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="micOption"
                      checked={(formData.micOption || 'click_to_ask') === 'click_to_ask'}
                      onChange={() => {
                        updateSetting('micOption', 'click_to_ask');
                        updateSetting('voiceMode', 'push_to_talk');
                      }}
                      className="accent-cyan-400 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">🎙️ Idle Mode (Click to Activate Ask)</span>
                        {(formData.micOption || 'click_to_ask') === 'click_to_ask' && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                        Microphone remains idle until clicked to ask. It listens to your question, formulate and speaks the answer, and then automatically stops and stays idle.
                      </p>
                      <div className="mt-2 text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                        <span>Behavior:</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">Idle &rarr; Click &rarr; Listen &rarr; Talk &rarr; Stop</span>
                      </div>
                    </div>
                  </label>

                  {/* Option 2: Always-On Microphone */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition relative overflow-hidden ${
                      formData.micOption === 'always_on'
                        ? 'bg-emerald-500/10 border-emerald-400 ring-1 ring-emerald-500/40 text-white shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="micOption"
                      checked={formData.micOption === 'always_on'}
                      onChange={() => {
                        updateSetting('micOption', 'always_on');
                        updateSetting('voiceMode', 'continuous');
                      }}
                      className="accent-emerald-400 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">🔄 Always-On Continuous Microphone</span>
                        {formData.micOption === 'always_on' && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                        Microphone is always on. It keeps listening and talking continuously in a hands-free conversational loop without requiring repeated clicks.
                      </p>
                      <div className="mt-2 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <span>Behavior:</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">Always ON &rarr; Listen &rarr; Talk &rarr; Keep Listening &infin;</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Hardware & Microcontroller Interaction Modes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Microcontroller & Device Trigger Protocol
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        onChange={() => updateSetting('voiceMode', vm.id)}
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

              {/* Wake Word Phrase & Silence Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Custom Wake Word / Trigger Phrase
                  </label>
                  <input
                    type="text"
                    value={formData.wakeWordPhrase || 'Hey Explorer'}
                    onChange={(e) => setFormData({ ...formData, wakeWordPhrase: e.target.value })}
                    placeholder="e.g. Hey Explorer, Jarvis, Namaste"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Say this phrase anytime to initiate a hands-free question.
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1.5">
                    <span>Silence Detection Timeout</span>
                    <span className="font-mono text-cyan-300">{(formData.silenceTimeoutSec || 1.8).toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.2"
                    value={formData.silenceTimeoutSec || 1.8}
                    onChange={(e) => setFormData({ ...formData, silenceTimeoutSec: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>1.0s (Fast cut)</span>
                    <span>1.8s (Balanced)</span>
                    <span>4.0s (Patient)</span>
                  </div>
                </div>
              </div>

              {/* VAD Sensitivity */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Voice Activity Detection (VAD) Sensitivity
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'low', label: 'Low (Noisy environments)' },
                    { id: 'medium', label: 'Medium (Standard room)' },
                    { id: 'high', label: 'High (Quiet studio / Whispers)' }
                  ].map(v => (
                    <button
                      type="button"
                      key={v.id}
                      onClick={() => updateSetting('vadSensitivity', v.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                        (formData.vadSensitivity || 'medium') === v.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Languages & Multilingual Dialects */}
        {(activeSection === 'all' || activeSection === 'language') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>4. Languages & Multilingual Mirroring (13+ Supported)</span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoLanguageDetect !== false}
                  onChange={(e) => updateSetting('autoLanguageDetect', e.target.checked)}
                  className="w-3.5 h-3.5 accent-cyan-400 rounded"
                />
                <span className="text-xs text-slate-300">Auto Mirror User's Tongue</span>
              </label>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    type="button"
                    key={lang.code}
                    onClick={() => updateSetting('language', lang.code)}
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
        )}

        {/* Section 5: Personality Modes */}
        {(activeSection === 'all' || activeSection === 'personality') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>5. Agent Personality, Demeanor & Pedagogical Style</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5">
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
                      onChange={() => updateSetting('personality', pm.id)}
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
          </div>
        )}

        {/* Section 6: Real-Time Web Search Grounding */}
        {(activeSection === 'all' || activeSection === 'search') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Search className="w-4 h-4 text-cyan-400" />
                <span>6. Real-time Search Grounding & Current Events</span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.searchAutoGrounding !== false}
                  onChange={(e) => updateSetting('searchAutoGrounding', e.target.checked)}
                  className="w-3.5 h-3.5 accent-cyan-400 rounded"
                />
                <span className="text-xs text-slate-300">Auto Web Grounding</span>
              </label>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Search Engine Provider
                  </label>
                  <select
                    value={formData.searchEngine}
                    onChange={(e) => updateSetting('searchEngine', e.target.value as SearchEngine)}
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
            </div>
          </div>
        )}

        {/* Section 7: Smart Home & Relay Voice Automation */}
        {(activeSection === 'all' || activeSection === 'relays') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Power className="w-4 h-4 text-cyan-400" />
              <span>7. Smart Home Hardware & Relay Voice Automation</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">
                    Voice-Actuated Relay Switching
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Allows the AI agent to recognize phrases like "turn on fan" or "light band karo" and toggle GPIO relay channels.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.relayVoiceControl !== false}
                  onChange={(e) => updateSetting('relayVoiceControl', e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">
                    Spoken Feedback on Device Actuation
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Agent articulates verbal confirmations ("Living Room Light turned on") upon triggering hardware.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.relayVoiceFeedback !== false}
                  onChange={(e) => updateSetting('relayVoiceFeedback', e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 8: OLED Display Facial Visualizer */}
        {(activeSection === 'all' || activeSection === 'oled') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Tv className="w-4 h-4 text-cyan-400" />
              <span>8. SSD1306 OLED Display Face Animations & Expressions</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">
                    Facial Visualizer Expressions
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Renders animated eyes and mouth on SSD1306 OLED for IDLE, LISTENING, THINKING, and SPEAKING states.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.oledFaceAnimations !== false}
                  onChange={(e) => updateSetting('oledFaceAnimations', e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1.5">
                  <span>Blink Animation Interval</span>
                  <span className="font-mono text-cyan-300">{formData.oledBlinkIntervalSec || 3}s</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="1"
                  value={formData.oledBlinkIntervalSec || 3}
                  onChange={(e) => setFormData({ ...formData, oledBlinkIntervalSec: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 9: Live Testing Playground */}
        {(activeSection === 'all' || activeSection === 'tester') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Play className="w-4 h-4 text-cyan-400" />
              <span>9. In-Settings Live Testing Playground</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
              <p className="text-xs text-slate-300">
                Test your current model, voice synthesizer, and prompt parameters instantly without leaving the settings view:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="Ask a test question..."
                  className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={handleRunLiveTest}
                  disabled={isTesting}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isTesting ? (
                    <span>Thinking...</span>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Test Live Voice & Reasoning</span>
                    </>
                  )}
                </button>
              </div>

              {testOutput && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {testOutput}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Save & Apply Bar */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/95 border border-cyan-500/40 backdrop-blur-md shadow-2xl shadow-cyan-950/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div className="hidden sm:block text-xs">
              <span className="font-bold text-white">Instant Synchronization:</span>
              <span className="text-slate-400 ml-1">Settings persist directly to local flash storage & API gateways.</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {savedNotice && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm transition shadow-lg shadow-cyan-500/20 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply All Functions</span>
            </button>
          </div>
        </div>
      </form>

      {/* JSON Import Modal */}
      {importJsonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Import Agent Functions JSON</span>
              </h4>
              <button
                type="button"
                onClick={() => setImportJsonModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste exported agent settings JSON below to apply:
            </p>

            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste JSON content here..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
            />

            {importError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImportJsonModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleImportJson}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
              >
                Apply Imported Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
