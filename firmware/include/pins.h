#ifndef EXPLORE_AI_PINS_H
#define EXPLORE_AI_PINS_H

#include <Arduino.h>

/**
 * ==============================================================================
 * Centralized Hardware Pin Definitions for Explore AI Assistant
 * Supports:
 *   - Standard ESP32 (WROOM-32 / ESP32-WROVER)
 *   - ESP32-S3 (Dual-core Xtensa LX7 with native USB & PSRAM)
 *   - ESP32-C3 (Single-core RISC-V)
 * ==============================================================================
 */

#if defined(CONFIG_IDF_TARGET_ESP32S3) || defined(BOARD_ESP32_S3) || defined(ARDUINO_ESP32S3_DEV)
    // --------------------------------------------------------------------------
    // ESP32-S3 Pinout Mapping
    // --------------------------------------------------------------------------
    // I2C OLED (SSD1306 128x64)
    #define PIN_I2C_SDA         8
    #define PIN_I2C_SCL         9
    #define OLED_RESET_PIN      -1 // Reset shared with system or floating
    #define OLED_I2C_ADDRESS    0x3C

    // INMP441 I2S Digital Microphone
    #define PIN_I2S_MIC_SCK     41 // Serial Clock (BCLK)
    #define PIN_I2S_MIC_WS      42 // Word Select (LRCLK)
    #define PIN_I2S_MIC_SD      40 // Serial Data Output from mic

    // MAX98357A I2S Digital Amplifier
    #define PIN_I2S_SPK_BCLK    15 // Bit Clock
    #define PIN_I2S_SPK_LRC     16 // Left/Right Clock (WS)
    #define PIN_I2S_SPK_DIN     17 // Data In to amplifier

    // User Controls & Indicators
    #define PIN_BUTTON_ACTION   0  // Action / Push-to-Talk button (Active LOW)
    #define PIN_BUTTON_RESET    4  // Dedicated reset/config button (Active LOW)
    #define PIN_STATUS_LED      38 // Onboard status/RGB or digital LED (Active HIGH)

#elif defined(CONFIG_IDF_TARGET_ESP32C3) || defined(BOARD_ESP32_C3) || defined(ARDUINO_ESP32C3_DEV)
    // --------------------------------------------------------------------------
    // ESP32-C3 Pinout Mapping
    // --------------------------------------------------------------------------
    #define PIN_I2C_SDA         4
    #define PIN_I2C_SCL         5
    #define OLED_RESET_PIN      -1
    #define OLED_I2C_ADDRESS    0x3C

    #define PIN_I2S_MIC_SCK     6
    #define PIN_I2S_MIC_WS      7
    #define PIN_I2S_MIC_SD      8

    #define PIN_I2S_SPK_BCLK    1
    #define PIN_I2S_SPK_LRC     2
    #define PIN_I2S_SPK_DIN     3

    #define PIN_BUTTON_ACTION   9
    #define PIN_BUTTON_RESET    0
    #define PIN_STATUS_LED      10

#else
    // --------------------------------------------------------------------------
    // Standard ESP32 DevKit (WROOM-32 30/38 pin)
    // --------------------------------------------------------------------------
    // I2C OLED (SSD1306 128x64)
    #define PIN_I2C_SDA         21
    #define PIN_I2C_SCL         22
    #define OLED_RESET_PIN      -1
    #define OLED_I2C_ADDRESS    0x3C

    // INMP441 I2S Digital Microphone
    #define PIN_I2S_MIC_SCK     14 // BCLK
    #define PIN_I2S_MIC_WS      15 // LRC
    #define PIN_I2S_MIC_SD      32 // DIN to ESP32 (Microphone SD)

    // MAX98357A I2S Digital Amplifier
    #define PIN_I2S_SPK_BCLK    26 // BCLK
    #define PIN_I2S_SPK_LRC     25 // LRC
    #define PIN_I2S_SPK_DIN     27 // DOUT from ESP32 (Amp DIN)

    // User Controls & Indicators
    #define PIN_BUTTON_ACTION   0  // Action button (Boot button or external GPIO 0)
    #define PIN_BUTTON_RESET    4  // Secondary reset / pairing button
    #define PIN_STATUS_LED      2  // Built-in Blue LED
#endif

// Hardware configuration flags
#define OLED_SCREEN_WIDTH       128
#define OLED_SCREEN_HEIGHT      64

#endif // EXPLORE_AI_PINS_H
