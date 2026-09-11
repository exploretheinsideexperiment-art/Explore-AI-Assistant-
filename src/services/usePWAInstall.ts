import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAInstallState {
  isInstalled: boolean;
  isApple: boolean;
  isSafari: boolean;
  isAndroid: boolean;
  isInstallable: boolean;
  showAppleModal: boolean;
  openAppleModal: () => void;
  closeAppleModal: (neverShowAgain?: boolean) => void;
  triggerInstall: () => Promise<boolean>;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isApple, setIsApple] = useState(false);
  const [isSafari, setIsSafari] = useState(true);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showAppleModal, setShowAppleModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check standalone mode (PWA is already installed and opened as an app)
    const isStandalone =
      (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)')?.matches) ||
      (typeof window !== 'undefined' && (window.navigator as unknown as { standalone?: boolean })?.standalone === true) ||
      (typeof document !== 'undefined' && typeof document.referrer === 'string' && document.referrer.includes('android-app://')) ||
      false;

    setIsInstalled(isStandalone);

    // 2. Platform detection
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);
    const isWebKit = /webkit/.test(ua);
    const isChromeOrCriOS = /crios|chrome|chromium/.test(ua);
    const isFirefox = /fxios|firefox/.test(ua);
    const isSafariBrowser = isWebKit && !isChromeOrCriOS && !isFirefox;

    setIsApple(isIOS);
    setIsAndroid(isAndroidDevice);
    setIsSafari(isSafariBrowser);

    // 3. Android / Chromium BeforeInstallPrompt Event Listener
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowAppleModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 4. Automatic Smart Prompt for Apple Phone (iOS Safari)
    // If on Apple device and not already installed as standalone
    if (isIOS && !isStandalone) {
      const dismissed = sessionStorage.getItem('explore_ai_apple_prompt_dismissed');
      if (!dismissed) {
        // Automatically display the guided Apple install sheet after 2.5s
        const timer = setTimeout(() => {
          setShowAppleModal(true);
        }, 2500);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
          window.removeEventListener('appinstalled', handleAppInstalled);
        };
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const openAppleModal = () => {
    setShowAppleModal(true);
  };

  const closeAppleModal = (dismissForSession = false) => {
    setShowAppleModal(false);
    if (dismissForSession && typeof window !== 'undefined') {
      sessionStorage.setItem('explore_ai_apple_prompt_dismissed', 'true');
    }
  };

  const triggerInstall = async (): Promise<boolean> => {
    if (isApple) {
      // On Apple devices, WebKit prohibits automated silent install; trigger guided prompt
      setShowAppleModal(true);
      return true;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return true;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      // Fallback for desktop / manual browsers
      setShowAppleModal(true);
    }
    return false;
  };

  return {
    isInstalled,
    isApple,
    isSafari,
    isAndroid,
    isInstallable: !!deferredPrompt || isApple,
    showAppleModal,
    openAppleModal,
    closeAppleModal,
    triggerInstall
  };
}
