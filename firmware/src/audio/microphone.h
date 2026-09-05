#ifndef EXPLORE_AI_MICROPHONE_H
#define EXPLORE_AI_MICROPHONE_H

#include <Arduino.h>
#include "../../include/pins.h"
#include "../../include/config.h"

class Microphone {
public:
    Microphone();
    bool begin();
    void end();
    
    // Read audio chunk into buffer (16kHz 16-bit PCM mono)
    size_t read(int16_t *buffer, size_t samples);
    bool isRecording() const { return recording; }
    void setRecording(bool rec) { recording = rec; }

private:
    bool recording;
    bool initialized;
};

extern Microphone microphone;

#endif // EXPLORE_AI_MICROPHONE_H
