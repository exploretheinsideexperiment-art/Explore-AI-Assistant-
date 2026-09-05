#include "wifi_manager.h"

WiFiManager wifiManager;

WiFiManager::WiFiManager()
    : currentState(WIFI_STATE_INIT),
      connectStartTime(0),
      lastReconnectAttempt(0),
      reconnectBackoffMs(1000),
      portalShutdownTimer(0),
      portalShutdownPending(false)
{}

bool WiFiManager::begin() {
    Serial.println("[WIFI] Initializing Wi-Fi Subsystem...");
    WiFi.persistent(false);
    WiFi.disconnect(true);
    delay(100);

    // Register Captive Portal Callbacks
    captivePortal.onConnect([this](const String &ssid, const String &password) {
        this->connectWithCredentials(ssid, password);
    });

    captivePortal.onReset([this]() {
        this->resetWiFiAndStartAP();
    });

    currentState = WIFI_STATE_CHECK_CREDENTIALS;
    return true;
}

void WiFiManager::startAccessPoint() {
    Serial.println("[WIFI] Starting AP: " AP_SSID_DEFAULT "...");
    WiFi.mode(WIFI_AP_STA); // AP_STA allows scanning while serving AP
    
    IPAddress apIP(192, 168, 4, 1);
    IPAddress netMsk(255, 255, 255, 0);
    WiFi.softAPConfig(apIP, apIP, netMsk);
    
    bool ok = WiFi.softAP(AP_SSID_DEFAULT, AP_PASSWORD_DEFAULT, AP_CHANNEL_DEFAULT, 0, AP_MAX_CONNECTIONS);
    if (!ok) {
        Serial.println("[WIFI] Error: Failed to start SoftAP!");
        oledDisplay.setState(STATE_ERROR);
        oledDisplay.setMessage("AP Start Failed");
        return;
    }

    Serial.printf("[WIFI] AP '%s' active at IP: %s\n", AP_SSID_DEFAULT, apIP.toString().c_str());
    captivePortal.start(apIP);

    oledDisplay.setState(STATE_WIFI_SETUP);
    oledDisplay.setNetworkInfo(AP_SSID_DEFAULT, apIP.toString(), 0);
    currentState = WIFI_STATE_AP_ACTIVE;
}

void WiFiManager::startStationConnect() {
    Serial.printf("[WIFI] Connecting to SSID: '%s'...\n", targetSSID.c_str());
    
    oledDisplay.setState(STATE_WIFI_CONNECTING);
    oledDisplay.setNetworkInfo(targetSSID, "0.0.0.0", 0);

    WiFi.begin(targetSSID.c_str(), targetPassword.c_str());
    connectStartTime = millis();
    currentState = WIFI_STATE_CONNECTING_STA;
}

void WiFiManager::connectWithCredentials(const String &ssid, const String &password) {
    targetSSID = ssid;
    targetPassword = password;
    startStationConnect();
}

void WiFiManager::onStationConnected() {
    localIP = WiFi.localIP().toString();
    int rssi = WiFi.RSSI();
    Serial.printf("[WIFI] Connected successfully! IP: %s, RSSI: %d dBm\n", localIP.c_str(), rssi);

    // Persist verified credentials to NVS storage
    storage.setWiFiCredentials(targetSSID, targetPassword);

    oledDisplay.setState(STATE_WIFI_CONNECTED);
    oledDisplay.setNetworkInfo(targetSSID, localIP, rssi);

    // If captive portal was running, notify clients and schedule graceful shutdown
    if (captivePortal.isRunning()) {
        captivePortal.setStatus(PORTAL_STATUS_CONNECTED, "Connected to " + targetSSID);
        portalShutdownTimer = millis() + 3000; // Let phone show success message
        portalShutdownPending = true;
    }

    reconnectBackoffMs = 1000;
    currentState = WIFI_STATE_CONNECTED_STA;
}

void WiFiManager::onStationFailed() {
    Serial.println("[WIFI] Connection failed or timed out.");
    
    if (captivePortal.isRunning()) {
        captivePortal.setStatus(PORTAL_STATUS_FAILED, "Failed to connect to " + targetSSID);
        currentState = WIFI_STATE_AP_ACTIVE;
        oledDisplay.setState(STATE_WIFI_SETUP);
    } else {
        // We had stored credentials, trigger exponential backoff reconnection
        currentState = WIFI_STATE_RECONNECT_WAIT;
        lastReconnectAttempt = millis();
        Serial.printf("[WIFI] Backing off for %u ms before next attempt...\n", reconnectBackoffMs);
        oledDisplay.setState(STATE_ERROR);
        oledDisplay.setMessage("WiFi Retry in " + String(reconnectBackoffMs / 1000) + "s");
    }
}

void WiFiManager::resetWiFiAndStartAP() {
    storage.clearWiFiCredentials();
    targetSSID = "";
    targetPassword = "";
    startAccessPoint();
}

bool WiFiManager::isConnected() const {
    return (currentState == WIFI_STATE_CONNECTED_STA && WiFi.status() == WL_CONNECTED);
}

bool WiFiManager::isAPMode() const {
    return (currentState == WIFI_STATE_AP_ACTIVE);
}

int WiFiManager::getRSSI() const {
    if (WiFi.status() == WL_CONNECTED) {
        return WiFi.RSSI();
    }
    return 0;
}

void WiFiManager::update() {
    // 1. Process captive portal DNS & HTTP requests if active
    if (captivePortal.isRunning()) {
        captivePortal.process();

        if (portalShutdownPending && millis() > portalShutdownTimer) {
            portalShutdownPending = false;
            captivePortal.stop();
            WiFi.softAPdisconnect(true);
            WiFi.mode(WIFI_STA);
            Serial.println("[WIFI] Switched to pure Station (STA) mode.");
            oledDisplay.setState(STATE_READY);
        }
    }

    // 2. Wi-Fi State Machine Runner
    switch (currentState) {
        case WIFI_STATE_CHECK_CREDENTIALS: {
            if (storage.hasWiFiCredentials()) {
                storage.getWiFiCredentials(targetSSID, targetPassword);
                Serial.printf("[WIFI] Found saved SSID: '%s'. Attempting connection...\n", targetSSID.c_str());
                startStationConnect();
            } else {
                Serial.println("[WIFI] No Wi-Fi credentials found in NVS. Launching setup AP...");
                startAccessPoint();
            }
            break;
        }

        case WIFI_STATE_CONNECTING_STA: {
            if (WiFi.status() == WL_CONNECTED) {
                onStationConnected();
            } else if (millis() - connectStartTime > WIFI_CONNECT_TIMEOUT_MS) {
                onStationFailed();
            }
            break;
        }

        case WIFI_STATE_CONNECTED_STA: {
            if (WiFi.status() != WL_CONNECTED) {
                Serial.println("[WIFI] Connection lost!");
                currentState = WIFI_STATE_RECONNECT_WAIT;
                lastReconnectAttempt = millis();
                oledDisplay.setState(STATE_WIFI_CONNECTING);
                oledDisplay.setMessage("WiFi Reconnecting");
            }
            break;
        }

        case WIFI_STATE_RECONNECT_WAIT: {
            if (millis() - lastReconnectAttempt >= reconnectBackoffMs) {
                // Exponential backoff with 30s ceiling
                reconnectBackoffMs = min(reconnectBackoffMs * 2, (uint32_t)WIFI_RECONNECT_MAX_BACKOFF);
                startStationConnect();
            }
            break;
        }

        case WIFI_STATE_AP_ACTIVE:
        case WIFI_STATE_INIT:
        default:
            break;
    }
}
