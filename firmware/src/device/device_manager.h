#ifndef EXPLORE_AI_DEVICE_MANAGER_H
#define EXPLORE_AI_DEVICE_MANAGER_H

#include <Arduino.h>
#include <esp_system.h>
#include "../../include/pins.h"
#include "../../include/config.h"
#include "../../include/version.h"
#include "../storage/storage.h"
#include "../display/oled.h"

class DeviceManager {
public:
    DeviceManager();
    bool begin();
    void update(); // Check reset buttons, heartbeat, battery if supported

    String getDeviceId() const { return deviceId; }
    String getFirmwareVersion() const { return FIRMWARE_VERSION_STR; }
    String getHardwareVariant() const { return HARDWARE_VARIANT_STR; }

    bool isPaired() const { return paired; }
    String getPairingCode() const { return pairingCode; }
    void setPaired(bool isPaired, const String &code);

    void triggerFactoryReset();

private:
    String deviceId;
    bool paired;
    String pairingCode;

    // Reset button tracking
    uint32_t resetPressStartTime;
    bool resetButtonPressed;
    DisplayState preResetState;

    void generateDeviceId();
    void handleResetButton();
};

extern DeviceManager deviceManager;

#endif // EXPLORE_AI_DEVICE_MANAGER_H
