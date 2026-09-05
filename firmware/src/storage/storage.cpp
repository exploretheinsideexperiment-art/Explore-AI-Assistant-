#include "storage.h"

Storage storage;

Storage::Storage() : initialized(false) {}

Storage::~Storage() {
    if (initialized) {
        wifiPrefs.end();
        devPrefs.end();
    }
}

bool Storage::begin() {
    if (initialized) return true;
    
    bool ok1 = wifiPrefs.begin(NVS_NAMESPACE_WIFI, false);
    bool ok2 = devPrefs.begin(NVS_NAMESPACE_DEVICE, false);
    
    initialized = ok1 && ok2;
    if (initialized) {
        Serial.println("[STORAGE] NVS partitions mounted successfully.");
    } else {
        Serial.println("[STORAGE] Warning: Failed to mount one or more NVS partitions!");
    }
    return initialized;
}

bool Storage::hasWiFiCredentials() {
    if (!initialized) begin();
    String ssid = wifiPrefs.getString(NVS_KEY_SSID, "");
    return (ssid.length() > 0);
}

bool Storage::getWiFiCredentials(String &ssid, String &password) {
    if (!initialized) begin();
    ssid = wifiPrefs.getString(NVS_KEY_SSID, "");
    password = wifiPrefs.getString(NVS_KEY_PASSWORD, "");
    return (ssid.length() > 0);
}

bool Storage::setWiFiCredentials(const String &ssid, const String &password) {
    if (!initialized) begin();
    if (ssid.length() == 0) return false;
    
    wifiPrefs.putString(NVS_KEY_SSID, ssid);
    wifiPrefs.putString(NVS_KEY_PASSWORD, password);
    
    Serial.printf("[STORAGE] Wi-Fi SSID '%s' saved to NVS (Password secured).\n", ssid.c_str());
    return true;
}

bool Storage::clearWiFiCredentials() {
    if (!initialized) begin();
    wifiPrefs.remove(NVS_KEY_SSID);
    wifiPrefs.remove(NVS_KEY_PASSWORD);
    Serial.println("[STORAGE] Wi-Fi credentials removed from NVS.");
    return true;
}

bool Storage::getDeviceConfig(String &language, String &voice, String &voiceMode) {
    if (!initialized) begin();
    language = devPrefs.getString(NVS_KEY_LANGUAGE, "en-IN");
    voice = devPrefs.getString(NVS_KEY_VOICE, "Rachel");
    voiceMode = devPrefs.getString(NVS_KEY_VOICE_MODE, "push_to_talk");
    return true;
}

bool Storage::setDeviceConfig(const String &language, const String &voice, const String &voiceMode) {
    if (!initialized) begin();
    devPrefs.putString(NVS_KEY_LANGUAGE, language);
    devPrefs.putString(NVS_KEY_VOICE, voice);
    devPrefs.putString(NVS_KEY_VOICE_MODE, voiceMode);
    return true;
}

bool Storage::getPairingStatus(bool &isPaired, String &pairingCode) {
    if (!initialized) begin();
    isPaired = devPrefs.getBool(NVS_KEY_IS_PAIRED, false);
    pairingCode = devPrefs.getString(NVS_KEY_PAIRING_CODE, "");
    return true;
}

bool Storage::setPairingStatus(bool isPaired, const String &pairingCode) {
    if (!initialized) begin();
    devPrefs.putBool(NVS_KEY_IS_PAIRED, isPaired);
    devPrefs.putString(NVS_KEY_PAIRING_CODE, pairingCode);
    return true;
}

bool Storage::factoryReset() {
    if (!initialized) begin();
    Serial.println("[STORAGE] Executing FACTORY RESET! Clearing all user preferences...");
    wifiPrefs.clear();
    devPrefs.clear();
    Serial.println("[STORAGE] NVS wiped. Factory reset complete.");
    return true;
}
