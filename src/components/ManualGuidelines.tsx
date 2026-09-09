import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Cpu, 
  Wifi, 
  Radio, 
  SlidersHorizontal, 
  Usb, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Download, 
  Zap, 
  Layers, 
  ShieldCheck, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Sliders, 
  Volume2, 
  Power, 
  Save, 
  Sparkles, 
  Printer,
  FileText,
  Clock,
  Settings,
  Flame,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { 
  CustomHardwareProfile, 
  AgentSettings, 
  DeviceInfo, 
  HardwareVariant,
  PersonalityMode,
  VoiceMode,
  GroqModel,
  SearchEngine,
  ActiveTab
} from '../types';
import { HARDWARE_BOARDS } from '../data/hardwareProfiles';

interface ManualGuidelinesProps {
  profile: CustomHardwareProfile;
  onUpdateProfile?: (profile: CustomHardwareProfile) => void;
  settings?: AgentSettings;
  onUpdateSettings?: (settings: AgentSettings) => void;
  device?: DeviceInfo;
  onUpdateDevice?: (device: Partial<DeviceInfo>) => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
  onNavigateToPinout?: () => void;
  onNavigateToFirmware?: () => void;
  onNavigateToUsbFlash?: () => void;
}

interface BookletTopic {
  id: string;
  topicNumber: string;
  title: string;
  subtitle: string;
  category: string;
  readTimeMinutes: number;
  icon: React.ComponentType<{ className?: string }>;
}

const BOOKLET_TOPICS: BookletTopic[] = [
  {
    id: 'topic-1',
    topicNumber: '01',
    title: 'Architecture & System Topology',
    subtitle: 'High-level concept, dual-engine intelligence, and embedded hardware bridge',
    category: 'System Core',
    readTimeMinutes: 4,
    icon: Layers
  },
  {
    id: 'topic-2',
    topicNumber: '02',
    title: 'Voice Assistant & Audio Pipeline',
    subtitle: '16kHz PCM streaming, VAD, LLM reasoning, and OLED facial visualizer',
    category: 'AI & Speech',
    readTimeMinutes: 5,
    icon: Sparkles
  },
  {
    id: 'topic-3',
    topicNumber: '03',
    title: 'ESP32 Board Matrix & Pin Safety',
    subtitle: 'I2S Audio, I2C OLED, strapping pins, and pin-to-pin wiring reference',
    category: 'Hardware',
    readTimeMinutes: 6,
    icon: Cpu
  },
  {
    id: 'topic-4',
    topicNumber: '04',
    title: 'Multi-Channel Relays & Automation',
    subtitle: 'Active Low vs Active High logic, flyback protection, and voice command mapping',
    category: 'Automation',
    readTimeMinutes: 4,
    icon: Zap
  },
  {
    id: 'topic-5',
    topicNumber: '05',
    title: 'Dual Wi-Fi & Emergency SoftAP',
    subtitle: 'Station DHCP, fallback captive portal, and 5s hardware button factory reset',
    category: 'Networking',
    readTimeMinutes: 4,
    icon: Wifi
  },
  {
    id: 'topic-6',
    topicNumber: '06',
    title: 'Cloud Protocols: Webhooks & MQTT',
    subtitle: 'Event-driven HTTP dispatches, MQTT pub/sub, and Home Assistant setup',
    category: 'IoT & Cloud',
    readTimeMinutes: 5,
    icon: Radio
  },
  {
    id: 'topic-7',
    topicNumber: '07',
    title: 'Web Serial OTG Browser Flashing',
    subtitle: 'In-browser flashing via Web Serial API, bootloader offsets, and partitions',
    category: 'Firmware',
    readTimeMinutes: 4,
    icon: Usb
  },
  {
    id: 'topic-8',
    topicNumber: '08',
    title: 'AI Model Tuning & Web Search',
    subtitle: 'Groq & Gemini engine balance, temperature tuning, and Tavily grounding',
    category: 'AI Tuning',
    readTimeMinutes: 5,
    icon: Sliders
  },
  {
    id: 'topic-9',
    topicNumber: '09',
    title: 'Diagnostics, Strapping Pins & Notes',
    subtitle: 'Brownout troubleshooting, UART vs Native USB, and persistent user notes',
    category: 'Operations',
    readTimeMinutes: 5,
    icon: ShieldCheck
  }
];

export const ManualGuidelines: React.FC<ManualGuidelinesProps> = ({
  profile,
  onUpdateProfile,
  settings,
  onUpdateSettings,
  device,
  onUpdateDevice,
  onNavigateToTab,
  onNavigateToPinout,
  onNavigateToFirmware,
  onNavigateToUsbFlash
}) => {
  const activeProfile = profile || HARDWARE_BOARDS['ESP32-S3'].recommendedPreset;
  const currentSettings = settings || ({} as AgentSettings);

  const [activeTopicId, setActiveTopicId] = useState<string>('topic-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Local storage for completed chapters & bookmarks
  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('explore_ai_manual_completed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [bookmarkedTopics, setBookmarkedTopics] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('explore_ai_manual_bookmarks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persistent notes per topic
  const [topicNotes, setTopicNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('explore_ai_manual_notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const activeTopicIndex = BOOKLET_TOPICS.findIndex(t => t.id === activeTopicId);
  const currentTopic = BOOKLET_TOPICS[activeTopicIndex] || BOOKLET_TOPICS[0];

  const handleNavigate = (tab: ActiveTab) => {
    if (onNavigateToTab) {
      onNavigateToTab(tab);
    } else if (tab === 'pinout' && onNavigateToPinout) {
      onNavigateToPinout();
    } else if (tab === 'firmware' && onNavigateToFirmware) {
      onNavigateToFirmware();
    } else if (tab === 'usbflash' && onNavigateToUsbFlash) {
      onNavigateToUsbFlash();
    }
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const toggleTopicCompletion = (id: string) => {
    const updated = { ...completedTopics, [id]: !completedTopics[id] };
    setCompletedTopics(updated);
    localStorage.setItem('explore_ai_manual_completed', JSON.stringify(updated));
  };

  const toggleBookmark = (id: string) => {
    const updated = { ...bookmarkedTopics, [id]: !bookmarkedTopics[id] };
    setBookmarkedTopics(updated);
    localStorage.setItem('explore_ai_manual_bookmarks', JSON.stringify(updated));
    triggerToast(updated[id] ? 'Bookmarked chapter' : 'Removed bookmark');
  };

  const handleNoteChange = (id: string, text: string) => {
    const updated = { ...topicNotes, [id]: text };
    setTopicNotes(updated);
    localStorage.setItem('explore_ai_manual_notes', JSON.stringify(updated));
  };

  // Filtered topics based on search
  const filteredTopics = BOOKLET_TOPICS.filter(topic => 
    topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedCount = Object.values(completedTopics).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / BOOKLET_TOPICS.length) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Booklet Cover & Progress Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  SYSTEM MANUAL BOOKLET
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Target Board: <b className="text-white">{activeProfile.boardName}</b>
                </span>
                <span className="text-xs text-slate-500">&bull;</span>
                <span className="text-xs text-slate-400 font-mono">
                  Baud: <b className="text-cyan-400">115,200</b>
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
                Explore AI Voice Assistant & IoT Controller
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Complete topic-wise documentation and live control manual. Read full hardware, network, and AI specifications, and modify operational parameters directly within each chapter.
              </p>
            </div>
          </div>

          {/* Quick Direct Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleNavigate('firmware')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Firmware Studio</span>
            </button>
            <button
              onClick={() => handleNavigate('pinout')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span>Pin Matrix</span>
            </button>
            <button
              onClick={() => handleNavigate('usbflash')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition transform active:scale-95"
            >
              <Usb className="w-4 h-4 text-slate-950" />
              <span>USB Flasher</span>
            </button>
          </div>
        </div>

        {/* Reading Progress & Stats Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5">
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-400">
              Booklet Progress: <b className="text-amber-400">{completedCount}</b> of {BOOKLET_TOPICS.length} Topics ({progressPercent}%)
            </div>
            <div className="w-36 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Total Read Time: ~40 mins
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-emerald-400 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Interactive Edits Synced
            </span>
          </div>
        </div>
      </div>

      {/* Main Booklet Layout: Sidebar Table of Contents + Topic Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar: Table of Contents */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Booklet Chapters</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {BOOKLET_TOPICS.length} TOPICS
              </span>
            </div>

            {/* Search within booklet */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search booklet topics..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Topic List */}
            <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredTopics.map((topic) => {
                const Icon = topic.icon;
                const isActive = topic.id === activeTopicId;
                const isCompleted = completedTopics[topic.id];
                const isBookmarked = bookmarkedTopics[topic.id];

                return (
                  <button
                    key={topic.id}
                    onClick={() => setActiveTopicId(topic.id)}
                    className={`w-full text-left p-3 rounded-xl transition border flex items-start justify-between gap-3 ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 truncate">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5 ${
                        isActive 
                          ? 'bg-amber-500 text-slate-950' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {topic.topicNumber}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                          <span>{topic.title}</span>
                          {isBookmarked && <Bookmark className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {topic.category} &bull; {topic.readTimeMinutes} min
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Printable Booklet Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Booklet Tools</span>
              <button
                onClick={() => {
                  window.print();
                }}
                className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <Printer className="w-3 h-3" />
                <span>Print / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Content Area: Active Chapter / Topic Booklet View */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            {/* Chapter Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
                  <span>CHAPTER {currentTopic.topicNumber} OF {BOOKLET_TOPICS.length}</span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="text-slate-400">{currentTopic.category}</span>
                  <span className="text-slate-600">&bull;</span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {currentTopic.readTimeMinutes} min read
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {currentTopic.title}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {currentTopic.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleBookmark(currentTopic.id)}
                  className={`p-2 rounded-xl border text-xs transition flex items-center gap-1.5 ${
                    bookmarkedTopics[currentTopic.id]
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                  title="Bookmark chapter"
                >
                  <Bookmark className={`w-4 h-4 ${bookmarkedTopics[currentTopic.id] ? 'fill-amber-400' : ''}`} />
                </button>

                <button
                  onClick={() => toggleTopicCompletion(currentTopic.id)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                    completedTopics[currentTopic.id]
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{completedTopics[currentTopic.id] ? 'Marked as Read' : 'Mark as Read'}</span>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* TOPIC 1: Architecture & System Topology                                   */}
            {/* ========================================================================= */}
            {currentTopic.id === 'topic-1' && (
              <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                  <h4 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>The Vision: Zero-Latency Voice Intelligence for Physical Spaces</span>
                  </h4>
                  <p className="text-xs leading-relaxed text-amber-200/90">
                    The Explore AI Assistant is an open-architecture, dual-intelligence hardware and software platform. It bridges ultra-fast cloud language models (Groq LLaMA 3.3 70B & Google Gemini 2.5) with local ESP32 microcontrollers to deliver sub-500ms conversational audio alongside deterministic smart home control.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Core Architectural Data Pipeline
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[11px]">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-cyan-400 font-bold">1. Acoustic Capture</div>
                      <p className="text-slate-400 font-sans text-xs">
                        INMP441 MEMS microphone captures sound and sends 16-bit Mono I2S PCM frames directly into DMA buffers at 16,000 Hz.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-amber-400 font-bold">2. LLM Reasoning</div>
                      <p className="text-slate-400 font-sans text-xs">
                        Audio frames are transcribed and streamed to the active LLM. Function calls determine if a physical relay should toggle or an API queried.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-emerald-400 font-bold">3. Physical Response</div>
                      <p className="text-slate-400 font-sans text-xs">
                        Synthesized audio streams out through the MAX98357A I2S Class-D amplifier while the SSD1306 OLED animates facial expressions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interactive Change Card for Topic 1 */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs uppercase tracking-wider">
                        Interactive Parameter Tuning: System Identity
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      LIVE APPLIED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Device Name in Network:
                      </label>
                      <input
                        type="text"
                        value={device?.name || 'Explore AI Assistant'}
                        onChange={(e) => {
                          if (onUpdateDevice) onUpdateDevice({ name: e.target.value });
                          triggerToast('Device Name Updated');
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Pairing Security Code:
                      </label>
                      <input
                        type="text"
                        value={device?.pairingCode || '489210'}
                        onChange={(e) => {
                          if (onUpdateDevice) onUpdateDevice({ pairingCode: e.target.value });
                          triggerToast('Pairing Code Updated');
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TOPIC 2: Voice Assistant & Audio Pipeline                                */}
            {/* ========================================================================= */}
            {currentTopic.id === 'topic-2' && (
              <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
                <p>
                  The voice interaction engine supports three distinct operational modes to match your power, latency, and environmental requirements:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5 text-cyan-300">
                      <Power className="w-3.5 h-3.5" /> Push to Talk (PTT)
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      Hold physical button (GPIO {activeProfile.controls.actionButton}) to capture. Zero false-triggers. Ideal for noisy workshops or living rooms.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5 text-amber-300">
                      <Volume2 className="w-3.5 h-3.5" /> Continuous Loop
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      AudioWorklet continually monitors input level with automated silence detection (VAD). Hands-free hands-busy cooking or assembly work.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5 text-emerald-300">
                      <Sparkles className="w-3.5 h-3.5" /> Wake Word Detection
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      Responds to keyword triggers ("Hey Explore") to awaken the system from idle sleep into listening state.
                    </p>
                  </div>
                </div>

                {/* OLED Face Expressions Map */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    SSD1306 Animated Face Expression Engine
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    During interaction, the OLED renders lively expressions based on state:
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300">IDLE (Blinking Eyes)</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300">LISTENING (Wide Oval)</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-purple-300">THINKING (Scanning Arc)</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-300">SPEAKING (Mouth Pulse)</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-rose-300">ERROR (Cross Eyes)</span>
                  </div>
                </div>

                {/* Interactive Change Card for Topic 2 */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs uppercase tracking-wider">
                        Interactive Parameter Tuning: Personality & Audio Mode
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      SAVED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Agent Personality Tone:
                      </label>
                      <select
                        value={currentSettings.personality || 'friendly'}
                        onChange={(e) => {
                          if (onUpdateSettings) {
                            onUpdateSettings({
                              ...currentSettings,
                              personality: e.target.value as PersonalityMode
                            });
                            triggerToast(`Personality set to ${e.target.value}`);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="friendly">Friendly & Helpful (Default)</option>
                        <option value="educational">Educational & Instructive</option>
                        <option value="professional">Professional & Direct</option>
                        <option value="technical">Technical Engineer (Deep Dives)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Voice Interaction Trigger Mode:
                      </label>
                      <select
                        value={currentSettings.voiceMode || 'push_to_talk'}
                        onChange={(e) => {
                          if (onUpdateSettings) {
                            onUpdateSettings({
                              ...currentSettings,
                              voiceMode: e.target.value as VoiceMode
                            });
                            triggerToast(`Trigger mode: ${e.target.value}`);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="push_to_talk">Push-to-Talk (Hold Button)</option>
                        <option value="continuous">Continuous Hands-Free (VAD)</option>
                        <option value="wake_word">Wake-Word ("Hey Explore")</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Microphone Interaction Behavior (Console & App):
                      </label>
                      <select
                        value={currentSettings.micOption || 'click_to_ask'}
                        onChange={(e) => {
                          if (onUpdateSettings) {
                            const newOption = e.target.value as 'click_to_ask' | 'always_on';
                            onUpdateSettings({
                              ...currentSettings,
                              micOption: newOption,
                              voiceMode: newOption === 'always_on' ? 'continuous' : 'push_to_talk'
                            });
                            triggerToast(`Microphone set to: ${newOption === 'always_on' ? 'Always-On Mic' : 'Idle Click-to-Ask'}`);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="click_to_ask">🎙️ Idle Mode (Click to Activate Ask — Listens & talks, otherwise keeps stopping)</option>
                        <option value="always_on">🔄 Always-On Mic (Microphone stays always on, keeps listening & talking continuously)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TOPIC 3: ESP32 Board Matrix & Pin Safety                                 */}
            {/* ========================================================================= */}
            {currentTopic.id === 'topic-3' && (
              <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
                <p>
                  Microcontroller selection dictates the available DMA-capable I2S buses, hardware I2C lines, and optocoupler driving current.
                </p>

                {/* Pin Matrix Table */}
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                  <div className="p-3 bg-slate-900 font-bold text-xs text-white flex items-center justify-between">
                    <span>Verified Pin Mapping for {activeProfile.boardName} ({activeProfile.variant})</span>
                    <button
                      onClick={() => handleNavigate('pinout')}
                      className="text-cyan-400 text-[11px] hover:underline flex items-center gap-1"
                    >
                      <span>Open Matrix Editor</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-850 font-mono text-[11px]">
                    <div className="p-3 flex justify-between">
                      <span className="text-slate-400">INMP441 I2S Mic (BCLK / WS / SD):</span>
                      <span className="text-cyan-300">GPIO {activeProfile.mic.bclk} / GPIO {activeProfile.mic.ws} / GPIO {activeProfile.mic.sd}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-slate-400">MAX98357A I2S Amp (BCLK / LRC / DIN):</span>
                      <span className="text-cyan-300">GPIO {activeProfile.amp.bclk} / GPIO {activeProfile.amp.lrc} / GPIO {activeProfile.amp.din}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-slate-400">SSD1306 OLED (SDA / SCL @ {activeProfile.display.i2cAddress || '0x3C'}):</span>
                      <span className="text-amber-300">GPIO {activeProfile.display.sda} / GPIO {activeProfile.display.scl}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-slate-400">Push-to-Talk Action & Reset Buttons:</span>
                      <span className="text-emerald-300">GPIO {activeProfile.controls.actionButton} & GPIO {activeProfile.controls.resetButton}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-slate-400">Relay Channels (1 - {activeProfile.relays.channels.length}):</span>
                      <span className="text-purple-300">
                        {activeProfile.relays.channels.map(c => `CH${c.id}:G${c.gpio}`).join(' | ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Critical Strapping Pin Warning */}
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Hardware Strapping Pin Rules (Prevent Boot Crashes)</span>
                  </div>
                  <ul className="list-disc list-inside text-rose-200/90 text-[11px] space-y-1">
                    <li><b>GPIO 0:</b> Boot mode selector. Never tie directly to GND with low resistance or the board will permanently stay in ROM download mode.</li>
                    <li><b>GPIO 12 (MTDI):</b> Flash voltage strapping on classic ESP32. Do not pull high at boot (causes flash brownout).</li>
                    <li><b>GPIO 34, 35, 36, 39:</b> Input only on classic ESP32! Cannot be used for Relays, LEDs, or I2S output clocks.</li>
                  </ul>
                </div>

                {/* Interactive Change Card for Topic 3 */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs uppercase tracking-wider">
                        Interactive Parameter Tuning: Hardware Preset
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                      INSTANT RE-TARGET
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Active Target Microcontroller:
                      </label>
                      <select
                        value={activeProfile.variant}
                        onChange={(e) => {
                          const newVar = e.target.value as HardwareVariant;
                          const preset = HARDWARE_BOARDS[newVar]?.recommendedPreset;
                          if (preset && onUpdateProfile) {
                            onUpdateProfile(preset);
                            triggerToast(`Switched target to ${newVar}`);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="ESP32-S3">ESP32-S3 DevKitC-1 (Dual Type-C / Vector Audio)</option>
                        <option value="ESP32-WROOM">ESP32-WROOM-32 (Standard 30/38-Pin DevKit)</option>
                        <option value="ESP32-C3">ESP32-C3 (RISC-V Single Core Supermini)</option>
                        <option value="ESP32-CAM">ESP32-CAM (AI-Thinker OV2640)</option>
                        <option value="ESP32-WROVER">ESP32-WROVER (8MB PSRAM)</option>
                        <option value="ESP32-S2">ESP32-S2 (Single Core USB OTG)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        SPI Flash Memory Size:
                      </label>
                      <select
                        value={activeProfile.flashSizeMb}
                        onChange={(e) => {
                          if (onUpdateProfile) {
                            onUpdateProfile({
                              ...activeProfile,
                              flashSizeMb: parseInt(e.target.value)
                            });
                            triggerToast(`Flash size set to ${e.target.value}MB`);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="4">4 MB (Default DevKit)</option>
                        <option value="8">8 MB (Extended SPI Flash)</option>
                        <option value="16">16 MB (Full Firmware + Spiffs + OTA)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TOPIC 4: Multi-Channel Relays & Automation Logic                        */}
            {/* ========================================================================= */}
            {currentTopic.id === 'topic-4' && (
              <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
                <p>
                  Relays isolate high-voltage AC mains (110V-240V) from the 3.3V microcontroller logic using optical couplers (PC817).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-cyan-300 text-xs">Active-Low Logic (Standard Chinese Relay Modules)</h4>
                    <p className="text-slate-400 text-[11px]">
                      Writing <b>LOW (0V)</b> pulls the optocoupler cathode down, turning the relay <b>ON</b>. Writing <b>HIGH (3.3V)</b> de-energizes the coil.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-amber-300 text-xs">Active-High Logic (Solid State Relays / MOSFETs)</h4>
                    <p className="text-slate-400 text-[11px]">
                      Writing <b>HIGH (3.3V)</b> gates the circuit <b>ON</b>. Writing <b>LOW (0V)</b> shuts off current flow.
                    </p>
                  </div>
                </div>

                {/* Voice Commands to Relays */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    Voice Command Trigger Mapping
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    The AI LLM automatically matches intent to channel labels:
                  </p>
                  <div className="space-y-1 font-mono text-[11px] text-cyan-200">
                    <div className="flex justify-between p-2 bg-slate-900 rounded">
                      <span>"Turn on the living room light"</span>
                      <span className="text-emerald-400">&rarr; Relay 1: HIGH</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-900 rounded">
                      <span>"Shut down all relays / emergency cut"</span>
                      <span className="text-rose-400">&rarr; All Channels: OFF</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Change Card for Topic 4 */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs uppercase tracking-wider">
                        Interactive Parameter Tuning: Live Relay State & Logic
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                      LIVE CONTROLS
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl">
                    <div>
                      <span className="font-bold text-white text-xs block">Relay Driving Logic:</span>
                      <span className="text-[11px] text-slate-400">Select active state depending on your physical module</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          if (onUpdateProfile) {
                            onUpdateProfile({
                              ...activeProfile,
                              relays: { ...activeProfile.relays, logic: 'active_low' }
                            });
                            triggerToast('Set Relay Logic: ACTIVE LOW');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          activeProfile.relays.logic === 'active_low'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Active LOW
                      </button>
                      <button
                        onClick={() => {
                          if (onUpdateProfile) {
                            onUpdateProfile({
                              ...activeProfile,
                              relays: { ...activeProfile.relays, logic: 'active_high' }
                            });
                            triggerToast('Set Relay Logic: ACTIVE HIGH');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          activeProfile.relays.logic === 'active_high'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Active HIGH
                      </button>
                    </div>
                  </div>

                  {/* Channel Test Toggles */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 block">
                      Live Relay Channel Status & Test:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {activeProfile.relays.channels.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => {
                            const updatedChannels = activeProfile.relays.channels.map(c => 
                              c.id === ch.id ? { ...c, state: !c.state } : c
                            );
                            if (onUpdateProfile) {
                              onUpdateProfile({
                                ...activeProfile,
                                relays: { ...activeProfile.relays, channels: updatedChannels }
                              });
                              triggerToast(`${ch.name}: ${!ch.state ? 'ON' : 'OFF'}`);
                            }
                          }}
                          className={`p-3 rounded-xl border text-center font-mono text-xs transition flex flex-col items-center justify-center gap-1 ${
                            ch.state
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Power className={`w-4 h-4 ${ch.state ? 'text-emerald-400' : 'text-slate-600'}`} />
                          <span className="font-bold text-[11px]">{ch.name}</span>
                          <span className="text-[10px] uppercase font-bold">{ch.state ? 'ENERGIZED' : 'OFF'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TOPIC 5: Dual Wi-Fi & Emergency SoftAP Provisioning                      */}
            {/* ========================================================================= */}
            {currentTopic.id === 'topic-5' && (
              <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
                <p>
                  Explore AI employs a fail-safe dual-mode Wi-Fi state machine to guarantee that you are never locked out of your device even if your home Wi-Fi credentials change.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-cyan-300 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span>1. Station Mode (STA)</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Connects directly to your local 2.4GHz home Wi-Fi network. Receives an IP address through DHCP or applies your static subnet configuration.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span>2. Emergency SoftAP Captive Portal</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      If the router cannot be reached within 15 seconds, the ESP32 activates an Access Point hotspot (<code className="text-amber-300">192.168.4.1</code>) so you can enter new credentials from any phone.
                    </p>
                  </div>
                </div>

                {/* 5-Second Factory Reset Sequence */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    How to Trigger Hardware NVS Credential Reset:
                  </h4>
                  <ol className="list-decimal list-inside text-slate-300 space-y-1 text-[11px]">
                    <li>Locate the physical reset switch on <b>GPIO {activeProfile.controls.resetButton}</b>.</li>
                    <li>Hold the button down continuously for <b>5 seconds</b>.</li>
                    <li>The status LED will blink 3 times rapidly, indicating Non-Volatile Storage (NVS) has been wiped.</li>
                    <li>The device restarts into SoftAP mode automatically.</li>
                  </ol>
                </div>

                {/* Interactive Change Card for Topic 5 */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs uppercase tracking-wider">
                        Interactive Parameter Tuning: Wi-Fi Credentials & SoftAP
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      SAVED TO PROFILE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Home Wi-Fi SSID (2.4GHz):
                      </label>
                      <input
                        type="text"
                        value={activeProfile.wifi?.ssid || ''}
                        onChange={(e) => {
                          if (onUpdateProfile) {
                            onUpdateProfile({
                              ...activeProfile,
                              wifi: { ...(activeProfile.wifi || {} as any), ssid: e.target.value }
                            });
                            triggerToast('Wi-Fi SSID Updated');
                          }
                        }}
                        placeholder="e.g. Home_Network_2.4G"
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Captive Portal Hotspot SSID:
                      </label>
                      <input
                        type="text"
                        value={activeProfile.wifi?.apSsid || 'Explore-AI-Assistant'}
                        onChange={(e) => {
                          if (onUpdateProfile) {
                            onUpdateProfile({
                              ...activeProfile,
                              wifi: { ...(activeProfile.wifi || {} as any), apSsid: e.target.value }
                            });
                            triggerToast('Hotspot SSID Updated');
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TOPIC 6: Cloud Protocols: Webhooks & MQTT Pub/Sub                       */}
            {/* ========================================================================= */}
            {currentTopic.id === 'topic-6' && (
              <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
                <p>
                  Explore AI connects to broader home automation platforms (Home Assistant, Node-RED, openHAB) using industry standard MQTT and HTTP Webhook integrations.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* MQTT Architecture */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" /> MQTT Pub/Sub Topics
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      Subscribe to control topics and publish JSON telemetry:
                    </p>
                    <pre className="p-2 bg-slate-900 rounded font-mono text-[10px] text-cyan-300 overflow-x-auto">
                      Sub: {activeProfile.cloudIntegration?.mqtt.baseTopic || 'explore_ai'}/relay/set{"\n"}
                      Pub: {activeProfile.cloudIntegration?.mqtt.baseTopic || 'explore_ai'}/status
                    </pre>
                  </div>

                  {/* Webhook Architecture */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" /> HTTP Webhook Dispatch
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      Pushes JSON event payloads on voice queries and relay triggers:
                    </p>
                    <pre className="p-2 bg-slate-900 rounded font-mono text-[10px] text-emerald-300 overflow-x-auto">
                      POST {activeProfile.cloudIntegration?.webhook.endpointUrl || 'https://api.site/hook'}
                    </pre>
                  </div>
                </div>

                {/* Interactive Change Card for Topic 6 */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs uppercase tracking-wider">
                        Interactive Parameter Tuning: Cloud IoT Protocol
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      LIVE SYNCED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Active Cloud Communication Protocol:
                      </label>
                      <select
                        value={activeProfile.cloudIntegration?.protocol || 'both'}
                        onChange={(e) => {
                          if (onUpdateProfile) {
                            onUpdateProfile({
                              ...activeProfile,
                              cloudIntegration: {
                                ...(activeProfile.cloudIntegration || {} as any),
                                protocol: e.target.value as any
                              }
                            });
                            triggerToast(`Protocol set to: ${e.target.value.toUpperCase()}`);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      >
                        <option value="both">Both (Webhook + MQTT Enabled)</option>
                        <option value="mqtt">MQTT Broker Only</option>
                        <option value="webhook">HTTP Webhooks Only</option>
                        <option value="none">None (Local Isolated Operation)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        MQTT Broker Host:
                      </label>
                      <input
                        type="text"
                        value={activeProfile.cloudIntegration?.mqtt.brokerHost || 'broker.hivemq.com'}
                        onChange={(e) => {
                          if (onUpdateProfile) {
                            onUpdateProfile({
                              ...activeProfile,
                              cloudIntegration: {
                                ...(activeProfile.cloudIntegration || {} as any),
                                mqtt: {
                                  ...(activeProfile.cloudIntegration?.mqtt || {} as any),
                                  brokerHost: e.target.value
                                }
                              }
                            });
                            triggerToast('MQTT Broker Host Updated');
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TOPIC 7: Web Serial USB Flasher (ESPFlash OTG)                           */}
            {/* ========================================================================= */}
            {currentTopic.id === 'topic-7' && (
              <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
                <p>
                  You do not need to install Python, Arduino IDE, or esptool.py on your machine. Using the browser-native Web Serial API in Google Chrome, Microsoft Edge, or Opera, you can flash binary firmwares directly over USB OTG.
                </p>

                {/* Partition Map Table */}
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                  <div className="p-3 bg-slate-900 font-bold text-xs text-white">
                    Standard ESP32 Memory Map & Flashing Addresses
                  </div>
                  <div className="divide-y divide-slate-850 font-mono text-[11px]">
                    <div className="p-3 flex justify-between">
                      <span className="text-slate-400">Bootloader Binary:</span>
                      <span className="text-cyan-300">0x1000 (ESP32) or 0x0000 (ESP32-S3 / C3)</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-slate-400">Partition Table (partitions.bin):</span>
                      <span className="text-cyan-300">0x8000</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-slate-400">Boot App Initialization (boot_app0.bin):</span>
                      <span className="text-cyan-300">0xE000</span>
                    </div>
                    <div className="p-3 flex justify-between">
                      <span className="text-slate-400">Explore AI Firmware Binary:</span>
                      <span className="text-amber-300 font-bold">0x10000</span>
                    </div>
                  </div>
                </div>

                {/* Flash Quick Button */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-xs block">Ready to Flash via Browser?</span>
                    <span className="text-[11px] text-slate-400">Connect your ESP32 with a data-capable USB cable and open the flasher</span>
                  </div>
                  <button
                    onClick={() => handleNavigate('usbflash')}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Usb className="w-4 h-4" />
                    <span>Open Web Flasher</span>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TOPIC 8: AI Model Tuning & Web Search                                    */}
            {/* ========================================================================= */}
            {currentTopic.id === 'topic-8' && (
              <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
                <p>
                  Explore AI combines Groq's sub-300ms LPU inference for snappy real-time conversations with Google Gemini's multimodal reasoning and live search grounding via Tavily or Serper.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-amber-400 text-xs">Groq LPU Engine</h4>
                    <p className="text-slate-400 text-[11px]">
                      Generates up to 500 tokens/sec. Allows instant speech response before audio playback buffers starve.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-cyan-400 text-xs">Gemini 2.5 Engine</h4>
                    <p className="text-slate-400 text-[11px]">
                      Rich reasoning, long context window, and deep scientific understanding.
                    </p>
                  </div>
                </div>

                {/* Interactive Change Card for Topic 8 */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs uppercase tracking-wider">
                        Interactive Parameter Tuning: Model & Search Grounding
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      SAVED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Primary Fast LLM Model:
                      </label>
                      <select
                        value={currentSettings.groqModel || 'llama-3.3-70b-versatile'}
                        onChange={(e) => {
                          if (onUpdateSettings) {
                            onUpdateSettings({
                              ...currentSettings,
                              groqModel: e.target.value as GroqModel
                            });
                            triggerToast(`Model updated to ${e.target.value}`);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      >
                        <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B Versatile (Fastest & Smartest)</option>
                        <option value="llama-3.1-8b-instant">LLaMA 3.1 8B Instant (Ultra-Low Latency)</option>
                        <option value="mixtral-8x7b-32768">Mixtral 8x7B (Long Context 32k)</option>
                        <option value="gemma2-9b-it">Google Gemma 2 9B IT</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Live Web Search Engine:
                      </label>
                      <select
                        value={currentSettings.searchEngine || 'tavily'}
                        onChange={(e) => {
                          if (onUpdateSettings) {
                            onUpdateSettings({
                              ...currentSettings,
                              searchEngine: e.target.value as SearchEngine
                            });
                            triggerToast(`Search engine set to ${e.target.value}`);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      >
                        <option value="tavily">Tavily AI Search (Built for LLMs)</option>
                        <option value="serper">Serper Google API</option>
                        <option value="google">Google Custom Search</option>
                        <option value="built-in">Built-in Fallback Grounding</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TOPIC 9: Diagnostics, Strapping Pins & Notes                             */}
            {/* ========================================================================= */}
            {currentTopic.id === 'topic-9' && (
              <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
                <p>
                  Quick diagnostics for common field deployment challenges and power delivery issues.
                </p>

                {/* Diagnostics Matrix */}
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-amber-400 font-bold text-xs">Symptom: ESP32 Boot Loops or Reboots on Wi-Fi Connect</div>
                    <p className="text-slate-400 text-[11px]">
                      <b>Cause:</b> Brownout Detector triggered by voltage dip below 2.7V when the 2.4GHz RF power amplifier kicks in.
                      <br />
                      <b>Solution:</b> Solder a 100uF - 470uF electrolytic capacitor directly across the 5V/VIN and GND pins, or use a certified 2A USB wall adapter.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-cyan-400 font-bold text-xs">Symptom: OLED Screen Remains Dark (No Display)</div>
                    <p className="text-slate-400 text-[11px]">
                      <b>Cause:</b> Incorrect I2C address (0x3C vs 0x3D) or loose SDA/SCL pull-up resistors.
                      <br />
                      <b>Solution:</b> Verify SDA is connected to <b>GPIO {activeProfile.display.sda}</b> and SCL to <b>GPIO {activeProfile.display.scl}</b> with 3.3V power.
                    </p>
                  </div>
                </div>

                {/* Editable Notes Section */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs uppercase tracking-wider">
                        My Personal Notes for this Chapter (Saved in Browser):
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">AUTO-SAVED</span>
                  </div>

                  <textarea
                    rows={4}
                    value={topicNotes[currentTopic.id] || ''}
                    onChange={(e) => handleNoteChange(currentTopic.id, e.target.value)}
                    placeholder="Write any custom hardware notes, bench test observations, or specific GPIO overrides here..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Bottom Chapter Navigation Bar (Turn Pages) */}
            <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-4">
              <button
                disabled={activeTopicIndex === 0}
                onClick={() => setActiveTopicId(BOOKLET_TOPICS[activeTopicIndex - 1].id)}
                className="px-4 py-2.5 rounded-xl border border-slate-750 bg-slate-800 hover:bg-slate-750 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous Chapter</span>
              </button>

              <div className="text-center font-mono text-xs text-slate-500">
                Topic {currentTopic.topicNumber} / {BOOKLET_TOPICS.length}
              </div>

              <button
                disabled={activeTopicIndex === BOOKLET_TOPICS.length - 1}
                onClick={() => setActiveTopicId(BOOKLET_TOPICS[activeTopicIndex + 1].id)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:pointer-events-none text-slate-950 text-xs font-bold flex items-center gap-2 transition"
              >
                <span className="hidden sm:inline">Next Chapter</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
