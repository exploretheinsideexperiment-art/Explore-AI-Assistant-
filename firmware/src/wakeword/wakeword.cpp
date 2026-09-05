#include "wakeword.h"

WakeWordDetector wakeWord;

WakeWordDetector::WakeWordDetector() : initialized(false) {}

bool WakeWordDetector::begin() {
    // TODO [PHASE 8]: Initialize local wake word engine (e.g. ESP-SR or micro-tflite for "Hey Explore")
    initialized = true;
    return true;
}

bool WakeWordDetector::processAudio(const int16_t *samples, size_t count) {
    if (!initialized || samples == nullptr) return false;
    // TODO [PHASE 8]: Process audio buffer through wake word model
    return false;
}
