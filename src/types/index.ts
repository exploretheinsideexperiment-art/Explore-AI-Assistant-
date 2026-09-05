export type DisplayState = 
  | 'BOOT'
  | 'WIFI_SETUP'
  | 'WIFI_CONNECTING'
  | 'WIFI_CONNECTED'
  | 'CLOUD_CONNECTING'
  | 'READY'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'ERROR'
  | 'OTA'
  | 'SLEEP'
  | 'FACTORY_RESET';

export type FaceExpression = 
  | 'IDLE'
  | 'BLINK'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'ERROR'
  | 'SLEEP'
  | 'HAPPY';

export type HardwareVariant = 
  | 'ESP32-S3' 
  | 'ESP32-WROOM' 
  | 'ESP32-C3' 
  | 'ESP32-CAM' 
  | 'ESP32-WROVER' 
  | 'ESP32-S2';

export interface DeviceInfo {
  id: string;
  name: string;
  hardwareVariant: HardwareVariant;
  firmwareVersion: string;
  status: 'online' | 'offline' | 'provisioning' | 'pairing';
  ipAddress: string;
  ssid: string;
  rssi: number;
  batteryLevel?: number;
  paired: boolean;
  pairingCode: string;
  lastSeen: string;
}

// --- Microcontroller Hardware Pin Definitions ---
export interface Inmp441PinConfig {
  bclk: number; // SCK / Bit Clock
  ws: number;   // WS / Word Select / LRCLK
  sd: number;   // SD / Serial Data Out from Mic
  channel: 'left' | 'right'; // Left (L/R to GND) or Right (L/R to VDD)
  i2sPort: number; // 0 or 1
}

export interface Max98357aPinConfig {
  bclk: number; // BCLK / Bit Clock
  lrc: number;  // LRC / Word Select
  din: number;  // DIN / Serial Data into Amp
  gainDb: 3 | 6 | 9 | 12 | 15; // Gain in decibels
  sdModePin?: number; // Optional Shutdown / Mode select pin
}

export type DisplayType = 
  | 'SSD1306_I2C_128x64'
  | 'SSD1306_SPI_128x64'
  | 'SH1106_I2C_128x64'
  | 'SSD1306_I2C_128x32'
  | 'ST7789_SPI_240x240'
  | 'ILI9341_SPI_320x240';

export interface DisplayPinConfig {
  type: DisplayType;
  // I2C Pins
  sda: number;
  scl: number;
  i2cAddress: string; // "0x3C" or "0x3D"
  i2cFreqKhz: number; // 400 or 100
  // SPI Pins
  mosi?: number;
  sclk?: number;
  cs?: number;
  dc?: number;
  rst?: number;
  blk?: number; // Backlight
  width: number;
  height: number;
}

export type RelayMode = 'none' | '4ch' | '8ch';
export type RelayLogic = 'active_low' | 'active_high';

export interface RelayChannel {
  id: number;
  name: string;
  gpio: number;
  state: boolean;
  icon?: string;
}

export interface RelayModuleConfig {
  mode: RelayMode;
  logic: RelayLogic;
  channels: RelayChannel[];
}

export interface HardwareControlsPinConfig {
  actionButton: number; // Boot / Push-to-Talk
  resetButton: number;  // Factory Reset button
  statusLed: number;    // Builtin LED / NeoPixel
}

export interface CustomHardwareProfile {
  variant: HardwareVariant;
  boardName: string;
  flashSizeMb: number;
  psram: boolean;
  mic: Inmp441PinConfig;
  amp: Max98357aPinConfig;
  display: DisplayPinConfig;
  relays: RelayModuleConfig;
  controls: HardwareControlsPinConfig;
}

export interface PinConflict {
  gpio: number;
  devices: string[];
  severity: 'error' | 'warning';
  description: string;
}

export type FlasherState = 
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'erasing'
  | 'flashing'
  | 'verifying'
  | 'completed'
  | 'error';

export interface FlashProgress {
  percentage: number;
  bytesWritten: number;
  totalBytes: number;
  speedKbps: number;
  currentFile: string;
}

export type LLMProvider = 'groq' | 'gemini';

export type GroqModel = 
  | 'openai/gpt-oss-120b'
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-8b-instant'
  | 'mixtral-8x7b-32768'
  | 'gemma2-9b-it';

export type SearchEngine = 'tavily' | 'serper' | 'google' | 'built-in';

export type PersonalityMode = 
  | 'educational'
  | 'friendly'
  | 'professional'
  | 'technical'
  | 'general';

export type VoiceMode = 'push_to_talk' | 'continuous' | 'wake_word';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  speechCode: string;
}

export type VoiceGender = 'Female' | 'Male';

export interface VoiceOption {
  id: string;
  name: string;
  gender: VoiceGender;
  accent: string;
  provider: 'Groq/Edge' | 'ElevenLabs' | 'WebSpeech';
}

export interface AgentSettings {
  llmProvider: LLMProvider;
  groqApiKey: string;
  groqModel: GroqModel;
  searchApiKey: string;
  searchEngine: SearchEngine;
  geminiApiKey: string;
  geminiModel: string;
  personality: PersonalityMode;
  language: string; // e.g. "hi-IN", "hinglish", "en-IN"
  voiceGender: VoiceGender;
  voice: string;
  voiceSpeed: number; // 0.8 - 1.5
  voicePitch: number; // 0.8 - 1.2
  voiceMode: VoiceMode;
  systemPromptAddition: string;
  temperature: number;
  maxTokens: number;
}

export interface WiFiNetwork {
  ssid: string;
  rssi: number;
  secure: boolean;
  channel?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  audioDuration?: number;
  searchQueries?: string[];
  modelUsed?: string;
}

export interface KnowledgeDocument {
  id: string;
  collection: string;
  title: string;
  fileType: 'pdf' | 'docx' | 'txt' | 'md';
  chunkCount: number;
  uploadedAt: string;
  summary: string;
}
