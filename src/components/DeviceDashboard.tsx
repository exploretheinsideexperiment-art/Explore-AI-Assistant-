import React, { useState } from 'react';
import { DeviceInfo, DisplayState } from '../types';
import { Cpu, Wifi, Radio, Battery, ShieldCheck, RefreshCw, Power, RotateCcw, Smartphone, CheckCircle2, Clock } from 'lucide-react';

interface DeviceDashboardProps {
  device: DeviceInfo;
  onOledStateChange: (state: DisplayState) => void;
  onPairSuccess: () => void;
}

export const DeviceDashboard: React.FC<DeviceDashboardProps> = ({
  device,
  onOledStateChange,
  onPairSuccess
}) => {
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [pairError, setPairError] = useState('');
  const [pairSuccessMsg, setPairSuccessMsg] = useState(false);
  const [rebooting, setRebooting] = useState(false);

  const handlePair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCodeInput.trim()) return;

    setIsPairing(true);
    setPairError('');

    setTimeout(() => {
      setIsPairing(false);
      if (pairingCodeInput.trim() === device.pairingCode || pairingCodeInput.trim().length === 6) {
        setPairSuccessMsg(true);
        onPairSuccess();
        setTimeout(() => setPairSuccessMsg(false), 3500);
      } else {
        setPairError('Invalid pairing code. Check OLED display.');
      }
    }, 1200);
  };

  const handleReboot = () => {
    setRebooting(true);
    onOledStateChange('BOOT');
    setTimeout(() => {
      onOledStateChange('WIFI_CONNECTED');
      setTimeout(() => {
        onOledStateChange('READY');
        setRebooting(false);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Device Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{device.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online (Connected)</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Device UUID: <span className="text-cyan-300 font-semibold">{device.id}</span> &bull; Hardware: <span className="text-slate-200">{device.hardwareVariant}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleReboot}
              disabled={rebooting}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${rebooting ? 'animate-spin' : ''}`} />
              <span>{rebooting ? 'Rebooting...' : 'Restart Device'}</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              <span>Wi-Fi Network</span>
            </div>
            <div className="text-sm font-bold text-white truncate">{device.ssid}</div>
            <div className="text-[10px] font-mono text-slate-400 mt-1">
              IP: {device.ipAddress} ({device.rssi} dBm)
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Firmware Version</span>
            </div>
            <div className="text-sm font-bold text-white font-mono">v{device.firmwareVersion}</div>
            <div className="text-[10px] text-emerald-400 mt-1">Up to date (OTA Slot A)</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Battery className="w-3.5 h-3.5 text-amber-400" />
              <span>Power Source</span>
            </div>
            <div className="text-sm font-bold text-white">5.0V USB Bus</div>
            <div className="text-[10px] text-slate-400 mt-1">Stable &bull; MAX98357A OK</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>FreeRTOS Heap</span>
            </div>
            <div className="text-sm font-bold text-white font-mono">248 KB Free</div>
            <div className="text-[10px] text-slate-400 mt-1">8MB Octal PSRAM Active</div>
          </div>
        </div>
      </div>

      {/* Account Pairing Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h4 className="text-sm font-bold text-white">Cloud Device Pairing</h4>
          </div>
          {device.paired ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Paired to User Account</span>
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
              Pairing Required
            </span>
          )}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl mb-4">
          Explore AI devices display a 6-digit ephemeral security token on boot. Enter the pairing code below to link the device to your account.
        </p>

        <form onSubmit={handlePair} className="flex flex-wrap items-center gap-3">
          <div className="w-48">
            <input
              type="text"
              maxLength={6}
              value={pairingCodeInput}
              onChange={(e) => setPairingCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. 489210"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-cyan-400 font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={isPairing || pairingCodeInput.length < 4}
            className="py-2.5 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-md"
          >
            {isPairing ? 'Verifying...' : 'Link Device to Account'}
          </button>

          <span className="text-xs text-slate-400">
            (Current Device Code: <strong className="text-cyan-300 font-mono">{device.pairingCode}</strong>)
          </span>
        </form>

        {pairSuccessMsg && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Device successfully paired to your cloud profile!</span>
          </div>
        )}

        {pairError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
            {pairError}
          </div>
        )}
      </div>
    </div>
  );
};
