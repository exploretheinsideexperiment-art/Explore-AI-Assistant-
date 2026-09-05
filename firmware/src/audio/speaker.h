#ifndef EXPLORE_AI_SPEAKER_H
#define EXPLORE_AI_SPEAKER_H

#include <Arduino.h>
#include "../../include/pins.h"
#include "../../include/config.h"

class Speaker {
public:
    Speaker();
    bool begin();
    void end();
    
    size_t write(const uint8_t *data, size_t len);
    void setVolume(uint8_t volume); // 0 - 100
    uint8_t getVolume() const { return currentVolume; }
    bool isPlaying() const { return playing; }

private:
    uint8_t currentVolume;
    bool playing;
    bool initialized;
};

extern Speaker speaker;

#endif // EXPLORE_AI_SPEAKER_H
