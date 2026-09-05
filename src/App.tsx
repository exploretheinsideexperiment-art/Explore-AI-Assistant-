/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DisplayState, DeviceInfo, AgentSettings, CustomHardwareProfile } from './types';
import { DEFAULT_AGENT_SETTINGS } from './data/languagesAndVoices';
import { HARDWARE_BOARDS } from './data/hardwareProfiles';
import { Header, ActiveTab } from './components/Header';
import { OledSimulator } from './components/OledSimulator';
import { CaptivePortalSimulator } from './components/CaptivePortalSimulator';
import { AgentSettingsView } from './components/AgentSettingsView';
import { VoiceChatConsole } from './components/VoiceChatConsole';
import { DeviceDashboard } from './components/DeviceDashboard';
import { HardwareViewer } from './components/HardwareViewer';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { FirmwareBrowser } from './components/FirmwareBrowser';
import { PinConfigurator } from './components/PinConfigurator';
import { UsbFlasherView } from './components/UsbFlasherView';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('console');
  const [displayState, setDisplayState] = useState<DisplayState>('READY');

  // Custom hardware profile state with local persistence
  const [customProfile, setCustomProfile] = useState<CustomHardwareProfile>(() => {
    try {
      const saved = localStorage.getItem('explore_ai_hardware_profile');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load custom hardware profile:', e);
    }
    return HARDWARE_BOARDS['ESP32-S3'].recommendedPreset;
  });

  const handleUpdateProfile = (updated: CustomHardwareProfile) => {
    setCustomProfile(updated);
    try {
      localStorage.setItem('explore_ai_hardware_profile', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist custom profile:', e);
    }
    // Also update device info's hardware variant to match
    setDevice(prev => ({
      ...prev,
      hardwareVariant: updated.variant
    }));
  };

  // Persist agent settings (Groq API Key, Groq Model, Search API Key, Language) to localStorage
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(() => {
    try {
      const saved = localStorage.getItem('explore_ai_settings');
      if (saved) {
        return { ...DEFAULT_AGENT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings from storage:', e);
    }
    return DEFAULT_AGENT_SETTINGS;
  });

  const [device, setDevice] = useState<DeviceInfo>({
    id: 'EXP-AI-9F2B48',
    name: 'Explore AI Assistant',
    hardwareVariant: 'ESP32-S3',
    firmwareVersion: '1.0.0',
    status: 'online',
    ipAddress: '192.168.1.142',
    ssid: 'Home-Fiber-WiFi_2.4G',
    rssi: -58,
    batteryLevel: 100,
    paired: true,
    pairingCode: '489210',
    lastSeen: 'Just now'
  });

  const handleSaveSettings = (newSettings: AgentSettings) => {
    setAgentSettings(newSettings);
    try {
      localStorage.setItem('explore_ai_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  };

  const handleWiFiConnected = (ssid: string, ip: string) => {
    setDevice(prev => ({
      ...prev,
      ssid,
      ipAddress: ip,
      status: 'online'
    }));
  };

  const handleFactoryReset = () => {
    setDevice(prev => ({
      ...prev,
      ssid: 'Explore AI (SoftAP)',
      ipAddress: '192.168.4.1',
      status: 'provisioning',
      paired: false
    }));
  };

  const handlePairSuccess = () => {
    setDevice(prev => ({ ...prev, paired: true }));
  };

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* App Header & Navigation */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        device={device}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'console' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: OLED Face Simulator */}
            <div className="lg:col-span-5 space-y-4">
              <OledSimulator
                state={displayState}
                onStateChange={setDisplayState}
                networkSSID={device.ssid}
                networkIP={device.ipAddress}
                rssi={device.rssi}
              />
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Real-time Hardware Synchronization</span>
                </div>
                <p className="leading-relaxed">
                  The OLED display above reacts live: when you activate the microphone it switches to <strong className="text-cyan-300">LISTENING</strong>, while the LLM generates tokens it shifts to <strong className="text-cyan-300">PROCESSING</strong>, and during voice output it bounces with <strong className="text-cyan-300">SPEAKING</strong>!
                </p>
              </div>
            </div>

            {/* Right Column: Voice & Chat Console */}
            <div className="lg:col-span-7">
              <VoiceChatConsole
                settings={agentSettings}
                onOledStateChange={setDisplayState}
                deviceOnline={device.status === 'online'}
                onUpdateSettings={(partial) => handleSaveSettings({ ...agentSettings, ...partial })}
              />
            </div>
          </div>
        )}

        {activeTab === 'portal' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-1/3">
                <OledSimulator
                  state={displayState}
                  onStateChange={setDisplayState}
                  networkSSID={device.ssid}
                  networkIP={device.ipAddress}
                  rssi={device.rssi}
                />
              </div>
              <div className="lg:w-2/3">
                <CaptivePortalSimulator
                  onWiFiConnected={handleWiFiConnected}
                  onFactoryReset={handleFactoryReset}
                  onOledStateChange={setDisplayState}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pinout' && (
          <PinConfigurator
            profile={customProfile}
            onChangeProfile={handleUpdateProfile}
            onOpenUsbFlasher={() => setActiveTab('usbflash')}
          />
        )}

        {activeTab === 'usbflash' && (
          <UsbFlasherView
            profile={customProfile}
            onBackToConfig={() => setActiveTab('pinout')}
          />
        )}

        {activeTab === 'settings' && (
          <AgentSettingsView
            settings={agentSettings}
            onSaveSettings={handleSaveSettings}
          />
        )}

        {activeTab === 'device' && (
          <DeviceDashboard
            device={device}
            onOledStateChange={setDisplayState}
            onPairSuccess={handlePairSuccess}
          />
        )}

        {activeTab === 'hardware' && (
          <HardwareViewer
            onNavigateToPinout={() => setActiveTab('pinout')}
            onNavigateToUsbFlash={() => setActiveTab('usbflash')}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBaseView />
        )}

        {activeTab === 'firmware' && (
          <FirmwareBrowser
            onNavigateToPinout={() => setActiveTab('pinout')}
            onNavigateToUsbFlash={() => setActiveTab('usbflash')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Explore AI Assistant &bull; ESP32, INMP441, MAX98357A, SSD1306, Groq & Gemini</span>
          <span className="font-mono text-[11px] text-slate-400">Open-Source Apache 2.0</span>
        </div>
      </footer>
    </div>
  );
}
