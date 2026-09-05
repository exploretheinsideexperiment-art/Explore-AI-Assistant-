# Explore AI Assistant — System Architecture

The Explore AI Assistant is a modular, high-reliability embedded AI ecosystem spanning:
1. **Edge Firmware (ESP32 / ESP32-S3 / ESP32-C3)**
2. **Cloud Orchestrator & Voice Pipeline (Node/TypeScript + WSS)**
3. **AI Inference & Knowledge Layer (Groq Llama 3 / Gemini + Search + Vector RAG)**
4. **Web & Mobile Management App (React + Tailwind + PWA)**

```
+-------------------------------------------------------------------------------+
|                             EXPLORE AI HARDWARE                               |
|                                                                               |
|  [ INMP441 Mic ] ---> I2S0 DMA ---> FreeRTOS AudioCaptureTask                 |
|                                                  |                            |
|  [ MAX98357A Spk] <--- I2S1 DMA <--- FreeRTOS AudioPlaybackTask               |
|                                                  |                            |
|  [ 128x64 OLED ] <--- I2C <--- DisplayStateTask (Procedural Face Animations)  |
|                                                  |                            |
|  [ Buttons/LED ] <--- GPIO Interrupts <--- DeviceManager (5s Factory Reset)   |
|                                                  |                            |
|  [ ESP32 Wi-Fi ] <--- SoftAP "Explore AI" / Captive Portal / WSS TLS Client   |
+--------------------------------------------------+----------------------------+
                                                   |
                                            WSS / HTTPS (TLS)
                                                   |
                                                   v
+-------------------------------------------------------------------------------+
|                            EXPLORE AI CLOUD BACKEND                           |
|                                                                               |
|  +------------------------+      +--------------------+                       |
|  |  WSS Gateway / Session | <--> |  Device & User DB  |                       |
|  +------------------------+      +--------------------+                       |
|              |                                                                |
|              v                                                                |
|  +-------------------------------------------------------------------------+  |
|  |                      VOICE & AI ORCHESTRATION PIPELINE                  |  |
|  |                                                                         |  |
|  |  [ VAD & Chunking ] -> [ STT Engine ] -> [ Context & Vector RAG ]       |  |
|  |                                                        |                |  |
|  |                                                        v                |  |
|  |  [ Streaming TTS ] <-- [ Groq Llama 3 / Gemini ] <-- [ Realtime Search] |  |
|  +-------------------------------------------------------------------------+  |
+--------------------------------------------------+----------------------------+
                                                   |
                                             REST / PWA Sync
                                                   |
                                                   v
+-------------------------------------------------------------------------------+
|                     EXPLORE AI WEB & ANDROID PWA DASHBOARD                    |
|                                                                               |
|  - Real-time OLED Face & Audio Testing Console                                |
|  - Wi-Fi Provisioning & Captive Portal Simulator                              |
|  - Agent Config: Groq API Key, Llama 3.3 70B, Search API, Indian Languages   |
|  - Device Inspector, Pairing, Telemetry & Firmware Updates                     |
+-------------------------------------------------------------------------------+
```

## Modular Separation
- **No Monoliths**: Every subsystem (OLED animations, Wi-Fi, captive portal, storage, device identity) is encapsulated with isolated header declarations and implementation units.
- **Hardware Agnostic Pinout**: Centralized in `include/pins.h` with preprocessor targets for standard ESP32, ESP32-S3, and ESP32-C3.
- **Fail-Safe Persistence**: ESP32 NVS (Non-Volatile Storage) partitions are separated into `explore_wifi` and `explore_dev` to ensure factory reset only touches user preferences while maintaining device UUID integrity.
