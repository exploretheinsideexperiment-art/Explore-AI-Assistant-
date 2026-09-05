# Explore AI Assistant — Development & Compilation Guide

This guide details how to set up your environment, compile the firmware using PlatformIO, and test the software.

---

## 1. Firmware Prerequisites

1. **Install PlatformIO Core or IDE**:
   ```bash
   pip install -U platformio
   # Or install the PlatformIO extension in VSCode / Cursor
   ```
2. **Serial USB Drivers**:
   - For CH340 / CP2102: standard USB UART drivers.
   - For ESP32-S3: Native USB CDC (`ARDUINO_USB_CDC_ON_BOOT=1` enabled in `platformio.ini`).

---

## 2. Compiling the Firmware

Navigate to the `firmware/` directory:

```bash
cd firmware

# Compile for default standard ESP32 (esp32dev)
pio run -e esp32dev

# Compile for ESP32-S3 (Recommended with PSRAM)
pio run -e esp32-s3-devkitc-1

# Compile for ESP32-C3
pio run -e esp32-c3-devkitm-1
```

---

## 3. Flashing to Hardware

Connect your ESP32 board via USB, then run:

```bash
# Upload to connected ESP32
pio run -e esp32-s3-devkitc-1 --target upload

# Launch serial monitor at 115200 baud
pio device monitor -b 115200
```

---

## 4. First-Boot Verification Checklist

1. **Serial Monitor**:
   - Confirm banner: `EXPLORE AI ASSISTANT FIRMWARE v1.0.0`.
   - Confirm Device ID generated: `EXP-AI-XXXXXXXXXXXX`.
   - Confirm NVS mounted.
   - Confirm SSD1306 OLED initialized at `0x3C`.
2. **OLED Screen**:
   - Observe the Explore AI boot geometric animation.
   - Observe transition to `Wi-Fi Setup Mode`:
     - Line 1: `AP: Explore AI`
     - Line 2: `IP: 192.168.4.1`
     - Line 3: `Portal: Open Browser`
3. **Smartphone Wi-Fi**:
   - Open phone Wi-Fi settings, locate `Explore AI`, and tap to connect.
   - Captive portal opens automatically with nearby Wi-Fi network scanner.
   - Choose home/office Wi-Fi, enter password, and submit.
   - OLED transitions to `Connecting...` with animated spinner, followed by `Wi-Fi Connected!`.
