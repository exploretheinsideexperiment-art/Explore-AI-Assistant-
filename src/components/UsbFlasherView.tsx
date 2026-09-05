import React, { useState, useEffect, useRef } from 'react';
import { CustomHardwareProfile, FlasherState, FlashProgress } from '../types';
import { usbFlasher, UsbSerialLog } from '../services/usbFlasherService';
import { 
  Usb, 
  Terminal, 
  Play, 
  Download, 
  Copy, 
  Check, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Zap, 
  Sliders, 
  ArrowRight,
  ShieldCheck,
  Send,
  Radio,
  Cpu
} from 'lucide-react';

interface UsbFlasherViewProps {
  profile: CustomHardwareProfile;
  onBackToConfig?: () => void;
}

export const UsbFlasherView: React.FC<UsbFlasherViewProps> = ({
  profile,
  onBackToConfig
}) => {
  const [flasherState, setFlasherState] = useState<FlasherState>('idle');
  const [progress, setProgress] = useState<FlashProgress>({
    percentage: 0,
    bytesWritten: 0,
    totalBytes: 0,
    speedKbps: 0,
    currentFile: ''
  });
  const [baudRate, setBaudRate] = useState<number>(460800);
  const [eraseFlashFirst, setEraseFlashFirst] = useState<boolean>(false);
  const [logs, setLogs] = useState<UsbSerialLog[]>([]);
  const [commandInput, setCommandInput] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copiedCli, setCopiedCli] = useState<boolean>(false);
  const [isSerialConnected, setIsSerialConnected] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const isWebSerialSupported = usbFlasher.isWebSerialSupported();

  // Subscribe to usbFlasher service events
  useEffect(() => {
    const unsubLog = usbFlasher.addLogListener((newLog) => {
      setLogs((prev) => [...prev.slice(-300), newLog]);
    });

    const unsubState = usbFlasher.addStateListener((newState) => {
      setFlasherState(newState);
      if (newState === 'completed' || newState === 'connected') {
        setIsSerialConnected(true);
      }
    });

    const unsubProgress = usbFlasher.addProgressListener((newProgress) => {
      setProgress(newProgress);
    });

    return () => {
      unsubLog();
      unsubState();
      unsubProgress();
    };
  }, []);

  // Auto-scroll terminal strictly inside container
  useEffect(() => {
    if (autoScroll && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle Real USB Flashing
  const handleStartFlashing = async () => {
    setIsSimulating(false);
    setProgress({ percentage: 0, bytesWritten: 0, totalBytes: 0, speedKbps: 0, currentFile: 'Connecting...' });
    await usbFlasher.flashFirmware({
      baudRate,
      eraseFlashFirst,
      profile
    });
  };

  // Handle Simulated USB Flashing (no hardware needed)
  const handleSimulateFlashing = async () => {
    setIsSimulating(true);
    setProgress({ percentage: 0, bytesWritten: 0, totalBytes: 0, speedKbps: 0, currentFile: 'Connecting...' });
    await usbFlasher.simulateFlashing({
      baudRate,
      eraseFlashFirst,
      profile
    });
  };

  // Handle sending serial command
  const handleSendCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim()) return;
    const cmd = commandInput.trim();
    setCommandInput('');
    await usbFlasher.sendCommand(cmd, profile);
  };

  // Send quick command
  const sendQuickCommand = (cmd: string) => {
    usbFlasher.sendCommand(cmd, profile);
  };

  // Clear logs
  const handleClearLogs = () => {
    setLogs([]);
  };

  // Copy CLI flashing command
  const handleCopyCli = () => {
    const cliCmd = `esptool.py --chip ${profile.variant.toLowerCase()} --baud ${baudRate} --before default_reset --after hard_reset write_flash -z 0x1000 bootloader.bin 0x8000 partitions.bin 0x10000 explore_ai_firmware.bin`;
    navigator.clipboard.writeText(cliCmd);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const isFlashingInProgress = 
    flasherState === 'connecting' ||
    flasherState === 'syncing' ||
    flasherState === 'erasing' ||
    flasherState === 'flashing' ||
    flasherState === 'verifying';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner: Overview & Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                USB Web Flasher & Serial Engine
              </span>
              <span className="text-xs text-slate-400">&bull; Web Serial API (Chrome / Edge / Opera)</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Usb className="w-6 h-6 text-cyan-400" />
              <span>Upload Firmware to {profile.boardName}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Connect your ESP32 board via USB cable to compile, flash, and verify the custom firmware with your configured INMP441, MAX98357A, Display, and 4/8-channel Relay pins.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onBackToConfig && (
              <button
                onClick={onBackToConfig}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition"
              >
                &larr; Back to Pinout
              </button>
            )}

            <button
              onClick={() => usbFlasher.downloadFirmwarePackage(profile)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Download Firmware Bundle</span>
            </button>
          </div>
        </div>

        {/* Browser Web Serial Support Notice */}
        {!isWebSerialSupported ? (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Web Serial API Not Detected in this Browser:</div>
              <p className="text-[11px] leading-relaxed opacity-90">
                Direct USB flashing requires Google Chrome, Microsoft Edge, or Opera over HTTPS. You can still test with the <strong className="text-white">"Simulated USB Flash Test"</strong> button below, or download the firmware package to flash using PlatformIO / esptool.py.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Web Serial API Available &bull; Ready to connect USB-to-UART or Native ESP32-S3 CDC</span>
            </div>
            <a
              href={window.location.href}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Open in dedicated window</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Flasher Controls & Action Bar */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          {/* Baud Rate Selector */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Flashing Baud Rate:
            </label>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(parseInt(e.target.value, 10))}
              disabled={isFlashingInProgress}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              <option value={115200}>115,200 baud (Safe / Long Cables)</option>
              <option value={460800}>460,800 baud (Recommended / Fast)</option>
              <option value={921600}>921,600 baud (Ultra Fast)</option>
            </select>
          </div>

          {/* Erase flash checkbox */}
          <div className="md:col-span-3 flex items-center h-10">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={eraseFlashFirst}
                onChange={(e) => setEraseFlashFirst(e.target.checked)}
                disabled={isFlashingInProgress}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500"
              />
              <span>Full Chip Erase before Upload</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-3">
            <button
              onClick={handleSimulateFlashing}
              disabled={isFlashingInProgress}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
            >
              <Play className="w-4 h-4 text-cyan-400" />
              <span>Simulated Flash Test</span>
            </button>

            <button
              onClick={handleStartFlashing}
              disabled={isFlashingInProgress}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition transform active:scale-95 shadow-lg ${
                isFlashingInProgress
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/25'
              }`}
            >
              {isFlashingInProgress ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Flashing {progress.percentage}%...</span>
                </>
              ) : (
                <>
                  <Usb className="w-4 h-4 text-slate-950" />
                  <span>Connect & Flash ESP32</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar & Stage Status */}
        {flasherState !== 'idle' && (
          <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  flasherState === 'completed' ? 'bg-emerald-400' :
                  flasherState === 'error' ? 'bg-rose-400' :
                  'bg-cyan-400 animate-ping'
                }`} />
                <span className="font-bold uppercase text-cyan-300 tracking-wider">
                  State: {flasherState}
                </span>
                {isSimulating && (
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">
                    SIMULATION
                  </span>
                )}
              </div>
              <div className="text-slate-400">
                {progress.currentFile && <span>Writing {progress.currentFile} &bull; </span>}
                <span>{Math.round(progress.bytesWritten / 1024)} KB / {Math.round(progress.totalBytes / 1024)} KB</span>
                <span className="text-cyan-400 ml-2">({progress.percentage}%)</span>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-150 ${
                  flasherState === 'completed'
                    ? 'bg-emerald-500'
                    : flasherState === 'error'
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Interactive USB Serial Terminal / Monitor */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Live USB Serial Terminal & Monitor</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-400">Direct bi-directional UART console at 115200 baud</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer mr-2">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-cyan-500"
              />
              <span>Auto-Scroll</span>
            </label>

            <button
              onClick={handleClearLogs}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Clear terminal logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Diagnostic Test Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] font-mono text-slate-400">Test Commands:</span>
          <button
            onClick={() => sendQuickCommand('status')}
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-mono text-[11px] transition"
          >
            status
          </button>
          <button
            onClick={() => sendQuickCommand('test_audio')}
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-mono text-[11px] transition"
          >
            test_audio (MAX98357A)
          </button>
          <button
            onClick={() => sendQuickCommand('test_mic')}
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-mono text-[11px] transition"
          >
            test_mic (INMP441)
          </button>
          <button
            onClick={() => sendQuickCommand('test_display')}
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-mono text-[11px] transition"
          >
            test_display
          </button>
          {profile.relays.mode !== 'none' && (
            <>
              <button
                onClick={() => sendQuickCommand('relay 1 on')}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-mono text-[11px] transition"
              >
                relay 1 on
              </button>
              <button
                onClick={() => sendQuickCommand('relay 1 off')}
                className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-mono text-[11px] transition"
              >
                relay 1 off
              </button>
            </>
          )}
          <button
            onClick={() => sendQuickCommand('reboot')}
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 font-mono text-[11px] transition"
          >
            reboot
          </button>
        </div>

        {/* Monospace Console Body */}
        <div ref={terminalContainerRef} className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs h-80 overflow-y-auto space-y-1 scrollbar-thin">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic py-10 text-center">
              Serial console idle. Click "Connect & Flash ESP32" or "Simulated Flash Test" to start stream.
            </div>
          ) : (
            logs.map((log) => {
              let color = 'text-slate-300';
              let badge = 'LOG';
              if (log.type === 'success') { color = 'text-emerald-400'; badge = 'OK'; }
              if (log.type === 'warn') { color = 'text-amber-400'; badge = 'WARN'; }
              if (log.type === 'error') { color = 'text-rose-400'; badge = 'ERR'; }
              if (log.type === 'tx') { color = 'text-cyan-300'; badge = 'TX'; }
              if (log.type === 'rx') { color = 'text-cyan-100'; badge = 'RX'; }

              return (
                <div key={log.id} className="flex items-start gap-2.5 leading-relaxed font-mono">
                  <span className="text-[10px] text-slate-600 shrink-0 select-none">
                    [{log.timestamp}]
                  </span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-bold shrink-0 select-none ${
                    log.type === 'tx' ? 'bg-cyan-500/20 text-cyan-300' :
                    log.type === 'rx' ? 'bg-blue-500/20 text-blue-300' :
                    log.type === 'error' ? 'bg-rose-500/20 text-rose-300' :
                    log.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {badge}
                  </span>
                  <span className={`${color} whitespace-pre-wrap break-all`}>
                    {log.text}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Command Input Bar */}
        <form onSubmit={handleSendCommand} className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-cyan-400 font-mono text-xs font-bold">$</span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Send serial command to ESP32 (e.g. status, relay 1 on, test_audio, reboot)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* CLI / Local Developer Command Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Prefer command-line flashing? Use Espressif esptool.py:</span>
          </div>
          <button
            onClick={handleCopyCli}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCli ? 'Copied Command!' : 'Copy CLI Command'}</span>
          </button>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-xs text-cyan-300/90 overflow-x-auto select-all">
          esptool.py --chip {profile.variant.toLowerCase()} --baud {baudRate} --before default_reset --after hard_reset write_flash -z {profile.variant === 'ESP32-S3' ? '0x0000' : '0x1000'} bootloader.bin 0x8000 partitions.bin 0x10000 explore_ai_firmware.bin
        </div>
      </div>
    </div>
  );
};
