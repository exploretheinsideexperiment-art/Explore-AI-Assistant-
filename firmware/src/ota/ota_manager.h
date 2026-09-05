#ifndef EXPLORE_AI_OTA_MANAGER_H
#define EXPLORE_AI_OTA_MANAGER_H

#include <Arduino.h>

class OtaManager {
public:
    OtaManager();
    bool checkForUpdate(const String &firmwareUrl, String &latestVersion);
    bool startUpdate(const String &downloadUrl);

private:
    bool inProgress;
};

extern OtaManager otaManager;

#endif // EXPLORE_AI_OTA_MANAGER_H
