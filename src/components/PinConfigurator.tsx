import React, { useState } from 'react';
import { 
  CustomHardwareProfile, 
  HardwareVariant, 
  DisplayType, 
  RelayMode, 
  RelayLogic,
  PinConflict 
} from '../types';
import { 
  HARDWARE_BOARDS, 
  DISPLAY_MODELS, 
  validateHardwareProfile,
  generatePinsHeader,
  generateRelayControllerCpp
} from '../data/hardwareProfiles';
import { 
  Cpu, 
  Mic, 
  Volume2, 
  Monitor, 
  ToggleLeft, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Download, 
  FileCode, 
  UploadCloud, 
  Zap, 
  ShieldAlert, 
  Info,
  Power
} from 'lucide-react';

interface PinConfiguratorProps {
  profile: CustomHardwareProfile;
  onChangeProfile: (updated: CustomHardwareProfile) => void;
  onOpenUsbFlasher: () => void;
}

export const PinConfigurator: React.FC<PinConfiguratorProps> = ({
  profile,
  onChangeProfile,
  onOpenUsbFlasher
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'mic' | 'amp' | 'display' | 'relays' | 'controls'>('mic');
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const boardSpec = HARDWARE_BOARDS[profile.variant];
  const conflicts = validateHardwareProfile(profile);
  const hasErrors = conflicts.some(c => c.severity === 'error');

  // Handle board variant change
  const handleVariantChange = (variant: HardwareVariant) => {
    const newBoard = HARDWARE_BOARDS[variant];
    onChangeProfile(JSON.parse(JSON.stringify(newBoard.recommendedPreset)));
  };

  // Reset to factory defaults
  const handleResetToDefaults = () => {
    const newBoard = HARDWARE_BOARDS[profile.variant];
    onChangeProfile(JSON.parse(JSON.stringify(newBoard.recommendedPreset)));
  };

  // Update INMP441 Microphone
  const updateMic = (partial: Partial<CustomHardwareProfile['mic']>) => {
    onChangeProfile({
      ...profile,
      mic: { ...profile.mic, ...partial }
    });
  };

  // Update MAX98357A Amplifier
  const updateAmp = (partial: Partial<CustomHardwareProfile['amp']>) => {
    onChangeProfile({
      ...profile,
      amp: { ...profile.amp, ...partial }
    });
  };

  // Update Display
  const handleDisplayTypeChange = (type: DisplayType) => {
    const model = DISPLAY_MODELS[type];
    const isI2c = model.interfaceType === 'I2C';
    onChangeProfile({
      ...profile,
      display: {
        type,
        sda: model.defaultPins.sda,
        scl: model.defaultPins.scl,
        i2cAddress: '0x3C',
        i2cFreqKhz: 400,
        mosi: model.defaultPins.mosi,
        sclk: model.defaultPins.sclk,
        cs: model.defaultPins.cs,
        dc: model.defaultPins.dc,
        rst: model.defaultPins.rst,
        blk: model.defaultPins.blk,
        width: type.includes('320') ? 320 : type.includes('240') ? 240 : 128,
        height: type.includes('32') ? 32 : type.includes('240') ? 240 : 64
      }
    });
  };

  const updateDisplay = (partial: Partial<CustomHardwareProfile['display']>) => {
    onChangeProfile({
      ...profile,
      display: { ...profile.display, ...partial }
    });
  };

  // Update Relay Module
  const handleRelayModeChange = (mode: RelayMode) => {
    let channels = profile.relays.channels;
    if (mode === 'none') {
      channels = [];
    } else if (mode === '4ch') {
      const gpios = profile.variant === 'ESP32-S3' ? [4, 5, 6, 7] : [18, 19, 23, 33];
      channels = [
        { id: 1, name: 'Living Room Light', gpio: gpios[0], state: false },
        { id: 2, name: 'Kitchen Light', gpio: gpios[1], state: false },
        { id: 3, name: 'Ceiling Fan', gpio: gpios[2], state: false },
        { id: 4, name: 'Smart Outlet', gpio: gpios[3], state: false }
      ];
    } else if (mode === '8ch') {
      const gpios = profile.variant === 'ESP32-S3' 
        ? [4, 5, 6, 7, 10, 11, 12, 13] 
        : [4, 5, 18, 19, 23, 33, 12, 13];
      channels = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        name: `Relay CH${i + 1}`,
        gpio: gpios[i] ?? (10 + i),
        state: false
      }));
    }

    onChangeProfile({
      ...profile,
      relays: {
        ...profile.relays,
        mode,
        channels
      }
    });
  };

  const updateRelayChannel = (id: number, partial: Partial<CustomHardwareProfile['relays']['channels'][0]>) => {
    const updatedChannels = profile.relays.channels.map(ch => 
      ch.id === id ? { ...ch, ...partial } : ch
    );
    onChangeProfile({
      ...profile,
      relays: {
        ...profile.relays,
        channels: updatedChannels
      }
    });
  };

  const toggleRelayState = (id: number) => {
    updateRelayChannel(id, {
      state: !profile.relays.channels.find(c => c.id === id)?.state
    });
  };

  const handleDownloadPinsHeader = () => {
    const code = generatePinsHeader(profile);
    const blob = new Blob([code], { type: 'text/x-c' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pins_${profile.variant.toLowerCase()}.h`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyGeneratedCode = () => {
    const code = generatePinsHeader(profile);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const allGpios = boardSpec.usableGpios;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner: Board Selection & Main Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Hardware Configuration Studio
              </span>
              <span className="text-xs text-slate-400">&bull; Microcontroller & Peripheral Matrix</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Cpu className="w-6 h-6 text-cyan-400" />
              <span>Select ESP32 Board & Pin Connections</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Configure tailored GPIO pins for INMP441 Microphone, MAX98357A I2S Amplifier, Displays, and 4/8-Channel Relays. All pins are auto-validated against bus collisions and chip-specific hardware constraints.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleResetToDefaults}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Reset to factory verified pinout for this board"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Load Board Defaults</span>
            </button>

            <button
              onClick={() => setShowCodePreview(!showCodePreview)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>{showCodePreview ? 'Hide C++ Code' : 'Preview pins.h'}</span>
            </button>

            <button
              onClick={handleDownloadPinsHeader}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export pins.h</span>
            </button>

            <button
              onClick={onOpenUsbFlasher}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition transform active:scale-95"
            >
              <UploadCloud className="w-4 h-4 text-slate-950" />
              <span>Upload via USB</span>
            </button>
          </div>
        </div>

        {/* Board Variant Selector Cards */}
        <div className="mt-6">
          <label className="text-xs font-semibold text-slate-300 block mb-2.5">
            1. Select ESP32 Microcontroller Module:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(Object.keys(HARDWARE_BOARDS) as HardwareVariant[]).map((v) => {
              const spec = HARDWARE_BOARDS[v];
              const isSelected = profile.variant === v;
              return (
                <button
                  key={v}
                  onClick={() => handleVariantChange(v)}
                  className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/60 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                        {v}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {spec.cpuArchitecture.split('@')[0]}
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{spec.flashSizeDefaultMb}MB Flash</span>
                    <span className={spec.hasPsramDefault ? 'text-emerald-400' : 'text-slate-500'}>
                      {spec.hasPsramDefault ? '+PSRAM' : 'No PSRAM'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Board Specs Pill */}
          <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-white">{boardSpec.name}</span>
              <span className="text-slate-500 font-mono text-[11px]">| {boardSpec.usbType}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              <span className="text-slate-500">Note: </span>
              <span>{boardSpec.notes}</span>
            </div>
          </div>
        </div>

        {/* Pin Conflict & Safety Auditor */}
        {conflicts.length > 0 && (
          <div className="mt-5 space-y-2">
            {conflicts.map((conf, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border flex items-start gap-3 text-xs ${
                  conf.severity === 'error'
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                }`}
              >
                {conf.severity === 'error' ? (
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">
                    {conf.severity === 'error' ? 'Pin Conflict Detected:' : 'Strapping / Hardware Caution:'}
                  </div>
                  <p className="mt-0.5 text-[11px] opacity-90">{conf.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Code Preview Drawer if opened */}
      {showCodePreview && (
        <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <FileCode className="w-4 h-4" />
              <span>Tailored C++ Header (firmware/include/pins.h)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyGeneratedCode}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition"
              >
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>
          <pre className="p-4 bg-slate-900 rounded-xl overflow-x-auto text-cyan-200/90 text-[11px] leading-relaxed max-h-80 overflow-y-auto">
            {generatePinsHeader(profile)}
          </pre>
        </div>
      )}

      {/* Navigation Sub-Tabs for Peripherals */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('mic')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'mic'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Mic className="w-4 h-4 text-cyan-400" />
          <span>INMP441 Microphone (I2S)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('amp')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'amp'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <span>MAX98357A Amplifier (I2S)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('display')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'display'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Monitor className="w-4 h-4 text-cyan-400" />
          <span>Display Modules (OLED/TFT)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('relays')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'relays'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ToggleLeft className="w-4 h-4 text-cyan-400" />
          <span>Relay Modules (4ch & 8ch)</span>
          {profile.relays.mode !== 'none' && (
            <span className="px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-200 text-[10px] font-mono">
              {profile.relays.mode.toUpperCase()}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('controls')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeSubTab === 'controls'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Power className="w-4 h-4 text-cyan-400" />
          <span>Buttons & Status LED</span>
        </button>
      </div>

      {/* Sub-Tab 1: INMP441 Microphone Pin Connection */}
      {activeSubTab === 'mic' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">INMP441 Digital MEMS Microphone</h3>
                  <p className="text-xs text-slate-400">High precision I2S digital audio recording</p>
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                16kHz 16-Bit Mono
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* SCK / BCLK */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  SCK / BCLK (Bit Clock):
                </label>
                <select
                  value={profile.mic.bclk}
                  onChange={(e) => updateMic({ bclk: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                >
                  {allGpios.map((g) => (
                    <option key={g} value={g}>GPIO {g}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Audio clock generator from ESP32</span>
              </div>

              {/* WS / LRCK */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  WS / LRCK (Word Select):
                </label>
                <select
                  value={profile.mic.ws}
                  onChange={(e) => updateMic({ ws: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                >
                  {allGpios.map((g) => (
                    <option key={g} value={g}>GPIO {g}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Left / Right framing clock</span>
              </div>

              {/* SD / DOUT */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  SD / DOUT (Serial Audio Data):
                </label>
                <select
                  value={profile.mic.sd}
                  onChange={(e) => updateMic({ sd: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                >
                  {allGpios.map((g) => (
                    <option key={g} value={g}>GPIO {g}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Microphone data stream into ESP32</span>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  L/R Pin Channel Select:
                </label>
                <select
                  value={profile.mic.channel}
                  onChange={(e) => updateMic({ channel: e.target.value as 'left' | 'right' })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="left">Left Channel (L/R Pin connected to GND)</option>
                  <option value="right">Right Channel (L/R Pin connected to 3.3V)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Recommended: Left (wire L/R to GND)</span>
              </div>
            </div>

            {/* Hardware Hookup Diagram Card */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Physical Wiring Pinout Table (INMP441 ➔ {profile.variant})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">VDD:</span> <strong className="text-rose-400">3.3V</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">GND:</span> <strong className="text-slate-300">GND</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">L/R:</span> <strong className="text-emerald-400">{profile.mic.channel === 'left' ? 'GND (Left)' : '3.3V (Right)'}</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">SCK:</span> <strong className="text-cyan-300">GPIO {profile.mic.bclk}</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">WS:</span> <strong className="text-cyan-300">GPIO {profile.mic.ws}</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">SD:</span> <strong className="text-cyan-300">GPIO {profile.mic.sd}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>INMP441 Hardware Engineering Notes</span>
            </h4>
            <ul className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>No Analog Noise:</strong> Because the INMP441 converts sound directly to a 24-bit/16-bit I2S digital bitstream at the microphone capsule, it is completely immune to electromagnetic hum and RF interference from Wi-Fi transmissions.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Acoustic Port:</strong> The microphone sound hole is located on the <em>underside</em> of the module PCB. Mount with the acoustic port unobstructed facing forward.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>I2S Clock Sync:</strong> On ESP32, I2S0 peripheral generates the BCLK and WS clocks in master transmitter mode and samples SD on clock edges without CPU overhead using DMA.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: MAX98357A Amplifier Pin Connection */}
      {activeSubTab === 'amp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">MAX98357A I2S Class D Amplifier</h3>
                  <p className="text-xs text-slate-400">3.2W digital audio DAC & speaker amplifier</p>
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700">
                3.2W into 4Ω
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* BCLK */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  BCLK (Bit Clock):
                </label>
                <select
                  value={profile.amp.bclk}
                  onChange={(e) => updateAmp({ bclk: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                >
                  {allGpios.map((g) => (
                    <option key={g} value={g}>GPIO {g}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Serial bit clock from ESP32</span>
              </div>

              {/* LRC */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  LRC / LRCLK (Word Select):
                </label>
                <select
                  value={profile.amp.lrc}
                  onChange={(e) => updateAmp({ lrc: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                >
                  {allGpios.map((g) => (
                    <option key={g} value={g}>GPIO {g}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Left/Right channel clock</span>
              </div>

              {/* DIN */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  DIN (Audio Data Input):
                </label>
                <select
                  value={profile.amp.din}
                  onChange={(e) => updateAmp({ din: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                >
                  {allGpios.map((g) => (
                    <option key={g} value={g}>GPIO {g}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Digital audio data output from ESP32</span>
              </div>

              {/* GAIN */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Hardware Gain Preset:
                </label>
                <select
                  value={profile.amp.gainDb}
                  onChange={(e) => updateAmp({ gainDb: parseInt(e.target.value, 10) as 3|6|9|12|15 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value={12}>+12 dB (GAIN connected to GND - Default / Recommended)</option>
                  <option value={15}>+15 dB (GAIN pin Floating / Unconnected)</option>
                  <option value={9}>+9 dB (GAIN connected to VDD through 100kΩ)</option>
                  <option value={6}>+6 dB (GAIN connected to GND through 100kΩ)</option>
                  <option value={3}>+3 dB (GAIN connected directly to VDD)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">Controls output amplification level</span>
              </div>
            </div>

            {/* Hardware Hookup Diagram Card */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Physical Wiring Pinout Table (MAX98357A ➔ {profile.variant})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">VIN:</span> <strong className="text-amber-400">5V (VBUS / 5V Rail)</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">GND:</span> <strong className="text-slate-300">GND</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">GAIN:</span> <strong className="text-emerald-400">{profile.amp.gainDb === 12 ? 'GND (+12dB)' : 'Floating'}</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">BCLK:</span> <strong className="text-cyan-300">GPIO {profile.amp.bclk}</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">LRC:</span> <strong className="text-cyan-300">GPIO {profile.amp.lrc}</strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">DIN:</span> <strong className="text-cyan-300">GPIO {profile.amp.din}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Speaker Wiring & Power Best Practices</span>
            </h4>
            <ul className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>5V Power Rail:</strong> Always power the MAX98357A from 5V (USB VBUS), NOT from the 3.3V LDO regulator. 5V allows the full 3.2W output into a 4Ω speaker without causing brownout resets on the ESP32.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Speaker Impedance:</strong> Connect a 4Ω or 8Ω speaker directly across the <code className="text-cyan-300">+</code> and <code className="text-cyan-300">-</code> screw terminals or solder pads. Do not tie either speaker wire to ground!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Buffer Underrun Prevention:</strong> FreeRTOS tasks stream audio via DMA ping-pong buffers for seamless speech synthesis without popping or stuttering.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Display Modules (Different Types) */}
      {activeSubTab === 'display' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Display Module Configuration</h3>
                  <p className="text-xs text-slate-400">Choose between OLED, IPS, and TFT color screens</p>
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                {profile.display.width} × {profile.display.height}
              </span>
            </div>

            {/* Display Model Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Select Display Hardware Type:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(DISPLAY_MODELS) as DisplayType[]).map((dType) => {
                  const model = DISPLAY_MODELS[dType];
                  const isSelected = profile.display.type === dType;
                  return (
                    <button
                      key={dType}
                      onClick={() => handleDisplayTypeChange(dType)}
                      className={`p-3 rounded-xl text-left border transition ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/60 ring-1 ring-cyan-500/40 text-cyan-200'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono">{model.resolution}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {model.interfaceType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 truncate">{model.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Pin Fields depending on I2C vs SPI */}
            {profile.display.type.includes('I2C') ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>I2C Bus Wiring (2-Wire Interface)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      SDA (I2C Data):
                    </label>
                    <select
                      value={profile.display.sda}
                      onChange={(e) => updateDisplay({ sda: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300"
                    >
                      {allGpios.map((g) => (
                        <option key={g} value={g}>GPIO {g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      SCL (I2C Clock):
                    </label>
                    <select
                      value={profile.display.scl}
                      onChange={(e) => updateDisplay({ scl: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300"
                    >
                      {allGpios.map((g) => (
                        <option key={g} value={g}>GPIO {g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      I2C Hex Address:
                    </label>
                    <select
                      value={profile.display.i2cAddress}
                      onChange={(e) => updateDisplay({ i2cAddress: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                    >
                      <option value="0x3C">0x3C (Default on 99% of OLEDs)</option>
                      <option value="0x3D">0x3D (Alternative address / jumper)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Bus Clock Speed:
                    </label>
                    <select
                      value={profile.display.i2cFreqKhz}
                      onChange={(e) => updateDisplay({ i2cFreqKhz: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                    >
                      <option value={400}>400 kHz (Fast Mode - Smooth Face Animation)</option>
                      <option value={100}>100 kHz (Standard Mode - Long Wire Stability)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>SPI Bus Wiring (High Refresh Color Display)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">MOSI (Data):</label>
                    <select
                      value={profile.display.mosi}
                      onChange={(e) => updateDisplay({ mosi: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-cyan-300"
                    >
                      {allGpios.map((g) => (<option key={g} value={g}>GPIO {g}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">SCLK (Clock):</label>
                    <select
                      value={profile.display.sclk}
                      onChange={(e) => updateDisplay({ sclk: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-cyan-300"
                    >
                      {allGpios.map((g) => (<option key={g} value={g}>GPIO {g}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">CS (Chip Select):</label>
                    <select
                      value={profile.display.cs}
                      onChange={(e) => updateDisplay({ cs: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-cyan-300"
                    >
                      {allGpios.map((g) => (<option key={g} value={g}>GPIO {g}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">DC (Data/Command):</label>
                    <select
                      value={profile.display.dc}
                      onChange={(e) => updateDisplay({ dc: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-cyan-300"
                    >
                      {allGpios.map((g) => (<option key={g} value={g}>GPIO {g}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">RST (Reset):</label>
                    <select
                      value={profile.display.rst}
                      onChange={(e) => updateDisplay({ rst: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-cyan-300"
                    >
                      {allGpios.map((g) => (<option key={g} value={g}>GPIO {g}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">BLK (Backlight):</label>
                    <select
                      value={profile.display.blk}
                      onChange={(e) => updateDisplay({ blk: parseInt(e.target.value, 10) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-cyan-300"
                    >
                      {allGpios.map((g) => (<option key={g} value={g}>GPIO {g}</option>))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Monitor className="w-4 h-4 text-cyan-400" />
              <span>Simulated Face Screen Preview</span>
            </h4>
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center">
              <div 
                className="bg-black border-2 border-cyan-500/40 rounded-xl p-4 flex flex-col items-center justify-center shadow-inner relative overflow-hidden"
                style={{
                  width: profile.display.type.includes('32') ? '220px' : '260px',
                  height: profile.display.type.includes('32') ? '90px' : '150px'
                }}
              >
                {/* Eyes simulation */}
                <div className="flex items-center gap-8 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50" />
                  <div className="w-8 h-8 rounded-lg bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50" />
                </div>
                {/* Smile / Mouth */}
                <div className="w-12 h-2 rounded-full bg-cyan-400/80" />
                <div className="absolute bottom-1 right-2 text-[9px] font-mono text-cyan-500/60">
                  {profile.display.width}x{profile.display.height}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 text-center">
                Procedural vector face reacts live to wake-word detection, LLM reasoning, speech output, and relay state changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Relay Module (4-Channel & 8-Channel) */}
      {activeSubTab === 'relays' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <ToggleLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Relay Automation Module (4ch & 8ch)</h3>
                <p className="text-xs text-slate-400">Control AC mains, lights, pumps, appliances via voice & serial commands</p>
              </div>
            </div>

            {/* Relay Mode Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              {(['none', '4ch', '8ch'] as RelayMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleRelayModeChange(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                    profile.relays.mode === m
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'none' ? 'Disabled' : m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {profile.relays.mode === 'none' ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
              <ToggleLeft className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">Relay Module is currently disabled</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Select <strong className="text-cyan-400">4CH</strong> or <strong className="text-cyan-400">8CH</strong> above to configure optocoupler relay control pins, custom appliance names, and live toggle controls.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Relay Trigger Logic Selection */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="text-xs font-bold text-white block">Relay Trigger Logic:</label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Most blue Songle relay boards use optoisolators triggered when the pin is pulled LOW (0V).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onChangeProfile({ ...profile, relays: { ...profile.relays, logic: 'active_low' } })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                      profile.relays.logic === 'active_low'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Active LOW (0V = ON) - Standard
                  </button>
                  <button
                    onClick={() => onChangeProfile({ ...profile, relays: { ...profile.relays, logic: 'active_high' } })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                      profile.relays.logic === 'active_high'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Active HIGH (3.3V = ON)
                  </button>
                </div>
              </div>

              {/* Grid of Relay Channels */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {profile.relays.channels.map((channel) => (
                  <div
                    key={channel.id}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                      channel.state
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          RELAY CH{channel.id}
                        </span>
                        <button
                          onClick={() => toggleRelayState(channel.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition ${
                            channel.state
                              ? 'bg-emerald-500 text-slate-950 animate-pulse'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {channel.state ? 'ACTIVE ON' : 'OFF'}
                        </button>
                      </div>

                      {/* Name input */}
                      <input
                        type="text"
                        value={channel.name}
                        onChange={(e) => updateRelayChannel(channel.id, { name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 mb-3"
                        placeholder="Appliance Name"
                      />

                      {/* GPIO Selector */}
                      <div>
                        <label className="text-[10px] font-mono text-slate-400 block mb-1">
                          Control GPIO Pin:
                        </label>
                        <select
                          value={channel.gpio}
                          onChange={(e) => updateRelayChannel(channel.id, { gpio: parseInt(e.target.value, 10) })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-300"
                        >
                          {allGpios.map((g) => (
                            <option key={g} value={g}>GPIO {g}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Interactive Live Toggle Switch */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Live Switch Test:</span>
                      <button
                        onClick={() => toggleRelayState(channel.id)}
                        className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                          channel.state ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            channel.state ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Master Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="text-slate-400">
                  <span>Voice Control Integration: Say </span>
                  <code className="text-cyan-300">"Turn on {profile.relays.channels[0]?.name || 'Light'}"</code>
                  <span> or use Serial command </span>
                  <code className="text-cyan-300">relay 1 on</code>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const updated = profile.relays.channels.map(c => ({ ...c, state: true }));
                      onChangeProfile({ ...profile, relays: { ...profile.relays, channels: updated } });
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition"
                  >
                    All Relays ON
                  </button>
                  <button
                    onClick={() => {
                      const updated = profile.relays.channels.map(c => ({ ...c, state: false }));
                      onChangeProfile({ ...profile, relays: { ...profile.relays, channels: updated } });
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition"
                  >
                    All Relays OFF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 5: Physical Buttons & Status LED */}
      {activeSubTab === 'controls' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Physical Buttons & Feedback Indicators</h3>
              <p className="text-xs text-slate-400">Push-to-talk button, factory reset wipe switch, and status LED</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Push to talk button */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-white block">
                Push-to-Talk / Action Button:
              </label>
              <select
                value={profile.controls.actionButton}
                onChange={(e) => onChangeProfile({
                  ...profile,
                  controls: { ...profile.controls, actionButton: parseInt(e.target.value, 10) }
                })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300"
              >
                {allGpios.map((g) => (
                  <option key={g} value={g}>GPIO {g} {g === 0 ? '(BOOT Button)' : ''}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Trigger voice query when pressed. Default is GPIO 0 (onboard BOOT button).
              </p>
            </div>

            {/* Reset button */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-white block">
                Factory Reset Hold Button:
              </label>
              <select
                value={profile.controls.resetButton}
                onChange={(e) => onChangeProfile({
                  ...profile,
                  controls: { ...profile.controls, resetButton: parseInt(e.target.value, 10) }
                })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300"
              >
                {allGpios.map((g) => (
                  <option key={g} value={g}>GPIO {g}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Holding for 5 seconds erases saved Wi-Fi credentials from Non-Volatile Storage (NVS).
              </p>
            </div>

            {/* Status LED */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-white block">
                System Status Indicator LED:
              </label>
              <select
                value={profile.controls.statusLed}
                onChange={(e) => onChangeProfile({
                  ...profile,
                  controls: { ...profile.controls, statusLed: parseInt(e.target.value, 10) }
                })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300"
              >
                {allGpios.map((g) => (
                  <option key={g} value={g}>GPIO {g}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Blinks during SoftAP Wi-Fi provisioning, pulses during LLM voice playback.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>Ready to flash {profile.boardName}</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {conflicts.length === 0 
              ? 'All selected GPIO pins are valid, conflict-free, and matched to chip specifications.'
              : `${conflicts.length} pin conflicts detected. Please resolve errors before flashing.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenUsbFlasher}
            disabled={hasErrors}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition transform shadow-lg ${
              hasErrors
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25 active:scale-95'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Proceed to USB Flasher</span>
          </button>
        </div>
      </div>
    </div>
  );
};
