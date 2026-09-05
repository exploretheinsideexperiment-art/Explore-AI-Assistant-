# Explore AI Assistant — Device Protocol Specification

This document defines the lifecycle states, Wi-Fi captive portal API, and NVS schema for Explore AI devices.

---

## 1. Device Onboarding State Machine

```
+-------------------------------------------------------------+
|                            BOOT                             |
+-------------------------------------------------------------+
                              |
                              v
                   [Check NVS Credentials]
                              |
        +---------------------+---------------------+
        | (No Credentials)                          | (Saved Credentials Found)
        v                                           v
+-----------------------+                 +-----------------------+
|  START SOFT_AP        |                 | CONNECT_WIFI          |
|  SSID: "Explore AI"   |                 | Target SSID in NVS    |
|  IP: 192.168.4.1      |                 +-----------------------+
+-----------------------+                             |
        |                                             |
        v                                             |
+-----------------------+                             |
|  CAPTIVE PORTAL       |                             |
|  DNS: 53 (*)          |                             |
|  HTTP: 80             |                             |
+-----------------------+                             |
        | (User Submits SSID/Pass)                    |
        v                                             v
+-----------------------+                 +-----------------------+
| CONNECTING_WIFI       |<----------------| WIFI_CONNECTING       |
+-----------------------+                 +-----------------------+
        |                                             |
   +----+----+                                   +----+----+
   |         |                                   |         |
 (Success) (Failed)                            (Success) (Failed)
   |         |                                   |         |
   |         +---> Return to AP & show error     |         +---> Exp Backoff Retry
   v                                             v
+-----------------------+                 +-----------------------+
| SAVE NVS CREDENTIALS  |                 | CONNECT_CLOUD         |
| Stop AP & DNS         |                 | Register / Auth WSS   |
+-----------------------+                 +-----------------------+
   |                                                 |
   +-------------------------------------------------+
```

---

## 2. Captive Portal Local HTTP API (Port 80)

### `GET /scan`
Returns surrounding 2.4GHz Wi-Fi networks.
- **Response**:
  ```json
  {
    "networks": [
      { "ssid": "Home-WiFi-5G", "rssi": -52, "secure": true },
      { "ssid": "IoT_Lab", "rssi": -68, "secure": true },
      { "ssid": "Guest_Cafe", "rssi": -85, "secure": false }
    ]
  }
  ```

### `POST /connect`
Initiates connection to the specified network.
- **Payload**:
  ```json
  {
    "ssid": "Home-WiFi-5G",
    "password": "secret_password"
  }
  ```
- **Response**:
  ```json
  {
    "status": "connecting",
    "message": "Attempting connection..."
  }
  ```

### `GET /status`
Queries the live connection progress.
- **Response (Connecting)**:
  ```json
  { "status": "connecting", "message": "Connecting to Home-WiFi-5G..." }
  ```
- **Response (Connected)**:
  ```json
  { "status": "connected", "ip": "192.168.1.142", "message": "Connected to Home-WiFi-5G" }
  ```

### `POST /reset`
Forces the device to wipe saved Wi-Fi and restart SoftAP.
