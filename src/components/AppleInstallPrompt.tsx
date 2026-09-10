import React, { useState } from 'react';
import { Share, PlusSquare, X, Smartphone, CheckCircle, ExternalLink, Copy, Check } from 'lucide-react';

interface AppleInstallPromptProps {
  isOpen: boolean;
  onClose: (dismissForSession?: boolean) => void;
  isSafari: boolean;
}

export const AppleInstallPrompt: React.FC<AppleInstallPromptProps> = ({
  isOpen,
  onClose,
  isSafari
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-cyan-950/40 text-slate-100">
        {/* Close Button */}
        <button
          onClick={() => onClose(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close installation prompt"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-xl bg-slate-950 border border-cyan-500/40 p-1 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <img
              src="./apple-touch-icon.png"
              alt="Explore AI Icon"
              className="w-10 h-10 rounded-lg"
              onError={(e) => {
                // Fallback to SVG if PNG fails
                (e.target as HTMLImageElement).src = './icon.svg';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Apple iPhone & iPad
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                iOS PWA
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              Install Explore AI on Apple Device
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          Apple iOS requires adding web apps to your Home Screen via Safari. Once added, Explore AI runs as a native standalone app with full screen view, offline caching, and instant microphone access.
        </p>

        {/* Step-by-Step Instructions */}
        <div className="space-y-2.5 mb-5 bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-xs">
          {isSafari ? (
            <>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold shrink-0 text-[11px]">
                  1
                </div>
                <div className="flex-1">
                  <span className="text-slate-200">Tap the </span>
                  <strong className="text-cyan-300 font-semibold inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded">
                    <Share className="w-3.5 h-3.5" /> Share
                  </strong>
                  <span className="text-slate-200"> button in the Safari navigation bar at the bottom.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold shrink-0 text-[11px]">
                  2
                </div>
                <div className="flex-1">
                  <span className="text-slate-200">Scroll down and select </span>
                  <strong className="text-cyan-300 font-semibold inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded">
                    <PlusSquare className="w-3.5 h-3.5" /> Add to Home Screen
                  </strong>
                  <span className="text-slate-200">.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold shrink-0 text-[11px]">
                  3
                </div>
                <div className="flex-1">
                  <span className="text-slate-200">Tap </span>
                  <strong className="text-emerald-400 font-semibold inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded">
                    Add
                  </strong>
                  <span className="text-slate-200"> in the top right corner to complete installation.</span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-200 text-xs">
                ⚠️ You are currently using a third-party browser on iOS. Apple only permits Home Screen installation from <strong>Apple Safari</strong>.
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">Copy URL to open in Safari:</span>
                <button
                  onClick={handleCopyUrl}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied URL!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-2 mb-5 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Fullscreen App Mode</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Fast Home Screen Launch</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Background Audio & Voice</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Works Seamlessly Offline</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={() => onClose(true)}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5 transition"
          >
            Don't show again
          </button>
          <button
            onClick={() => onClose(false)}
            className="flex-1 max-w-[140px] px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 text-white font-semibold text-xs transition shadow-md shadow-cyan-900/30"
          >
            Got it!
          </button>
        </div>

        {/* Bouncing pointer arrow indicating Safari Share Sheet at screen bottom on iPhone */}
        {isSafari && (
          <div className="sm:hidden flex flex-col items-center justify-center mt-3 animate-bounce text-cyan-400">
            <span className="text-[10px] font-mono tracking-wide text-cyan-300">Tap Share ⎋ below</span>
            <svg className="w-4 h-4 text-cyan-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
