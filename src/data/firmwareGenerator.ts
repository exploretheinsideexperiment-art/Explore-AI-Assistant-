/**
 * Unified Firmware & PlatformIO Project Generator for Explore AI Assistant
 * Combines full libraries, pin definitions, Wi-Fi management, Webhook triggers,
 * and MQTT telemetry/control into production-ready C++ / Arduino code.
 */

import { CustomHardwareProfile, AgentSettings } from '../types';
import { DISPLAY_MODELS } from './hardwareProfiles';

/**
 * Generates the complete, self-contained, single-file Arduino sketch (.ino / main.cpp).
 * Ready to open directly in Arduino IDE or compile as a single-source project!
 */
export function generateUnifiedFirmwareIno(
  profile: CustomHardwareProfile,
  settings?: AgentSettings
): string {
  const isI2c = profile.display.type.includes('I2C');
  const isLowRelay = profile.relays.logic === 'active_low';
  const onVal = isLowRelay ? 'LOW' : 'HIGH';
  const offVal = isLowRelay ? 'HIGH' : 'LOW';

  const webhookEnabled = profile.cloudIntegration?.webhook?.enabled && 
    (profile.cloudIntegration.protocol === 'webhook' || profile.cloudIntegration.protocol === 'both');

  const mqttEnabled = profile.cloudIntegration?.mqtt?.enabled && 
    (profile.cloudIntegration.protocol === 'mqtt' || profile.cloudIntegration.protocol === 'both');

  const wifiConfig = profile.wifi || {
    ssid: 'MyHomeWiFi',
    password: 'WiFiPassword123',
    apSsid: 'Explore-AI-Assistant',
    apPassword: '',
    staticIpEnabled: false,
    staticIp: '192.168.1.200',
    gateway: '192.168.1.1',
    subnet: '255.255.255.0',
    dns: '8.8.8.8',
    autoReconnect: true,
    connectTimeoutSec: 15
  };

  const webhookConfig = profile.cloudIntegration?.webhook || {
    enabled: true,
    endpointUrl: 'https://webhook.site/explore-ai-demo',
    authToken: 'Bearer secret_token_xyz',
    httpMethod: 'POST',
    triggerOnRelay: true,
    triggerOnVoice: true
  };

  const mqttConfig = profile.cloudIntegration?.mqtt || {
    enabled: true,
    brokerHost: 'broker.hivemq.com',
    brokerPort: 1883,
    clientId: 'explore-ai-esp32',
    username: '',
    password: '',
    baseTopic: 'explore_ai/esp32',
    subscribeRelayCommands: true,
    publishTelemetry: true,
    qos: 0
  };

  const dispModel = DISPLAY_MODELS[profile.display.type] || DISPLAY_MODELS['SSD1306_I2C_128x64'];

  return `/**
 * ==============================================================================
 * EXPLORE AI ASSISTANT - COMPLETE UNIFIED FIRMWARE
 * Target Board: ${profile.boardName} (${profile.variant})
 * Architecture: ESP32 + INMP441 + MAX98357A + OLED + Relays + Wi-Fi + MQTT + Webhooks
 * Auto-Generated: ${new Date().toISOString()}
 * ==============================================================================
 *
 * REQUIRED ARDUINO LIBRARIES:
 * 1. Adafruit SSD1306       (by Adafruit, version ^2.5.9)
 * 2. Adafruit GFX Library   (by Adafruit, version ^1.11.9)
 * 3. ArduinoJson            (by Benoit Blanchon, version ^7.0.4)
 * 4. PubSubClient           (by Nick O'Leary, version ^2.8) - for MQTT
 * 
 * ARDUINO IDE BOARD CONFIGURATION:
 * - Board: "ESP32S3 Dev Module" / "ESP32 Dev Module" (matches ${profile.variant})
 * - Flash Size: "${profile.flashSizeMb}MB"
 * - PSRAM: "${profile.psram ? 'OPI / QSPI PSRAM Enabled' : 'Disabled'}"
 * - Partition Scheme: "Huge APP (3MB No OTA / 1MB SPIFFS)" or "default_8MB.csv"
 * - Core Debug Level: "Info"
 * ==============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <driver/i2s.h>
#include <Preferences.h>

// ==============================================================================
// 1. PIN DEFINITIONS & HARDWARE CONSTANTS
// ==============================================================================
#define BOARD_TARGET_${profile.variant.replace(/-/g, '_')} 1
#define BOARD_NAME                "${profile.boardName}"
#define SERIAL_BAUD_RATE          115200

// --- INMP441 I2S Microphone ---
#define PIN_I2S_MIC_SCK           ${profile.mic.bclk}   // Bit Clock (BCLK)
#define PIN_I2S_MIC_WS            ${profile.mic.ws}     // Word Select (LRCK)
#define PIN_I2S_MIC_SD            ${profile.mic.sd}     // Serial Data In (DOUT)
#define I2S_MIC_PORT              I2S_NUM_${profile.mic.i2sPort}
#define I2S_SAMPLE_RATE           16000

// --- MAX98357A I2S Amplifier ---
#define PIN_I2S_SPK_BCLK          ${profile.amp.bclk}   // Bit Clock
#define PIN_I2S_SPK_LRC           ${profile.amp.lrc}    // Word Select
#define PIN_I2S_SPK_DIN           ${profile.amp.din}    // Data Out
#define MAX98357A_GAIN_DB         ${profile.amp.gainDb}
${profile.amp.sdModePin !== undefined ? `#define PIN_I2S_SPK_SD_MODE      ${profile.amp.sdModePin}` : '// SD_MODE: Unconnected / Hardwired'}

// --- Display: ${dispModel.name} ---
#define SCREEN_WIDTH              ${profile.display.width}
#define SCREEN_HEIGHT             ${profile.display.height}
#define OLED_RESET                -1
${isI2c ? `// I2C OLED Bus
#define PIN_I2C_SDA               ${profile.display.sda}
#define PIN_I2C_SCL               ${profile.display.scl}
#define OLED_I2C_ADDRESS          ${profile.display.i2cAddress}
#define I2C_FREQ_HZ               ${profile.display.i2cFreqKhz * 1000}` : `// SPI Display Bus
#define PIN_SPI_MOSI              ${profile.display.mosi ?? 23}
#define PIN_SPI_SCLK              ${profile.display.sclk ?? 18}
#define PIN_DISPLAY_CS            ${profile.display.cs ?? 5}
#define PIN_DISPLAY_DC            ${profile.display.dc ?? 2}
#define PIN_DISPLAY_RST           ${profile.display.rst ?? 4}`}

// --- Physical Buttons & Indicators ---
#define PIN_BUTTON_ACTION         ${profile.controls.actionButton}  // Push-to-Talk / Boot button
#define PIN_BUTTON_RESET          ${profile.controls.resetButton}   // Factory reset wipe (hold 5s)
#define PIN_STATUS_LED            ${profile.controls.statusLed}     // Builtin Status LED

// --- Relay Control (${profile.relays.mode.toUpperCase()} - ${isLowRelay ? 'Active LOW' : 'Active HIGH'}) ---
#define RELAY_COUNT               ${profile.relays.channels.length}
#define RELAY_STATE_ON            ${onVal}
#define RELAY_STATE_OFF           ${offVal}

// ==============================================================================
// 2. WI-FI & NETWORK PARAMETERS
// ==============================================================================
const char* WIFI_SSID             = "${wifiConfig.ssid}";
const char* WIFI_PASSWORD         = "${wifiConfig.password}";
const char* SOFTAP_SSID           = "${wifiConfig.apSsid}";
const char* SOFTAP_PASSWORD       = "${wifiConfig.apPassword}";
const bool  AUTO_RECONNECT        = ${wifiConfig.autoReconnect ? 'true' : 'false'};
const int   CONNECT_TIMEOUT_SEC   = ${wifiConfig.connectTimeoutSec};

${wifiConfig.staticIpEnabled ? `// Static IP Configuration
IPAddress STATIC_IP(${wifiConfig.staticIp.replace(/\./g, ', ')});
IPAddress GATEWAY_IP(${wifiConfig.gateway.replace(/\./g, ', ')});
IPAddress SUBNET_MASK(${wifiConfig.subnet.replace(/\./g, ', ')});
IPAddress DNS_IP(${wifiConfig.dns.replace(/\./g, ', ')});` : '// DHCP Dynamic IP Addressing enabled'}

// ==============================================================================
// 3. CLOUD INTEGRATIONS (WEBHOOK & MQTT)
// ==============================================================================
// Webhook Settings
const bool  WEBHOOK_ENABLED       = ${webhookEnabled ? 'true' : 'false'};
const char* WEBHOOK_URL           = "${webhookConfig.endpointUrl}";
const char* WEBHOOK_AUTH_TOKEN    = "${webhookConfig.authToken}";
const bool  WEBHOOK_TRIG_RELAY    = ${webhookConfig.triggerOnRelay ? 'true' : 'false'};
const bool  WEBHOOK_TRIG_VOICE    = ${webhookConfig.triggerOnVoice ? 'true' : 'false'};

// MQTT Settings
const bool  MQTT_ENABLED          = ${mqttEnabled ? 'true' : 'false'};
const char* MQTT_BROKER           = "${mqttConfig.brokerHost}";
const int   MQTT_PORT             = ${mqttConfig.brokerPort};
const char* MQTT_CLIENT_ID        = "${mqttConfig.clientId}";
const char* MQTT_USER             = "${mqttConfig.username}";
const char* MQTT_PASS             = "${mqttConfig.password}";
const char* MQTT_BASE_TOPIC       = "${mqttConfig.baseTopic}";
const bool  MQTT_SUB_RELAY_CMDS   = ${mqttConfig.subscribeRelayCommands ? 'true' : 'false'};
const bool  MQTT_PUB_TELEMETRY    = ${mqttConfig.publishTelemetry ? 'true' : 'false'};

// ==============================================================================
// 4. DATA STRUCTURES & GLOBAL OBJECTS
// ==============================================================================
enum AssistantFaceState {
    FACE_IDLE,
    FACE_LISTENING,
    FACE_THINKING,
    FACE_SPEAKING,
    FACE_HAPPY,
    FACE_ERROR
};

struct RelayChannelConfig {
    uint8_t id;
    uint8_t pin;
    const char* name;
    bool state;
};

static RelayChannelConfig g_relays[] = {
${profile.relays.channels.length > 0 ? profile.relays.channels.map(ch => 
`    { ${ch.id}, ${ch.gpio}, "${ch.name}", false },`
).join('\n') : '    // No relays configured in profile'}
};

const size_t NUM_RELAYS = sizeof(g_relays) / sizeof(g_relays[0]);

// Display & Client Instances
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
WiFiClient espClient;
PubSubClient mqttClient(espClient);
Preferences prefs;
DNSServer dnsServer;
WebServer webServer(80);

// Runtime States
AssistantFaceState g_faceState = FACE_IDLE;
unsigned long g_lastAnimationTick = 0;
unsigned long g_lastMqttCheck = 0;
unsigned long g_lastTelemetryTick = 0;
unsigned long g_resetBtnPressStart = 0;
bool g_isResetBtnDown = false;
bool g_inSoftApMode = false;
int g_eyeXOffset = 0;

// ==============================================================================
// 5. RELAY CONTROLLER IMPLEMENTATION
// ==============================================================================
void initRelays() {
    Serial.printf("[RELAY] Initializing %d relay channels (%s)...\\n", 
                  NUM_RELAYS, "${isLowRelay ? 'Active LOW' : 'Active HIGH'}");
    for (size_t i = 0; i < NUM_RELAYS; i++) {
        pinMode(g_relays[i].pin, OUTPUT);
        digitalWrite(g_relays[i].pin, RELAY_STATE_OFF);
        g_relays[i].state = false;
        Serial.printf("[RELAY] CH%d on GPIO %d ('%s') initialized OFF.\\n", 
                      g_relays[i].id, g_relays[i].pin, g_relays[i].name);
    }
}

void triggerWebhook(const char* eventType, int channelId = 0, bool state = false);
void publishMqttRelayState(int channelId, bool state);

void setRelay(uint8_t channelId, bool state) {
    for (size_t i = 0; i < NUM_RELAYS; i++) {
        if (g_relays[i].id == channelId) {
            g_relays[i].state = state;
            digitalWrite(g_relays[i].pin, state ? RELAY_STATE_ON : RELAY_STATE_OFF);
            Serial.printf("[RELAY] Channel %d ('%s') -> %s\\n", 
                          channelId, g_relays[i].name, state ? "ON" : "OFF");

            // Notify via Webhook
            if (WEBHOOK_ENABLED && WEBHOOK_TRIG_RELAY) {
                triggerWebhook("relay_toggle", channelId, state);
            }

            // Notify via MQTT
            if (MQTT_ENABLED && mqttClient.connected()) {
                publishMqttRelayState(channelId, state);
            }
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

// ==============================================================================
// 6. WEBHOOK & HTTP DISPATCHER
// ==============================================================================
void triggerWebhook(const char* eventType, int channelId, bool state) {
    if (!WEBHOOK_ENABLED || WiFi.status() != WL_CONNECTED || strlen(WEBHOOK_URL) == 0) {
        return;
    }

    HTTPClient http;
    http.begin(WEBHOOK_URL);
    http.addHeader("Content-Type", "application/json");
    if (strlen(WEBHOOK_AUTH_TOKEN) > 0) {
        http.addHeader("Authorization", WEBHOOK_AUTH_TOKEN);
    }

    StaticJsonDocument<256> doc;
    doc["device_name"] = BOARD_NAME;
    doc["event"] = eventType;
    doc["ip"] = WiFi.localIP().toString();
    doc["rssi"] = WiFi.RSSI();
    doc["timestamp"] = millis();

    if (channelId > 0) {
        doc["channel"] = channelId;
        doc["state"] = state ? "ON" : "OFF";
    }

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    int httpCode = http.POST(jsonPayload);
    if (httpCode > 0) {
        Serial.printf("[WEBHOOK] Sent '%s' to %s -> Code: %d\\n", eventType, WEBHOOK_URL, httpCode);
    } else {
        Serial.printf("[WEBHOOK] Error sending payload: %s\\n", http.errorToString(httpCode).c_str());
    }
    http.end();
}

// ==============================================================================
// 7. MQTT BROKER CLIENT & TOPIC HANDLER
// ==============================================================================
void onMqttMessageReceived(char* topic, byte* payload, unsigned int length) {
    String msg;
    for (unsigned int i = 0; i < length; i++) {
        msg += (char)payload[i];
    }
    msg.trim();
    Serial.printf("[MQTT] Received on [%s]: %s\\n", topic, msg.c_str());

    String cmdTopic = String(MQTT_BASE_TOPIC) + "/relay/set";
    if (String(topic) == cmdTopic) {
        // Parse JSON: {"channel": 1, "state": "ON"} OR simple text "1:ON"
        StaticJsonDocument<256> doc;
        DeserializationError err = deserializeJson(doc, msg);
        if (!err) {
            int ch = doc["channel"] | 0;
            const char* st = doc["state"] | "";
            bool turnOn = (String(st).equalsIgnoreCase("ON") || doc["state"] == true || doc["state"] == 1);
            if (ch > 0) setRelay(ch, turnOn);
        } else {
            // Text fallback format: "1:1", "1:ON", "ALL:OFF"
            int colonIdx = msg.indexOf(':');
            if (colonIdx > 0) {
                String chStr = msg.substring(0, colonIdx);
                String valStr = msg.substring(colonIdx + 1);
                valStr.toUpperCase();
                bool turnOn = (valStr == "ON" || valStr == "1" || valStr == "TRUE");
                if (chStr.equalsIgnoreCase("ALL")) {
                    setAllRelays(turnOn);
                } else {
                    setRelay(chStr.toInt(), turnOn);
                }
            }
        }
    }
}

void publishMqttRelayState(int channelId, bool state) {
    if (!MQTT_ENABLED || !mqttClient.connected()) return;
    String topic = String(MQTT_BASE_TOPIC) + "/relay/" + String(channelId) + "/state";
    const char* val = state ? "ON" : "OFF";
    mqttClient.publish(topic.c_str(), val, true);
}

void publishMqttTelemetry() {
    if (!MQTT_ENABLED || !mqttClient.connected()) return;

    StaticJsonDocument<512> doc;
    doc["board"] = BOARD_NAME;
    doc["ip"] = WiFi.localIP().toString();
    doc["rssi"] = WiFi.RSSI();
    doc["uptime_sec"] = millis() / 1000;
    doc["free_heap"] = ESP.getFreeHeap();

    JsonObject relaysObj = doc.createNestedObject("relays");
    for (size_t i = 0; i < NUM_RELAYS; i++) {
        relaysObj[String(g_relays[i].id)] = g_relays[i].state ? "ON" : "OFF";
    }

    String telemetryStr;
    serializeJson(doc, telemetryStr);
    String topic = String(MQTT_BASE_TOPIC) + "/status";
    mqttClient.publish(topic.c_str(), telemetryStr.c_str());
    Serial.printf("[MQTT] Published status telemetry to [%s]\\n", topic.c_str());
}

void ensureMqttConnection() {
    if (!MQTT_ENABLED || WiFi.status() != WL_CONNECTED) return;

    if (!mqttClient.connected()) {
        Serial.printf("[MQTT] Connecting to broker %s:%d...\\n", MQTT_BROKER, MQTT_PORT);
        String subTopic = String(MQTT_BASE_TOPIC) + "/relay/set";
        
        bool ok = false;
        if (strlen(MQTT_USER) > 0) {
            ok = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS);
        } else {
            ok = mqttClient.connect(MQTT_CLIENT_ID);
        }

        if (ok) {
            Serial.println("[MQTT] Connected successfully!");
            mqttClient.subscribe(subTopic.c_str());
            Serial.printf("[MQTT] Subscribed to [%s]\\n", subTopic.c_str());

            // Announce presence
            String birthTopic = String(MQTT_BASE_TOPIC) + "/presence";
            mqttClient.publish(birthTopic.c_str(), "online", true);

            // Publish initial relay states
            for (size_t i = 0; i < NUM_RELAYS; i++) {
                publishMqttRelayState(g_relays[i].id, g_relays[i].state);
            }
        } else {
            Serial.printf("[MQTT] Connection failed, state code: %d\\n", mqttClient.state());
        }
    }
}

// ==============================================================================
// 8. OLED DISPLAY PROCEDURAL FACIAL EXPRESSIONS
// ==============================================================================
void drawOledFace(AssistantFaceState state, int lookX) {
    display.clearDisplay();

    int eyeWidth = 28;
    int eyeHeight = 36;
    int eyeRadius = 12;
    int leftEyeX = 22 + lookX;
    int rightEyeX = 78 + lookX;
    int eyeY = 14;

    switch (state) {
        case FACE_IDLE:
            // Relaxed rounded eyes
            display.fillRoundRect(leftEyeX, eyeY, eyeWidth, eyeHeight, eyeRadius, SSD1306_WHITE);
            display.fillRoundRect(rightEyeX, eyeY, eyeWidth, eyeHeight, eyeRadius, SSD1306_WHITE);
            break;

        case FACE_LISTENING:
            // Big open curious eyes with dilated pupils
            display.fillRoundRect(leftEyeX - 2, eyeY - 4, eyeWidth + 4, eyeHeight + 8, eyeRadius + 4, SSD1306_WHITE);
            display.fillRoundRect(rightEyeX - 2, eyeY - 4, eyeWidth + 4, eyeHeight + 8, eyeRadius + 4, SSD1306_WHITE);
            display.fillCircle(leftEyeX + eyeWidth / 2, eyeY + eyeHeight / 2, 5, SSD1306_BLACK);
            display.fillCircle(rightEyeX + eyeWidth / 2, eyeY + eyeHeight / 2, 5, SSD1306_BLACK);
            break;

        case FACE_THINKING:
            // Squinting analytical eyes
            display.fillRoundRect(leftEyeX, eyeY + 10, eyeWidth, 14, 6, SSD1306_WHITE);
            display.fillRoundRect(rightEyeX, eyeY + 10, eyeWidth, 14, 6, SSD1306_WHITE);
            break;

        case FACE_SPEAKING:
            // Bouncing animated eyes + sound wave bar
            display.fillRoundRect(leftEyeX, eyeY + 4, eyeWidth, eyeHeight - 8, eyeRadius, SSD1306_WHITE);
            display.fillRoundRect(rightEyeX, eyeY + 4, eyeWidth, eyeHeight - 8, eyeRadius, SSD1306_WHITE);
            // Audio wave bar below
            display.fillRect(44, 56, 40, 4, SSD1306_WHITE);
            break;

        case FACE_HAPPY:
            // Inverted arcs / happy squint
            display.drawCircle(leftEyeX + 14, eyeY + 20, 16, SSD1306_WHITE);
            display.drawCircle(rightEyeX + 14, eyeY + 20, 16, SSD1306_WHITE);
            display.fillRect(0, eyeY + 20, 128, 20, SSD1306_BLACK);
            break;

        case FACE_ERROR:
            // X X eyes
            display.drawLine(leftEyeX, eyeY + 6, leftEyeX + eyeWidth, eyeY + eyeHeight - 6, SSD1306_WHITE);
            display.drawLine(leftEyeX + eyeWidth, eyeY + 6, leftEyeX, eyeY + eyeHeight - 6, SSD1306_WHITE);
            display.drawLine(rightEyeX, eyeY + 6, rightEyeX + eyeWidth, eyeY + eyeHeight - 6, SSD1306_WHITE);
            display.drawLine(rightEyeX + eyeWidth, eyeY + 6, rightEyeX, eyeY + eyeHeight - 6, SSD1306_WHITE);
            break;
    }

    // Mini status bar at bottom
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 56);
    if (WiFi.status() == WL_CONNECTED) {
        display.print("WiFi: OK ");
        display.print(WiFi.localIP().toString().c_str());
    } else if (g_inSoftApMode) {
        display.print("AP: 192.168.4.1");
    } else {
        display.print("Connecting WiFi...");
    }

    display.display();
}

// ==============================================================================
// 9. WI-FI & CAPTIVE PORTAL PROVISIONING
// ==============================================================================
void startSoftAP() {
    Serial.printf("[WIFI] Starting Fallback SoftAP '%s'...\\n", SOFTAP_SSID);
    g_inSoftApMode = true;
    WiFi.mode(WIFI_AP);
    IPAddress apIP(192, 168, 4, 1);
    WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
    WiFi.softAP(SOFTAP_SSID, SOFTAP_PASSWORD);

    dnsServer.start(53, "*", apIP);

    webServer.onNotFound([]() {
        String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><title>Explore AI Setup</title>";
        html += "<style>body{font-family:sans-serif;background:#0f172a;color:#fff;padding:24px;text-align:center;}";
        html += "input,button{width:100%;max-width:320px;padding:12px;margin:8px 0;border-radius:8px;border:none;box-sizing:border-box;}";
        html += "input{background:#1e293b;color:#fff;}button{background:#06b6d4;font-weight:bold;cursor:pointer;}</style></head>";
        html += "<body><h2>Explore AI Assistant</h2><p>Configure Local Wi-Fi</p>";
        html += "<form method='POST' action='/save'>";
        html += "<input name='ssid' placeholder='Wi-Fi Network Name (SSID)' required><br>";
        html += "<input name='pass' type='password' placeholder='Wi-Fi Password'><br>";
        html += "<button type='submit'>Save & Connect</button></form></body></html>";
        webServer.send(200, "text/html", html);
    });

    webServer.on("/save", HTTP_POST, []() {
        String s = webServer.arg("ssid");
        String p = webServer.arg("pass");
        prefs.begin("wifi", false);
        prefs.putString("ssid", s);
        prefs.putString("pass", p);
        prefs.end();
        webServer.send(200, "text/html", "<h3>Credentials Saved! Rebooting...</h3>");
        delay(1000);
        ESP.restart();
    });

    webServer.begin();
    Serial.printf("[WIFI] Captive portal live at 192.168.4.1\\n");
}

void connectWiFi() {
    Serial.printf("[WIFI] Connecting to '%s'...\\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);

    ${wifiConfig.staticIpEnabled ? `
    // Apply Static IP
    WiFi.config(STATIC_IP, GATEWAY_IP, SUBNET_MASK, DNS_IP);
    ` : ''}

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int elapsed = 0;
    while (WiFi.status() != WL_CONNECTED && elapsed < CONNECT_TIMEOUT_SEC) {
        delay(1000);
        elapsed++;
        Serial.print(".");
        digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        digitalWrite(PIN_STATUS_LED, HIGH);
        Serial.printf("[WIFI] Connected! IP: %s | RSSI: %d dBm\\n", 
                      WiFi.localIP().toString().c_str(), WiFi.RSSI());
        if (WEBHOOK_ENABLED) {
            triggerWebhook("device_online");
        }
    } else {
        Serial.println("[WIFI] Failed to connect within timeout. Launching SoftAP portal...");
        startSoftAP();
    }
}

// ==============================================================================
// 10. I2S AUDIO PERIPHERAL INITIALIZATION
// ==============================================================================
void initI2SMicrophone() {
    Serial.printf("[I2S-MIC] Initializing INMP441 on Port %d (BCLK:%d, WS:%d, SD:%d)...\\n",
                  ${profile.mic.i2sPort}, PIN_I2S_MIC_SCK, PIN_I2S_MIC_WS, PIN_I2S_MIC_SD);

    i2s_config_t i2s_mic_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
        .sample_rate = I2S_SAMPLE_RATE,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format = ${profile.mic.channel === 'left' ? 'I2S_CHANNEL_FMT_ONLY_LEFT' : 'I2S_CHANNEL_FMT_ONLY_RIGHT'},
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = 4,
        .dma_buf_len = 512,
        .use_apll = false,
        .tx_desc_auto_clear = false,
        .fixed_mclk = 0
    };

    i2s_pin_config_t mic_pins = {
        .bck_io_num = PIN_I2S_MIC_SCK,
        .ws_io_num = PIN_I2S_MIC_WS,
        .data_out_num = I2S_PIN_NO_CHANGE,
        .data_in_num = PIN_I2S_MIC_SD
    };

    i2s_driver_install(I2S_MIC_PORT, &i2s_mic_config, 0, NULL);
    i2s_set_pin(I2S_MIC_PORT, &mic_pins);
    Serial.println("[I2S-MIC] Microphone driver installed.");
}

void initI2SSpeaker() {
    Serial.printf("[I2S-AMP] Initializing MAX98357A (BCLK:%d, LRC:%d, DIN:%d, Gain:%d dB)...\\n",
                  PIN_I2S_SPK_BCLK, PIN_I2S_SPK_LRC, PIN_I2S_SPK_DIN, MAX98357A_GAIN_DB);

    i2s_config_t i2s_spk_config = {
        .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
        .sample_rate = 16000,
        .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
        .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
        .dma_buf_count = 4,
        .dma_buf_len = 512,
        .use_apll = false,
        .tx_desc_auto_clear = true,
        .fixed_mclk = 0
    };

    i2s_pin_config_t spk_pins = {
        .bck_io_num = PIN_I2S_SPK_BCLK,
        .ws_io_num = PIN_I2S_SPK_LRC,
        .data_out_num = PIN_I2S_SPK_DIN,
        .data_in_num = I2S_PIN_NO_CHANGE
    };

    i2s_port_t spk_port = I2S_NUM_1;
    i2s_driver_install(spk_port, &i2s_spk_config, 0, NULL);
    i2s_set_pin(spk_port, &spk_pins);
    Serial.println("[I2S-AMP] Amplifier driver installed.");
}

// ==============================================================================
// 11. MAIN SETUP & EVENT LOOP
// ==============================================================================
void setup() {
    Serial.begin(SERIAL_BAUD_RATE);
    delay(300);

    Serial.println("\\n==================================================");
    Serial.println("         EXPLORE AI ASSISTANT FIRMWARE            ");
    Serial.printf (" Target: %s (%s)\\n", BOARD_NAME, "${profile.variant}");
    Serial.println("==================================================");

    // Physical Buttons & Status LED
    pinMode(PIN_BUTTON_ACTION, INPUT_PULLUP);
    pinMode(PIN_BUTTON_RESET, INPUT_PULLUP);
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);

    // Initialize Relays
    initRelays();

    // Initialize OLED Display
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, I2C_FREQ_HZ);
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDRESS)) {
        Serial.println("[OLED] Warning: SSD1306 not detected on I2C bus.");
    } else {
        display.clearDisplay();
        drawOledFace(FACE_HAPPY, 0);
        delay(1000);
    }

    // Initialize Audio Subsystems
    initI2SMicrophone();
    initI2SSpeaker();

    // Wi-Fi Connection
    connectWiFi();

    // MQTT Setup
    if (MQTT_ENABLED) {
        mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
        mqttClient.setCallback(onMqttMessageReceived);
        ensureMqttConnection();
    }

    Serial.println("[MAIN] System operational. Running event loop.");
}

void loop() {
    unsigned long now = millis();

    // Handle SoftAP DNS & WebServer if in fallback portal mode
    if (g_inSoftApMode) {
        dnsServer.processNextRequest();
        webServer.handleClient();
    }

    // MQTT Routine
    if (MQTT_ENABLED && WiFi.status() == WL_CONNECTED) {
        if (!mqttClient.connected()) {
            if (now - g_lastMqttCheck > 5000) {
                g_lastMqttCheck = now;
                ensureMqttConnection();
            }
        } else {
            mqttClient.loop();
        }

        // Periodic Telemetry Publishing (every 30s)
        if (MQTT_PUB_TELEMETRY && (now - g_lastTelemetryTick > 30000)) {
            g_lastTelemetryTick = now;
            publishMqttTelemetry();
        }
    }

    // Physical Reset Button Hold (5 seconds = factory wipe)
    if (digitalRead(PIN_BUTTON_RESET) == LOW) {
        if (!g_isResetBtnDown) {
            g_isResetBtnDown = true;
            g_resetBtnPressStart = now;
        } else if (now - g_resetBtnPressStart > 5000) {
            Serial.println("[SYSTEM] Reset button held for 5s! Wiping preferences & restarting...");
            prefs.begin("wifi", false);
            prefs.clear();
            prefs.end();
            drawOledFace(FACE_ERROR, 0);
            delay(1500);
            ESP.restart();
        }
    } else {
        g_isResetBtnDown = false;
    }

    // Push-to-Talk Action Button
    if (digitalRead(PIN_BUTTON_ACTION) == LOW) {
        g_faceState = FACE_LISTENING;
    } else if (g_faceState == FACE_LISTENING) {
        g_faceState = FACE_IDLE;
    }

    // Refresh OLED Facial Animations every 150ms
    if (now - g_lastAnimationTick > 150) {
        g_lastAnimationTick = now;
        // Subtle eye wandering
        if (random(0, 10) == 0) {
            g_eyeXOffset = random(-3, 4);
        }
        drawOledFace(g_faceState, g_eyeXOffset);
    }

    delay(5);
}
`;
}

/**
 * Generates dynamic platformio.ini with all required dependencies
 */
export function generatePlatformIoIni(profile: CustomHardwareProfile): string {
  let envName = 'esp32-s3-devkitc-1';
  let boardName = 'esp32-s3-devkitc-1';

  if (profile.variant === 'ESP32-DEVKIT-V1-CH340' || profile.variant === 'ESP32-WROOM') {
    envName = 'esp32dev';
    boardName = 'esp32dev';
  } else if (profile.variant === 'ESP32-C3') {
    envName = 'esp32-c3-devkitm-1';
    boardName = 'esp32-c3-devkitm-1';
  } else if (profile.variant === 'ESP32-S2') {
    envName = 'esp32-s2-saola-1';
    boardName = 'esp32-s2-saola-1';
  } else if (profile.variant === 'ESP32-CAM') {
    envName = 'esp32cam';
    boardName = 'esp32cam';
  } else if (profile.variant === 'ESP32-WROVER') {
    envName = 'esp32-wrover-e';
    boardName = 'esp32-wrover-e';
  }

  const isS3 = profile.variant === 'ESP32-S3';

  return `[platformio]
default_envs = ${envName}

[env:${envName}]
platform = espressif32 @ ~6.5.0
board = ${boardName}
framework = arduino
monitor_speed = 115200
board_build.partitions = ${profile.flashSizeMb >= 8 ? 'default_8MB.csv' : 'huge_app.csv'}

build_flags =
    -DCORE_DEBUG_LEVEL=3
${isS3 ? `    -DARDUINO_USB_MODE=1
    -DARDUINO_USB_CDC_ON_BOOT=1` : ''}
${profile.psram ? `    -DBOARD_HAS_PSRAM` : ''}

lib_deps =
    adafruit/Adafruit SSD1306 @ ^2.5.9
    adafruit/Adafruit GFX Library @ ^1.11.9
    bblanchon/ArduinoJson @ ^7.0.4
    knolleary/PubSubClient @ ^2.8
`;
}

/**
 * Generates include/config.h with Wi-Fi, Webhook, and MQTT constants
 */
export function generateConfigHeader(
  profile: CustomHardwareProfile,
  settings?: AgentSettings
): string {
  const wifi = profile.wifi || {
    ssid: 'MyHomeWiFi',
    password: 'WiFiPassword123',
    apSsid: 'Explore-AI-Assistant',
    apPassword: '',
    staticIpEnabled: false,
    staticIp: '192.168.1.200',
    gateway: '192.168.1.1',
    subnet: '255.255.255.0',
    dns: '8.8.8.8',
    autoReconnect: true,
    connectTimeoutSec: 15
  };

  const cloud = profile.cloudIntegration || {
    protocol: 'both',
    webhook: {
      enabled: true,
      endpointUrl: 'https://webhook.site/explore-ai-demo',
      authToken: 'Bearer secret_xyz',
      httpMethod: 'POST',
      triggerOnRelay: true,
      triggerOnVoice: true
    },
    mqtt: {
      enabled: true,
      brokerHost: 'broker.hivemq.com',
      brokerPort: 1883,
      clientId: 'explore-ai-esp32',
      username: '',
      password: '',
      baseTopic: 'explore_ai/esp32',
      subscribeRelayCommands: true,
      publishTelemetry: true,
      qos: 0
    }
  };

  return `#ifndef EXPLORE_AI_CONFIG_H
#define EXPLORE_AI_CONFIG_H

#include <Arduino.h>

// --- General Diagnostics ---
#define SERIAL_BAUD_RATE            115200
#define FIRMWARE_VERSION            "1.2.0"
#define TARGET_BOARD_NAME           "${profile.boardName}"

// --- Wi-Fi Connectivity Configuration ---
#define WIFI_STA_SSID               "${wifi.ssid}"
#define WIFI_STA_PASSWORD           "${wifi.password}"
#define WIFI_AP_SSID_DEFAULT        "${wifi.apSsid}"
#define WIFI_AP_PASS_DEFAULT        "${wifi.apPassword}"
#define WIFI_AUTO_RECONNECT         ${wifi.autoReconnect ? '1' : '0'}
#define WIFI_TIMEOUT_SEC            ${wifi.connectTimeoutSec}

${wifi.staticIpEnabled ? `// Static IP Addressing
#define WIFI_STATIC_IP_ENABLED      1
#define WIFI_STATIC_IP              "${wifi.staticIp}"
#define WIFI_GATEWAY_IP             "${wifi.gateway}"
#define WIFI_SUBNET_MASK            "${wifi.subnet}"
#define WIFI_DNS_IP                 "${wifi.dns}"` : `#define WIFI_STATIC_IP_ENABLED      0`}

// --- Webhook Configuration ---
#define WEBHOOK_ENABLED             ${cloud.webhook.enabled ? '1' : '0'}
#define WEBHOOK_ENDPOINT_URL        "${cloud.webhook.endpointUrl}"
#define WEBHOOK_AUTH_TOKEN          "${cloud.webhook.authToken}"
#define WEBHOOK_TRIGGER_ON_RELAY    ${cloud.webhook.triggerOnRelay ? '1' : '0'}
#define WEBHOOK_TRIGGER_ON_VOICE    ${cloud.webhook.triggerOnVoice ? '1' : '0'}

// --- MQTT Broker Configuration ---
#define MQTT_ENABLED                ${cloud.mqtt.enabled ? '1' : '0'}
#define MQTT_BROKER_HOST            "${cloud.mqtt.brokerHost}"
#define MQTT_BROKER_PORT            ${cloud.mqtt.brokerPort}
#define MQTT_CLIENT_ID              "${cloud.mqtt.clientId}"
#define MQTT_USERNAME               "${cloud.mqtt.username}"
#define MQTT_PASSWORD               "${cloud.mqtt.password}"
#define MQTT_BASE_TOPIC             "${cloud.mqtt.baseTopic}"
#define MQTT_SUB_RELAY_COMMANDS     ${cloud.mqtt.subscribeRelayCommands ? '1' : '0'}
#define MQTT_PUB_TELEMETRY          ${cloud.mqtt.publishTelemetry ? '1' : '0'}

// --- Audio Streaming Specs ---
#define AUDIO_SAMPLE_RATE           16000
#define AUDIO_BITS_PER_SAMPLE       16

#endif // EXPLORE_AI_CONFIG_H
`;
}
