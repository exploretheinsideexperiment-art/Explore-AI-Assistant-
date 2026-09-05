import React, { useState } from 'react';
import { Terminal, FileCode, Copy, Check, Download, ExternalLink, SlidersHorizontal, Usb } from 'lucide-react';

interface FirmwareBrowserProps {
  onNavigateToPinout?: () => void;
  onNavigateToUsbFlash?: () => void;
}

export const FirmwareBrowser: React.FC<FirmwareBrowserProps> = ({
  onNavigateToPinout,
  onNavigateToUsbFlash
}) => {
  const [selectedFile, setSelectedFile] = useState('firmware/include/pins.h');
  const [copied, setCopied] = useState(false);

  const fileSnippets: Record<string, string> = {
    'firmware/platformio.ini': `[platformio]
default_envs = esp32-s3-devkitc-1

[env:esp32-s3-devkitc-1]
platform = espressif32 @ ~6.5.0
board = esp32-s3-devkitc-1
framework = arduino
monitor_speed = 115200
board_build.partitions = default_8MB.csv
build_flags =
    -DARDUINO_USB_MODE=1
    -DARDUINO_USB_CDC_ON_BOOT=1
    -DBOARD_HAS_PSRAM
lib_deps =
    adafruit/Adafruit SSD1306 @ ^2.5.9
    adafruit/Adafruit GFX Library @ ^1.11.9
    bblanchon/ArduinoJson @ ^7.0.4`,

    'firmware/include/pins.h': `#ifndef EXPLORE_AI_PINS_H
#define EXPLORE_AI_PINS_H

// --- ESP32-S3 Pin Configuration ---
#define PIN_I2C_SDA          8
#define PIN_I2C_SCL          9
#define OLED_I2C_ADDRESS     0x3C

// INMP441 I2S Microphone
#define PIN_I2S_MIC_SCK      41  // Bit Clock (BCLK)
#define PIN_I2S_MIC_WS       42  // Word Select (LRCK)
#define PIN_I2S_MIC_SD       40  // Serial Data In (DOUT)

// MAX98357A I2S Amplifier
#define PIN_I2S_SPK_BCLK     15  // Bit Clock
#define PIN_I2S_SPK_LRC      16  // Left/Right Clock (WS)
#define PIN_I2S_SPK_DIN      17  // Serial Data Out (DIN)

// Buttons & Feedback
#define PIN_BUTTON_ACTION    0   // Push-to-Talk (Boot)
#define PIN_BUTTON_RESET     4   // 5s Factory Reset
#define PIN_LED_STATUS       38  // Status Indicator

#endif // EXPLORE_AI_PINS_H`,

    'firmware/include/config.h': `#ifndef EXPLORE_AI_CONFIG_H
#define EXPLORE_AI_CONFIG_H

#define SERIAL_BAUD_RATE         115200
#define WIFI_AP_SSID_DEFAULT     "Explore AI"
#define WIFI_AP_PASS_DEFAULT     ""
#define WIFI_AP_IP               IPAddress(192, 168, 4, 1)
#define DNS_PORT                 53
#define HTTP_PORT                80
#define FACTORY_RESET_HOLD_MS    5000
#define AUDIO_SAMPLE_RATE        16000
#define AUDIO_BITS_PER_SAMPLE    16

#endif // EXPLORE_AI_CONFIG_H`,

    'firmware/src/main.cpp': `#include <Arduino.h>
#include "include/config.h"
#include "include/pins.h"
#include "src/storage/storage.h"
#include "src/display/oled.h"
#include "src/wifi/wifi_manager.h"
#include "src/device/device_manager.h"

void setup() {
    Serial.begin(115200);
    storage.begin();
    oledDisplay.begin();
    deviceManager.begin();
    wifiManager.begin();
}

void loop() {
    deviceManager.update(); // 5s Factory reset
    wifiManager.update();   // Captive portal & backoff
    oledDisplay.update();   // Procedural face animation
    delay(5);
}`,

    'firmware/src/wifi/captive_portal.cpp': `// Captive portal intercepts OS probe endpoints
server.on("/generate_204", [this]() { handleRoot(); });
server.on("/hotspot-detect.html", [this]() { handleRoot(); });
server.on("/ncsi.txt", [this]() { handleRoot(); });
server.on("/scan", [this]() { handleScan(); });
server.on("/connect", HTTP_POST, [this]() { handleConnect(); });
server.on("/status", [this]() { handleStatus(); });`
  };

  const currentCode = fileSnippets[selectedFile] || fileSnippets['firmware/include/pins.h'];

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Firmware Source & Compilation</h3>
            <p className="text-xs text-slate-400">
              All 28 firmware source files created for ESP32 and ESP32-S3.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToPinout && (
            <button
              onClick={onNavigateToPinout}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Configure Pins</span>
            </button>
          )}

          {onNavigateToUsbFlash && (
            <button
              onClick={onNavigateToUsbFlash}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-cyan-500/20"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>Flash via USB</span>
            </button>
          )}

          <button
            onClick={copyCode}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy File'}</span>
          </button>
        </div>
      </div>

      {/* Quick Compilation Commands Banner */}
      <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs">
        <div className="text-slate-400 mb-2 font-sans font-semibold text-[11px] uppercase tracking-wider text-cyan-400">
          PlatformIO CLI Build Commands
        </div>
        <div className="space-y-1 text-slate-300">
          <p><span className="text-cyan-400">$</span> cd firmware</p>
          <p><span className="text-cyan-400">$</span> pio run -e esp32-s3-devkitc-1 <span className="text-slate-500"># Compile for ESP32-S3</span></p>
          <p><span className="text-cyan-400">$</span> pio run -e esp32-s3-devkitc-1 -t upload <span className="text-slate-500"># Flash over USB</span></p>
          <p><span className="text-cyan-400">$</span> pio device monitor -b 115200 <span className="text-slate-500"># Launch 115200 serial monitor</span></p>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* File List */}
        <div className="md:col-span-4 space-y-1.5">
          {Object.keys(fileSnippets).map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFile(f)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition flex items-center gap-2 truncate ${
                selectedFile === f
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{f.split('/').pop()}</span>
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="md:col-span-8 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto font-mono text-xs text-slate-300">
          <div className="text-slate-500 pb-2 mb-2 border-b border-slate-900 flex justify-between items-center text-[10px]">
            <span>{selectedFile}</span>
            <span>C++ / Arduino</span>
          </div>
          <pre className="text-cyan-100/90 leading-relaxed font-mono whitespace-pre">
            {currentCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
