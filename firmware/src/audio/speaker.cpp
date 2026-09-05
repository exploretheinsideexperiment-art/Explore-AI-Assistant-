#include "speaker.h"

Speaker speaker;

Speaker::Speaker() : currentVolume(80), playing(false), initialized(false) {}

bool Speaker::begin() {
    // TODO [PHASE 7]: Configure I2S output for MAX98357A
    // Pins: BCLK = PIN_I2S_SPK_BCLK, LRC = PIN_I2S_SPK_LRC, DIN = PIN_I2S_SPK_DIN
    Serial.println("[SPEAKER] MAX98357A Speaker interface registered (Ready for Phase 7 playback).");
    initialized = true;
    return true;
}

void Speaker::end() {
    initialized = false;
    playing = false;
}

void Speaker::setVolume(uint8_t volume) {
    currentVolume = constrain(volume, 0, 100);
}

size_t Speaker::write(const uint8_t *data, size_t len) {
    if (!initialized || data == nullptr) return 0;
    // TODO [PHASE 7]: Write decoded audio samples to I2S DMA
    return len;
}
