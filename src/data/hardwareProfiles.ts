import { 
  HardwareVariant, 
  CustomHardwareProfile, 
  DisplayType, 
  PinConflict 
} from '../types';

export interface BoardSpecification {
  id: HardwareVariant;
  name: string;
  chipFamily: 'ESP32' | 'ESP32-S3' | 'ESP32-C3' | 'ESP32-S2';
  cpuArchitecture: string;
  flashSizeDefaultMb: number;
  hasPsramDefault: boolean;
  usbType: 'USB-to-UART (CP2102/CH340)' | 'Native USB-OTG / CDC' | 'Direct USB-Serial-JTAG';
  usableGpios: number[];
  inputOnlyGpios: number[];
  strappingGpios: number[];
  flashReservedGpios: number[];
  recommendedPreset: CustomHardwareProfile;
  notes: string;
}

export const HARDWARE_BOARDS: Record<HardwareVariant, BoardSpecification> = {
  'ESP32-S3': {
    id: 'ESP32-S3',
    name: 'ESP32-S3 DevKitC-1 (Dual-Core LX7 + Native USB)',
    chipFamily: 'ESP32-S3',
    cpuArchitecture: 'Xtensa Dual-Core 32-bit LX7 @ 240MHz with AI Vector Instructions',
    flashSizeDefaultMb: 8,
    hasPsramDefault: true,
    usbType: 'Native USB-OTG / CDC',
    usableGpios: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48],
    inputOnlyGpios: [],
    strappingGpios: [0, 3, 45, 46],
    flashReservedGpios: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37], // Octal SPI Flash & PSRAM
    recommendedPreset: {
      variant: 'ESP32-S3',
      boardName: 'ESP32-S3-DevKitC-1-N8R8',
      flashSizeMb: 8,
      psram: true,
      mic: {
        bclk: 41,
        ws: 42,
        sd: 40,
        channel: 'left',
        i2sPort: 0
      },
      amp: {
        bclk: 15,
        lrc: 16,
        din: 17,
        gainDb: 12
      },
      display: {
        type: 'SSD1306_I2C_128x64',
        sda: 8,
        scl: 9,
        i2cAddress: '0x3C',
        i2cFreqKhz: 400,
        width: 128,
        height: 64
      },
      relays: {
        mode: '4ch',
        logic: 'active_low',
        channels: [
          { id: 1, name: 'Light 1 (Living Room)', gpio: 4, state: false },
          { id: 2, name: 'Light 2 (Kitchen)', gpio: 5, state: false },
          { id: 3, name: 'Cooling Fan', gpio: 6, state: false },
          { id: 4, name: 'Smart Outlet', gpio: 7, state: false }
        ]
      },
      controls: {
        actionButton: 0,
        resetButton: 47,
        statusLed: 38
      }
    },
    notes: 'Dual Type-C ports available. Connect to USB port (Native CDC) or UART port for flashing.'
  },

  'ESP32-WROOM': {
    id: 'ESP32-WROOM',
    name: 'ESP32 WROOM-32 / DevKit v1 (Standard 30/38-Pin)',
    chipFamily: 'ESP32',
    cpuArchitecture: 'Xtensa Dual-Core 32-bit LX6 @ 240MHz',
    flashSizeDefaultMb: 4,
    hasPsramDefault: false,
    usbType: 'USB-to-UART (CP2102/CH340)',
    usableGpios: [0, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39],
    inputOnlyGpios: [34, 35, 36, 39], // Cannot be used for relays or outputs
    strappingGpios: [0, 2, 12, 15],
    flashReservedGpios: [6, 7, 8, 9, 10, 11],
    recommendedPreset: {
      variant: 'ESP32-WROOM',
      boardName: 'ESP32-WROOM-32D',
      flashSizeMb: 4,
      psram: false,
      mic: {
        bclk: 14,
        ws: 15,
        sd: 32,
        channel: 'left',
        i2sPort: 0
      },
      amp: {
        bclk: 26,
        lrc: 25,
        din: 27,
        gainDb: 12
      },
      display: {
        type: 'SSD1306_I2C_128x64',
        sda: 21,
        scl: 22,
        i2cAddress: '0x3C',
        i2cFreqKhz: 400,
        width: 128,
        height: 64
      },
      relays: {
        mode: '4ch',
        logic: 'active_low',
        channels: [
          { id: 1, name: 'Relay 1 (Main Light)', gpio: 18, state: false },
          { id: 2, name: 'Relay 2 (Sub Light)', gpio: 19, state: false },
          { id: 3, name: 'Relay 3 (Fan)', gpio: 23, state: false },
          { id: 4, name: 'Relay 4 (Socket)', gpio: 33, state: false }
        ]
      },
      controls: {
        actionButton: 0,
        resetButton: 4,
        statusLed: 2
      }
    },
    notes: 'The most popular classic ESP32 board. GPIO 34, 35, 36, and 39 are input-only.'
  },

  'ESP32-C3': {
    id: 'ESP32-C3',
    name: 'ESP32-C3 DevKitM-1 (Single-Core RISC-V)',
    chipFamily: 'ESP32-C3',
    cpuArchitecture: '32-bit RISC-V Single-Core @ 160MHz',
    flashSizeDefaultMb: 4,
    hasPsramDefault: false,
    usbType: 'Direct USB-Serial-JTAG',
    usableGpios: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 18, 19, 20, 21],
    inputOnlyGpios: [],
    strappingGpios: [2, 8, 9],
    flashReservedGpios: [11, 12, 13, 14, 15, 16, 17],
    recommendedPreset: {
      variant: 'ESP32-C3',
      boardName: 'ESP32-C3-DevKitM-1',
      flashSizeMb: 4,
      psram: false,
      mic: {
        bclk: 6,
        ws: 7,
        sd: 8,
        channel: 'left',
        i2sPort: 0
      },
      amp: {
        bclk: 1,
        lrc: 2,
        din: 3,
        gainDb: 12
      },
      display: {
        type: 'SSD1306_I2C_128x64',
        sda: 4,
        scl: 5,
        i2cAddress: '0x3C',
        i2cFreqKhz: 400,
        width: 128,
        height: 64
      },
      relays: {
        mode: '4ch',
        logic: 'active_low',
        channels: [
          { id: 1, name: 'Relay 1', gpio: 18, state: false },
          { id: 2, name: 'Relay 2', gpio: 19, state: false },
          { id: 3, name: 'Relay 3', gpio: 20, state: false },
          { id: 4, name: 'Relay 4', gpio: 21, state: false }
        ]
      },
      controls: {
        actionButton: 9,
        resetButton: 0,
        statusLed: 10
      }
    },
    notes: 'Ultra-low cost RISC-V core with hardware USB-Serial-JTAG peripheral.'
  },

  'ESP32-CAM': {
    id: 'ESP32-CAM',
    name: 'ESP32-CAM (AI-Thinker OV2640 Module)',
    chipFamily: 'ESP32',
    cpuArchitecture: 'Xtensa Dual-Core 32-bit LX6 @ 240MHz + 4MB PSRAM',
    flashSizeDefaultMb: 4,
    hasPsramDefault: true,
    usbType: 'USB-to-UART (CP2102/CH340)',
    usableGpios: [0, 2, 4, 12, 13, 14, 15, 16],
    inputOnlyGpios: [],
    strappingGpios: [0, 2],
    flashReservedGpios: [6, 7, 8, 9, 10, 11],
    recommendedPreset: {
      variant: 'ESP32-CAM',
      boardName: 'AI-Thinker-ESP32-CAM',
      flashSizeMb: 4,
      psram: true,
      mic: {
        bclk: 14,
        ws: 15,
        sd: 13,
        channel: 'left',
        i2sPort: 0
      },
      amp: {
        bclk: 2,
        lrc: 12,
        din: 16,
        gainDb: 12
      },
      display: {
        type: 'SSD1306_I2C_128x64',
        sda: 13,
        scl: 15,
        i2cAddress: '0x3C',
        i2cFreqKhz: 100,
        width: 128,
        height: 64
      },
      relays: {
        mode: 'none',
        logic: 'active_low',
        channels: []
      },
      controls: {
        actionButton: 0,
        resetButton: 12,
        statusLed: 4 // High power Flash LED
      }
    },
    notes: 'Requires FTDI programmer to GPIO 0 + GND to enter flash mode.'
  },

  'ESP32-WROVER': {
    id: 'ESP32-WROVER',
    name: 'ESP32-WROVER-E (With 8MB PSRAM)',
    chipFamily: 'ESP32',
    cpuArchitecture: 'Xtensa Dual-Core 32-bit LX6 @ 240MHz with 8MB SPIRAM',
    flashSizeDefaultMb: 16,
    hasPsramDefault: true,
    usbType: 'USB-to-UART (CP2102/CH340)',
    usableGpios: [0, 2, 4, 5, 12, 13, 14, 15, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39],
    inputOnlyGpios: [34, 35, 36, 39],
    strappingGpios: [0, 2, 12, 15],
    flashReservedGpios: [6, 7, 8, 9, 10, 11, 16, 17], // GPIO 16, 17 reserved for PSRAM
    recommendedPreset: {
      variant: 'ESP32-WROVER',
      boardName: 'ESP32-WROVER-IE-16MB',
      flashSizeMb: 16,
      psram: true,
      mic: {
        bclk: 14,
        ws: 15,
        sd: 32,
        channel: 'left',
        i2sPort: 0
      },
      amp: {
        bclk: 26,
        lrc: 25,
        din: 27,
        gainDb: 12
      },
      display: {
        type: 'SSD1306_I2C_128x64',
        sda: 21,
        scl: 22,
        i2cAddress: '0x3C',
        i2cFreqKhz: 400,
        width: 128,
        height: 64
      },
      relays: {
        mode: '8ch',
        logic: 'active_low',
        channels: [
          { id: 1, name: 'Light 1', gpio: 4, state: false },
          { id: 2, name: 'Light 2', gpio: 5, state: false },
          { id: 3, name: 'Fan', gpio: 18, state: false },
          { id: 4, name: 'Plug 1', gpio: 19, state: false },
          { id: 5, name: 'Plug 2', gpio: 23, state: false },
          { id: 6, name: 'Heater', gpio: 33, state: false },
          { id: 7, name: 'Pump', gpio: 12, state: false },
          { id: 8, name: 'Alarm', gpio: 13, state: false }
        ]
      },
      controls: {
        actionButton: 0,
        resetButton: 2,
        statusLed: 2
      }
    },
    notes: 'Large PSRAM memory enables local ring buffers for high sample rate audio and large voice models.'
  },

  'ESP32-S2': {
    id: 'ESP32-S2',
    name: 'ESP32-S2 Saola-1 (Single-Core Xtensa LX7 + USB OTG)',
    chipFamily: 'ESP32-S2',
    cpuArchitecture: 'Xtensa Single-Core 32-bit LX7 @ 240MHz',
    flashSizeDefaultMb: 4,
    hasPsramDefault: false,
    usbType: 'Native USB-OTG / CDC',
    usableGpios: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42],
    inputOnlyGpios: [],
    strappingGpios: [0, 45, 46],
    flashReservedGpios: [26, 27, 28, 29, 30, 31, 32],
    recommendedPreset: {
      variant: 'ESP32-S2',
      boardName: 'ESP32-S2-Saola-1',
      flashSizeMb: 4,
      psram: false,
      mic: {
        bclk: 33,
        ws: 34,
        sd: 35,
        channel: 'left',
        i2sPort: 0
      },
      amp: {
        bclk: 36,
        lrc: 37,
        din: 38,
        gainDb: 12
      },
      display: {
        type: 'SSD1306_I2C_128x64',
        sda: 8,
        scl: 9,
        i2cAddress: '0x3C',
        i2cFreqKhz: 400,
        width: 128,
        height: 64
      },
      relays: {
        mode: '4ch',
        logic: 'active_low',
        channels: [
          { id: 1, name: 'Relay 1', gpio: 1, state: false },
          { id: 2, name: 'Relay 2', gpio: 2, state: false },
          { id: 3, name: 'Relay 3', gpio: 3, state: false },
          { id: 4, name: 'Relay 4', gpio: 4, state: false }
        ]
      },
      controls: {
        actionButton: 0,
        resetButton: 14,
        statusLed: 15
      }
    },
    notes: 'Single-core with native USB-OTG full-speed.'
  }
};

export const DISPLAY_MODELS: Record<DisplayType, { 
  name: string; 
  interfaceType: 'I2C' | 'SPI'; 
  resolution: string; 
  controller: string; 
  color: string;
  defaultPins: { sda: number; scl: number; mosi?: number; sclk?: number; cs?: number; dc?: number; rst?: number; blk?: number } 
}> = {
  'SSD1306_I2C_128x64': {
    name: 'SSD1306 Monochrome OLED 128×64 (I2C)',
    interfaceType: 'I2C',
    resolution: '128 × 64',
    controller: 'SSD1306',
    color: 'Monochrome (Blue/White/Yellow)',
    defaultPins: { sda: 21, scl: 22 }
  },
  'SSD1306_SPI_128x64': {
    name: 'SSD1306 Monochrome OLED 128×64 (4-Wire SPI)',
    interfaceType: 'SPI',
    resolution: '128 × 64',
    controller: 'SSD1306',
    color: 'Monochrome (High Refresh)',
    defaultPins: { sda: 0, scl: 0, mosi: 23, sclk: 18, cs: 5, dc: 17, rst: 16 }
  },
  'SH1106_I2C_128x64': {
    name: 'SH1106 1.3" OLED 128×64 (I2C)',
    interfaceType: 'I2C',
    resolution: '128 × 64 (1.3 Inch)',
    controller: 'SH1106',
    color: 'Monochrome (White/Blue)',
    defaultPins: { sda: 21, scl: 22 }
  },
  'SSD1306_I2C_128x32': {
    name: 'SSD1306 Mini OLED 128×32 (I2C)',
    interfaceType: 'I2C',
    resolution: '128 × 32 (0.91 Inch)',
    controller: 'SSD1306',
    color: 'Monochrome (Compact)',
    defaultPins: { sda: 21, scl: 22 }
  },
  'ST7789_SPI_240x240': {
    name: 'ST7789 IPS Full Color Display 240×240 (SPI)',
    interfaceType: 'SPI',
    resolution: '240 × 240 (1.3" / 1.54" IPS)',
    controller: 'ST7789V',
    color: '65K RGB Full Color',
    defaultPins: { sda: 0, scl: 0, mosi: 23, sclk: 18, cs: 5, dc: 2, rst: 4, blk: 15 }
  },
  'ILI9341_SPI_320x240': {
    name: 'ILI9341 Large TFT Display 320×240 (SPI)',
    interfaceType: 'SPI',
    resolution: '320 × 240 (2.4" / 2.8" TFT)',
    controller: 'ILI9341',
    color: '262K RGB Full Color',
    defaultPins: { sda: 0, scl: 0, mosi: 23, sclk: 18, cs: 15, dc: 2, rst: 4, blk: 21 }
  }
};

/**
 * Validate hardware profile and detect pin collisions or invalid GPIO usage
 */
export function validateHardwareProfile(profile: CustomHardwareProfile): PinConflict[] {
  const board = HARDWARE_BOARDS[profile.variant];
  const conflicts: PinConflict[] = [];

  const pinUsageMap: Record<number, string[]> = {};

  const recordUsage = (gpio: number | undefined, deviceName: string) => {
    if (gpio === undefined || gpio < 0) return;
    if (!pinUsageMap[gpio]) {
      pinUsageMap[gpio] = [];
    }
    pinUsageMap[gpio].push(deviceName);
  };

  // 1. Record Mic Pins
  recordUsage(profile.mic.bclk, 'INMP441 Mic (BCLK)');
  recordUsage(profile.mic.ws, 'INMP441 Mic (WS)');
  recordUsage(profile.mic.sd, 'INMP441 Mic (SD)');

  // 2. Record Amp Pins
  recordUsage(profile.amp.bclk, 'MAX98357A Amp (BCLK)');
  recordUsage(profile.amp.lrc, 'MAX98357A Amp (LRC)');
  recordUsage(profile.amp.din, 'MAX98357A Amp (DIN)');
  if (profile.amp.sdModePin !== undefined) {
    recordUsage(profile.amp.sdModePin, 'MAX98357A Amp (SD_MODE)');
  }

  // 3. Record Display Pins
  const isI2C = profile.display.type.includes('I2C');
  if (isI2C) {
    recordUsage(profile.display.sda, 'Display (I2C SDA)');
    recordUsage(profile.display.scl, 'Display (I2C SCL)');
  } else {
    recordUsage(profile.display.mosi, 'Display (SPI MOSI)');
    recordUsage(profile.display.sclk, 'Display (SPI SCLK)');
    recordUsage(profile.display.cs, 'Display (SPI CS)');
    recordUsage(profile.display.dc, 'Display (SPI DC)');
    recordUsage(profile.display.rst, 'Display (SPI RST)');
    if (profile.display.blk !== undefined) {
      recordUsage(profile.display.blk, 'Display (Backlight BLK)');
    }
  }

  // 4. Record Relays
  if (profile.relays.mode !== 'none') {
    profile.relays.channels.forEach((ch) => {
      recordUsage(ch.gpio, `Relay CH${ch.id} (${ch.name})`);
    });
  }

  // 5. Record Controls
  recordUsage(profile.controls.actionButton, 'Action Button (PTT)');
  recordUsage(profile.controls.resetButton, 'Factory Reset Button');
  recordUsage(profile.controls.statusLed, 'Status LED');

  // Check multi-usage
  for (const [gpioStr, devices] of Object.entries(pinUsageMap)) {
    const gpio = parseInt(gpioStr, 10);

    // Collision check
    if (devices.length > 1) {
      // I2C bus sharing is permitted if both are I2C devices, but mic/amp/relays cannot share!
      conflicts.push({
        gpio,
        devices,
        severity: 'error',
        description: `GPIO ${gpio} is assigned to multiple peripherals: ${devices.join(', ')}`
      });
    }

    // Flash reserved check
    if (board.flashReservedGpios.includes(gpio)) {
      conflicts.push({
        gpio,
        devices,
        severity: 'error',
        description: `GPIO ${gpio} is strictly reserved for onboard SPI Flash/PSRAM! Using it will cause ESP32 boot-loop.`
      });
    }

    // Input only check for output peripherals (Relays, Display CS/DC/RST, Amp)
    if (board.inputOnlyGpios.includes(gpio)) {
      const hasOutputRole = devices.some(d => 
        d.includes('Relay') || 
        d.includes('Amp') || 
        d.includes('Display') || 
        d.includes('LED')
      );
      if (hasOutputRole) {
        conflicts.push({
          gpio,
          devices,
          severity: 'error',
          description: `GPIO ${gpio} on ${board.name} is INPUT-ONLY (no output driver circuitry). It cannot drive relays or outputs.`
        });
      }
    }

    // Strapping pins warning
    if (board.strappingGpios.includes(gpio)) {
      conflicts.push({
        gpio,
        devices,
        severity: 'warning',
        description: `GPIO ${gpio} is an ESP32 strapping pin. Ensure external circuitry does not pull it to unexpected state during boot.`
      });
    }
  }

  return conflicts;
}

/**
 * Generate C++ header `pins.h` code based on the custom hardware profile
 */
export function generatePinsHeader(profile: CustomHardwareProfile): string {
  const isI2cDisplay = profile.display.type.includes('I2C');
  const dispModel = DISPLAY_MODELS[profile.display.type];

  return `/**
 * ==============================================================================
 * Auto-Generated Hardware Pin Configuration for Explore AI Assistant
 * Target Board: ${profile.boardName} (${profile.variant})
 * Generated: ${new Date().toISOString()}
 * ==============================================================================
 */

#ifndef EXPLORE_AI_PINS_H
#define EXPLORE_AI_PINS_H

#include <Arduino.h>

// --- Board Architecture & Memory ---
#define BOARD_TARGET_${profile.variant.replace(/-/g, '_')} 1
#define BOARD_NAME                  "${profile.boardName}"
#define BOARD_FLASH_SIZE_MB         ${profile.flashSizeMb}
#define BOARD_HAS_PSRAM             ${profile.psram ? '1' : '0'}

// --- INMP441 I2S MEMS Microphone ---
#define PIN_I2S_MIC_SCK             ${profile.mic.bclk}   // Bit Clock (BCLK)
#define PIN_I2S_MIC_WS              ${profile.mic.ws}     // Word Select (LRCK)
#define PIN_I2S_MIC_SD              ${profile.mic.sd}     // Serial Data (DOUT)
#define I2S_MIC_CHANNEL             ${profile.mic.channel === 'left' ? 'I2S_CHANNEL_FMT_ONLY_LEFT' : 'I2S_CHANNEL_FMT_ONLY_RIGHT'}
#define I2S_MIC_PORT                ${profile.mic.i2sPort}

// --- MAX98357A I2S Class D Amplifier ---
#define PIN_I2S_SPK_BCLK            ${profile.amp.bclk}   // Bit Clock
#define PIN_I2S_SPK_LRC             ${profile.amp.lrc}    // Word Select
#define PIN_I2S_SPK_DIN             ${profile.amp.din}    // Audio Data In
#define MAX98357A_GAIN_DB           ${profile.amp.gainDb}
${profile.amp.sdModePin !== undefined ? `#define PIN_I2S_SPK_SD_MODE        ${profile.amp.sdModePin}` : '// SD_MODE: Floating/Hardwired'}

// --- Display Configuration (${dispModel.name}) ---
#define DISPLAY_TYPE_${profile.display.type} 1
#define SCREEN_WIDTH                ${profile.display.width}
#define SCREEN_HEIGHT               ${profile.display.height}
${isI2cDisplay ? `// I2C OLED
#define PIN_I2C_SDA                 ${profile.display.sda}
#define PIN_I2C_SCL                 ${profile.display.scl}
#define OLED_I2C_ADDRESS            ${profile.display.i2cAddress}
#define I2C_BUS_FREQ_HZ             ${profile.display.i2cFreqKhz * 1000}` : `// SPI Display
#define PIN_SPI_MOSI                ${profile.display.mosi ?? 23}
#define PIN_SPI_SCLK                ${profile.display.sclk ?? 18}
#define PIN_DISPLAY_CS              ${profile.display.cs ?? 5}
#define PIN_DISPLAY_DC              ${profile.display.dc ?? 2}
#define PIN_DISPLAY_RST             ${profile.display.rst ?? 4}
${profile.display.blk !== undefined ? `#define PIN_DISPLAY_BLK             ${profile.display.blk}` : ''}`}

// --- Relay Control Modules (${profile.relays.mode.toUpperCase()}) ---
#define RELAY_MODE_${profile.relays.mode.toUpperCase()} 1
#define RELAY_TRIGGER_${profile.relays.logic === 'active_low' ? 'ACTIVE_LOW' : 'ACTIVE_HIGH'} 1
#define RELAY_COUNT                 ${profile.relays.channels.length}

${profile.relays.channels.map(ch => 
  `#define PIN_RELAY_${ch.id}                ${ch.gpio}  // ${ch.name}`
).join('\n')}

// --- Physical Buttons & Indicators ---
#define PIN_BUTTON_ACTION           ${profile.controls.actionButton}  // Push-to-talk / Boot
#define PIN_BUTTON_RESET            ${profile.controls.resetButton}   // Factory wipe hold 5s
#define PIN_STATUS_LED              ${profile.controls.statusLed}     // Status indicator

#endif // EXPLORE_AI_PINS_H
`;
}

/**
 * Generate full C++ Relay controller module code
 */
export function generateRelayControllerCpp(profile: CustomHardwareProfile): string {
  if (profile.relays.mode === 'none' || profile.relays.channels.length === 0) {
    return `// Relay controller disabled (Relay mode: none)\nvoid initRelays() {}\nvoid setRelay(int ch, bool on) {}\n`;
  }

  const isLow = profile.relays.logic === 'active_low';
  const onVal = isLow ? 'LOW' : 'HIGH';
  const offVal = isLow ? 'HIGH' : 'LOW';

  return `/**
 * Relay Module Controller (4ch / 8ch)
 * Logic: ${isLow ? 'Active LOW (0V activates relay)' : 'Active HIGH (3.3V activates relay)'}
 */
#include <Arduino.h>
#include "include/pins.h"

struct RelayPinMap {
    uint8_t id;
    uint8_t pin;
    const char* name;
    bool state;
};

static RelayPinMap g_relays[] = {
${profile.relays.channels.map(ch => 
  `    { ${ch.id}, PIN_RELAY_${ch.id}, "${ch.name}", false },`
).join('\n')}
};

const size_t NUM_RELAYS = sizeof(g_relays) / sizeof(g_relays[0]);

void initRelays() {
    Serial.printf("[RELAY] Initializing %d relays (${isLow ? 'Active LOW' : 'Active HIGH'})...\\n", NUM_RELAYS);
    for (size_t i = 0; i < NUM_RELAYS; i++) {
        pinMode(g_relays[i].pin, OUTPUT);
        digitalWrite(g_relays[i].pin, ${offVal}); // Default OFF
        g_relays[i].state = false;
        Serial.printf("[RELAY] CH%d on GPIO %d ('%s') initialized OFF.\\n", 
            g_relays[i].id, g_relays[i].pin, g_relays[i].name);
    }
}

void setRelay(uint8_t channelId, bool state) {
    for (size_t i = 0; i < NUM_RELAYS; i++) {
        if (g_relays[i].id == channelId) {
            g_relays[i].state = state;
            digitalWrite(g_relays[i].pin, state ? ${onVal} : ${offVal});
            Serial.printf("[RELAY] Channel %d ('%s') set to %s\\n", 
                channelId, g_relays[i].name, state ? "ON" : "OFF");
            return;
        }
    }
}

void toggleRelay(uint8_t channelId) {
    for (size_t i = 0; i < NUM_RELAYS; i++) {
        if (g_relays[i].id == channelId) {
            setRelay(channelId, !g_relays[i].state);
            return;
        }
    }
}

void setAllRelays(bool state) {
    for (size_t i = 0; i < NUM_RELAYS; i++) {
        setRelay(g_relays[i].id, state);
    }
}
`;
}
