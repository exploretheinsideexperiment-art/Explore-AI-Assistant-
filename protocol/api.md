# Explore AI Assistant — REST API Specification

Base URL: `https://api.exploreai.example`

---

## 1. Authentication Endpoints

- `POST /api/auth/register`: Register user with email/mobile and password.
- `POST /api/auth/login`: Authenticate and receive JWT access & refresh tokens.
- `POST /api/auth/verify`: OTP verification for 2FA or email confirmation.
- `POST /api/auth/logout`: Invalidate session.

---

## 2. Device Management Endpoints

### Register Hardware Device
- **Route**: `POST /api/devices/register`
- **Body**:
  ```json
  {
    "device_id": "EXP-AI-9F2B48",
    "hardware": "ESP32-S3",
    "firmware": "1.0.0",
    "mac": "34:85:18:9F:2B:48"
  }
  ```

### Pair Device to User Account
- **Route**: `POST /api/devices/pair`
- **Body**:
  ```json
  {
    "pairing_code": "489210",
    "custom_name": "Living Room Explorer"
  }
  ```

### Device List & Details
- `GET /api/devices`: List all devices owned by authenticated user.
- `GET /api/devices/:id`: Get device status (online/offline, IP, RSSI, battery, firmware).
- `PATCH /api/devices/:id`: Rename or update device metadata.
- `DELETE /api/devices/:id`: Unpair and disassociate device.

---

## 3. Configuration Endpoints

- `GET /api/devices/:id/config`: Retrieve device configuration.
- `PATCH /api/devices/:id/config`:
  ```json
  {
    "language": "hi-IN",
    "voice": "Rachel",
    "voice_mode": "push_to_talk",
    "ai_provider": "groq",
    "model": "llama-3.3-70b-versatile",
    "personality": "educational"
  }
  ```

---

## 4. Languages & Voices Endpoints

- `GET /api/languages`: List supported languages (Hindi, English, Hinglish, Bhojpuri, Bengali, Marathi, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Urdu).
- `GET /api/voices`: List available TTS voices (ElevenLabs, Edge-TTS, OpenAI).

---

## 5. Knowledge Base (RAG) Endpoints

- `POST /api/knowledge/upload`: Upload PDF, DOCX, TXT, or Markdown for chunking & embedding.
- `GET /api/knowledge`: List collections and documents.
- `DELETE /api/knowledge/:id`: Remove document from vector store.

---

## 6. OTA Firmware Updates

- `GET /api/firmware/latest?hardware=ESP32-S3`: Check for latest binary release, checksum, and release notes.
