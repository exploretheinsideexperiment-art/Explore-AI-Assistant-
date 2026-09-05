# Explore AI Assistant — WebSocket (WSS) Protocol Specification

Version: `1.0.0`
Transport: `Secure WebSocket (WSS)`
Encoding: Text frames for JSON control messages, Binary frames for raw PCM audio streams.

---

## 1. Handshake & Authentication Flow

### A. Device Hello (`device -> server`)
Immediately after the TLS connection is established, the ESP32 sends a `hello` handshake frame:

```json
{
  "type": "hello",
  "protocol_version": 1,
  "device_id": "EXP-AI-9F2B48",
  "firmware": "1.0.0",
  "hardware": "ESP32-S3",
  "token": "<JWT_OR_DEVICE_TOKEN>"
}
```

### B. Server Hello Acknowledgement (`server -> device`)
The server validates the device ownership, checks pairing, and replies:

```json
{
  "type": "hello_ack",
  "session_id": "sess_88f910ab32",
  "server_time": 1725350400,
  "status": "ready",
  "config": {
    "language": "hi-IN",
    "voice": "Rachel",
    "voice_mode": "push_to_talk",
    "sample_rate": 16000
  }
}
```

If the device is not paired to a user account, the server returns:

```json
{
  "type": "pairing_required",
  "device_id": "EXP-AI-9F2B48",
  "pairing_code": "489210",
  "expires_in": 600
}
```

---

## 2. Audio Streaming Protocol

### Upstream (ESP32 -> Backend Voice Input)
1. **Start Listening Event**:
   ```json
   {
     "type": "audio_start",
     "format": "pcm_16bit",
     "sample_rate": 16000,
     "channels": 1
   }
   ```
2. **Binary Frames**:
   - Streamed sequentially in chunks of 512–1024 bytes (32ms–64ms per frame).
3. **Audio End Event**:
   ```json
   {
     "type": "audio_end"
   }
   ```

### Downstream (Backend -> ESP32 TTS Output)
1. **TTS Begin Event**:
   ```json
   {
     "type": "tts_start",
     "format": "pcm_16bit",
     "sample_rate": 16000,
     "text": "Sure, here is how an ESP32 works..."
   }
   ```
2. **Binary Frames**:
   - Decoded PCM audio streamed to the ESP32 MAX98357A I2S driver.
3. **TTS End Event**:
   ```json
   {
     "type": "tts_end"
   }
   ```

---

## 3. OLED State Synchronization

The server can push facial/state instructions to the OLED:

```json
{
  "type": "state_update",
  "state": "SPEAKING",
  "text": "Explaining Ohm's Law..."
}
```

Supported States:
- `IDLE`
- `LISTENING`
- `PROCESSING`
- `SPEAKING`
- `ERROR`
- `SLEEP`

---

## 4. Heartbeat (Ping / Pong)

To prevent idle NAT dropouts, the device sends a heartbeat every 30 seconds:

```json
{
  "type": "ping",
  "timestamp": 1725350430,
  "rssi": -58
}
```

Server replies:
```json
{
  "type": "pong",
  "timestamp": 1725350430
}
```
