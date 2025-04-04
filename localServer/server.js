const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const WebSocket = require("ws");
const axios = require("axios"); // Required for HTTP forwarding
const readline = require("readline"); // For command line input
const mysql = require("mysql2");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// MySQL connection pool
const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "race_project"
});

// IPs of the ESP32 cars
const carIPs = ["192.168.1.143", "192.168.1.87"]; // Red and Blue
const carColors = {
    "192.168.1.143": "Red",
    "192.168.1.87": "Blue"
};
const carToUsername = {};
const assignedColors = new Set();

let finishLineSocket = null;
let lapCounts = {
  blue: 0,
  red: 0
};
let redLastLapTime = null;
let blueLastLapTime = null;
const LAP_THRESHOLD = 4;
let currentDisplayedLap = 0;
let raceStarted = false;
const detectionCooldown = 3000; // 3 seconds cooldown between detections
let lastDetectionTime = {
  blue: 0,
  red: 0
};
let lapStartTime = {
  blue: null,
  red: null
};
let raceWinner = null;

// Start race sequence
function startRace() {
  raceStarted = true;
  raceWinner = null;
  currentDisplayedLap = 1;
  lapCounts.blue = 0;
  lapCounts.red = 0;
  lastDetectionTime.blue = 0;
  lastDetectionTime.red = 0;
  lapStartTime.blue = Date.now();
  lapStartTime.red = Date.now();
  sendToFinishLine("show:countdown");
}

// Send command to finish line ESP32
function sendToFinishLine(message) {
  if (finishLineSocket && finishLineSocket.readyState === WebSocket.OPEN) {
    console.log("Sending to finish line:", message);
    finishLineSocket.send(message);
  } else {
    console.log("Finish line WebSocket not connected.");
  }
}
function handleLap(carColor, lapCount, carIP) {
    const now = Date.now();
    let lapTime = 0;
    let carNumber = carColor === "red" ? 1 : 2;
    const displayColor = capitalize(carColor);

    // Lap 1: Log only and set starting timestamp
    if (lapCount === 1) {
        console.log(`${displayColor} car starting lap 1`);

        if (carColor === "red") {
            redLastLapTime = now;
        } else {
            blueLastLapTime = now;
        }

        return; // ⛔ Skip timing + DB insert
    }

    // ✅ Calculate lap time using valid timestamp
    if (carColor === "red") {
        lapTime = redLastLapTime ? (now - redLastLapTime) / 1000 : 0;
        redLastLapTime = now;
    } else {
        lapTime = blueLastLapTime ? (now - blueLastLapTime) / 1000 : 0;
        blueLastLapTime = now;
    }

    // 🧼 Console log once
    console.log(`${displayColor} car completed lap ${lapCount}`);
    console.log(`${displayColor.toUpperCase()} Lap ${lapCount}: ${lapTime.toFixed(2)}s`);

    // 🔍 Lookup username
    const username = carToUsername[carIP] || "Unknown";

    // ✅ Save to DB
    db.query(
        "INSERT INTO leaderboard (username, car_number, lap_time, lap_count, timestamp) VALUES (?, ?, ?, ?, NOW())",
        [username, carNumber, lapTime, lapCount],
        (err) => {
            if (err) console.error("Database error:", err);
        }
    );

    // 🎯 Finish line display
    if (lapCount === LAP_THRESHOLD) {
        if (!raceWinner) {
            raceWinner = carColor; // record first car to reach lap 4
            sendToFinishLine(`show:${displayColor} Car Wins!`);
        }
    } else if (lapCount > currentDisplayedLap) {
        currentDisplayedLap = lapCount;
        sendToFinishLine(`show:lap ${lapCount}`);
    }
}

// Handle color detection messages from ESP32 finish line
const finishLineServer = new WebSocket.Server({ port: 8084 });
finishLineServer.on("connection", (ws) => {
    console.log("Finish line ESP32 connected.");
    finishLineSocket = ws;

    ws.on("message", (data) => {
        const color = data.toString().toLowerCase();
        const now = Date.now();

        // Always print detected color
        if (color === "red") {
            console.log("Detected: red");
        } else if (color === "blue") {
            console.log("Detected: blue");
        }

        // Only handle lap logic if race is started
        if (!raceStarted) return;

        // ⛔ Skip if car already finished
        if (color === "red" && lapCounts.red >= LAP_THRESHOLD) return;
        if (color === "blue" && lapCounts.blue >= LAP_THRESHOLD) return;

        if (color === "red" && now - lastDetectionTime.red >= detectionCooldown) {
            lastDetectionTime.red = now;
            lapCounts.red++;
            handleLap("red", lapCounts.red, "192.168.1.143");
        }

        if (color === "blue" && now - lastDetectionTime.blue >= detectionCooldown) {
            lastDetectionTime.blue = now;
            lapCounts.blue++;
            handleLap("blue", lapCounts.blue, "192.168.1.87");
        }
    });

    ws.on("close", () => {
        console.log("Finish Line ESP32 Disconnected");
        finishLineSocket = null;
    });
});

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// 🏎️ Car Control WebSocket (Port 5001)
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("register_username", (username) => {
        socket.username = username; // track user
        let carColor, carIP;

        if (!assignedColors.has("Red")) {
            carColor = "Red";
            carIP = "192.168.1.143";
            assignedColors.add("Red");
        } else if (!assignedColors.has("Blue")) {
            carColor = "Blue";
            carIP = "192.168.1.87";
            assignedColors.add("Blue");
        } else {
            socket.emit("car_assignment", { carColor: "Spectator", carIP: null });
            return;
        }

        carToUsername[carIP] = username;
        console.log(`Assigned ${username} to ${carColor} car (${carIP})`);

        // Send assignment info back to client
        socket.emit("car_assignment", { carColor, carIP });
    });


    socket.on("button_press", async (data) => {
        const carIP = data.car_ip;
        const action = data.action;
        console.log(`Command for ${carIP}: ${action}`);

        try {
            const response = await axios.get(`http://${carIP}/command?action=${action}`);
            console.log(`ESP32 ${carIP} Response:`, response.data);
        } catch (error) {
            console.error(`Error sending command to ${carIP}:`, error.message);
        }
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);

        // Find which car IP was assigned to this user
        const assignedEntry = Object.entries(carToUsername).find(([carIP, username]) => {
            return username && socket.username === username;
        });

        if (assignedEntry) {
            const [carIP, username] = assignedEntry;
            const carColor = carColors[carIP];

            console.log(`User ${username} disconnected, freeing up ${carColor} car`);

            // Remove the assignment
            delete carToUsername[carIP];
            assignedColors.delete(carColor);
        }
    });

    // Handle race start request from frontend
    socket.on("start_race", () => {
      console.log("Start race requested from client");
      startRace();
    });
});

// Enable race start from command line for testing
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on("line", (input) => {
  if (input.trim().toLowerCase() === "start") {
    console.log("Start race requested from terminal");
    startRace();
  }
});

server.listen(5001, "0.0.0.0", () => {
    console.log("WebSocket server running on http://0.0.0.0:5001");
});

console.log("Finish Line WebSocket listening on port 8084");
