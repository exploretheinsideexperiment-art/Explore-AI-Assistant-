import React from 'react';
import { Cpu, Wifi, Sparkles, Sliders, Monitor, BookOpen, Terminal, Smartphone, Usb, SlidersHorizontal, Apple, Download, CheckCircle } from 'lucide-react';
import { DeviceInfo, ActiveTab } from '../types';
import { PWAInstallState } from '../services/usePWAInstall';

export type { ActiveTab };

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  device: DeviceInfo;
  pwaState?: PWAInstallState;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  device,
  pwaState
}) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'console', label: 'Live Assistant', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'pinout', label: 'Pin Configurator', icon: <SlidersHorizontal className="w-4 h-4 text-cyan-400" />, badge: 'ESP32' },
    { id: 'usbflash', label: 'ESPFlash (OTG)', icon: <Usb className="w-4 h-4 text-cyan-400" />, badge: 'Station' },
    { id: 'settings', label: 'Agent Settings', icon: <Sliders className="w-4 h-4 text-amber-400" />, badge: 'Config' },
    { id: 'portal', label: 'Wi-Fi Provisioning', icon: <Wifi className="w-4 h-4" /> },
    { id: 'device', label: 'Device Telemetry', icon: <Cpu className="w-4 h-4" /> },
    { id: 'hardware', label: 'Hardware Wiring', icon: <Monitor className="w-4 h-4" /> },
    { id: 'knowledge', label: 'Knowledge Base', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'firmware', label: 'Firmware Code', icon: <Terminal className="w-4 h-4 text-emerald-400" />, badge: 'Unified' },
    { id: 'manual', label: 'Manual Guidelines', icon: <BookOpen className="w-4 h-4 text-amber-400" />, badge: 'Booklet' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-850">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-400 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-cyan-400 font-black text-sm">
                EX
              </div>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Explore AI Assistant</span>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                  ESP32 &bull; Groq
                </span>
              </h1>
              <p className="text-[10px] text-slate-400">
                Cloud Connected Embedded Voice Platform
              </p>
            </div>
          </div>

          {/* Device Status Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-mono text-[11px]">{device.id}</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400 text-[11px]">{device.ssid}</span>
          </div>

          {/* Mobile & Desktop PWA Installation Action */}
          <div className="flex items-center gap-2">
            {pwaState?.isInstalled ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-[11px] text-emerald-300 font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Installed PWA</span>
                <span className="sm:hidden">Installed</span>
              </div>
            ) : pwaState?.isApple ? (
              <button
                onClick={pwaState.openAppleModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 text-white text-[11px] font-semibold transition shadow-sm shadow-cyan-500/20 active:scale-95"
                title="Install Explore AI on Apple iPhone or iPad"
              >
                <Apple className="w-3.5 h-3.5" />
                <span>Install on iPhone</span>
              </button>
            ) : pwaState?.isAndroid ? (
              <button
                onClick={pwaState.triggerInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 text-white text-[11px] font-semibold transition shadow-sm shadow-cyan-500/20 active:scale-95"
                title="Install Explore AI on Android"
              >
                <Smartphone className="w-3.5 h-3.5 text-cyan-200" />
                <span>Install App</span>
              </button>
            ) : (
              <button
                onClick={pwaState?.triggerInstall}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-[11px] text-slate-300 hover:text-white transition active:scale-95"
                title="Install Explore AI on Apple, Android, or PC"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Install App</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none border-t border-slate-900/60">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
