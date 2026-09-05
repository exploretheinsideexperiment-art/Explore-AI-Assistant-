import React, { useState } from 'react';
import { HardwareVariant } from '../types';
import { Cpu, Zap, Activity, Info, Check, SlidersHorizontal, Usb } from 'lucide-react';

interface HardwareViewerProps {
  onNavigateToPinout?: () => void;
  onNavigateToUsbFlash?: () => void;
}

export const HardwareViewer: React.FC<HardwareViewerProps> = ({
  onNavigateToPinout,
  onNavigateToUsbFlash
}) => {
  const [selectedVariant, setSelectedVariant] = useState<HardwareVariant>('ESP32-S3');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyPinout = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const pinTables: Record<HardwareVariant, { module: string; pinName: string; gpio: string; note: string }[]> = {
    'ESP32-S3': [
      { module: 'SSD1306 OLED (I2C)', pinName: 'SDA', gpio: 'GPIO 8', note: 'I2C Data line (4.7kΩ pullup)' },
      { module: 'SSD1306 OLED (I2C)', pinName: 'SCL', gpio: 'GPIO 9', note: 'I2C Clock line' },
      { module: 'INMP441 Mic (I2S)', pinName: 'SCK (BCLK)', gpio: 'GPIO 41', note: 'Bit clock' },
      { module: 'INMP441 Mic (I2S)', pinName: 'WS (LRCK)', gpio: 'GPIO 42', note: 'Word select (Left/Right)' },
      { module: 'INMP441 Mic (I2S)', pinName: 'SD (DATA)', gpio: 'GPIO 40', note: 'Serial audio data in' },
      { module: 'INMP441 Mic (I2S)', pinName: 'L/R', gpio: 'GND', note: 'Select Left channel' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'BCLK', gpio: 'GPIO 15', note: 'I2S Bit clock' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'LRC', gpio: 'GPIO 16', note: 'I2S Word select' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'DIN', gpio: 'GPIO 17', note: 'I2S Audio data out' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'VIN', gpio: '5V (VBUS)', note: '5V recommended for 3.2W output' },
      { module: 'Relay Module (4ch/8ch)', pinName: 'CH1 - CH4', gpio: 'GPIO 4, 5, 6, 7', note: 'Active LOW optoisolated control' },
      { module: 'Push-to-Talk Button', pinName: 'ACTION', gpio: 'GPIO 0', note: 'Active LOW (Internal pullup)' },
      { module: 'Factory Reset Button', pinName: 'RESET', gpio: 'GPIO 47', note: 'Hold 5s to wipe NVS' },
      { module: 'Status LED', pinName: 'LED_STATUS', gpio: 'GPIO 38', note: 'RGB / Builtin status indicator' }
    ],
    'ESP32-WROOM': [
      { module: 'SSD1306 OLED (I2C)', pinName: 'SDA', gpio: 'GPIO 21', note: 'Default I2C Data' },
      { module: 'SSD1306 OLED (I2C)', pinName: 'SCL', gpio: 'GPIO 22', note: 'Default I2C Clock' },
      { module: 'INMP441 Mic (I2S)', pinName: 'SCK (BCLK)', gpio: 'GPIO 14', note: 'I2S0 Clock' },
      { module: 'INMP441 Mic (I2S)', pinName: 'WS (LRCK)', gpio: 'GPIO 15', note: 'I2S0 Word select' },
      { module: 'INMP441 Mic (I2S)', pinName: 'SD (DATA)', gpio: 'GPIO 32', note: 'I2S0 Data in' },
      { module: 'INMP441 Mic (I2S)', pinName: 'L/R', gpio: 'GND', note: 'Left channel ground' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'BCLK', gpio: 'GPIO 26', note: 'I2S1 Bit clock' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'LRC', gpio: 'GPIO 25', note: 'I2S1 Word select' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'DIN', gpio: 'GPIO 27', note: 'I2S1 Audio data out' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'VIN', gpio: '5V', note: '5V rail for clean amplification' },
      { module: 'Relay Module (4ch/8ch)', pinName: 'CH1 - CH4', gpio: 'GPIO 18, 19, 23, 33', note: 'Active LOW optoisolated control' },
      { module: 'Push-to-Talk Button', pinName: 'ACTION', gpio: 'GPIO 0', note: 'Boot button' },
      { module: 'Factory Reset Button', pinName: 'RESET', gpio: 'GPIO 4', note: 'Hold 5s to wipe NVS' },
      { module: 'Status LED', pinName: 'LED_STATUS', gpio: 'GPIO 2', note: 'On-board Blue LED' }
    ],
    'ESP32-C3': [
      { module: 'SSD1306 OLED (I2C)', pinName: 'SDA', gpio: 'GPIO 4', note: 'I2C Data' },
      { module: 'SSD1306 OLED (I2C)', pinName: 'SCL', gpio: 'GPIO 5', note: 'I2C Clock' },
      { module: 'INMP441 Mic (I2S)', pinName: 'SCK (BCLK)', gpio: 'GPIO 6', note: 'Clock' },
      { module: 'INMP441 Mic (I2S)', pinName: 'WS (LRCK)', gpio: 'GPIO 7', note: 'Word select' },
      { module: 'INMP441 Mic (I2S)', pinName: 'SD (DATA)', gpio: 'GPIO 8', note: 'Data in' },
      { module: 'INMP441 Mic (I2S)', pinName: 'L/R', gpio: 'GND', note: 'GND' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'BCLK', gpio: 'GPIO 1', note: 'Bit clock' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'LRC', gpio: 'GPIO 2', note: 'Word select' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'DIN', gpio: 'GPIO 3', note: 'Data out' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'VIN', gpio: '5V', note: '5V rail' },
      { module: 'Relay Module (4ch)', pinName: 'CH1 - CH4', gpio: 'GPIO 18, 19, 20, 21', note: 'Output control pins' },
      { module: 'Push-to-Talk Button', pinName: 'ACTION', gpio: 'GPIO 9', note: 'Boot button' },
      { module: 'Factory Reset Button', pinName: 'RESET', gpio: 'GPIO 0', note: 'Hold 5s' },
      { module: 'Status LED', pinName: 'LED_STATUS', gpio: 'GPIO 10', note: 'Status LED' }
    ],
    'ESP32-CAM': [
      { module: 'SSD1306 OLED (I2C)', pinName: 'SDA', gpio: 'GPIO 13', note: 'Shared with HS2_DATA3' },
      { module: 'SSD1306 OLED (I2C)', pinName: 'SCL', gpio: 'GPIO 15', note: 'Shared with HS2_CMD' },
      { module: 'INMP441 Mic (I2S)', pinName: 'SCK (BCLK)', gpio: 'GPIO 14', note: 'I2S clock' },
      { module: 'INMP441 Mic (I2S)', pinName: 'WS (LRCK)', gpio: 'GPIO 15', note: 'I2S word select' },
      { module: 'INMP441 Mic (I2S)', pinName: 'SD (DATA)', gpio: 'GPIO 13', note: 'Audio input' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'BCLK', gpio: 'GPIO 2', note: 'Bit clock' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'LRC', gpio: 'GPIO 12', note: 'Word select' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'DIN', gpio: 'GPIO 16', note: 'Audio out' },
      { module: 'High-Power Flash LED', pinName: 'FLASH_LED', gpio: 'GPIO 4', note: 'Onboard white LED' }
    ],
    'ESP32-WROVER': [
      { module: 'SSD1306 OLED (I2C)', pinName: 'SDA', gpio: 'GPIO 21', note: 'I2C Data' },
      { module: 'SSD1306 OLED (I2C)', pinName: 'SCL', gpio: 'GPIO 22', note: 'I2C Clock' },
      { module: 'INMP441 Mic (I2S)', pinName: 'SCK (BCLK)', gpio: 'GPIO 14', note: 'Bit clock' },
      { module: 'INMP441 Mic (I2S)', pinName: 'WS (LRCK)', gpio: 'GPIO 15', note: 'Word select' },
      { module: 'INMP441 Mic (I2S)', pinName: 'SD (DATA)', gpio: 'GPIO 32', note: 'Data in' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'BCLK', gpio: 'GPIO 26', note: 'Bit clock' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'LRC', gpio: 'GPIO 25', note: 'Word select' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'DIN', gpio: 'GPIO 27', note: 'Data out' },
      { module: 'Relay Module (8ch)', pinName: 'CH1 - CH8', gpio: 'GPIO 4, 5, 18, 19, 23, 33, 12, 13', note: '8-Channel full automation' }
    ],
    'ESP32-S2': [
      { module: 'SSD1306 OLED (I2C)', pinName: 'SDA', gpio: 'GPIO 8', note: 'I2C Data' },
      { module: 'SSD1306 OLED (I2C)', pinName: 'SCL', gpio: 'GPIO 9', note: 'I2C Clock' },
      { module: 'INMP441 Mic (I2S)', pinName: 'SCK (BCLK)', gpio: 'GPIO 33', note: 'Bit clock' },
      { module: 'INMP441 Mic (I2S)', pinName: 'WS (LRCK)', gpio: 'GPIO 34', note: 'Word select' },
      { module: 'INMP441 Mic (I2S)', pinName: 'SD (DATA)', gpio: 'GPIO 35', note: 'Data in' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'BCLK', gpio: 'GPIO 36', note: 'Bit clock' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'LRC', gpio: 'GPIO 37', note: 'Word select' },
      { module: 'MAX98357A Amp (I2S)', pinName: 'DIN', gpio: 'GPIO 38', note: 'Data out' },
      { module: 'Relay Module (4ch)', pinName: 'CH1 - CH4', gpio: 'GPIO 1, 2, 3, 4', note: '4-Channel relay control' }
    ]
  };

  const currentPins = pinTables[selectedVariant];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Hardware Wiring & Pinout Guide</h3>
            <p className="text-xs text-slate-400">
              Verified GPIO pin mappings configured in <code className="text-cyan-300">firmware/include/pins.h</code>
            </p>
          </div>
        </div>

        {/* Board Variant Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          {(['ESP32-S3', 'ESP32-WROOM', 'ESP32-C3', 'ESP32-CAM', 'ESP32-WROVER', 'ESP32-S2'] as HardwareVariant[]).map((v) => (
            <button
              key={v}
              onClick={() => setSelectedVariant(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                selectedVariant === v
                  ? 'bg-cyan-500 text-slate-950 shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Pinout & Flasher Quick Bar */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-300">
          <span>Need custom GPIOs for displays, microphones, amplifiers, or 4/8-channel relays?</span>
        </div>
        <div className="flex items-center gap-2">
          {onNavigateToPinout && (
            <button
              onClick={onNavigateToPinout}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white border border-cyan-500/30 font-semibold flex items-center gap-1.5 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open Pin Configurator</span>
            </button>
          )}
          {onNavigateToUsbFlash && (
            <button
              onClick={onNavigateToUsbFlash}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 transition shadow-md shadow-cyan-500/20"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>Flash via USB</span>
            </button>
          )}
        </div>
      </div>

      {/* Pinout Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Subsystem Module</th>
              <th className="py-3 px-4">Pin Function</th>
              <th className="py-3 px-4">ESP32 GPIO</th>
              <th className="py-3 px-4">Wiring & Voltage Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {currentPins.map((p, idx) => (
              <tr key={idx} className="hover:bg-slate-850/50 transition">
                <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>{p.module}</span>
                </td>
                <td className="py-3 px-4 font-mono text-cyan-300">{p.pinName}</td>
                <td className="py-3 px-4 font-mono font-bold text-emerald-400">{p.gpio}</td>
                <td className="py-3 px-4 text-slate-400">{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hardware Tips */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <Zap className="w-4 h-4" />
            <span>Power & Noise Suppression Tip</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The MAX98357A amplifier draws up to 800mA peak when driving a 4Ω speaker. Power it from the 5V / VBUS pin rather than 3.3V, and add a 100µF capacitor across its power pins to prevent speaker pops and Wi-Fi resets.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <Activity className="w-4 h-4" />
            <span>INMP441 Microphone Grounding</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Ensure the L/R pin of the INMP441 is firmly soldered to GND. This tells the I2S microphone to transmit samples on the Left channel during the I2S frame clock cycle.
          </p>
        </div>
      </div>
    </div>
  );
};
