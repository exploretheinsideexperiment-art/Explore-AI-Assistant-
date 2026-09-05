#ifndef EXPLORE_AI_ANIMATIONS_H
#define EXPLORE_AI_ANIMATIONS_H

#include <Arduino.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

enum FaceExpression {
    FACE_IDLE,
    FACE_BLINK,
    FACE_LISTENING,
    FACE_THINKING,
    FACE_SPEAKING,
    FACE_ERROR,
    FACE_SLEEP,
    FACE_HAPPY
};

class FaceRenderer {
public:
    FaceRenderer();
    void render(Adafruit_SSD1306 &display, FaceExpression expr, uint32_t frameTick);

private:
    void drawEye(Adafruit_SSD1306 &display, int x, int y, int w, int h, int pupilDx, int pupilDy);
    void drawMouth(Adafruit_SSD1306 &display, int x, int y, int w, FaceExpression expr, uint32_t frameTick);
};

#endif // EXPLORE_AI_ANIMATIONS_H
