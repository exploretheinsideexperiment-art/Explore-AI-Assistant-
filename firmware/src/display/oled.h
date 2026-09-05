#ifndef EXPLORE_AI_OLED_H
#define EXPLORE_AI_OLED_H

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "../../include/pins.h"
#include "../../include/version.h"
#include "animations.h"

enum DisplayState {
    STATE_BOOT,
    STATE_WIFI_SETUP,
    STATE_WIFI_CONNECTING,
    STATE_WIFI_CONNECTED,
    STATE_CLOUD_CONNECTING,
    STATE_READY,
    STATE_LISTENING,
    STATE_PROCESSING,
    STATE_SPEAKING,
    STATE_ERROR,
    STATE_OTA,
    STATE_SLEEP,
    STATE_FACTORY_RESET
};

class OLEDDisplay {
public:
    OLEDDisplay();
    bool begin();
    
    void setState(DisplayState newState);
    DisplayState getState() const { return currentState; }

    void setMessage(const String &msg);
    void setSubMessage(const String &sub);
    void setNetworkInfo(const String &ssid, const String &ip, int rssi = 0);
    void setProgress(int percent);

    void update(); // Called regularly in main loop

    void showBootScreen();
    void showFactoryResetPrompt(int secondsRemaining);

private:
    Adafruit_SSD1306 display;
    FaceRenderer faceRenderer;
    DisplayState currentState;
    
    String message;
    String subMessage;
    String netSSID;
    String netIP;
    int netRSSI;
    int progressPercent;
    
    uint32_t frameCounter;
    uint32_t lastFrameTime;
    uint32_t lastBlinkTime;
    bool isBlinking;
    bool isInitialized;

    void drawStatusBar();
    void drawBootUI();
    void drawWiFiSetupUI();
    void drawConnectingUI();
    void drawConnectedUI();
    void drawErrorUI();
    void drawOtaUI();
    void drawFactoryResetUI(int seconds);
};

extern OLEDDisplay oledDisplay;

#endif // EXPLORE_AI_OLED_H
