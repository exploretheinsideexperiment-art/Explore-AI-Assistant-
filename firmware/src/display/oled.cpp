#include "oled.h"

OLEDDisplay oledDisplay;

OLEDDisplay::OLEDDisplay() 
    : display(OLED_SCREEN_WIDTH, OLED_SCREEN_HEIGHT, &Wire, OLED_RESET_PIN),
      currentState(STATE_BOOT),
      netRSSI(0),
      progressPercent(0),
      frameCounter(0),
      lastFrameTime(0),
      lastBlinkTime(0),
      isBlinking(false),
      isInitialized(false)
{
    message = "Starting...";
    subMessage = "";
    netSSID = "";
    netIP = "";
}

bool OLEDDisplay::begin() {
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDRESS)) {
        Serial.println("[OLED] Error: SSD1306 allocation failed. Check I2C wiring (SDA/SCL).");
        return false;
    }

    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.display();
    
    isInitialized = true;
    Serial.println("[OLED] SSD1306 128x64 initialized at 0x3C.");
    showBootScreen();
    return true;
}

void OLEDDisplay::setState(DisplayState newState) {
    if (currentState != newState) {
        currentState = newState;
        frameCounter = 0;
        Serial.printf("[OLED] State transitioned to: %d\n", newState);
    }
}

void OLEDDisplay::setMessage(const String &msg) {
    message = msg;
}

void OLEDDisplay::setSubMessage(const String &sub) {
    subMessage = sub;
}

void OLEDDisplay::setNetworkInfo(const String &ssid, const String &ip, int rssi) {
    netSSID = ssid;
    netIP = ip;
    netRSSI = rssi;
}

void OLEDDisplay::setProgress(int percent) {
    progressPercent = constrain(percent, 0, 100);
}

void OLEDDisplay::drawStatusBar() {
    display.drawFastHLine(0, 10, OLED_SCREEN_WIDTH, SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(2, 1);
    display.print("EXPLORE AI");

    // RSSI / Wi-Fi icon indication on top right
    if (netIP.length() > 0 && netIP != "0.0.0.0") {
        display.setCursor(82, 1);
        display.print("WiFi ");
        int bars = map(constrain(netRSSI, -90, -30), -90, -30, 1, 4);
        for (int i = 0; i < 4; i++) {
            if (i < bars) {
                display.drawFastVLine(114 + i * 3, 8 - (i * 2), i * 2 + 1, SSD1306_WHITE);
            }
        }
    } else {
        display.setCursor(96, 1);
        display.print("AP");
    }
}

void OLEDDisplay::showBootScreen() {
    if (!isInitialized) return;
    display.clearDisplay();
    
    // Geometric high-tech logo
    display.drawCircle(64, 24, 18, SSD1306_WHITE);
    display.drawCircle(64, 24, 14, SSD1306_WHITE);
    display.fillCircle(64, 24, 6, SSD1306_WHITE);
    
    display.setTextSize(1);
    display.setCursor(18, 46);
    display.print("EXPLORE AI OS");
    display.setCursor(32, 56);
    display.print("v" FIRMWARE_VERSION_STR " " HARDWARE_VARIANT_STR);
    display.display();
}

void OLEDDisplay::drawBootUI() {
    showBootScreen();
}

void OLEDDisplay::drawWiFiSetupUI() {
    drawStatusBar();
    display.setTextSize(1);
    display.setCursor(4, 16);
    display.print("Wi-Fi Setup Mode");
    
    display.drawRoundRect(2, 28, 124, 34, 4, SSD1306_WHITE);
    display.setCursor(8, 32);
    display.print("AP: Explore AI");
    display.setCursor(8, 42);
    display.print("IP: 192.168.4.1");
    display.setCursor(8, 52);
    display.print("Portal: Open Browser");
}

void OLEDDisplay::drawConnectingUI() {
    drawStatusBar();
    display.setTextSize(1);
    display.setCursor(4, 16);
    display.print("Connecting...");
    
    display.setCursor(4, 30);
    display.print("SSID: ");
    display.print(netSSID.substring(0, 14));
    
    // Animated connection spinner
    int cx = 64;
    int cy = 48;
    int r = 8;
    int phase = (frameCounter % 8);
    float angle = phase * (3.14159f / 4.0f);
    display.drawCircle(cx, cy, r, SSD1306_WHITE);
    display.fillCircle(cx + cos(angle) * r, cy + sin(angle) * r, 2, SSD1306_WHITE);
}

void OLEDDisplay::drawConnectedUI() {
    drawStatusBar();
    display.setTextSize(1);
    display.setCursor(4, 16);
    display.print("Wi-Fi Connected!");
    display.setCursor(4, 30);
    display.print("IP: ");
    display.print(netIP);
    display.setCursor(4, 44);
    display.print("Connecting Cloud...");
}

void OLEDDisplay::drawErrorUI() {
    faceRenderer.render(display, FACE_ERROR, frameCounter);
    display.setTextSize(1);
    display.setCursor(2, 54);
    display.print(message.substring(0, 20));
}

void OLEDDisplay::drawOtaUI() {
    drawStatusBar();
    display.setTextSize(1);
    display.setCursor(14, 18);
    display.print("OTA Firmware Update");
    
    // Progress bar frame
    display.drawRect(14, 34, 100, 12, SSD1306_WHITE);
    int fillW = (progressPercent * 96) / 100;
    display.fillRect(16, 36, fillW, 8, SSD1306_WHITE);
    
    display.setCursor(54, 50);
    display.print(progressPercent);
    display.print("%");
}

void OLEDDisplay::drawFactoryResetUI(int seconds) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(16, 8);
    display.print("FACTORY RESET?");
    display.setCursor(6, 24);
    display.print("Release to Cancel");
    display.setCursor(20, 40);
    display.print("Resetting in: ");
    display.print(seconds);
    display.print("s");
    
    // Warning hatch border
    display.drawRect(0, 0, 128, 64, SSD1306_WHITE);
    display.display();
}

void OLEDDisplay::showFactoryResetPrompt(int secondsRemaining) {
    drawFactoryResetUI(secondsRemaining);
}

void OLEDDisplay::update() {
    if (!isInitialized) return;

    uint32_t now = millis();
    if (now - lastFrameTime < 60) { // ~16 FPS rendering for low CPU and smooth face motion
        return;
    }
    lastFrameTime = now;
    frameCounter++;

    // Periodic automatic blink handling in idle state
    if (currentState == STATE_READY || currentState == STATE_BOOT) {
        if (!isBlinking && (now - lastBlinkTime > 3500)) {
            isBlinking = true;
            lastBlinkTime = now;
        } else if (isBlinking && (now - lastBlinkTime > 180)) {
            isBlinking = false;
            lastBlinkTime = now;
        }
    }

    display.clearDisplay();

    switch (currentState) {
        case STATE_BOOT:
            drawBootUI();
            break;

        case STATE_WIFI_SETUP:
            drawWiFiSetupUI();
            break;

        case STATE_WIFI_CONNECTING:
            drawConnectingUI();
            break;

        case STATE_WIFI_CONNECTED:
        case STATE_CLOUD_CONNECTING:
            drawConnectedUI();
            break;

        case STATE_READY:
            drawStatusBar();
            faceRenderer.render(display, isBlinking ? FACE_BLINK : FACE_IDLE, frameCounter);
            break;

        case STATE_LISTENING:
            drawStatusBar();
            faceRenderer.render(display, FACE_LISTENING, frameCounter);
            break;

        case STATE_PROCESSING:
            drawStatusBar();
            faceRenderer.render(display, FACE_THINKING, frameCounter);
            break;

        case STATE_SPEAKING:
            drawStatusBar();
            faceRenderer.render(display, FACE_SPEAKING, frameCounter);
            break;

        case STATE_ERROR:
            drawErrorUI();
            break;

        case STATE_OTA:
            drawOtaUI();
            break;

        case STATE_SLEEP:
            faceRenderer.render(display, FACE_SLEEP, frameCounter);
            break;

        case STATE_FACTORY_RESET:
            // Handled dynamically via showFactoryResetPrompt()
            break;
    }

    display.display();
}
