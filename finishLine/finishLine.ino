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
const char* ssid = "TheCrib";
const char* password = "DeezNuts";
const char* websocketServer = "192.168.1.86";
const uint16_t websocketPort = 8084;

unsigned long lastBlueDetection = 0;
unsigned long lastRedDetection = 0;
const unsigned long detectionDelay = 3000;

String currentLapShown = ""; // Keep track of last displayed lap

void setup() {
    Serial.begin(115200);
    pixy.init();
    matrix.begin(0x70); // LED Matrix I2C address

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
        } else if (msg.startsWith("show: ")) {
            String lapText = msg.substring(5); // Extract "lap X"
            if (lapText != currentLapShown) {
                scrollText("Lap " + lapText, LED_YELLOW);
                currentLapShown = lapText;
            }
        } else if (msg.startsWith("show:")) {
            String displayMsg = msg.substring(5);
            scrollText(displayMsg, LED_GREEN);
        }
    }
}

void scrollText(String text, uint16_t color) {
    matrix.clear();
    matrix.setTextWrap(false);
    matrix.setTextSize(1);
    matrix.setTextColor(color);

    int textWidth = text.length() * 6;
    for (int8_t x = 8; x >= -textWidth; x--) {
        matrix.clear();
        matrix.setCursor(x, 0);
        matrix.print(text);
        matrix.writeDisplay();
        delay(100);
    }
}

void runCountdown() {
    scrollText("3", LED_RED);
    delay(1000);
    scrollText("2", LED_RED);
    delay(1000);
    scrollText("1", LED_YELLOW);
    delay(1000);
    scrollText("GO!", LED_GREEN);
    delay(1000);
    currentLapShown = "1";
    scrollText("Lap 1", LED_YELLOW);
}
