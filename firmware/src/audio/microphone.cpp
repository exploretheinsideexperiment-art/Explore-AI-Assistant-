#include "microphone.h"

Microphone microphone;

Microphone::Microphone() : recording(false), initialized(false) {}

bool Microphone::begin() {
    // TODO [PHASE 6]: Configure I2S driver for INMP441
    // Pins: SCK = PIN_I2S_MIC_SCK, WS = PIN_I2S_MIC_WS, SD = PIN_I2S_MIC_SD
    Serial.println("[MIC] INMP441 Microphone interface registered (Ready for Phase 6 I2S streaming).");
    initialized = true;
    return true;
}

void Microphone::end() {
    initialized = false;
    recording = false;
}

size_t Microphone::read(int16_t *buffer, size_t samples) {
    if (!initialized || !recording || buffer == nullptr) return 0;
    // TODO [PHASE 6]: Read DMA buffer from I2S driver
    memset(buffer, 0, samples * sizeof(int16_t));
    return samples;
}
