#include "device_manager.h"

DeviceManager deviceManager;

DeviceManager::DeviceManager()
    : paired(false),
      resetPressStartTime(0),
      resetButtonPressed(false),
      preResetState(STATE_BOOT)
{}

bool DeviceManager::begin() {
    generateDeviceId();
    
    // Configure hardware buttons with internal pull-up
    pinMode(PIN_BUTTON_ACTION, INPUT_PULLUP);
    pinMode(PIN_BUTTON_RESET, INPUT_PULLUP);
    
    #if defined(PIN_STATUS_LED)
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);
    #endif

    // Load pairing state
    storage.getPairingStatus(paired, pairingCode);

    Serial.println("==========================================");
    Serial.println("     EXPLORE AI ASSISTANT FIRMWARE        ");
    Serial.println("==========================================");
    Serial.printf("Device ID:        %s\n", deviceId.c_str());
    Serial.printf("Hardware:         %s\n", HARDWARE_VARIANT_STR);
    Serial.printf("Firmware Version: %s\n", FIRMWARE_VERSION_STR);
    Serial.printf("Paired to Cloud:  %s\n", paired ? "YES" : "NO");
    Serial.println("==========================================");

    return true;
}

void DeviceManager::generateDeviceId() {
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    
    char idBuffer[32];
    snprintf(idBuffer, sizeof(idBuffer), "EXP-AI-%02X%02X%02X%02X%02X%02X",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    deviceId = String(idBuffer);
}

void DeviceManager::setPaired(bool isPaired, const String &code) {
    paired = isPaired;
    pairingCode = code;
    storage.setPairingStatus(isPaired, code);
}

void DeviceManager::triggerFactoryReset() {
    Serial.println("[DEVICE] Initiating Hardware Factory Reset!");
    oledDisplay.showFactoryResetPrompt(0);
    delay(1000);
    
    storage.factoryReset();
    
    Serial.println("[DEVICE] Restarting in 2 seconds...");
    delay(2000);
    ESP.restart();
}

void DeviceManager::handleResetButton() {
    // Physical button is active LOW when held
    bool btnState = (digitalRead(PIN_BUTTON_RESET) == LOW) || 
                    (digitalRead(PIN_BUTTON_ACTION) == LOW && oledDisplay.getState() == STATE_WIFI_SETUP);

    if (btnState) {
        if (!resetButtonPressed) {
            resetButtonPressed = true;
            resetPressStartTime = millis();
            preResetState = oledDisplay.getState();
            Serial.println("[DEVICE] Reset button pressed. Hold 5s for factory reset...");
        } else {
            uint32_t holdDuration = millis() - resetPressStartTime;
            if (holdDuration >= FACTORY_RESET_HOLD_MS) {
                triggerFactoryReset();
            } else if (holdDuration >= 1000) {
                int secondsRemaining = (FACTORY_RESET_HOLD_MS - holdDuration) / 1000 + 1;
                oledDisplay.showFactoryResetPrompt(secondsRemaining);
            }
        }
    } else {
        if (resetButtonPressed) {
            resetButtonPressed = false;
            Serial.println("[DEVICE] Reset button released before 5s timeout. Cancelled.");
            oledDisplay.setState(preResetState);
        }
    }
}

void DeviceManager::update() {
    handleResetButton();
}
