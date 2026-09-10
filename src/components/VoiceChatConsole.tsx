import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, AgentSettings, DisplayState, VoiceGender } from '../types';
import { aiService } from '../services/aiService';
import { ttsService } from '../services/ttsService';
import { wakeWordService } from '../services/wakeWordService';
import { evaluateSpeechInput } from '../utils/questionDetector';
import { noiseCancellationService, NoiseCancellationStats } from '../services/noiseCancellationService';
import { Mic, MicOff, Send, Volume2, Sparkles, RefreshCw, Cpu, Bot, User, Check, Radio, Zap, ShieldCheck, Waves } from 'lucide-react';

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
      content: 'Hello! I am Explore AI Assistant. Click the microphone button or type below to ask any question about science, ESP32, electronics, physics, or coding, and I will give you a detailed, comprehensive answer!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: settings.groqModel || 'llama-3.3-70b-versatile'
    }
  ]);
  const [input, setInput] = useState('');
  const [micOption, setMicOption] = useState<'click_to_ask' | 'always_on'>(
    settings.voiceMode === 'continuous' ? 'always_on' : 'click_to_ask'
  );
  const [isAlwaysOnActive, setIsAlwaysOnActive] = useState<boolean>(
    settings.voiceMode === 'continuous'
  );
  const [isMicCapturing, setIsMicCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListeningToFullQuestion, setIsListeningToFullQuestion] = useState(false);
  const [wakeNotice, setWakeNotice] = useState<{ message: string; query?: string } | null>(null);
  const [ncStats, setNcStats] = useState<NoiseCancellationStats>({
    isActive: false,
    rmsLevel: 0,
    isVoiceActive: false,
    noiseFloorDb: -60
  });

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef(false);
  const micOptionRef = useRef<'click_to_ask' | 'always_on'>(micOption);
  const isAlwaysOnActiveRef = useRef<boolean>(isAlwaysOnActive);
  const isSpeakingRef = useRef(isSpeaking);
  const isProcessingRef = useRef(isProcessing);
  const wakeWordAwakenedRef = useRef(false);
  const wakeNoticeTimeoutRef = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const speechEndTimerRef = useRef<any>(null);
  const handleSendRef = useRef<(e?: React.FormEvent, customText?: string) => Promise<void>>(async () => {});
  const currentSpeechCandidateRef = useRef<string>('');
  const inputRef = useRef<string>(input);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  // Subscribe to real-time noise cancellation and acoustic telemetry
  useEffect(() => {
    const unsub = noiseCancellationService.subscribeStats((stats) => {
      setNcStats(stats);
    });

    if (micOption === 'always_on' && isAlwaysOnActive) {
      noiseCancellationService.startNoiseCancellation().catch((err) => {
        console.warn('[NoiseCancellation] Activation note:', err);
      });
    }

    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    micOptionRef.current = micOption;
  }, [micOption]);

  useEffect(() => {
    isAlwaysOnActiveRef.current = isAlwaysOnActive;
  }, [isAlwaysOnActive]);

  useEffect(() => {
    if (settings.voiceMode === 'continuous') {
      setMicOption('always_on');
      setIsAlwaysOnActive(true);
    } else if (settings.voiceMode === 'push_to_talk') {
      setMicOption('click_to_ask');
      setIsAlwaysOnActive(false);
    }
  }, [settings.voiceMode]);

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
    // In click-to-ask mode, don't start while assistant is speaking.
    // In always-on mode, KEEP MIC RUNNING so user can interrupt at any time!
    if (isSpeakingRef.current && micOptionRef.current !== 'always_on') return;
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
        if (!isSpeakingRef.current && !isProcessingRef.current) {
          onOledStateChange('LISTENING');
        }
      };

      recognition.onresult = (event: any) => {
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

        // While Explore AI is processing or speaking, do NOT capture microphone audio
        // (prevents acoustic speaker feedback loop and accidental cancellation)
        if (isSpeakingRef.current || isProcessingRef.current) {
          return;
        }

        // EVALUATE SPEECH INPUT:
        // "Hear only the question being asked and ignore the rest of the sound."
        const speechEvaluation = evaluateSpeechInput(fullTranscript);

        // Check if wake word was activated ("Hey Explorer")
        const wakeCheck = wakeWordService.parseWakeWord(fullTranscript);
        if (wakeCheck.hasWakeWord && wakeCheck.isWakeOnly) {
          if (!wakeWordAwakenedRef.current) {
            wakeWordService.playWakeChime();
            wakeWordAwakenedRef.current = true;
            setIsListeningToFullQuestion(true);
            triggerWakeNotice(`⚡ "${wakeCheck.matchedPhrase || 'Hey Explorer'}" awakened! Ask your question...`);
            onOledStateChange('LISTENING');
          }
          return;
        }

        // Ignore ambient room sound, filler artifacts ("uh", "um", "hmm", coughing, TV background)
        if (speechEvaluation.isNoise && !wakeWordAwakenedRef.current) {
          // Pure ambient noise or stray non-question sounds are ignored
          return;
        }

        // Extract genuine question candidate
        const questionQuery = speechEvaluation.cleanQuery || (wakeCheck.cleanedQuery || fullTranscript).trim();
        if (!questionQuery || questionQuery.length < 2) return;

        setInput(questionQuery);
        inputRef.current = questionQuery;
        currentSpeechCandidateRef.current = questionQuery;
        setIsListeningToFullQuestion(true);
        onOledStateChange('LISTENING');

        // Reset debounce timer as new speech fragments arrive
        if (speechEndTimerRef.current) {
          clearTimeout(speechEndTimerRef.current);
          speechEndTimerRef.current = null;
        }

        // PROMPT, RELIABLE DISPATCH:
        // If the speech engine marked hasFinal = true, the phrase is locked. Dispatch in 350ms.
        // If interim (hasFinal = false), allow 800ms of silence before answering.
        const dispatchDelay = hasFinal ? 350 : 800;

        speechEndTimerRef.current = setTimeout(() => {
          const finalCandidate = (currentSpeechCandidateRef.current || questionQuery).trim();
          if (finalCandidate && !isProcessingRef.current && !isSpeakingRef.current) {
            setIsListeningToFullQuestion(false);
            wakeWordAwakenedRef.current = false;
            currentSpeechCandidateRef.current = '';
            if (micOptionRef.current !== 'always_on') {
              safeStopRecognition();
            }
            onOledStateChange('PROCESSING');
            handleSendRef.current(undefined, finalCandidate);
          }
        }, dispatchDelay);
      };

      recognition.onspeechend = () => {
        // Browser Voice Activity Detector detected speech end:
        const candidate = (currentSpeechCandidateRef.current || inputRef.current || '').trim();
        if (candidate && !isProcessingRef.current && !isSpeakingRef.current) {
          const evalRes = evaluateSpeechInput(candidate);
          if (evalRes.isQuestion || wakeWordAwakenedRef.current) {
            if (speechEndTimerRef.current) {
              clearTimeout(speechEndTimerRef.current);
              speechEndTimerRef.current = null;
            }
            speechEndTimerRef.current = setTimeout(() => {
              const queryToSend = (currentSpeechCandidateRef.current || candidate).trim();
              if (queryToSend && !isProcessingRef.current && !isSpeakingRef.current) {
                currentSpeechCandidateRef.current = '';
                setIsListeningToFullQuestion(false);
                wakeWordAwakenedRef.current = false;
                onOledStateChange('PROCESSING');
                handleSendRef.current(undefined, queryToSend);
              }
            }, 250);
          }
        }
      };

      recognition.onsoundend = () => {
        // Handled via onspeechend and timer.
      };

      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        setIsMicCapturing(false);

        // If recognition closed with an unanswered valid question, DISPATCH IT!
        const pending = (currentSpeechCandidateRef.current || inputRef.current || '').trim();
        if (pending && !isProcessingRef.current && !isSpeakingRef.current) {
          const evalRes = evaluateSpeechInput(pending);
          if (evalRes.isQuestion || wakeWordAwakenedRef.current) {
            if (speechEndTimerRef.current) {
              clearTimeout(speechEndTimerRef.current);
              speechEndTimerRef.current = null;
            }
            currentSpeechCandidateRef.current = '';
            setIsListeningToFullQuestion(false);
            wakeWordAwakenedRef.current = false;
            onOledStateChange('PROCESSING');
            handleSendRef.current(undefined, pending);
            return;
          }
        }

        // Always-On Option: Continuous listening loop!
        // When recognition ends due to browser silence timeout, auto-restart immediately
        // (as long as assistant is not speaking/processing)
        if (micOptionRef.current === 'always_on' && isAlwaysOnActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (micOptionRef.current === 'always_on' && isAlwaysOnActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              safeStartRecognition();
            }
          }, 150);
        } else if (micOptionRef.current === 'click_to_ask' && !isProcessingRef.current && !isSpeakingRef.current) {
          onOledStateChange('READY');
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('[Speech] Recognition event:', e.error);
        }
        isRecognitionActiveRef.current = false;
        setIsMicCapturing(false);

        // Auto-restart in Always-On mode if terminated due to no-speech timeout
        if (micOptionRef.current === 'always_on' && isAlwaysOnActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(() => {
            if (micOptionRef.current === 'always_on' && isAlwaysOnActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              safeStartRecognition();
            }
          }, 250);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      safeStopRecognition();
    };
  }, [settings.language, safeStartRecognition, safeStopRecognition, onOledStateChange]);

  const selectMicOption = (option: 'click_to_ask' | 'always_on') => {
    setMicOption(option);
    micOptionRef.current = option;

    if (option === 'always_on') {
      setIsAlwaysOnActive(true);
      isAlwaysOnActiveRef.current = true;
      if (onUpdateSettings) {
        onUpdateSettings({ voiceMode: 'continuous' });
      }
      // Activate hardware Acoustic Echo Cancellation (AEC) & DSP noise reduction
      noiseCancellationService.startNoiseCancellation().catch(() => {});
      triggerWakeNotice('🟢 Always-On Mic + Noise Cancellation Active: Listens to entire conversation & allows live interruption!');
      wakeWordService.playWakeChime();
      ttsService.stop();
      setIsSpeaking(false);
      setTimeout(() => {
        safeStartRecognition();
      }, 150);
    } else {
      setIsAlwaysOnActive(false);
      isAlwaysOnActiveRef.current = false;
      if (onUpdateSettings) {
        onUpdateSettings({ voiceMode: 'push_to_talk' });
      }
      safeStopRecognition();
      triggerWakeNotice('🎙️ Click to Ask Activated: Mic stays idle until you click it to ask, then stops.');
      onOledStateChange('READY');
    }
  };

  const handleInterruptSpeech = useCallback(() => {
    ttsService.stop();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setIsProcessing(false);
    isProcessingRef.current = false;
    if (activeAbortControllerRef.current) {
      try {
        activeAbortControllerRef.current.abort();
      } catch (e) {}
      activeAbortControllerRef.current = null;
    }
    wakeWordAwakenedRef.current = false;
    currentSpeechCandidateRef.current = '';
    setInput('');
    inputRef.current = '';
    safeStartRecognition();
    onOledStateChange('LISTENING');
    triggerWakeNotice('🛑 Assistant paused. Listening for your question now...');
  }, [safeStartRecognition, onOledStateChange]);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or type your message.');
      return;
    }

    // If assistant is currently speaking, clicking mic interrupts and starts listening
    if (isSpeaking) {
      handleInterruptSpeech();
      return;
    }

    if (micOption === 'always_on') {
      // In Always-On mode, clicking toggles pause/resume of continuous listening
      if (isAlwaysOnActive && (isMicCapturing || isRecognitionActiveRef.current)) {
        safeStopRecognition();
        setIsAlwaysOnActive(false);
        isAlwaysOnActiveRef.current = false;
        triggerWakeNotice('⏸️ Always-On Mic Paused — Click to resume continuous listening');
        onOledStateChange('READY');
      } else {
        setIsAlwaysOnActive(true);
        isAlwaysOnActiveRef.current = true;
        noiseCancellationService.startNoiseCancellation().catch(() => {});
        ttsService.stop();
        setIsSpeaking(false);
        wakeWordService.playWakeChime();
        triggerWakeNotice('🟢 Always-On Mic Active: Listening for questions, noise ignored...');
        safeStartRecognition();
      }
    } else {
      // In Click-to-Ask (Idle) mode:
      if (isMicCapturing || isRecognitionActiveRef.current) {
        // User clicked mic while listening to finish & send question
        safeStopRecognition();
        setIsListeningToFullQuestion(false);
        const targetQuery = (currentSpeechCandidateRef.current || inputRef.current || input).trim();
        currentSpeechCandidateRef.current = '';
        if (targetQuery.length >= 2) {
          handleSendRef.current(undefined, targetQuery);
        } else {
          triggerWakeNotice('Microphone stopped (returned to idle)');
          onOledStateChange('READY');
        }
      } else {
        // User clicked idle mic to activate and ask
        noiseCancellationService.startNoiseCancellation().catch(() => {});
        ttsService.stop();
        setIsSpeaking(false);
        wakeWordService.playWakeChime();
        triggerWakeNotice('🎤 Microphone Activated — Speak your question now (will stop after answering)...');
        setInput('');
        inputRef.current = '';
        currentSpeechCandidateRef.current = '';
        wakeWordAwakenedRef.current = true;
        safeStartRecognition();
      }
    }
  };

  const triggerWakeTriggerChip = (phrase: 'Hey Explorer' | 'Hi Explorer' | 'Hello Explorer') => {
    noiseCancellationService.startNoiseCancellation().catch(() => {});
    ttsService.stop();
    setIsSpeaking(false);
    wakeWordAwakenedRef.current = true;
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

    // Stop microphone recognition while assistant processes and speaks answer aloud.
    // This prevents the microphone from hearing the speaker and looping!
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

    // Create a new AbortController for this response stream to allow barge-in cancellation
    activeAbortControllerRef.current = new AbortController();

    try {
      const asstMsgId = `asst-${Date.now()}`;
      let firstSentenceTriggered = false;

      // Start a clean streaming speech session
      ttsService.startStreamingSession(() => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;

        if (micOptionRef.current === 'always_on' && isAlwaysOnActiveRef.current) {
          // ALWAYS-ON CONVERSATION:
          // Keeps listening and talking in a continuous loop!
          // Ensure microphone is active and ready for the user's next question!
          setTimeout(() => {
            if (micOptionRef.current === 'always_on' && isAlwaysOnActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              wakeWordAwakenedRef.current = false;
              currentSpeechCandidateRef.current = '';
              inputRef.current = '';
              setInput('');
              safeStartRecognition();
              onOledStateChange('LISTENING');
              triggerWakeNotice('🎤 Continuous Listening: Speak your next question anytime...');
            }
          }, 350);
        } else {
          // CLICK-TO-ASK (IDLE) OPTION:
          // Listen and talk, otherwise keep stopping (stays idle)!
          safeStopRecognition();
          onOledStateChange('READY');
          triggerWakeNotice('✅ Answer complete. Mic is idle — Click to ask another question.');
        }
      });

      const response = await aiService.streamResponse(
        query,
        messages,
        settings,
        (sentence, isFirst) => {
          if (activeAbortControllerRef.current?.signal.aborted) return;

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
            if (!activeAbortControllerRef.current?.signal.aborted) {
              setIsSpeaking(true);
              isSpeakingRef.current = true;
              onOledStateChange('SPEAKING');
            }
          });
        },
        (fullText) => {
          if (activeAbortControllerRef.current?.signal.aborted) return;

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
        },
        activeAbortControllerRef.current.signal
      );

      // Notify TTS service that LLM text generation is finished
      ttsService.finishStreamingSession();

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
    } catch (err: any) {
      if (err?.name === 'AbortError' || activeAbortControllerRef.current?.signal.aborted) {
        console.log('[AI Stream] Interrupted cleanly by user barge-in speech');
        return;
      }
      console.error('Failed to get response:', err);
      ttsService.finishStreamingSession();
      onOledStateChange('ERROR');
      setTimeout(() => onOledStateChange('READY'), 2000);
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col min-h-[660px] h-[calc(100vh-210px)] max-h-[860px] shadow-xl overflow-hidden">
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

        {/* Dynamic Status: Speaking vs Listening vs Ready */}
        <div className="flex items-center gap-2">
          {isSpeaking ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-medium animate-pulse">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Speaking Answer...</span>
            </div>
          ) : isMicCapturing ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold shadow-sm shadow-rose-500/20 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
              <Mic className="w-3.5 h-3.5 text-rose-400" />
              <span>{micOption === 'always_on' ? 'Always-On — Listening...' : 'Microphone Active — Listening...'}</span>
            </div>
          ) : micOption === 'always_on' && !isAlwaysOnActive ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/60 border border-amber-700/50 text-amber-300 text-xs font-medium">
              <MicOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Always-On: Paused</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-850 border border-slate-750 text-slate-400 text-xs font-medium">
              <MicOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Mic Idle (Click to Ask)</span>
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

      {/* Dual Microphone Interaction Mode Bar & Wake Word Triggers */}
      <div className="px-4 py-2.5 bg-slate-950/85 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
        {/* Microphone Options: Click to Ask vs Always-On */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mic Mode:</span>
          </span>

          <div className="flex items-center bg-slate-900 border border-slate-750 rounded-xl p-1 gap-1">
            {/* Option 1: Click to Ask (Idle Mode) */}
            <button
              type="button"
              onClick={() => selectMicOption('click_to_ask')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                micOption === 'click_to_ask'
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Idle until clicked. Listens, answers, then automatically stops."
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Click to Ask (Idle)</span>
              {micOption === 'click_to_ask' && <Check className="w-3 h-3 stroke-[3]" />}
            </button>

            {/* Option 2: Always-On Microphone (Continuous) */}
            <button
              type="button"
              onClick={() => selectMicOption('always_on')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                micOption === 'always_on'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Microphone is always on. Keeps listening & talking continuously in a hands-free loop."
            >
              <Radio className={`w-3.5 h-3.5 ${micOption === 'always_on' ? 'animate-pulse text-slate-950' : ''}`} />
              <span>Always-On Mic (Continuous)</span>
              {micOption === 'always_on' && <Check className="w-3 h-3 stroke-[3]" />}
            </button>
          </div>

          {/* Always-on Pause/Resume Helper if Always-on selected */}
          {micOption === 'always_on' && (
            <button
              type="button"
              onClick={toggleMic}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                isAlwaysOnActive
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/50 hover:bg-emerald-900'
                  : 'bg-amber-950/70 text-amber-300 border-amber-600/50 hover:bg-amber-900'
              }`}
              title={isAlwaysOnActive ? 'Continuous loop is active — click to pause' : 'Continuous loop is paused — click to resume'}
            >
              <span className={`w-2 h-2 rounded-full ${isAlwaysOnActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span>{isAlwaysOnActive ? 'Loop: LISTENING' : 'Loop: PAUSED'}</span>
            </button>
          )}

          {/* Noise Cancellation Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 text-xs font-semibold shadow-sm"
            title="Active Hardware Acoustic Echo Cancellation (AEC), Ambient Noise Suppression (ANS), Highpass Filter (85Hz) & Vocal Clarifier"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Noise Cancellation:</span>
            <span className="text-emerald-400 font-bold">Active</span>
            <Waves className={`w-3.5 h-3.5 ${ncStats.isVoiceActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
        </div>

        {/* Wake Triggers & Quick Simulation */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 hidden lg:inline">Wake Triggers:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => triggerWakeTriggerChip('Hey Explorer')}
              className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Click to awaken with 'Hey Explorer'"
            >
              "Hey Explorer"
            </button>
            <button
              type="button"
              onClick={() => triggerWakeTriggerChip('Hi Explorer')}
              className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Click to awaken with 'Hi Explorer'"
            >
              "Hi Explorer"
            </button>
            <button
              type="button"
              onClick={() => simulateWakeWordQuery('Hey Explorer', 'what is the speed of light?')}
              className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-1 transition shadow-sm"
              title="Simulate speaking 'Hey Explorer, what is the speed of light?'"
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">Quick Test</span>
            </button>
          </div>
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
            {micOption === 'always_on' && isAlwaysOnActive ? 'LISTENING' : 'ACTIVE'}
          </span>
        </div>
      )}

      {/* Messages Stream */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-900/60 scroll-smooth"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                msg.role === 'user'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-850 text-cyan-300 border border-slate-700'
              }`}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-4 sm:px-5 py-3.5 text-xs sm:text-[13.5px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-tr-none shadow-md'
                  : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-none shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-slate-800/40 text-[10px] text-slate-400">
                <span className="font-mono">{msg.timestamp}</span>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => replayMessage(msg.content)}
                    className="hover:text-cyan-300 flex items-center gap-1 transition text-[11px]"
                    title="Read Aloud via Speaker"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
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
        <div className="px-4 py-2 bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border-t border-cyan-500/40 flex items-center justify-between text-xs text-cyan-300 animate-pulse">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="font-semibold truncate">
              Hearing question... (Ambient sound ignored. Auto-answering when you finish)
            </span>
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
            className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 shrink-0 transition flex items-center gap-1"
          >
            <span>Answer Now</span>
            <span>⚡</span>
          </button>
        </div>
      )}

      {/* Active Speaking Banner with 1-Tap Interrupt Control */}
      {isSpeaking && (
        <div className="px-4 py-1.5 bg-indigo-950/90 border-t border-indigo-500/40 flex items-center justify-between text-xs text-indigo-200 animate-fadeIn">
          <div className="flex items-center gap-2 overflow-hidden">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
            <span className="font-medium truncate">
              Speaking answer... (Noise filtered out)
            </span>
          </div>
          <button
            type="button"
            onClick={handleInterruptSpeech}
            className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 shrink-0 transition flex items-center gap-1"
            title="Interrupt answer and ask a new question"
          >
            <span>🛑 Stop & Ask</span>
          </button>
        </div>
      )}

      {/* Persistent Continuous Always-On Status Banner */}
      {micOption === 'always_on' && !isSpeaking && !isListeningToFullQuestion && (
        <div className="px-4 py-1.5 bg-emerald-950/80 border-t border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isAlwaysOnActive ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isAlwaysOnActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="font-semibold">
              {isAlwaysOnActive
                ? 'Always-On Mic Active: Hears only questions asked, ignores background sound.'
                : 'Always-On Mic is Paused: Click "Resume" or the microphone button to continue listening.'}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleMic}
            className="text-[11px] font-bold text-slate-300 hover:text-emerald-300 underline"
          >
            {isAlwaysOnActive ? 'Pause Mic' : 'Resume Listening'}
          </button>
        </div>
      )}

      {/* Input Bottom Bar */}
      <form
        onSubmit={handleSend}
        className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2.5"
      >
        {/* Main Microphone Action Button */}
        <button
          type="button"
          onClick={toggleMic}
          className={`h-11 px-4 rounded-xl flex items-center gap-2 shrink-0 transition font-medium text-xs sm:text-sm ${
            micOption === 'always_on'
              ? isAlwaysOnActive
                ? isSpeaking
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30'
                  : 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/30 animate-pulse'
                : 'bg-slate-850 hover:bg-slate-800 text-amber-300 border border-amber-600/50'
              : isMicCapturing
              ? 'bg-rose-500 text-white font-bold shadow-lg shadow-rose-500/30 animate-pulse'
              : isSpeaking
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20'
          }`}
          title={
            micOption === 'always_on'
              ? isAlwaysOnActive
                ? 'Always-On is active and listening continuously — Click to pause'
                : 'Always-On is paused — Click to resume continuous listening'
              : isMicCapturing
              ? 'Microphone is listening — Click to finish & send question'
              : isSpeaking
              ? 'Assistant is speaking answer (mic will stay stopped after)'
              : 'Microphone is idle — Click to activate and ask your question (stops after answering)'
          }
        >
          {micOption === 'always_on' ? (
            isAlwaysOnActive ? (
              isSpeaking ? (
                <>
                  <Volume2 className="w-4 h-4 text-slate-950 animate-bounce" />
                  <span className="hidden sm:inline">Speaking...</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span>
                  <Mic className="w-4 h-4 text-slate-950" />
                  <span className="hidden sm:inline">Always-On (Listening)</span>
                </>
              )
            ) : (
              <>
                <MicOff className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Always-On (Paused)</span>
              </>
            )
          ) : isMicCapturing ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <Mic className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Listening...</span>
            </>
          ) : isSpeaking ? (
            <>
              <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">Talking...</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Click to Ask</span>
            </>
          )}
        </button>

        {/* Quick Mode Switcher Chip */}
        <button
          type="button"
          onClick={() => selectMicOption(micOption === 'always_on' ? 'click_to_ask' : 'always_on')}
          className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-[11px] sm:text-xs flex items-center gap-1.5 shrink-0 transition"
          title={
            micOption === 'always_on'
              ? 'Switch to "Click to Ask" (Idle until clicked, stops after answering)'
              : 'Switch to "Always-On Mic" (Keeps listening and talking continuously)'
          }
        >
          <Radio className={`w-3.5 h-3.5 ${micOption === 'always_on' ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span className="hidden md:inline">
            {micOption === 'always_on' ? 'Always-On' : 'Click-to-Ask'}
          </span>
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            micOption === 'always_on'
              ? isAlwaysOnActive
                ? '🟢 Always-On active — Listening... Speak your question anytime'
                : '⏸️ Always-On paused — Click "Resume" or type your question'
              : isMicCapturing
              ? '🎤 Listening to your voice... Speak your question now'
              : 'Click "Click to Ask" or type your question here...'
          }
          className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 h-11"
        />

        {isMicCapturing && (currentSpeechCandidateRef.current || input.trim()).length >= 2 && (
          <button
            type="button"
            onClick={() => {
              if (speechEndTimerRef.current) {
                clearTimeout(speechEndTimerRef.current);
                speechEndTimerRef.current = null;
              }
              const target = (currentSpeechCandidateRef.current || inputRef.current || input).trim();
              currentSpeechCandidateRef.current = '';
              safeStopRecognition();
              setIsListeningToFullQuestion(false);
              handleSendRef.current(undefined, target);
            }}
            className="h-10 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1 shrink-0 font-bold text-xs shadow-md animate-pulse"
            title="Immediately send question and answer"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950" />
            <span className="hidden sm:inline">Ask Now</span>
          </button>
        )}

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
