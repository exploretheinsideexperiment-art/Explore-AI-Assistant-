import React from 'react';
import { Cpu, Wifi, Sparkles, Sliders, Monitor, BookOpen, Terminal, Smartphone, Usb, SlidersHorizontal } from 'lucide-react';
import { DeviceInfo } from '../types';

export type ActiveTab = 'console' | 'portal' | 'pinout' | 'usbflash' | 'settings' | 'device' | 'hardware' | 'knowledge' | 'firmware';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  device: DeviceInfo;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  device
}) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'console', label: 'Live Assistant', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'pinout', label: 'Pin Configurator', icon: <SlidersHorizontal className="w-4 h-4 text-cyan-400" />, badge: 'ESP32' },
    { id: 'usbflash', label: 'USB Flasher', icon: <Usb className="w-4 h-4 text-cyan-400" />, badge: 'Upload' },
    { id: 'portal', label: 'Wi-Fi Provisioning', icon: <Wifi className="w-4 h-4" /> },
    { id: 'settings', label: 'Agent Settings', icon: <Sliders className="w-4 h-4" /> },
    { id: 'device', label: 'Device Telemetry', icon: <Cpu className="w-4 h-4" /> },
    { id: 'hardware', label: 'Hardware Wiring', icon: <Monitor className="w-4 h-4" /> },
    { id: 'knowledge', label: 'Knowledge Base', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'firmware', label: 'Firmware Code', icon: <Terminal className="w-4 h-4" /> }
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

          {/* Android PWA Install Pill */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Android PWA Ready</span>
            </div>
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
