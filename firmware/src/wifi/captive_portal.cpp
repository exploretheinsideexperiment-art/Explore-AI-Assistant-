#include "captive_portal.h"

CaptivePortal captivePortal;

CaptivePortal::CaptivePortal() 
    : server(HTTP_PORT), running(false), currentStatus(PORTAL_STATUS_IDLE) {
    statusMessage = "Ready for setup";
}

CaptivePortal::~CaptivePortal() {
    stop();
}

bool CaptivePortal::start(const IPAddress &apIP) {
    if (running) return true;
    portalIP = apIP;

    // Start DNS server redirecting everything to captive portal IP
    dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
    dnsServer.start(DNS_PORT, "*", portalIP);

    // Standard Routes
    server.on("/", HTTP_GET, std::bind(&CaptivePortal::handleRoot, this));
    server.on("/scan", HTTP_GET, std::bind(&CaptivePortal::handleScan, this));
    server.on("/connect", HTTP_POST, std::bind(&CaptivePortal::handleConnect, this));
    server.on("/status", HTTP_GET, std::bind(&CaptivePortal::handleStatus, this));
    server.on("/reset", HTTP_POST, std::bind(&CaptivePortal::handleReset, this));

    // Captive Portal Detection URLs
    server.on("/generate_204", HTTP_GET, std::bind(&CaptivePortal::handleCaptiveRedirect, this));
    server.on("/gen_204", HTTP_GET, std::bind(&CaptivePortal::handleCaptiveRedirect, this));
    server.on("/hotspot-detect.html", HTTP_GET, std::bind(&CaptivePortal::handleCaptiveRedirect, this));
    server.on("/connecttest.txt", HTTP_GET, std::bind(&CaptivePortal::handleCaptiveRedirect, this));
    server.on("/ncsi.txt", HTTP_GET, std::bind(&CaptivePortal::handleCaptiveRedirect, this));
    server.on("/canonical.html", HTTP_GET, std::bind(&CaptivePortal::handleCaptiveRedirect, this));

    server.onNotFound(std::bind(&CaptivePortal::handleNotFound, this));

    server.begin();
    running = true;
    Serial.printf("[PORTAL] Captive portal DNS & HTTP started at http://%s\n", portalIP.toString().c_str());
    return true;
}

void CaptivePortal::stop() {
    if (!running) return;
    dnsServer.stop();
    server.stop();
    running = false;
    Serial.println("[PORTAL] Captive portal stopped.");
}

void CaptivePortal::process() {
    if (!running) return;
    dnsServer.processNextRequest();
    server.handleClient();
}

void CaptivePortal::setStatus(PortalStatus status, const String &info) {
    currentStatus = status;
    statusMessage = info;
    Serial.printf("[PORTAL] Status update: %d - %s\n", status, info.c_str());
}

void CaptivePortal::handleCaptiveRedirect() {
    server.sendHeader("Location", String("http://") + portalIP.toString() + "/", true);
    server.send(302, "text/plain", "");
}

void CaptivePortal::handleNotFound() {
    // If request Host is not the portal IP, redirect to captive portal
    if (server.hostHeader() != portalIP.toString()) {
        server.sendHeader("Location", String("http://") + portalIP.toString() + "/", true);
        server.send(302, "text/plain", "");
        return;
    }
    server.send(404, "text/plain", "Explore AI - 404 Not Found");
}

void CaptivePortal::handleRoot() {
    server.send(200, "text/html", generateIndexHTML());
}

void CaptivePortal::handleScan() {
    Serial.println("[PORTAL] Scanning for Wi-Fi networks...");
    int n = WiFi.scanNetworks(false, true); // Async scan done synchronously here
    
    JsonDocument doc;
    JsonArray networks = doc["networks"].to<JsonArray>();

    for (int i = 0; i < n; ++i) {
        String ssid = WiFi.SSID(i);
        if (ssid.length() == 0) continue; // Skip hidden networks

        JsonObject net = networks.add<JsonObject>();
        net["ssid"] = ssid;
        net["rssi"] = WiFi.RSSI(i);
        net["secure"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
    }
    WiFi.scanDelete();

    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
}

void CaptivePortal::handleConnect() {
    if (!server.hasArg("plain")) {
        server.send(400, "application/json", "{\"error\":\"Missing body payload\"}");
        return;
    }

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, server.arg("plain"));
    if (error) {
        server.send(400, "application/json", "{\"error\":\"Invalid JSON format\"}");
        return;
    }

    const char* ssid = doc["ssid"];
    const char* password = doc["password"];

    if (!ssid || strlen(ssid) == 0) {
        server.send(400, "application/json", "{\"error\":\"SSID cannot be empty\"}");
        return;
    }

    Serial.printf("[PORTAL] Connection request received for SSID: %s\n", ssid);
    currentStatus = PORTAL_STATUS_CONNECTING;
    statusMessage = "Connecting to " + String(ssid) + "...";

    server.send(200, "application/json", "{\"status\":\"connecting\",\"message\":\"Attempting connection...\"}");

    if (connectCallback) {
        connectCallback(String(ssid), password ? String(password) : "");
    }
}

void CaptivePortal::handleStatus() {
    JsonDocument doc;
    switch (currentStatus) {
        case PORTAL_STATUS_IDLE:
            doc["status"] = "idle";
            break;
        case PORTAL_STATUS_CONNECTING:
            doc["status"] = "connecting";
            break;
        case PORTAL_STATUS_CONNECTED:
            doc["status"] = "connected";
            doc["ip"] = WiFi.localIP().toString();
            break;
        case PORTAL_STATUS_FAILED:
            doc["status"] = "failed";
            break;
    }
    doc["message"] = statusMessage;

    String res;
    serializeJson(doc, res);
    server.send(200, "application/json", res);
}

void CaptivePortal::handleReset() {
    server.send(200, "application/json", "{\"status\":\"ok\",\"message\":\"Device resetting...\"}");
    if (resetCallback) {
        resetCallback();
    }
}

String CaptivePortal::generateIndexHTML() {
    return F(R"rawliteral(<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Explore AI Setup</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #131a29;
      --primary: #06b6d4;
      --primary-hover: #0891b2;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: #1e293b;
      --danger: #ef4444;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; width: 100%; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .logo-badge { width: 42px; height: 42px; border-radius: 12px; background: rgba(6,182,212,0.15); border: 1px solid var(--primary); display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 20px; font-weight: bold; }
    h1 { font-size: 20px; font-weight: 700; color: #fff; }
    .subtitle { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
    .form-group { margin-bottom: 18px; }
    label { display: block; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
    .refresh-btn { background: none; border: none; color: var(--primary); font-size: 13px; cursor: pointer; float: right; }
    select, input[type="text"], input[type="password"] {
      width: 100%; padding: 12px 14px; background: #0b111e; border: 1px solid var(--border); border-radius: 10px; color: #fff; font-size: 14px; outline: none; transition: border 0.2s;
    }
    select:focus, input:focus { border-color: var(--primary); }
    .btn-connect {
      width: 100%; padding: 14px; background: var(--primary); border: none; border-radius: 10px; color: #000; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s; margin-top: 8px;
    }
    .btn-connect:hover { background: var(--primary-hover); }
    .btn-connect:disabled { opacity: 0.5; cursor: not-allowed; }
    .status-box { margin-top: 18px; padding: 12px; border-radius: 10px; font-size: 13px; display: none; line-height: 1.4; }
    .status-box.info { background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.3); color: #38bdf8; display: block; }
    .status-box.error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: var(--danger); display: block; }
    .status-box.success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: var(--success); display: block; }
    .device-info { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between; }
    .network-item { display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-badge">AI</div>
      <div>
        <h1>Explore AI Assistant</h1>
        <div class="subtitle">Connect your device to Wi-Fi</div>
      </div>
    </div>

    <form id="wifiForm" onsubmit="handleConnect(event)">
      <div class="form-group">
        <label for="ssidSelect">Nearby Wi-Fi Networks <button type="button" class="refresh-btn" onclick="scanNetworks()">⟳ Scan</button></label>
        <select id="ssidSelect" onchange="onSSIDChange()">
          <option value="">-- Scanning nearby networks... --</option>
        </select>
      </div>

      <div class="form-group" id="customSsidGroup" style="display:none;">
        <label for="customSsid">Manual SSID</label>
        <input type="text" id="customSsid" placeholder="Enter network name">
      </div>

      <div class="form-group">
        <label for="password">Wi-Fi Password</label>
        <input type="password" id="password" placeholder="Enter password (leave empty if open)">
      </div>

      <button type="submit" class="btn-connect" id="submitBtn">Connect to Wi-Fi</button>
    </form>

    <div id="statusBox" class="status-box"></div>

    <div class="device-info">
      <span>Firmware: v1.0.0</span>
      <span>Captive AP: Explore AI</span>
    </div>
  </div>

  <script>
    let pollInterval = null;

    async function scanNetworks() {
      const select = document.getElementById('ssidSelect');
      select.innerHTML = '<option value="">Scanning networks...</option>';
      try {
        const res = await fetch('/scan');
        const data = await res.json();
        select.innerHTML = '<option value="">-- Select a Wi-Fi Network --</option>';
        if (data.networks && data.networks.length > 0) {
          data.networks.forEach(net => {
            const opt = document.createElement('option');
            opt.value = net.ssid;
            opt.textContent = `${net.ssid} (${net.rssi} dBm) ${net.secure ? '🔒' : '🔓'}`;
            select.appendChild(opt);
          });
        } else {
          select.innerHTML = '<option value="">No networks found</option>';
        }
        select.innerHTML += '<option value="__manual__">+ Enter hidden/custom SSID</option>';
      } catch (err) {
        select.innerHTML = '<option value="__manual__">Scan failed, enter manual SSID</option>';
        document.getElementById('customSsidGroup').style.display = 'block';
      }
    }

    function onSSIDChange() {
      const val = document.getElementById('ssidSelect').value;
      document.getElementById('customSsidGroup').style.display = (val === '__manual__') ? 'block' : 'none';
    }

    async function handleConnect(e) {
      e.preventDefault();
      const selectVal = document.getElementById('ssidSelect').value;
      const customVal = document.getElementById('customSsid').value.trim();
      const ssid = (selectVal === '__manual__') ? customVal : selectVal;
      const password = document.getElementById('password').value;

      if (!ssid) {
        showStatus('Please select or enter a Wi-Fi network.', 'error');
        return;
      }

      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.textContent = 'Connecting...';
      showStatus('Sending credentials to Explore AI device...', 'info');

      try {
        const res = await fetch('/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ssid, password })
        });
        const result = await res.json();
        if (res.ok) {
          showStatus('Credentials accepted. Verifying Wi-Fi connection...', 'info');
          startPollingStatus();
        } else {
          showStatus(result.error || 'Failed to submit credentials.', 'error');
          btn.disabled = false;
          btn.textContent = 'Connect to Wi-Fi';
        }
      } catch (err) {
        showStatus('Communication error with device.', 'error');
        btn.disabled = false;
        btn.textContent = 'Connect to Wi-Fi';
      }
    }

    function startPollingStatus() {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch('/status');
          const data = await res.json();
          if (data.status === 'connected') {
            clearInterval(pollInterval);
            showStatus(`Connected! Device IP: ${data.ip}. Connecting to Explore AI cloud...`, 'success');
            document.getElementById('submitBtn').textContent = 'Connected!';
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            showStatus('Wi-Fi connection failed. Please check password and retry.', 'error');
            document.getElementById('submitBtn').disabled = false;
            document.getElementById('submitBtn').textContent = 'Connect to Wi-Fi';
          }
        } catch (e) {}
      }, 2000);
    }

    function showStatus(text, type) {
      const box = document.getElementById('statusBox');
      box.textContent = text;
      box.className = 'status-box ' + type;
    }

    // Auto-scan on load
    window.addEventListener('DOMContentLoaded', scanNetworks);
  </script>
</body>
</html>)rawliteral");
}
