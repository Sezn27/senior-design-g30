const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const WebSocket = require("ws");
const axios = require("axios"); // Required for HTTP forwarding
const readline = require("readline"); // For command line input

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let finishLineSocket = null;

let lapCounts = {
  blue: 0,
  red: 0
};

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

// Start race sequence
function startRace() {
  raceStarted = true;
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

// Handle color detection messages from ESP32 finish line
const finishLineServer = new WebSocket.Server({ port: 8084 });
finishLineServer.on("connection", (ws) => {
  console.log("Finish line ESP32 connected.");
  finishLineSocket = ws;

  ws.on("message", (data) => {
    const color = data.toString();
    console.log("Finish line detection:", color);

    if (!raceStarted) return;

    const now = Date.now();
    if (lapCounts[color] !== undefined && now - lastDetectionTime[color] > detectionCooldown) {
      lastDetectionTime[color] = now;

      // Record lap time before incrementing
      if (lapStartTime[color] !== null) {
        const lapTime = (now - lapStartTime[color]) / 1000; // in seconds
        console.log(`${capitalize(color)} car completed Lap ${lapCounts[color] + 1} in ${lapTime.toFixed(2)} seconds`);
        lapStartTime[color] = now; // Reset for next lap
      }

      lapCounts[color]++;
      console.log(`${color} car now at lap ${lapCounts[color]}`);

      // Only update display if this is a new max lap
      const newLap = Math.max(lapCounts.blue, lapCounts.red);
      if (newLap > currentDisplayedLap && newLap <= LAP_THRESHOLD) {
        currentDisplayedLap = newLap;
        sendToFinishLine(`show:lap ${newLap}`);
      }

      // Check for win
      if (lapCounts[color] === LAP_THRESHOLD) {
        sendToFinishLine(`show:${capitalize(color)} Car Wins!`);
        lapStartTime[color] = null; // Stop tracking this car's lap time

        // Check if both cars have finished
        if (lapCounts.blue === LAP_THRESHOLD && lapCounts.red === LAP_THRESHOLD) {
          raceStarted = false;
        }
      }
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
