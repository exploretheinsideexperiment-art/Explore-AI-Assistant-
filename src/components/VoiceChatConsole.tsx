import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, AgentSettings, DisplayState, VoiceGender } from '../types';
import { aiService } from '../services/aiService';
import { ttsService } from '../services/ttsService';
import { wakeWordService } from '../services/wakeWordService';
import { Mic, MicOff, Send, Volume2, Sparkles, RefreshCw, Cpu, Bot, User, Check, Radio, Zap } from 'lucide-react';

interface VoiceChatConsoleProps {
  settings: AgentSettings;
  onOledStateChange: (state: DisplayState) => void;
  deviceOnline: boolean;
  onUpdateSettings?: (newSettings: Partial<AgentSettings>) => void;
}

export const VoiceChatConsole: React.FC<VoiceChatConsoleProps> = ({
  settings,
  onOledStateChange,
  deviceOnline,
  onUpdateSettings
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: 'Hello! I am Explore AI Assistant. Continuous voice is active! Say "Hey Explorer", "Hi Explorer", or "Hello Explorer" followed by your question, and I will answer you immediately!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: settings.groqModel || 'llama-3.3-70b-versatile'
    }
  ]);
  const [input, setInput] = useState('');
  const [isContinuousMode, setIsContinuousMode] = useState<boolean>(true);
  const [isMicCapturing, setIsMicCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListeningToFullQuestion, setIsListeningToFullQuestion] = useState(false);
  const [wakeNotice, setWakeNotice] = useState<{ message: string; query?: string } | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef(false);
  const isContinuousModeRef = useRef(isContinuousMode);
  const isSpeakingRef = useRef(isSpeaking);
  const isProcessingRef = useRef(isProcessing);
  const wakeWordAwakenedRef = useRef(false);
  const wakeNoticeTimeoutRef = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const speechEndTimerRef = useRef<any>(null);
  const handleSendRef = useRef<(e?: React.FormEvent, customText?: string) => Promise<void>>(async () => {});
  const currentSpeechCandidateRef = useRef<string>('');

  useEffect(() => {
    isContinuousModeRef.current = isContinuousMode;
  }, [isContinuousMode]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  // Auto-scroll strictly inside the chat container; NEVER use scrollIntoView which causes the browser window to slide down!
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const triggerWakeNotice = (message: string, query?: string) => {
    setWakeNotice({ message, query });
    if (wakeNoticeTimeoutRef.current) clearTimeout(wakeNoticeTimeoutRef.current);
    wakeNoticeTimeoutRef.current = setTimeout(() => {
      setWakeNotice(null);
    }, 4500);
  };

  const safeStartRecognition = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isRecognitionActiveRef.current) return;
    if (isSpeakingRef.current) return;
    try {
      recognitionRef.current.start();
      isRecognitionActiveRef.current = true;
      setIsMicCapturing(true);
    } catch (err: any) {
      if (err.name === 'InvalidStateError' || err.message?.includes('already started')) {
        isRecognitionActiveRef.current = true;
        setIsMicCapturing(true);
      }
    }
  }, []);

  const safeStopRecognition = useCallback(() => {
    if (speechEndTimerRef.current) {
      clearTimeout(speechEndTimerRef.current);
      speechEndTimerRef.current = null;
    }
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {}
    isRecognitionActiveRef.current = false;
    setIsMicCapturing(false);
    setIsListeningToFullQuestion(false);
  }, []);

  // Setup Web Speech API for continuous uninterrupted listening
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

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
        'ur-PK': 'ur-PK',
        'en-IN': 'en-IN'
      };
      recognition.lang = langMap[settings.language] || 'en-US';

      recognition.onstart = () => {
        isRecognitionActiveRef.current = true;
        setIsMicCapturing(true);
        onOledStateChange('LISTENING');
      };

      recognition.onresult = (event: any) => {
        // While Explore AI is actively speaking aloud or processing, ignore incoming mic audio
        // to prevent acoustic feedback loop where the assistant listens to its own voice
        if (isSpeakingRef.current || isProcessingRef.current) {
          return;
        }

        const results = event.results;
        let fullTranscript = '';
        let hasFinal = false;

        for (let i = 0; i < results.length; i++) {
          fullTranscript += results[i][0].transcript + ' ';
          if (results[i].isFinal) {
            hasFinal = true;
          }
        }
        fullTranscript = fullTranscript.trim();
        if (!fullTranscript) return;

        setInput(fullTranscript);

        // Analyze for wake phrases: "Hey Explorer", "Hi Explorer", "Hello Explorer"
        const parsed = wakeWordService.parseWakeWord(fullTranscript);

        // Check if either wake word is matched, or we were awakened, or continuous conversation is active
        const isAwake = parsed.hasWakeWord || wakeWordAwakenedRef.current || isContinuousModeRef.current;
        if (!isAwake) return;

        // Extract query candidate
        const queryCandidate = (parsed.hasWakeWord && parsed.cleanedQuery)
          ? parsed.cleanedQuery.trim()
          : fullTranscript.trim();

        currentSpeechCandidateRef.current = queryCandidate;

        // Wake word alone spoken without question yet: e.g. "Hey Explorer"
        if (parsed.hasWakeWord && (!parsed.cleanedQuery || parsed.cleanedQuery.trim().length < 2)) {
          if (!wakeWordAwakenedRef.current) {
            wakeWordService.playWakeChime();
            wakeWordAwakenedRef.current = true;
            setIsListeningToFullQuestion(true);
            triggerWakeNotice(`⚡ "${parsed.matchedPhrase || 'Hey Explorer'}" awakened! Listening for your question...`);
            onOledStateChange('LISTENING');
          }
          return;
        }

        if (queryCandidate.length >= 2) {
          setIsListeningToFullQuestion(true);
          onOledStateChange('LISTENING');

          // Clear any running silence timer because speaker is speaking
          if (speechEndTimerRef.current) {
            clearTimeout(speechEndTimerRef.current);
            speechEndTimerRef.current = null;
          }

          // When the browser marks the utterance as finished (hasFinal: true), wait only 400ms for any follow-up word.
          // Otherwise wait 800ms for interim pause before formulating answer.
          const delayMs = hasFinal ? 400 : 800;

          speechEndTimerRef.current = setTimeout(() => {
            setIsListeningToFullQuestion(false);
            wakeWordAwakenedRef.current = false;
            onOledStateChange('PROCESSING');
            const finalQuery = currentSpeechCandidateRef.current || queryCandidate;
            currentSpeechCandidateRef.current = '';
            handleSendRef.current(undefined, finalQuery);
          }, delayMs);
        }
      };

      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        // Keep speech recognition continuously active in the background
        if (isContinuousModeRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (isContinuousModeRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              safeStartRecognition();
            }
          }, 150);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('[Speech] Recognition event:', e.error);
        }
        isRecognitionActiveRef.current = false;
        if (isContinuousModeRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (isContinuousModeRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              safeStartRecognition();
            }
          }, 250);
        }
      };

      recognitionRef.current = recognition;

      // Start continuous listening immediately
      if (isContinuousModeRef.current) {
        safeStartRecognition();
      }
    }

    return () => {
      safeStopRecognition();
    };
  }, [settings.language, safeStartRecognition, safeStopRecognition, onOledStateChange]);

  const toggleContinuousMode = () => {
    const next = !isContinuousMode;
    setIsContinuousMode(next);
    isContinuousModeRef.current = next;

    if (onUpdateSettings) {
      onUpdateSettings({ voiceMode: next ? 'wake_word' : 'push_to_talk' });
    }

    if (next) {
      triggerWakeNotice('⚡ Continuous Voice Activated! Say "Hey Explorer [question]" anytime');
      wakeWordService.playWakeChime();
      ttsService.stop();
      setIsSpeaking(false);
      setTimeout(() => {
        safeStartRecognition();
      }, 150);
    } else {
      safeStopRecognition();
      triggerWakeNotice('Continuous Voice Paused');
      onOledStateChange('READY');
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or type your message.');
      return;
    }

    if (isContinuousMode) {
      // Pause continuous listening
      setIsContinuousMode(false);
      isContinuousModeRef.current = false;
      safeStopRecognition();
      triggerWakeNotice('Microphone Paused (Click to resume)');
    } else {
      // Resume continuous listening
      setIsContinuousMode(true);
      isContinuousModeRef.current = true;
      ttsService.stop();
      setIsSpeaking(false);
      wakeWordService.playWakeChime();
      safeStartRecognition();
      triggerWakeNotice('⚡ Microphone Active — Say "Hey Explorer [question]" anytime');
    }
  };

  const triggerWakeTriggerChip = (phrase: 'Hey Explorer' | 'Hi Explorer' | 'Hello Explorer') => {
    ttsService.stop();
    setIsSpeaking(false);
    wakeWordAwakenedRef.current = true;
    if (!isContinuousModeRef.current) {
      setIsContinuousMode(true);
      isContinuousModeRef.current = true;
    }
    safeStartRecognition();
    wakeWordService.playWakeChime();
    triggerWakeNotice(`⚡ "${phrase}" activated! Ask your question now...`);
    setInput(`${phrase}, `);
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    let rawQuery = (customText || input).trim();
    if (!rawQuery || isProcessingRef.current) return;

    // Clear any active silence timer and listening state
    if (speechEndTimerRef.current) {
      clearTimeout(speechEndTimerRef.current);
      speechEndTimerRef.current = null;
    }
    setIsListeningToFullQuestion(false);
    wakeWordAwakenedRef.current = false;
    currentSpeechCandidateRef.current = '';

    // Stop active speech recognition while the assistant generates and speaks to prevent acoustic feedback loop
    safeStopRecognition();

    // Check if query begins with wake phrase ("Hey Explorer", "Hi Explorer", "Hello Explorer") and clean it
    const parsed = wakeWordService.parseWakeWord(rawQuery);
    const query = parsed.hasWakeWord && parsed.cleanedQuery ? parsed.cleanedQuery : rawQuery;

    // Stop active TTS audio if any was playing
    ttsService.stop();

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: rawQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);
    isProcessingRef.current = true;
    onOledStateChange('PROCESSING');

    try {
      const asstMsgId = `asst-${Date.now()}`;
      let firstSentenceTriggered = false;

      // Start a clean streaming speech session
      ttsService.startStreamingSession(() => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        onOledStateChange('READY');
        // Speech ended: assistant is ready for the user's next sentence immediately
        if (isContinuousModeRef.current) {
          setTimeout(() => {
            if (isContinuousModeRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              safeStartRecognition();
            }
          }, 150);
        }
      });

      const response = await aiService.streamResponse(
        query,
        messages,
        settings,
        (sentence, isFirst) => {
          // Speak immediately when first sentence is ready (<200ms!)
          if (isFirst || !firstSentenceTriggered) {
            firstSentenceTriggered = true;
            setIsProcessing(false);
            isProcessingRef.current = false;
            setIsSpeaking(true);
            isSpeakingRef.current = true;
            onOledStateChange('SPEAKING');
          }
          ttsService.enqueueSentence(sentence, settings, () => {
            setIsSpeaking(true);
            isSpeakingRef.current = true;
            onOledStateChange('SPEAKING');
          });
        },
        (fullText) => {
          // Real-time live chat bubble update
          setMessages(prev => {
            const existingIdx = prev.findIndex(m => m.id === asstMsgId);
            if (existingIdx !== -1) {
              const updated = [...prev];
              updated[existingIdx] = { ...updated[existingIdx], content: fullText };
              return updated;
            } else {
              return [
                ...prev,
                {
                  id: asstMsgId,
                  role: 'assistant',
                  content: fullText,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  modelUsed: settings.groqModel || 'llama-3.1-8b-instant'
                }
              ];
            }
          });
        }
      );

      // Finalize assistant message
      setMessages(prev => {
        const existingIdx = prev.findIndex(m => m.id === asstMsgId);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            content: response.text,
            searchQueries: response.searchQueries
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: asstMsgId,
              role: 'assistant',
              content: response.text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              modelUsed: settings.groqModel || 'llama-3.1-8b-instant',
              searchQueries: response.searchQueries
            }
          ];
        }
      });
    } catch (err) {
      console.error('Failed to get response:', err);
      onOledStateChange('ERROR');
      setTimeout(() => onOledStateChange('READY'), 2000);
      if (isContinuousModeRef.current) {
        setTimeout(() => safeStartRecognition(), 1000);
      }
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  handleSendRef.current = handleSend;

  const simulateWakeWordQuery = (wakePhrase: string, query: string) => {
    wakeWordService.playWakeChime();
    triggerWakeNotice(`⚡ "${wakePhrase}" detected! Responding immediately...`, query);
    setInput(`${wakePhrase}, ${query}`);
    handleSend(undefined, query);
  };

  const replayMessage = (content: string) => {
    ttsService.stop();
    ttsService.speak(
      content,
      settings,
      () => {
        setIsSpeaking(true);
        onOledStateChange('SPEAKING');
      },
      () => {
        setIsSpeaking(false);
        onOledStateChange('READY');
        if (isContinuousModeRef.current) {
          safeStartRecognition();
        }
      }
    );
  };

  const handleSwitchVoice = (gender: VoiceGender) => {
    if (isSpeaking) {
      ttsService.stop();
      setIsSpeaking(false);
    }
    const defaultVoice = gender === 'Male' ? 'madhur' : 'swara';
    const updatedSettings: AgentSettings = {
      ...settings,
      voiceGender: gender,
      voice: defaultVoice
    };

    if (onUpdateSettings) {
      onUpdateSettings(updatedSettings);
    }

    // Audible confirmation feedback in the selected voice
    const sample = gender === 'Male'
      ? (settings.language.startsWith('hi') || settings.language === 'hinglish' || settings.language === 'bho-IN'
          ? 'पुरुष आवाज़ सक्रिय है।'
          : 'Male voice active.')
      : (settings.language.startsWith('hi') || settings.language === 'hinglish' || settings.language === 'bho-IN'
          ? 'महिला आवाज़ सक्रिय है।'
          : 'Female voice active.');

    ttsService.speak(
      sample,
      updatedSettings,
      () => {
        setIsSpeaking(true);
        onOledStateChange('SPEAKING');
      },
      () => {
        setIsSpeaking(false);
        onOledStateChange('READY');
      }
    );
  };

  const quickPrompts = [
    'what is the speed of light?',
    'how does an ESP32 work?',
    'tell me an interesting science fact',
    'who was Nikola Tesla?',
    'Namaste! Who are you?'
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[540px] shadow-xl overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Explore AI Voice Assistant</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/40 font-mono">
                {settings.groqModel}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2">
              <span>Lang: <strong>{settings.language}</strong></span>
              <span>&bull;</span>
              <span>Engine: <strong className={settings.voiceGender === 'Male' ? 'text-cyan-300' : 'text-rose-300'}>{settings.voiceGender === 'Male' ? '👨 Male' : '👩 Female'}</strong> ({settings.voice || (settings.voiceGender === 'Male' ? 'madhur' : 'swara')})</span>
            </div>
          </div>
        </div>

        {/* Dynamic Status: Continuous Listening vs Speaking vs Paused */}
        <div className="flex items-center gap-2">
          {isSpeaking ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-medium animate-pulse">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Speaking Response...</span>
            </div>
          ) : isContinuousMode ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm shadow-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <span>Continuous Listening (Active)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-850 border border-slate-750 text-slate-400 text-xs font-medium">
              <MicOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Voice Paused (Click to Resume)</span>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Voice Engine Switcher Bar */}
      <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-[11px] text-slate-400 hidden sm:inline">Voice Engine:</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
            settings.voiceGender === 'Male'
              ? 'bg-cyan-950 text-cyan-300 border-cyan-700/50'
              : 'bg-rose-950 text-rose-300 border-rose-700/50'
          }`}>
            {settings.voiceGender === 'Male' ? '👨 Male Voice' : '👩 Female Voice'}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ⚡ Fast Response (&lt;250ms)
          </span>
        </div>

        {onUpdateSettings && (
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-1">
            <button
              type="button"
              onClick={() => handleSwitchVoice('Female')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                (settings.voiceGender || 'Female') === 'Female'
                  ? 'bg-rose-500 text-slate-950 shadow-sm shadow-rose-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Activate Female Voice Engine"
            >
              <span>👩 Female</span>
              {(settings.voiceGender || 'Female') === 'Female' && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
            <button
              type="button"
              onClick={() => handleSwitchVoice('Male')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                settings.voiceGender === 'Male'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Activate Male Voice Engine"
            >
              <span>👨 Male</span>
              {settings.voiceGender === 'Male' && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
          </div>
        )}
      </div>

      {/* Wake Word Bar with "Hey Explorer", "Hi Explorer", "Hello Explorer" Triggers */}
      <div className="px-4 py-2 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isContinuousMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-white">Wake Triggers:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => triggerWakeTriggerChip('Hey Explorer')}
                className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 transition"
                title="Click to awaken with 'Hey Explorer'"
              >
                "Hey Explorer"
              </button>
              <button
                type="button"
                onClick={() => triggerWakeTriggerChip('Hi Explorer')}
                className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-600/50 transition"
                title="Click to awaken with 'Hi Explorer'"
              >
                "Hi Explorer"
              </button>
              <button
                type="button"
                onClick={() => triggerWakeTriggerChip('Hello Explorer')}
                className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 border border-indigo-600/50 transition"
                title="Click to awaken with 'Hello Explorer'"
              >
                "Hello Explorer"
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleContinuousMode}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
              isContinuousMode
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-850 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white'
            }`}
            title={isContinuousMode ? 'Continuous conversation is active — click to pause' : 'Click to activate continuous always-listening voice'}
          >
            <Radio className={`w-3.5 h-3.5 ${isContinuousMode ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{isContinuousMode ? 'Continuous: ACTIVE' : 'Continuous: PAUSED'}</span>
          </button>

          <button
            type="button"
            onClick={() => simulateWakeWordQuery('Hey Explorer', 'what is the speed of light?')}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-1 transition shadow-sm"
            title="Simulate speaking 'Hey Explorer, what is the speed of light?'"
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Test "Hey Explorer"</span>
            <span className="sm:hidden">Test</span>
          </button>
        </div>
      </div>

      {/* Wake Word Trigger Alert Banner */}
      {wakeNotice && (
        <div className="px-4 py-2 bg-gradient-to-r from-emerald-950 via-slate-900 to-cyan-950 border-b border-emerald-500/40 flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2 overflow-hidden">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
            <div className="text-xs truncate">
              <span className="font-bold text-emerald-200">{wakeNotice.message}</span>
              {wakeNotice.query && (
                <span className="text-cyan-200 ml-1.5 font-medium italic">"{wakeNotice.query}"</span>
              )}
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/40 shrink-0 font-bold">
            {isContinuousMode ? 'LISTENING' : 'PAUSED'}
          </span>
        </div>
      )}

      {/* Messages Stream */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-900/60 scroll-smooth"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                msg.role === 'user'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-850 text-cyan-300 border border-slate-700'
              }`}
            >
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-tr-none shadow-md'
                  : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-none shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/40 text-[10px] text-slate-400">
                <span className="font-mono">{msg.timestamp}</span>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => replayMessage(msg.content)}
                    className="hover:text-cyan-300 flex items-center gap-1 transition"
                    title="Read Aloud via Speaker"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Speak</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-850 text-cyan-300 border border-slate-700 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-cyan-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Explore AI is thinking (Groq LLM streaming)...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts & Wake Words Bar */}
      <div className="px-4 py-2 bg-slate-950/70 border-t border-slate-855 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
        <span className="text-slate-500 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Ask:</span>
        </span>
        {quickPrompts.map((p) => (
          <button
            key={p}
            onClick={() => simulateWakeWordQuery('Hey Explorer', p)}
            className="px-2.5 py-1 rounded-full bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition shrink-0 truncate max-w-[260px]"
          >
            "Hey Explorer, {p}"
          </button>
        ))}
      </div>

      {/* Active Conversation Listening Indicator (Patiently Waiting for Complete Sentence) */}
      {isListeningToFullQuestion && (
        <div className="px-4 py-1.5 bg-cyan-950/90 border-t border-cyan-500/40 flex items-center justify-between text-xs text-cyan-300 animate-pulse">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="font-semibold truncate">Listening to your full question... (I'll answer after you finish speaking)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (speechEndTimerRef.current) {
                clearTimeout(speechEndTimerRef.current);
                speechEndTimerRef.current = null;
              }
              const targetText = currentSpeechCandidateRef.current || input;
              currentSpeechCandidateRef.current = '';
              setIsListeningToFullQuestion(false);
              handleSendRef.current(undefined, targetText);
            }}
            className="text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 shrink-0 transition"
          >
            Answer Now ⚡
          </button>
        </div>
      )}

      {/* Persistent Continuous Listening Status Banner */}
      {isContinuousMode && (
        <div className="px-4 py-1.5 bg-emerald-950/80 border-t border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold">Continuous Voice Listening: Say "Hey Explorer [question]" or speak directly...</span>
          </div>
          <button
            type="button"
            onClick={toggleMic}
            className="text-[11px] font-bold text-slate-400 hover:text-rose-300 underline"
          >
            Pause Mic
          </button>
        </div>
      )}

      {/* Input Bottom Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={toggleMic}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
            isContinuousMode
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/30 animate-pulse'
              : 'bg-slate-850 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700'
          }`}
          title={isContinuousMode ? 'Continuous Listening is ON — Click to pause' : 'Continuous Listening is PAUSED — Click to activate'}
        >
          {isContinuousMode ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isContinuousMode
              ? 'Continuous voice listening active: Say "Hey Explorer [question]" or type...'
              : 'Continuous voice paused. Click mic or type your question...'
          }
          className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
        />

        <button
          type="submit"
          disabled={!input.trim() || isProcessing}
          className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 flex items-center justify-center shrink-0 transition font-bold"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
