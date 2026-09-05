#include "api_client.h"

ApiClient apiClient;

ApiClient::ApiClient() : apiUrl(DEFAULT_CLOUD_API_URL), initialized(false) {}

bool ApiClient::begin(const String &baseUrl) {
    apiUrl = baseUrl;
    initialized = true;
    Serial.printf("[API] Cloud API client configured for: %s\n", apiUrl.c_str());
    return true;
}

bool ApiClient::registerDevice(const String &deviceId, const String &hwVariant, const String &firmwareVer) {
    if (!initialized) return false;
    // TODO [PHASE 2]: Perform HTTPS POST to /api/devices/register
    Serial.printf("[API] Registering device %s (HW: %s, FW: %s)\n", deviceId.c_str(), hwVariant.c_str(), firmwareVer.c_str());
    return true;
}

bool ApiClient::checkPairingStatus(const String &deviceId, bool &isPaired, String &pairingCode) {
    if (!initialized) return false;
    // TODO [PHASE 4]: Perform HTTPS GET to /api/devices/:id/status
    isPaired = false;
    pairingCode = "123456";
    return true;
}
