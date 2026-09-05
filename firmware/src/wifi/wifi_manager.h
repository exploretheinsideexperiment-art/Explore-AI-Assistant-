#ifndef EXPLORE_AI_WIFI_MANAGER_H
#define EXPLORE_AI_WIFI_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include "../../include/config.h"
#include "../../include/pins.h"
#include "../storage/storage.h"
#include "../display/oled.h"
#include "captive_portal.h"

enum WiFiManagerState {
    WIFI_STATE_INIT,
    WIFI_STATE_CHECK_CREDENTIALS,
    WIFI_STATE_START_AP,
    WIFI_STATE_AP_ACTIVE,
    WIFI_STATE_CONNECTING_STA,
    WIFI_STATE_CONNECTED_STA,
    WIFI_STATE_CONNECT_FAILED,
    WIFI_STATE_RECONNECT_WAIT
};

class WiFiManager {
public:
    WiFiManager();
    bool begin();
    void update(); // Main loop runner

    void connectWithCredentials(const String &ssid, const String &password);
    void resetWiFiAndStartAP();

    bool isConnected() const;
    bool isAPMode() const;
    
    String getSSID() const { return targetSSID; }
    String getIP() const { return localIP; }
    int getRSSI() const;

    WiFiManagerState getState() const { return currentState; }

private:
    WiFiManagerState currentState;
    String targetSSID;
    String targetPassword;
    String localIP;

    uint32_t connectStartTime;
    uint32_t lastReconnectAttempt;
    uint32_t reconnectBackoffMs;
    uint32_t portalShutdownTimer;
    bool portalShutdownPending;

    void startAccessPoint();
    void startStationConnect();
    void onStationConnected();
    void onStationFailed();
};

extern WiFiManager wifiManager;

#endif // EXPLORE_AI_WIFI_MANAGER_H
