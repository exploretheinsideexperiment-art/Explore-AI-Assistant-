#include "animations.h"

FaceRenderer::FaceRenderer() {}

void FaceRenderer::drawEye(Adafruit_SSD1306 &display, int x, int y, int w, int h, int pupilDx, int pupilDy) {
    if (h <= 2) {
        // Closed eye / blink line
        display.fillRoundRect(x - w / 2, y, w, 2, 1, SSD1306_WHITE);
        return;
    }
    // Outer rounded eye shape
    display.fillRoundRect(x - w / 2, y - h / 2, w, h, min(w, h) / 2, SSD1306_WHITE);
    // Inner pupil cutout for character
    int pupilR = max(2, w / 4);
    display.fillCircle(x + pupilDx, y + pupilDy, pupilR, SSD1306_BLACK);
    // Light reflection dot
    display.drawPixel(x + pupilDx - 1, y + pupilDy - 1, SSD1306_WHITE);
}

void FaceRenderer::drawMouth(Adafruit_SSD1306 &display, int x, int y, int w, FaceExpression expr, uint32_t frameTick) {
    switch (expr) {
        case FACE_SPEAKING: {
            // Animated audio wave mouth
            int mouthH = 2 + (abs((int)(frameTick % 16) - 8));
            display.fillRoundRect(x - w / 2, y - mouthH / 2, w, mouthH, mouthH / 2, SSD1306_WHITE);
            break;
        }
        case FACE_HAPPY:
        case FACE_IDLE: {
            // Gentle curved smile
            display.drawFastHLine(x - w / 2 + 2, y, w - 4, SSD1306_WHITE);
            display.drawPixel(x - w / 2, y - 1, SSD1306_WHITE);
            display.drawPixel(x + w / 2, y - 1, SSD1306_WHITE);
            break;
        }
        case FACE_LISTENING: {
            // Focused small circular mouth
            display.drawCircle(x, y, 3, SSD1306_WHITE);
            break;
        }
        case FACE_THINKING: {
            // Pensive slanted mouth
            display.drawLine(x - w / 2 + 3, y - 1, x + w / 2 - 3, y + 1, SSD1306_WHITE);
            break;
        }
        case FACE_ERROR: {
            // Drooping mouth
            display.drawFastHLine(x - w / 2 + 2, y, w - 4, SSD1306_WHITE);
            display.drawPixel(x - w / 2, y + 1, SSD1306_WHITE);
            display.drawPixel(x + w / 2, y + 1, SSD1306_WHITE);
            break;
        }
        case FACE_SLEEP:
        default:
            display.drawFastHLine(x - w / 3, y, (w * 2) / 3, SSD1306_WHITE);
            break;
    }
}

void FaceRenderer::render(Adafruit_SSD1306 &display, FaceExpression expr, uint32_t frameTick) {
    int leftEyeX = 42;
    int rightEyeX = 86;
    int eyeY = 24;
    int eyeW = 20;
    int eyeH = 28;
    int mouthY = 48;
    int mouthW = 26;

    int pupilDx = 0;
    int pupilDy = 0;

    switch (expr) {
        case FACE_IDLE:
            eyeH = 28;
            break;

        case FACE_BLINK:
            eyeH = 2; // Flat slit during blink
            break;

        case FACE_LISTENING: {
            // Wide attentive eyes with sound wave radar dots
            eyeH = 30;
            eyeW = 22;
            int wavePhase = (frameTick / 4) % 3;
            // Left & right audio listener bars
            display.drawFastVLine(16, eyeY - 8 - wavePhase * 2, 16 + wavePhase * 4, SSD1306_WHITE);
            display.drawFastVLine(112, eyeY - 8 - wavePhase * 2, 16 + wavePhase * 4, SSD1306_WHITE);
            break;
        }

        case FACE_THINKING: {
            // Eyes looking upwards and shifting left/right
            int shift = ((frameTick / 6) % 2 == 0) ? -2 : 2;
            pupilDx = shift;
            pupilDy = -5;
            eyeH = 24;
            // Orbiting thinking dot above head
            int orbitPhase = (frameTick % 12);
            int orbitX = 64 + (orbitPhase - 6) * 4;
            display.fillCircle(orbitX, 6, 2, SSD1306_WHITE);
            break;
        }

        case FACE_SPEAKING: {
            // Dynamic eye bounce synchronized with voice
            int bounce = (frameTick % 4 == 0) ? 1 : 0;
            eyeY += bounce;
            mouthY += bounce;
            break;
        }

        case FACE_ERROR: {
            // Angled eyebrows and cross eyes
            display.drawLine(leftEyeX - 12, eyeY - 14, leftEyeX + 8, eyeY - 10, SSD1306_WHITE);
            display.drawLine(rightEyeX - 8, eyeY - 10, rightEyeX + 12, eyeY - 14, SSD1306_WHITE);
            // Draw cross eyes
            display.drawLine(leftEyeX - 8, eyeY - 8, leftEyeX + 8, eyeY + 8, SSD1306_WHITE);
            display.drawLine(leftEyeX + 8, eyeY - 8, leftEyeX - 8, eyeY + 8, SSD1306_WHITE);
            display.drawLine(rightEyeX - 8, eyeY - 8, rightEyeX + 8, eyeY + 8, SSD1306_WHITE);
            display.drawLine(rightEyeX + 8, eyeY - 8, rightEyeX - 8, eyeY + 8, SSD1306_WHITE);
            drawMouth(display, 64, mouthY, mouthW, expr, frameTick);
            return;
        }

        case FACE_SLEEP: {
            // Curved closed eyes
            display.drawFastHLine(leftEyeX - 10, eyeY, 20, SSD1306_WHITE);
            display.drawFastHLine(rightEyeX - 10, eyeY, 20, SSD1306_WHITE);
            // Floating 'Z' characters
            int zPhase = (frameTick / 8) % 3;
            display.setCursor(96 + zPhase * 6, 12 - zPhase * 3);
            display.setTextSize(1);
            display.setTextColor(SSD1306_WHITE);
            display.print("z");
            drawMouth(display, 64, mouthY, mouthW, expr, frameTick);
            return;
        }

        default:
            break;
    }

    drawEye(display, leftEyeX, eyeY, eyeW, eyeH, pupilDx, pupilDy);
    drawEye(display, rightEyeX, eyeY, eyeW, eyeH, pupilDx, pupilDy);
    drawMouth(display, 64, mouthY, mouthW, expr, frameTick);
}
