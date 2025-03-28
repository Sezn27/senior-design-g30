#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>

// WiFi Credentials
const char* ssid = "TheCrib";
const char* password = "DeezNuts";

// Web server running on port 80
WebServer server(80);

// Camera Pin Configuration (For AI-Thinker Module)
#define PWDN_GPIO_NUM    -1
#define RESET_GPIO_NUM   -1
#define XCLK_GPIO_NUM     21
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       19
#define Y4_GPIO_NUM       18
#define Y3_GPIO_NUM        5
#define Y2_GPIO_NUM        4
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Motor control pins
#define MOTOR_FORWARD  12  // Connect to motor driver IN1
#define MOTOR_BACKWARD 13  // Connect to motor driver IN2
#define MOTOR_Left  14  // Connect to motor driver IN1
#define MOTOR_Right 15  // Connect to motor driver IN2


void setup() {
    Serial.begin(115200);
    Serial.println("Initializing camera...");

    // Camera Configuration
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    // Optimized for speed
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;

    // Initialize Camera
    if (esp_camera_init(&config) != ESP_OK) {
        Serial.println("Camera init failed!");
        return;
    }
    Serial.println("Camera initialized successfully!");

    // Setup motor pins
    pinMode(MOTOR_FORWARD, OUTPUT);
    pinMode(MOTOR_BACKWARD, OUTPUT);
    pinMode(MOTOR_Left, OUTPUT);
    pinMode(MOTOR_Right, OUTPUT);
    digitalWrite(MOTOR_FORWARD, LOW);
    digitalWrite(MOTOR_BACKWARD, LOW);
    digitalWrite(MOTOR_Left, LOW);
    digitalWrite(MOTOR_Right, LOW);

    // Connect to WiFi
    Serial.print("Connecting to WiFi...");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected!");
    Serial.print("ESP32 IP Address: ");
    Serial.println(WiFi.localIP());

    // Define HTTP routes
    server.on("/capture", HTTP_GET, []() {
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) {
            server.send(500, "text/plain", "Camera capture failed");
            return;
        }
        server.send_P(200, "image/jpeg", (const char*)fb->buf, fb->len);
        esp_camera_fb_return(fb);
    });

server.on("/command", HTTP_GET, []() {
    String action = server.arg("action");
    Serial.println("Received command: " + action);

    if (action == "move_forward") {
        Serial.println("Moving forward...");
        digitalWrite(MOTOR_FORWARD, HIGH);
        digitalWrite(MOTOR_BACKWARD, LOW);
        server.send(200, "text/plain", "Moving Forward");
    } 
    else if (action == "move_backward") {
        Serial.println("Moving backward...");
        digitalWrite(MOTOR_FORWARD, LOW);
        digitalWrite(MOTOR_BACKWARD, HIGH);
        server.send(200, "text/plain", "Moving Backward");
    }
    else if (action == "turn_left") {
        Serial.println("Turning left...");
        digitalWrite(MOTOR_Left, HIGH);
        digitalWrite(MOTOR_Right, LOW);
        server.send(200, "text/plain", "Turning Left");
    }
    else if (action == "turn_right") {
        Serial.println("Turning right...");
        digitalWrite(MOTOR_Left, LOW);
        digitalWrite(MOTOR_Right, HIGH);
        server.send(200, "text/plain", "Turning Right");
    }
    else if (action == "stop") {
        Serial.println("Stopping motors...");
        digitalWrite(MOTOR_FORWARD, LOW);
        digitalWrite(MOTOR_BACKWARD, LOW);
        server.send(200, "text/plain", "Stopping");
    }
    else if (action == "stop_turn") {
        Serial.println("Stopping turn...");
        digitalWrite(MOTOR_Left, LOW);
        digitalWrite(MOTOR_Right, LOW);
        server.send(200, "text/plain", "Stopping Turn");
    }
    else if (action == "start") {
        Serial.println("Received 'start' command (currently does nothing)");
        server.send(200, "text/plain", "Start command acknowledged");
    }
    else {
        Serial.println("Invalid command received: " + action);
        server.send(400, "text/plain", "Invalid Command");
    }
});



    server.begin();
    Serial.println("HTTP server started. Access: http://<ESP32_IP>/command?action=move_forward");
}

void loop() {
    server.handleClient();  // Handle HTTP requests
}
