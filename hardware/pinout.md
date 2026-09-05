# Explore AI Assistant — Hardware Pinout Matrix

All GPIO assignments are centralized in `firmware/include/pins.h`.

```
                  +-------------------------+
                  |    EXPLORE AI ASSISTANT |
                  |       ESP32-S3 PINOUT   |
                  +-------------------------+
                   (GND) ----------------- GND (All Modules)
                   (3V3) ----------------- VCC (OLED, INMP441)
                   (5V)  ----------------- VIN (MAX98357A Amp)

  [I2C SSD1306 OLED]
  GPIO 8  -------------------------------- SDA
  GPIO 9  -------------------------------- SCL

  [I2S INMP441 MIC]
  GPIO 41 -------------------------------- SCK (BCLK)
  GPIO 42 -------------------------------- WS (LRCLK)
  GPIO 40 -------------------------------- SD (DOUT)
  GND     -------------------------------- L/R (Left Channel)

  [I2S MAX98357A AMP]
  GPIO 15 -------------------------------- BCLK
  GPIO 16 -------------------------------- LRC (WS)
  GPIO 17 -------------------------------- DIN
  
  [BUTTONS & LED]
  GPIO 0  -------------------------------- Action Button (Active LOW)
  GPIO 4  -------------------------------- Factory Reset (Hold 5s)
  GPIO 38 -------------------------------- Status Indicator LED
```

## Supported Board Configuration Profiles

### 1. ESP32-S3-DevKitC-1
- Dual-core Xtensa 32-bit LX7 @ 240MHz
- 8MB Octal PSRAM / 8MB Flash
- Hardware I2S0 (Microphone) & I2S1 (Speaker) concurrently supported.

### 2. Standard ESP32-WROOM-32 Dev Module
- Dual-core Xtensa 32-bit LX6 @ 240MHz
- 520KB SRAM / 4MB Flash
- OLED: SDA=21, SCL=22
- MIC: SCK=14, WS=15, SD=32
- SPK: BCLK=26, LRC=25, DIN=27

### 3. ESP32-C3-DevKitM-1
- Single-core 32-bit RISC-V @ 160MHz
- 400KB SRAM / 4MB Flash
- Compact budget footprint.
