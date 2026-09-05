#ifndef EXPLORE_AI_CAPTIVE_PORTAL_H
#define EXPLORE_AI_CAPTIVE_PORTAL_H

#include <Arduino.h>
#include <DNSServer.h>
#include <WebServer.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include "../../include/config.h"

enum PortalStatus {
    PORTAL_STATUS_IDLE,
    PORTAL_STATUS_CONNECTING,
    PORTAL_STATUS_CONNECTED,
    PORTAL_STATUS_FAILED
};

typedef std::function<void(const String& ssid, const String& password)> WiFiConnectCallback;
typedef std::function<void()> ResetCallback;

class CaptivePortal {
public:
    CaptivePortal();
    ~CaptivePortal();

    bool start(const IPAddress &apIP);
    void stop();
    void process();

    void onConnect(WiFiConnectCallback cb) { connectCallback = cb; }
    void onReset(ResetCallback cb) { resetCallback = cb; }

    void setStatus(PortalStatus status, const String &info = "");
    bool isRunning() const { return running; }

private:
    DNSServer dnsServer;
    WebServer server;
    bool running;
    IPAddress portalIP;
    
    PortalStatus currentStatus;
    String statusMessage;
    
    WiFiConnectCallback connectCallback;
    ResetCallback resetCallback;

    // Route Handlers
    void handleRoot();
    void handleScan();
    void handleConnect();
    void handleStatus();
    void handleReset();
    void handleCaptiveRedirect();
    void handleNotFound();

    // HTML generator
    String generateIndexHTML();
};

extern CaptivePortal captivePortal;

#endif // EXPLORE_AI_CAPTIVE_PORTAL_H
