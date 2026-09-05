# Explore AI Assistant — Security Model

Comprehensive hardware and cloud security architecture.

---

## 1. Threat Vectors & Mitigations

| Threat Vector | Mitigation in Explore AI |
|---------------|--------------------------|
| **Wi-Fi Credential Theft** | Stored inside encrypted NVS partition; passwords are never printed to Serial logs and never returned across local JSON status endpoints. |
| **Man-in-the-Middle (MitM)** | Enforced HTTPS / WSS communication with strict TLS certificate verification in production. |
| **Unauthorized Device Hijacking** | Ephemeral 6-digit cryptographically random pairing tokens expiring in 10 minutes. Ownership is validated server-side. |
| **API Key Exposure** | LLM provider keys (Groq, OpenAI, ElevenLabs) are strictly held in backend cloud memory / secure server environment. The ESP32 client never receives raw API keys. |
| **Tampered Firmware** | Dual-bank OTA with SHA256 integrity verification and automated fallback to previous slot if boot fails. |
| **Denial of Service / Brute Force** | Rate limiting on authentication and pairing endpoints (max 5 pairing attempts per minute). |
