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
      content: 'Hello! I am Explore AI Assistant. Whenever you say "Hey Explorer" and ask any question, I will respond immediately! You can also type or click any question chip below.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: settings.groqModel || 'llama-3.3-70b-versatile'
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWakeWordMode, setIsWakeWordMode] = useState<boolean>(true);
  const [wakeNotice, setWakeNotice] = useState<{ message: string; query?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isWakeWordModeRef = useRef(isWakeWordMode);
  const isSpeakingRef = useRef(isSpeaking);
  const isProcessingRef = useRef(isProcessing);
  const wakeWordAwakenedRef = useRef(false);
  const wakeChimePlayedRef = useRef(false);
  const wakeNoticeTimeoutRef = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const speechDebounceTimerRef = useRef<any>(null);

  useEffect(() => {
    isWakeWordModeRef.current = isWakeWordMode;
  }, [isWakeWordMode]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    if (settings.voiceMode === 'wake_word' && !isWakeWordMode) {
      setIsWakeWordMode(true);
    }
  }, [settings.voiceMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const triggerWakeNotice = (message: string, query?: string) => {
    setWakeNotice({ message, query });
    if (wakeNoticeTimeoutRef.current) clearTimeout(wakeNoticeTimeoutRef.current);
    wakeNoticeTimeoutRef.current = setTimeout(() => {
      setWakeNotice(null);
    }, 4500);
  };

  const startRecognitionSafe = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      wakeChimePlayedRef.current = false;
      recognitionRef.current.start();
      setIsListening(true);
      if (wakeWordAwakenedRef.current) {
        onOledStateChange('LISTENING');
      }
    } catch (e) {
      // Ignored: browser recognition may already be active
    }
  }, [onOledStateChange]);

  const stopRecognitionSafe = useCallback(() => {
    if (speechDebounceTimerRef.current) {
      clearTimeout(speechDebounceTimerRef.current);
    }
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {}
    setIsListening(false);
  }, []);

  // Setup Web Speech API for voice input & continuous wake word listening
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

      recognition.onresult = (event: any) => {
        const results = event.results;
        let fullTranscript = '';
        for (let i = 0; i < results.length; i++) {
          fullTranscript += ' ' + results[i][0].transcript;
        }
        fullTranscript = fullTranscript.trim();
        setInput(fullTranscript);

        const lastResult = results[results.length - 1];
        const isFinal = lastResult && lastResult.isFinal;

        // Check for wake word "Hey Explorer"
        const parsed = wakeWordService.parseWakeWord(fullTranscript);

        if (parsed.hasWakeWord) {
          // Play wake chime once upon detecting "Hey Explorer"
          if (!wakeChimePlayedRef.current) {
            wakeWordService.playWakeChime();
            wakeChimePlayedRef.current = true;
          }

          if (parsed.cleanedQuery && parsed.cleanedQuery.length >= 2) {
            // Spoken as "Hey Explorer [question]" in one flow: respond immediately!
            onOledStateChange('LISTENING');
            triggerWakeNotice('⚡ "Hey Explorer" detected! Responding immediately...', parsed.cleanedQuery);

            if (speechDebounceTimerRef.current) {
              clearTimeout(speechDebounceTimerRef.current);
            }

            if (isFinal) {
              wakeWordAwakenedRef.current = false;
              wakeChimePlayedRef.current = false;
              stopRecognitionSafe();
              handleSend(undefined, parsed.cleanedQuery);
            } else {
              // Wait 400ms for user to conclude question words, then respond immediately!
              speechDebounceTimerRef.current = setTimeout(() => {
                wakeWordAwakenedRef.current = false;
                wakeChimePlayedRef.current = false;
                stopRecognitionSafe();
                handleSend(undefined, parsed.cleanedQuery);
              }, 400);
            }
            return;
          } else {
            // Spoken "Hey Explorer" alone: awaken and keep listening continuously without interrupting TTS
            wakeWordAwakenedRef.current = true;
            triggerWakeNotice('⚡ "Hey Explorer" Awakened! Ask any question, responding immediately...');
            onOledStateChange('LISTENING');
            return;
          }
        } else if (wakeWordAwakenedRef.current && fullTranscript.length >= 2) {
          // Previously awakened, now receiving question: respond immediately!
          onOledStateChange('LISTENING');
          triggerWakeNotice('⚡ "Hey Explorer" listening...', fullTranscript);

          if (speechDebounceTimerRef.current) {
            clearTimeout(speechDebounceTimerRef.current);
          }

          if (isFinal) {
            wakeWordAwakenedRef.current = false;
            wakeChimePlayedRef.current = false;
            stopRecognitionSafe();
            handleSend(undefined, fullTranscript);
          } else {
            speechDebounceTimerRef.current = setTimeout(() => {
              wakeWordAwakenedRef.current = false;
              wakeChimePlayedRef.current = false;
              stopRecognitionSafe();
              handleSend(undefined, fullTranscript);
            }, 450);
          }
          return;
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // If wake-word mode is active and not currently speaking or processing, auto-restart
        if (isWakeWordModeRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (isWakeWordModeRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              startRecognitionSafe();
            }
          }, 250);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('Speech recognition warning:', e.error);
        }
        setIsListening(false);
        if (isWakeWordModeRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (isWakeWordModeRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              startRecognitionSafe();
            }
          }, 400);
        }
      };

      recognitionRef.current = recognition;

      // Start initial wake word listener if mode is active
      if (isWakeWordModeRef.current) {
        startRecognitionSafe();
      }
    }

    return () => {
      if (speechDebounceTimerRef.current) clearTimeout(speechDebounceTimerRef.current);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      stopRecognitionSafe();
    };
  }, [settings.language, startRecognitionSafe, stopRecognitionSafe]);

  const toggleWakeWordMode = () => {
    const next = !isWakeWordMode;
    setIsWakeWordMode(next);
    isWakeWordModeRef.current = next;

    if (onUpdateSettings) {
      onUpdateSettings({ voiceMode: next ? 'wake_word' : 'push_to_talk' });
    }

    if (next) {
      triggerWakeNotice('⚡ Hands-Free Mode Activated! Say "Hey Explorer [question]"');
      wakeWordService.playWakeChime();
      ttsService.stop();
      setIsSpeaking(false);
      setTimeout(() => {
        startRecognitionSafe();
      }, 250);
    } else {
      wakeWordAwakenedRef.current = false;
      stopRecognitionSafe();
      onOledStateChange('READY');
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or type your message.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      onOledStateChange('READY');
    } else {
      try {
        ttsService.stop();
        setIsSpeaking(false);
        startRecognitionSafe();
        onOledStateChange('LISTENING');
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    let rawQuery = (customText || input).trim();
    if (!rawQuery || isProcessing) return;

    // Check if query begins with "Hey Explorer" and clean it
    const parsed = wakeWordService.parseWakeWord(rawQuery);
    const query = parsed.hasWakeWord && parsed.cleanedQuery ? parsed.cleanedQuery : rawQuery;

    // Stop listening while generating response
    stopRecognitionSafe();

    // Stop any active TTS speech
    ttsService.stop();

    if (speechDebounceTimerRef.current) {
      clearTimeout(speechDebounceTimerRef.current);
    }
    wakeWordAwakenedRef.current = false;
    wakeChimePlayedRef.current = false;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: rawQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);
    onOledStateChange('PROCESSING');

    try {
      const response = await aiService.generateResponse(query, messages, settings);

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: settings.groqModel || 'llama-3.3-70b-versatile',
        searchQueries: response.searchQueries
      };

      setMessages(prev => [...prev, assistantMsg]);
      setIsProcessing(false);

      // Play voice output via TTS and drive OLED Speaking state
      onOledStateChange('SPEAKING');
      setIsSpeaking(true);

      ttsService.speak(
        response.text,
        settings,
        () => {
          setIsSpeaking(true);
          onOledStateChange('SPEAKING');
        },
        () => {
          setIsSpeaking(false);
          onOledStateChange('READY');
          // Resume continuous wake word listening once speech finishes
          if (isWakeWordModeRef.current) {
            setTimeout(() => {
              if (isWakeWordModeRef.current && !isSpeakingRef.current) {
                startRecognitionSafe();
              }
            }, 300);
          }
        }
      );
    } catch (err) {
      console.error('Failed to get response:', err);
      setIsProcessing(false);
      onOledStateChange('ERROR');
      setTimeout(() => onOledStateChange('READY'), 3000);
      if (isWakeWordModeRef.current) {
        setTimeout(() => startRecognitionSafe(), 3000);
      }
    }
  };

  const simulateWakeWordQuery = (query: string) => {
    wakeWordService.playWakeChime();
    triggerWakeNotice(`⚡ "Hey Explorer" detected! Responding immediately...`, query);
    setInput(`Hey Explorer, ${query}`);
    if (speechDebounceTimerRef.current) clearTimeout(speechDebounceTimerRef.current);
    wakeWordAwakenedRef.current = false;
    wakeChimePlayedRef.current = false;
    setTimeout(() => {
      handleSend(undefined, query);
    }, 150);
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
        if (isWakeWordModeRef.current) {
          startRecognitionSafe();
        }
      }
    );
  };

  const stopAudio = () => {
    ttsService.stop();
    setIsSpeaking(false);
    onOledStateChange('READY');
    if (isWakeWordModeRef.current) {
      setTimeout(() => startRecognitionSafe(), 200);
    }
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
    'Hey Explorer, what is the speed of light?',
    'Hey Explorer, how does an ESP32 work?',
    'Hey Explorer, tell me an interesting science fact',
    'Hey Explorer, who was Nikola Tesla?',
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

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium animate-pulse">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Speaking Response...</span>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Voice Engine Switcher Bar (Visible on All Screen Sizes) */}
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

      {/* "Hey Explorer" Wake Word Bar */}
      <div className="px-4 py-2 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isWakeWordMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white">Wake Word:</span>
            <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md border ${
              isWakeWordMode
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/50'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}>
              "Hey Explorer"
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden md:inline">
            {isWakeWordMode ? 'Say "Hey Explorer [question]" for instant reply' : 'Hands-free voice trigger'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleWakeWordMode}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
              isWakeWordMode
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-850 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white'
            }`}
            title={isWakeWordMode ? 'Turn off continuous wake word listening' : 'Turn on continuous wake word listening'}
          >
            <Radio className={`w-3.5 h-3.5 ${isWakeWordMode ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{isWakeWordMode ? 'Hands-Free: ON' : 'Hands-Free: OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => simulateWakeWordQuery('what is the speed of light?')}
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
            IMMEDIATE RESPOND
          </span>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-900/60">
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

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 bg-slate-950/70 border-t border-slate-850 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
        <span className="text-slate-500 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Quick:</span>
        </span>
        {quickPrompts.map((p) => (
          <button
            key={p}
            onClick={() => {
              if (p.toLowerCase().startsWith('hey explorer')) {
                simulateWakeWordQuery(p.replace(/^Hey Explorer,?\s*/i, ''));
              } else {
                handleSend(undefined, p);
              }
            }}
            className="px-2.5 py-1 rounded-full bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition shrink-0 truncate max-w-[260px]"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Bottom Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={toggleMic}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
              : 'bg-slate-850 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700'
          }`}
          title={isListening ? 'Stop Listening' : (isWakeWordMode ? 'Mic active (Listening for "Hey Explorer")' : 'Push to Talk (Mic)')}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isListening
              ? (isWakeWordMode ? 'Listening continuously: Say "Hey Explorer [question]"...' : 'Listening to your voice...')
              : (isWakeWordMode ? 'Say "Hey Explorer [question]" or type message...' : 'Ask Explore AI anything or press Mic...')
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
