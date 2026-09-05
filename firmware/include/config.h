#ifndef EXPLORE_AI_CONFIG_H
#define EXPLORE_AI_CONFIG_H

#include <Arduino.h>

/**
 * ==============================================================================
 * Global Configuration for Explore AI Assistant
 * ==============================================================================
 */

// Wi-Fi Access Point & Captive Portal
#define AP_SSID_DEFAULT             "Explore AI"
#define AP_PASSWORD_DEFAULT         ""              // Open network for simple onboarding
#define AP_IP_DEFAULT               "192.168.4.1"
#define AP_CHANNEL_DEFAULT          1
#define AP_MAX_CONNECTIONS          4
#define DNS_PORT                    53
#define HTTP_PORT                   80

// Wi-Fi Client Timeouts
#define WIFI_CONNECT_TIMEOUT_MS     15000           // 15 seconds connection timeout
#define WIFI_RECONNECT_MAX_BACKOFF  30000           // Max 30 seconds exponential backoff
#define WIFI_SCAN_INTERVAL_MS       20000

// NVS Namespaces & Keys
#define NVS_NAMESPACE_WIFI          "explore_wifi"
#define NVS_NAMESPACE_DEVICE        "explore_dev"
#define NVS_KEY_SSID                "ssid"
#define NVS_KEY_PASSWORD            "pass"
#define NVS_KEY_DEVICE_ID           "device_id"
#define NVS_KEY_PAIRING_CODE        "pair_code"
#define NVS_KEY_IS_PAIRED           "is_paired"
#define NVS_KEY_LANGUAGE            "language"
#define NVS_KEY_VOICE               "voice"
#define NVS_KEY_VOICE_MODE          "voice_mode"

// Factory Reset
#define FACTORY_RESET_HOLD_MS       5000            // Hold button 5 seconds to trigger reset
#define BUTTON_DEBOUNCE_MS          50

// Serial & Logging
#define SERIAL_BAUD_RATE            115200
#define LOG_LEVEL_VERBOSE           1

// Cloud Defaults (Configurable via Web / NVS)
#define DEFAULT_CLOUD_API_URL       "https://api.exploreai.example"
#define DEFAULT_CLOUD_WSS_URL       "wss://api.exploreai.example/ws"

// Audio Specifications
#define AUDIO_SAMPLE_RATE           16000           // 16 kHz mono standard for speech
#define AUDIO_BITS_PER_SAMPLE       16
#define AUDIO_I2S_DMA_BUF_COUNT     8
#define AUDIO_I2S_DMA_BUF_LEN       512

#endif // EXPLORE_AI_CONFIG_H
