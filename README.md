# Explore AI Assistant

[![PlatformIO](https://img.shields.io/badge/PlatformIO-ESP32%20%7C%20ESP32--S3-orange.svg)](https://platformio.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![AI Engine](https://img.shields.io/badge/AI-Groq%20%2F%20Gemini-green.svg)](https://groq.com)

**Explore AI Assistant** is an open, cloud-connected AI voice assistant ecosystem designed for ESP32 and ESP32-S3 hardware. It features a friendly animated OLED face, seamless captive portal Wi-Fi provisioning, multi-language conversational capabilities (including Indian languages such as Hindi, Hinglish, Bengali, Tamil, Telugu, Marathi), high-speed Groq & Gemini LLM intelligence, and responsive web/mobile dashboard management.

---

## 🛠️ Hardware Requirements

- **Microcontroller**: ESP32 / ESP32-S3 (Recommended: ESP32-S3 DevKit with 8MB PSRAM)
- **Display**: SSD1306 128×64 I2C OLED
- **Microphone**: INMP441 I2S digital omnidirectional microphone
- **Amplifier**: MAX98357A 3.2W Class-D I2S mono amplifier
- **Speaker**: 4Ω or 8Ω, 2W–3W mini speaker
- **Push Buttons**: Push-to-Talk (GPIO 0) and Factory Reset (GPIO 4)

---

## 🚀 Quick Start (Phase 1 Firmware)

### 1. Build & Flash with PlatformIO
```bash
cd firmware

# Compile for ESP32-S3
pio run -e esp32-s3-devkitc-1

# Flash firmware over USB
pio run -e esp32-s3-devkitc-1 --target upload

# Monitor serial output
pio device monitor -b 115200
```

### 2. First Boot Wi-Fi Provisioning
1. Power on the device.
2. The OLED displays the **Explore AI** boot animation followed by:
   ```
   Wi-Fi Setup Mode
   AP: Explore AI
   IP: 192.168.4.1
   ```
3. Connect your smartphone or laptop to the Wi-Fi AP: **`Explore AI`**.
4. The captive portal opens automatically.
5. Select your home or lab Wi-Fi from the scanned list, enter your password, and click **Connect to Wi-Fi**.
6. The device securely saves your credentials to NVS and connects to the internet.

### 3. Factory Reset
- Hold the **Reset Button (GPIO 4)** for **5 seconds**.
- The OLED displays an active countdown. Releasing before 5s cancels. Holding for 5s wipes all NVS credentials and restarts setup.

---

## 📂 Repository Structure

- `firmware/`: Complete PlatformIO C++ firmware with modular drivers:
  - `include/pins.h`: Hardware pin definitions for ESP32, S3, C3
  - `src/display/`: Procedural OLED face animation engine
  - `src/wifi/`: Captive portal, DNS server, Wi-Fi scanner, reconnect backoff
  - `src/storage/`: NVS persistent preferences & credential protection
  - `src/device/`: Hardware-derived unique device ID & 5s reset handler
- `hardware/`: Wiring guides and pinout diagrams (`hardware/wiring.md`)
- `protocol/`: WebSocket protocol (`protocol/websocket.md`) and device specifications
- `docs/`: Architecture, security model, and troubleshooting guides
- `src/`: Web Application & Mobile PWA with live OLED simulator, Groq & Gemini configuration, language selector, and interactive test console.

---

## 🔒 Security
- Passwords are encrypted in NVS and never logged to Serial.
- Local captive portal returns sanitized status without exposing passwords.
- Cloud uses TLS WSS/HTTPS and ephemeral pairing codes.
