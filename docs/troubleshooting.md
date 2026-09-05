# Explore AI Assistant — Troubleshooting Guide

Common hardware, networking, and display diagnostic solutions.

---

## 1. OLED Display Issues

### OLED Does Not Turn On (Blank Screen)
- **Check I2C Address**: Most SSD1306 displays are at `0x3C`, but some clones use `0x3D`. Check `firmware/include/pins.h`.
- **Check SDA / SCL Pins**:
  - ESP32 Default: SDA = GPIO 21, SCL = GPIO 22
  - ESP32-S3: SDA = GPIO 8, SCL = GPIO 9
  - ESP32-C3: SDA = GPIO 4, SCL = GPIO 5
- **Pull-up Resistors**: Most breakout modules include 4.7kΩ pull-ups. If using bare glass displays, ensure 4.7kΩ pull-ups are connected from SDA and SCL to 3.3V.

---

## 2. Wi-Fi & Captive Portal Issues

### Captive Portal Does Not Pop Up Automatically
- If your phone does not automatically trigger the captive portal login notification, open any browser on the connected phone and navigate directly to:
  `http://192.168.4.1` or `http://explore.ai`
- Ensure mobile data is temporarily disabled if your phone aggressively falls back to cellular when a local AP lacks internet connectivity.

### Connection Failed / Stuck on "Connecting"
- Verify your Wi-Fi router supports **2.4 GHz 802.11 b/g/n** (ESP32 does not connect to 5 GHz only SSIDs).
- Ensure password does not contain unsupported multi-byte characters.
- Check signal strength; RSSI worse than -85 dBm may experience packet loss.

---

## 3. Audio & Speaker Noise

### Speaker Makes "Popping" or "Static Buzzing" Sounds
- The MAX98357A requires stable 5V current. Powering from a weak 3.3V pin causes voltage dips and clipping. Connect VIN to the 5V / VBUS pin.
- Solder a 100µF capacitor directly across VIN and GND of the MAX98357A module.
- Keep the I2S clock and data lines away from the Wi-Fi antenna trace on the ESP32.

---

## 4. Factory Reset Procedure

If you entered incorrect credentials or want to re-provision the device:
1. Locate the **Reset Button** (GPIO 4 or hold the Action Button on boot).
2. **Press and hold for 5 seconds**.
3. The OLED will display:
   ```
   FACTORY RESET?
   Release to Cancel
   Resetting in: 5s ... 1s
   ```
4. Release after 5 seconds to wipe NVS and reboot into fresh AP onboarding mode.
