import React, { useState } from 'react';
import { 
  Terminal, 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  SlidersHorizontal, 
  Usb,
  Wifi,
  Radio,
  Sparkles,
  Layers,
  Cpu,
  BookOpen
} from 'lucide-react';
import { CustomHardwareProfile, AgentSettings } from '../types';
import { 
  HARDWARE_BOARDS, 
  generatePinsHeader, 
  generateRelayControllerCpp,
  DEFAULT_WIFI_CONFIG,
  DEFAULT_CLOUD_CONFIG
} from '../data/hardwareProfiles';
import { 
  generateUnifiedFirmwareIno, 
  generatePlatformIoIni, 
  generateConfigHeader 
} from '../data/firmwareGenerator';

interface FirmwareBrowserProps {
  profile?: CustomHardwareProfile;
  settings?: AgentSettings;
  onNavigateToPinout?: () => void;
  onNavigateToUsbFlash?: () => void;
  onNavigateToManual?: () => void;
}

export const FirmwareBrowser: React.FC<FirmwareBrowserProps> = ({
  profile,
  settings,
  onNavigateToPinout,
  onNavigateToUsbFlash,
  onNavigateToManual
}) => {
  const activeProfile = profile || HARDWARE_BOARDS['ESP32-S3'].recommendedPreset;
  const boardSpec = HARDWARE_BOARDS[activeProfile.variant] || HARDWARE_BOARDS['ESP32-S3'];

  const [selectedFile, setSelectedFile] = useState('explore_ai_all_in_one.ino');
  const [copied, setCopied] = useState(false);

  // Dynamically compute all files reflecting the active PIN and Wi-Fi/MQTT configuration
  const fileSnippets: Record<string, { code: string; desc: string; isUnified?: boolean }> = {
    'explore_ai_all_in_one.ino': {
      code: generateUnifiedFirmwareIno(activeProfile),
      desc: 'Complete Single-Sketch: Combines all libraries, Wi-Fi, Webhook, MQTT, OLED & Relays',
      isUnified: true
    },
    'firmware/include/pins.h': {
      code: generatePinsHeader(activeProfile),
      desc: `Auto-generated pin definitions for ${activeProfile.boardName}`
    },
    'firmware/include/config.h': {
      code: generateConfigHeader(activeProfile, settings),
      desc: 'Wi-Fi SSIDs, Webhook endpoints, MQTT broker, and audio parameters'
    },
    'firmware/platformio.ini': {
      code: generatePlatformIoIni(activeProfile),
      desc: `PlatformIO environment, build flags, and library dependencies for ${activeProfile.variant}`
    },
    'firmware/src/relay_controller.cpp': {
      code: generateRelayControllerCpp(activeProfile),
      desc: `Relay state management and GPIO initialization for ${activeProfile.relays.channels.length} channels`
    },
    'firmware/src/main.cpp': {
      code: `#include <Arduino.h>
#include "include/config.h"
#include "include/pins.h"
#include "src/display/oled.h"
#include "src/wifi/wifi_manager.h"
#include "src/device/device_manager.h"

// Hardware profile: ${activeProfile.boardName} (${activeProfile.variant})
void setup() {
    Serial.begin(115200);
    delay(100);
    Serial.println("\\n====================================");
    Serial.println("   EXPLORE AI EMBEDDED SYSTEM      ");
    Serial.println("   Board: ${activeProfile.boardName}");
    Serial.println("====================================");

    // Initialize display
    oledDisplay.begin();
    oledDisplay.showFace("BOOTING");

    // Initialize physical buttons
    pinMode(PIN_BUTTON_ACTION, INPUT_PULLUP);
    pinMode(PIN_BUTTON_RESET, INPUT_PULLUP);
    pinMode(PIN_LED_STATUS, OUTPUT);
    digitalWrite(PIN_LED_STATUS, HIGH);

    // Start Wi-Fi & Cloud connections
    wifiManager.begin();
}

void loop() {
    wifiManager.update();   // Maintain Wi-Fi & process MQTT loop
    oledDisplay.update();   // Render facial animation
    
    // Check push to talk button
    if (digitalRead(PIN_BUTTON_ACTION) == LOW) {
        digitalWrite(PIN_LED_STATUS, LOW); // Active pulse
        // Trigger voice capture loop
    } else {
        digitalWrite(PIN_LED_STATUS, HIGH);
    }
    
    delay(5);
}`,
      desc: 'Modular setup and loop execution lifecycle'
    }
  };

  const currentFileData = fileSnippets[selectedFile] || fileSnippets['explore_ai_all_in_one.ino'];
  const currentCode = currentFileData.code;

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCurrentFile = () => {
    const filename = selectedFile.split('/').pop() || 'firmware.ino';
    const isIni = filename.endsWith('.ini');
    const blob = new Blob([currentCode], { type: isIni ? 'text/plain' : 'text/x-c' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllInOneIno = () => {
    const code = generateUnifiedFirmwareIno(activeProfile);
    const blob = new Blob([code], { type: 'text/x-c' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `explore_ai_${activeProfile.variant.toLowerCase()}_unified.ino`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-6xl mx-auto space-y-6">
      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-lg font-bold text-white">Firmware Source & Unified Library Studio</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                LIVE PIN SYNCED
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Combines full hardware PIN definitions, Wi-Fi connectivity, Webhook dispatch, and MQTT messaging with complete embedded libraries.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToPinout && (
            <button
              onClick={onNavigateToPinout}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span>Configure Pins</span>
            </button>
          )}

          {onNavigateToManual && (
            <button
              onClick={onNavigateToManual}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>User Manual</span>
            </button>
          )}

          <button
            onClick={downloadAllInOneIno}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition transform active:scale-95"
            title="Download full combined sketch for Arduino IDE"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>Download .INO Sketch</span>
          </button>

          {onNavigateToUsbFlash && (
            <button
              onClick={onNavigateToUsbFlash}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-cyan-500/20 transform active:scale-95"
            >
              <Usb className="w-4 h-4 text-slate-950" />
              <span>Flash via USB</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Sync Status Card */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-750 flex items-center justify-center text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Target: {activeProfile.boardName} ({activeProfile.variant})</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
              <span>Wi-Fi SSID: <b className="text-cyan-300 font-mono">{(activeProfile.wifi || DEFAULT_WIFI_CONFIG).ssid || 'Unset'}</b></span>
              <span>Relays: <b className="text-cyan-300 font-mono">{activeProfile.relays.channels.length} CH</b></span>
              <span>Display: <b className="text-cyan-300 font-mono">{activeProfile.display.type}</b></span>
              <span>Cloud Protocol: <b className="text-emerald-300 font-mono uppercase">{(activeProfile.cloudIntegration || DEFAULT_CLOUD_CONFIG).protocol}</b></span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 block font-mono">ARDUINO CORE & PLATFORMIO</span>
          <span className="text-xs text-slate-300 font-semibold">Zero-Dependency Easy Flash</span>
        </div>
      </div>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* File Navigator Sidebar */}
        <div className="md:col-span-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Generated Firmware Tree
          </div>

          {Object.entries(fileSnippets).map(([f, data]) => {
            const isSelected = selectedFile === f;
            return (
              <button
                key={f}
                onClick={() => setSelectedFile(f)}
                className={`w-full text-left p-3 rounded-xl text-xs transition border flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between font-mono font-bold">
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="truncate">{f.split('/').pop()}</span>
                  </div>
                  {data.isUnified && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-sans font-bold">
                      ALL-IN-ONE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">
                  {data.desc}
                </p>
              </button>
            );
          })}

          {/* CLI Instructions Card */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1 mt-4">
            <span className="text-cyan-400 text-[10px] font-sans font-bold uppercase tracking-wider block">
              Quick CLI Upload
            </span>
            <div className="space-y-0.5 text-slate-300 text-[10px]">
              <p><span className="text-cyan-400">$</span> pio run -e {activeProfile.variant === 'ESP32-S3' ? 'esp32-s3-devkitc-1' : 'esp32dev'} -t upload</p>
              <p><span className="text-cyan-400">$</span> pio device monitor -b 115200</p>
            </div>
          </div>
        </div>

        {/* Code Content & Header Actions */}
        <div className="md:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-900 gap-2">
            <div className="flex items-center gap-2 truncate font-mono text-xs">
              <span className="text-white font-bold truncate">{selectedFile}</span>
              <span className="text-slate-500 text-[11px] hidden sm:inline">&bull; {currentFileData.desc}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyCode}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={downloadCurrentFile}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          <pre className="p-4 bg-slate-900/60 rounded-xl overflow-x-auto font-mono text-cyan-100/90 text-xs leading-relaxed max-h-[560px] overflow-y-auto">
            {currentCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
