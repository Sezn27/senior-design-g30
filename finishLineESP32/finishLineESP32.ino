#include <WiFi.h>
#include <WebSocketsClient.h>
#include <Pixy2.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include "Adafruit_LEDBackpack.h"

Pixy2 pixy;
WebSocketsClient webSocket;
Adafruit_BicolorMatrix matrix = Adafruit_BicolorMatrix();

// WiFi credentials
const char* ssid = "TP-Link_D668";
const char* password = "68619152";
const char* websocketServer = "192.168.0.103";
const uint16_t websocketPort = 8084;

// Detection timing
unsigned long lastBlueDetection = 0;
unsigned long lastRedDetection = 0;
const unsigned long detectionDelay = 3000;

String currentLapShown = ""; // Track current lap on display

// --- Forward Declarations ---
void runCountdown();
void flashNumber(uint8_t number, uint16_t color);
void flashMessage(String msg, uint16_t color);
void flashMatrixColor(uint16_t color);

void setup() {
    Serial.begin(115200);
    pixy.init();
    matrix.begin(0x70);

    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.print(".");
    }
    Serial.println("\nConnected to WiFi");
    Serial.println("ESP32 IP Address: ");
    Serial.println(WiFi.localIP());

    webSocket.begin(websocketServer, websocketPort, "/");
    webSocket.onEvent(webSocketEvent);
    Serial.println("Connected to WebSocket server");

    matrix.clear();
    matrix.writeDisplay();
}

void loop() {
    webSocket.loop();

    pixy.ccc.getBlocks();
    unsigned long currentTime = millis();

    if (pixy.ccc.numBlocks) {
        for (int i = 0; i < pixy.ccc.numBlocks; i++) {
            int signature = pixy.ccc.blocks[i].m_signature;
            if (signature == 1 && (currentTime - lastBlueDetection > detectionDelay)) {
                sendColorToServer("blue");
                lastBlueDetection = currentTime;
            } 
            else if (signature == 2 && (currentTime - lastRedDetection > detectionDelay)) {
                sendColorToServer("red");
                lastRedDetection = currentTime;
            }
        }
    }
}

void sendColorToServer(const char* color) {
    if (webSocket.isConnected()) {
        Serial.print("Sending color to server: ");
        Serial.println(color);
        webSocket.sendTXT(color);
    } else {
        Serial.println("WebSocket not connected. Attempting to reconnect...");
        webSocket.begin(websocketServer, websocketPort, "/");
    }
}

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length) {
    if (type == WStype_CONNECTED) {
        Serial.println("WebSocket connected!");
    } else if (type == WStype_DISCONNECTED) {
        Serial.println("WebSocket disconnected. Reconnecting...");
        webSocket.begin(websocketServer, websocketPort, "/");
    } else if (type == WStype_TEXT) {
        String msg = String((char*)payload);
        Serial.print("Received WebSocket message: ");
        Serial.println(msg);

        if (msg.startsWith("show:countdown")) {
            runCountdown();
        } else if (msg.startsWith("show:lap ")) {
            String lapText = msg.substring(9);
            if (lapText != currentLapShown) {
                int lap = lapText.toInt();
                if (lap >= 1 && lap <= 3) {
                    flashNumber(lap, LED_YELLOW);
                }
                currentLapShown = lapText;
            }
        } else if (msg == "show:Red Car Wins!" || msg == "show:Blue Car Wins!") {
            if (msg.indexOf("Red") >= 0) {
            flashMessage("R", LED_YELLOW);
        } else if (msg.indexOf("Blue") >= 0) {
            flashMessage("B", LED_YELLOW);
        }

        }
    }
}

// --- Utility Display Functions ---

void runCountdown() {
    flashMatrixColor(LED_RED);
    delay(1000);
    flashMatrixColor(LED_YELLOW);
    delay(1000);
    flashMatrixColor(LED_GREEN);
    delay(1000);
    currentLapShown = "1";
    flashNumber(1, LED_YELLOW);
}

void flashMatrixColor(uint16_t color) {
    matrix.clear();
    for (uint8_t x = 0; x < 8; x++) {
        for (uint8_t y = 0; y < 8; y++) {
            matrix.drawPixel(x, y, color);
        }
    }
    matrix.writeDisplay();
}

void flashNumber(uint8_t number, uint16_t color) {
    matrix.clear();
    matrix.setRotation(3); // 90° clockwise
    matrix.setTextSize(1);
    matrix.setTextColor(color);
    matrix.setCursor(0, 0);
    matrix.print(number);
    matrix.writeDisplay();
    delay(1000);
    matrix.setRotation(0);
}

void flashMessage(String msg, uint16_t color) {
    matrix.clear();
    matrix.setRotation(3); // 90° clockwise
    matrix.setTextSize(1);
    matrix.setTextColor(color);
    matrix.setCursor(0, 0);
    matrix.print(msg);
    matrix.writeDisplay();
    delay(1000);
    matrix.setRotation(0);
}
