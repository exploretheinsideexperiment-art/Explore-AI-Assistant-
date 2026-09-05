#ifndef EXPLORE_AI_API_CLIENT_H
#define EXPLORE_AI_API_CLIENT_H

#include <Arduino.h>
#include "../../include/config.h"

class ApiClient {
public:
    ApiClient();
    bool begin(const String &baseUrl = DEFAULT_CLOUD_API_URL);
    
    // Register device identity to cloud
    bool registerDevice(const String &deviceId, const String &hwVariant, const String &firmwareVer);
    
    // Check if device is paired to user account
    bool checkPairingStatus(const String &deviceId, bool &isPaired, String &pairingCode);

private:
    String apiUrl;
    bool initialized;
};

extern ApiClient apiClient;

#endif // EXPLORE_AI_API_CLIENT_H
