#ifndef EXPLORE_AI_WEBSOCKET_CLIENT_H
#define EXPLORE_AI_WEBSOCKET_CLIENT_H

#include <Arduino.h>
#include "../../include/config.h"

enum WsConnectionState {
    WS_DISCONNECTED,
    WS_CONNECTING,
    WS_CONNECTED,
    WS_AUTHENTICATED
};

class WebSocketClient {
public:
    WebSocketClient();
    bool begin(const String &wssUrl = DEFAULT_CLOUD_WSS_URL);
    void update();
    void disconnect();

    bool sendHello(const String &deviceId, const String &firmware);
    bool sendAudioChunk(const uint8_t *data, size_t len);
    bool sendState(const String &state);

    WsConnectionState getState() const { return state; }

private:
    String socketUrl;
    WsConnectionState state;
    uint32_t lastPing;
};

extern WebSocketClient wsClient;

#endif // EXPLORE_AI_WEBSOCKET_CLIENT_H
