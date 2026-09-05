#ifndef EXPLORE_AI_WAKEWORD_H
#define EXPLORE_AI_WAKEWORD_H

#include <Arduino.h>

class WakeWordDetector {
public:
    WakeWordDetector();
    bool begin();
    bool processAudio(const int16_t *samples, size_t count);

private:
    bool initialized;
};

extern WakeWordDetector wakeWord;

#endif // EXPLORE_AI_WAKEWORD_H
