# Explore AI Assistant — Development Roadmap

- [x] **Phase 1: Hardware-First Core Onboarding (COMPLETED)**
  - Centralized hardware pin abstraction (`include/pins.h`) for ESP32, S3, C3
  - 128x64 SSD1306 OLED procedural facial animation engine & state machine
  - Wi-Fi Access Point `"Explore AI"` (192.168.4.1) & Captive Portal
  - Asynchronous Wi-Fi scanner (`/scan`), credential submit (`/connect`), status (`/status`)
  - Captive portal detection redirects (`/generate_204`, `/hotspot-detect.html`, `/ncsi.txt`)
  - NVS persistent credential storage with password privacy enforcement
  - Hardware physical 5-second factory reset handler
  - Complete wiring, pinout, and PlatformIO configuration

- [ ] **Phase 2: Cloud Infrastructure & Device Registration**
  - Device telemetry endpoints and registration handshake

- [ ] **Phase 3: User Authentication & Mobile Dashboard**
  - OTP / email verification and device dashboard

- [ ] **Phase 4: Ephemeral Device Pairing**
  - 6-digit sync between device OLED and web portal

- [ ] **Phase 5: Secure WebSocket (WSS) Protocol**
  - Streaming JSON control and binary audio pipeline

- [ ] **Phase 6: Audio Capture & I2S Microphone (INMP441)**
  - FreeRTOS DMA task and Voice Activity Detection (VAD)

- [ ] **Phase 7: AI Pipeline (Groq Llama 3 / Gemini + TTS + MAX98357A)**
  - Low-latency streaming speech synthesis

- [ ] **Phase 8: Voice Modes & Wake Word**
  - Push-to-Talk, continuous conversation, and "Hey Explore"

- [ ] **Phase 9: Knowledge Base & Vector RAG**
  - Document chunking, embeddings, and context-aware responses

- [ ] **Phase 10: Production Hardening & OTA Upgrades**
  - Dual-bank secure updates
