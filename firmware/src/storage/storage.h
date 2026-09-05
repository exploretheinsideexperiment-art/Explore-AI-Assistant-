#ifndef EXPLORE_AI_STORAGE_H
#define EXPLORE_AI_STORAGE_H

#include <Arduino.h>
#include <Preferences.h>
#include "../../include/config.h"

class Storage {
public:
    Storage();
    ~Storage();

    bool begin();

    // Wi-Fi Credentials
    bool hasWiFiCredentials();
    bool getWiFiCredentials(String &ssid, String &password);
    bool setWiFiCredentials(const String &ssid, const String &password);
    bool clearWiFiCredentials();

    // Device & Pairing Storage
    bool getDeviceConfig(String &language, String &voice, String &voiceMode);
    bool setDeviceConfig(const String &language, const String &voice, const String &voiceMode);
    bool getPairingStatus(bool &isPaired, String &pairingCode);
    bool setPairingStatus(bool isPaired, const String &pairingCode);

    // Factory Reset: erases all credentials and user configs
    bool factoryReset();

private:
    Preferences wifiPrefs;
    Preferences devPrefs;
    bool initialized;
};

extern Storage storage;

#endif // EXPLORE_AI_STORAGE_H
