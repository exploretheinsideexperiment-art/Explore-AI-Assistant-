#include <Arduino.h>
#include "include/config.h"
#include "include/pins.h"
#include "include/version.h"
#include "src/storage/storage.h"
#include "src/display/oled.h"
#include "src/wifi/wifi_manager.h"
#include "src/device/device_manager.h"
#include "src/audio/microphone.h"
#include "src/audio/speaker.h"
#include "src/cloud/api_client.h"
#include "src/cloud/websocket_client.h"

void setup() {
    // 1. Start Serial for diagnostics
    Serial.begin(SERIAL_BAUD_RATE);
    delay(500);

    Serial.println("\n\n");
    Serial.println("==================================================");
    Serial.println("         EXPLORE AI ASSISTANT FIRMWARE            ");
    Serial.printf (" Version: %s | Variant: %s\n", FIRMWARE_VERSION_STR, HARDWARE_VARIANT_STR);
    Serial.println("==================================================");

    // 2. Initialize Persistent Storage (NVS)
    if (!storage.begin()) {
        Serial.println("[MAIN] Fatal: Storage initialization failed!");
    }

    // 3. Initialize OLED Display Subsystem & Show Boot Screen
    if (oledDisplay.begin()) {
        Serial.println("[MAIN] OLED Display online.");
        delay(1500); // Display boot splash
    } else {
        Serial.println("[MAIN] OLED Display not detected. Continuing headless...");
    }

    // 4. Initialize Device Identity & Button Handlers
    deviceManager.begin();

    // 5. Initialize Hardware Interfaces (Microphone & Speaker interfaces registered)
    microphone.begin();
    speaker.begin();

    // 6. Initialize Wi-Fi Subsystem (AP Provisioning / STA Connect)
    wifiManager.begin();

    Serial.println("[MAIN] System setup complete. Entering runtime event loop.");
}

void loop() {
    // A. Monitor Device State & Hardware Factory Reset Button
    deviceManager.update();

    // B. Wi-Fi & Captive Portal State Machine
    wifiManager.update();

    // C. Refresh OLED Animation & UI State
    oledDisplay.update();

    // D. Yield to FreeRTOS scheduler
    delay(5);
}
