import React, { useState } from 'react';
import { WiFiNetwork, DisplayState } from '../types';
import { Wifi, Lock, Unlock, RefreshCw, CheckCircle2, AlertCircle, RotateCcw, Smartphone, Globe } from 'lucide-react';

interface CaptivePortalSimulatorProps {
  onWiFiConnected: (ssid: string, ip: string) => void;
  onFactoryReset: () => void;
  onOledStateChange: (state: DisplayState) => void;
}

export const CaptivePortalSimulator: React.FC<CaptivePortalSimulatorProps> = ({
  onWiFiConnected,
  onFactoryReset,
  onOledStateChange
}) => {
  const [networks, setNetworks] = useState<WiFiNetwork[]>([
    { ssid: 'Home-Fiber-WiFi_2.4G', rssi: -48, secure: true },
    { ssid: 'IoT_Lab_Network', rssi: -62, secure: true },
    { ssid: 'Explore_Robotics_Club', rssi: -71, secure: true },
    { ssid: 'Campus_Guest_Free', rssi: -84, secure: false }
  ]);
  const [selectedSSID, setSelectedSSID] = useState('Home-Fiber-WiFi_2.4G');
  const [customSSID, setCustomSSID] = useState('');
  const [password, setPassword] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [connectStatus, setConnectStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [activeUrlTest, setActiveUrlTest] = useState<string | null>(null);
  const [resetHoldProgress, setResetHoldProgress] = useState(0);
  const [resetIntervalId, setResetIntervalId] = useState<any>(null);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setNetworks([
        { ssid: 'Home-Fiber-WiFi_2.4G', rssi: -45, secure: true },
        { ssid: 'IoT_Lab_Network', rssi: -58, secure: true },
        { ssid: 'Explore_Robotics_Club', rssi: -68, secure: true },
        { ssid: 'Makerspace_Electronics', rssi: -75, secure: true },
        { ssid: 'Campus_Guest_Free', rssi: -82, secure: false }
      ]);
      setIsScanning(false);
    }, 1000);
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const ssid = selectedSSID === '__manual__' ? customSSID.trim() : selectedSSID;
    if (!ssid) {
      setConnectStatus('failed');
      setStatusMessage('Please select or specify a Wi-Fi network.');
      return;
    }

    setConnectStatus('connecting');
    setStatusMessage(`Connecting to "${ssid}"...`);
    onOledStateChange('WIFI_CONNECTING');

    setTimeout(() => {
      // Simulate successful handshake
      const mockIP = '192.168.1.' + Math.floor(Math.random() * 150 + 100);
      setConnectStatus('connected');
      setStatusMessage(`Connected! Assigned IP: ${mockIP}. Redirecting to Explore AI Cloud...`);
      onOledStateChange('WIFI_CONNECTED');
      onWiFiConnected(ssid, mockIP);

      setTimeout(() => {
        onOledStateChange('READY');
      }, 2500);
    }, 2000);
  };

  // Factory reset hold simulation (5s hold)
  const startResetHold = () => {
    onOledStateChange('FACTORY_RESET');
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 100;
      const pct = Math.min(100, (elapsed / 5000) * 100);
      setResetHoldProgress(pct);

      if (elapsed >= 5000) {
        clearInterval(interval);
        setConnectStatus('idle');
        setSelectedSSID('Home-Fiber-WiFi_2.4G');
        setPassword('');
        setStatusMessage('Device wiped to factory settings. AP reopened.');
        onFactoryReset();
        onOledStateChange('WIFI_SETUP');
        setResetHoldProgress(0);
      }
    }, 100);
    setResetIntervalId(interval);
  };

  const cancelResetHold = () => {
    if (resetIntervalId) {
      clearInterval(resetIntervalId);
      setResetIntervalId(null);
    }
    if (resetHoldProgress > 0 && resetHoldProgress < 100) {
      setResetHoldProgress(0);
      onOledStateChange('WIFI_SETUP');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Captive Portal & Onboarding Simulator</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                Phase 1 Active
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Simulates the ESP32 Wi-Fi SoftAP (<code className="text-cyan-300">Explore AI</code> @ <code className="text-cyan-300">192.168.4.1</code>)
            </p>
          </div>
        </div>

        {/* Captive Portal Detection Test Trigger */}
        <div className="flex items-center gap-1.5 text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 text-[11px]">Test OS Probe:</span>
          {['/generate_204', '/hotspot-detect.html', '/ncsi.txt'].map((url) => (
            <button
              key={url}
              onClick={() => {
                setActiveUrlTest(url);
                setTimeout(() => setActiveUrlTest(null), 3000);
              }}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-cyan-300 border border-slate-700 transition"
            >
              {url}
            </button>
          ))}
        </div>
      </div>

      {activeUrlTest && (
        <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300 flex items-center justify-between animate-fadeIn">
          <span>
            HTTP 302 Redirect intercepted for <strong className="font-mono">{activeUrlTest}</strong> &rarr; <code className="font-mono">http://192.168.4.1/</code>
          </span>
          <span className="text-[10px] text-cyan-400 font-mono">OK (Captive Portal Served)</span>
        </div>
      )}

      {/* Main Onboarding Interactive Frame */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Phone / Browser Mockup Card */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800/80 rounded-2xl p-5 shadow-2xl relative">
          {/* Simulated Mobile Browser Top Bar */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-850 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span className="font-medium text-slate-300">Explore AI Setup Portal</span>
            </div>
            <div className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono text-[10px] border border-slate-800">
              http://192.168.4.1/
            </div>
          </div>

          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Select Nearby Wi-Fi Network
                </label>
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={isScanning}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Scanning...' : 'Rescan (GET /scan)'}</span>
                </button>
              </div>

              <div className="space-y-2">
                {networks.map((net) => (
                  <label
                    key={net.ssid}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      selectedSSID === net.ssid
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="wifiSSID"
                        checked={selectedSSID === net.ssid}
                        onChange={() => setSelectedSSID(net.ssid)}
                        className="accent-cyan-400"
                      />
                      <span className="text-sm font-medium">{net.ssid}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span>{net.rssi} dBm</span>
                      {net.secure ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </label>
                ))}

                <label
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    selectedSSID === '__manual__'
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <input
                    type="radio"
                    name="wifiSSID"
                    checked={selectedSSID === '__manual__'}
                    onChange={() => setSelectedSSID('__manual__')}
                    className="accent-cyan-400"
                  />
                  <span className="text-sm font-medium">+ Enter Hidden / Custom SSID</span>
                </label>
              </div>
            </div>

            {selectedSSID === '__manual__' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Network SSID Name
                </label>
                <input
                  type="text"
                  value={customSSID}
                  onChange={(e) => setCustomSSID(e.target.value)}
                  placeholder="e.g. MySecretWiFi"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Wi-Fi Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter network password"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={connectStatus === 'connecting'}
              className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              {connectStatus === 'connecting' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting Device (POST /connect)...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  <span>Connect Explore AI to Wi-Fi</span>
                </>
              )}
            </button>
          </form>

          {/* Status Feedback Banner */}
          {statusMessage && (
            <div
              className={`mt-4 p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                connectStatus === 'connected'
                  ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                  : connectStatus === 'failed'
                  ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                  : 'bg-cyan-950/40 border-cyan-800/50 text-cyan-300'
              }`}
            >
              {connectStatus === 'connected' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Hardware & Provisioning Features Info */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-cyan-400">
              Phase 1 Firmware Specifications
            </h4>
            <ul className="text-xs text-slate-300 space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Access Point:</strong> Defaults to SSID <code className="text-cyan-300">"Explore AI"</code> on channel 1 with IP <code className="text-cyan-300">192.168.4.1</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Captive Portal DNS:</strong> Port 53 server answers all DNS requests with device IP to trigger native mobile captive prompts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Security & Privacy:</strong> Wi-Fi passwords are saved encrypted into NVS (<code className="text-slate-300">explore_wifi</code>) and never printed to Serial logs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Exponential Backoff:</strong> If connection drops, attempts reconnect at 1s, 2s, 4s, 8s, 16s up to 30s.</span>
              </li>
            </ul>
          </div>

          {/* Physical 5-Second Factory Reset Simulation */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Physical 5s Factory Reset Button</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400">GPIO 4</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Press and hold the button below for 5 seconds to simulate the hardware factory reset button.
            </p>

            <button
              type="button"
              onMouseDown={startResetHold}
              onMouseUp={cancelResetHold}
              onMouseLeave={cancelResetHold}
              onTouchStart={startResetHold}
              onTouchEnd={cancelResetHold}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition relative overflow-hidden active:scale-95"
            >
              {resetHoldProgress > 0 && (
                <div
                  className="absolute inset-0 bg-rose-600/30 transition-all duration-100"
                  style={{ width: `${resetHoldProgress}%` }}
                />
              )}
              <span className="relative z-10">
                {resetHoldProgress > 0
                  ? `Holding... ${Math.ceil((5000 - (resetHoldProgress / 100) * 5000) / 1000)}s remaining`
                  : 'Hold for 5s to Factory Reset'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
