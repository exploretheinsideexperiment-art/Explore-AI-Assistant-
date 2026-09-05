#include "websocket_client.h"

WebSocketClient wsClient;

WebSocketClient::WebSocketClient() 
    : socketUrl(DEFAULT_CLOUD_WSS_URL), state(WS_DISCONNECTED), lastPing(0) {}

bool WebSocketClient::begin(const String &wssUrl) {
    socketUrl = wssUrl;
    // TODO [PHASE 5]: Initialize TLS WebSocketsClient for WSS
    Serial.printf("[WSS] WebSocket interface configured for %s (Ready for Phase 5).\n", socketUrl.c_str());
    return true;
}

void WebSocketClient::update() {
    // TODO [PHASE 5]: Socket poll & heartbeat handling
}

void WebSocketClient::disconnect() {
    state = WS_DISCONNECTED;
}

bool WebSocketClient::sendHello(const String &deviceId, const String &firmware) {
    // TODO [PHASE 5]: Send protocol hello handshake frame
    Serial.printf("[WSS] Send hello: device=%s, fw=%s\n", deviceId.c_str(), firmware.c_str());
    return true;
}

bool WebSocketClient::sendAudioChunk(const uint8_t *data, size_t len) {
    if (state != WS_AUTHENTICATED || data == nullptr) return false;
    // TODO [PHASE 6]: Send binary WebSocket frame
    return true;
}

bool WebSocketClient::sendState(const String &stateMsg) {
    // TODO [PHASE 5]: Send JSON state event
    return true;
}
