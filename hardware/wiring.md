# Explore AI Assistant — Hardware Wiring Guide

This document outlines the complete hardware schematic and connection guide for the **Explore AI Assistant** hardware platform.

---

## 1. Components List

| Component | Function | Interface | Operating Voltage |
|-----------|----------|-----------|-------------------|
| **ESP32 / ESP32-S3** | Main Microcontroller & Wi-Fi/BT | SOC | 3.3V |
| **SSD1306 OLED (128x64)** | Visual Face & Status Display | I2C | 3.3V |
| **INMP441** | Omnidirectional Digital Microphone | I2S | 3.3V |
| **MAX98357A** | 3.2W Class-D Mono Amplifier | I2S | 3.3V - 5V (5V recommended for audio loudness) |
| **Speaker (4Ω or 8Ω, 2W–3W)** | Audio Output | Analog Audio | Connected to MAX98357A +/- |
| **Tactile Push Button (Action)** | Push-to-Talk / Wake | GPIO | Pull-up to 3.3V |
| **Tactile Push Button (Reset)** | 5-Second Factory Reset | GPIO | Pull-up to 3.3V |
| **Status LED** (Optional) | Visual Connection Indicator | GPIO | 3.3V with 330Ω resistor |

---

## 2. Wiring Matrix

### A. SSD1306 128×64 I2C OLED Display

| OLED Pin | ESP32 (WROOM-32) | ESP32-S3 | ESP32-C3 | Notes |
|----------|------------------|----------|----------|-------|
| **VCC**  | 3.3V             | 3.3V     | 3.3V     | Clean 3.3V rail |
| **GND**  | GND              | GND      | GND      | Common ground |
| **SCL**  | GPIO 22          | GPIO 9   | GPIO 5   | I2C Clock |
| **SDA**  | GPIO 21          | GPIO 8   | GPIO 4   | I2C Data |

---

### B. INMP441 I2S Digital Microphone

| INMP441 Pin | ESP32 (WROOM-32) | ESP32-S3 | ESP32-C3 | Description |
|-------------|------------------|----------|----------|-------------|
| **VDD**     | 3.3V             | 3.3V     | 3.3V     | Power |
| **GND**     | GND              | GND      | GND      | Ground |
| **SD**      | GPIO 32          | GPIO 40  | GPIO 8   | Serial Data Out (Mic to ESP) |
| **WS**      | GPIO 15          | GPIO 42  | GPIO 7   | Word Select (L/R Clock) |
| **SCK**     | GPIO 14          | GPIO 41  | GPIO 6   | Serial Clock (BCLK) |
| **L/R**     | GND              | GND      | GND      | Pull to GND for Left channel |

---

### C. MAX98357A I2S Class-D Amplifier

| MAX98357A Pin | ESP32 (WROOM-32) | ESP32-S3 | ESP32-C3 | Description |
|---------------|------------------|----------|----------|-------------|
| **VIN**       | 5V (or 3.3V)     | 5V       | 5V       | 5V from USB gives clear 3W power |
| **GND**       | GND              | GND      | GND      | Common ground |
| **DIN**       | GPIO 27          | GPIO 17  | GPIO 3   | Digital Audio In (ESP to Amp) |
| **BCLK**      | GPIO 26          | GPIO 15  | GPIO 1   | Bit Clock |
| **LRC**       | GPIO 25          | GPIO 16  | GPIO 2   | Left/Right Clock (WS) |
| **GAIN**      | Leave floating   | Floating | Floating | Defaults to 9dB gain (or 100kΩ to GND for 3dB) |
| **SD_MODE**   | Leave floating   | Floating | Floating | Stereo mix to mono |
| **SPEAKER +** | Speaker (+)      | Spk (+)  | Spk (+)  | Connect to speaker positive terminal |
| **SPEAKER -** | Speaker (-)      | Spk (-)  | Spk (-)  | Connect to speaker negative terminal |

---

### D. Buttons & LEDs

| Control | ESP32 (WROOM-32) | ESP32-S3 | ESP32-C3 | Wiring Note |
|---------|------------------|----------|----------|-------------|
| **Action Button** | GPIO 0 (or Boot button) | GPIO 0 | GPIO 9 | Connect between GPIO and GND (Internal pull-up enabled) |
| **Reset Button** | GPIO 4 | GPIO 4 | GPIO 0 | Connect between GPIO and GND (Hold 5s for factory reset) |
| **Status LED** | GPIO 2 | GPIO 38 | GPIO 10 | Connect through 330Ω resistor to GND |

---

## 3. Power Supply Recommendations

1. The MAX98357A amplifier can draw peak transients up to **500mA–800mA** when driving a 4Ω speaker at high volumes.
2. Ensure you power the device via a **5V / 2A USB power adapter**.
3. Place a **100µF – 220µF electrolytic capacitor** across the 5V and GND rail near the MAX98357A to absorb voltage dips and eliminate speaker pop.
4. Keep I2S wire traces short (<10 cm) to avoid digital clock jitter and EMI interference with the Wi-Fi antenna.
