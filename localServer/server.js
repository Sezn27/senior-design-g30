const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const axios = require("axios");
const WebSocket = require("ws");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
});

// Lap Tracking Variables
let lapCounts = { blue: 0, red: 0 };
let lastDetectionTime = { blue: 0, red: 0 };
const lapThreshold = 3; // Number of laps to win
const detectionCooldown = 3000; // 3 seconds cooldown between detections

// 🚦 WebSocket for Finish Line (Port 8084)
const finishLineServer = new WebSocket.Server({ port: 8084 });

finishLineServer.on("connection", (ws) => {
    console.log("Finish Line ESP32 Connected");

    ws.on("message", (message) => {
        const messageStr = message.toString().trim(); // Convert buffer to string & remove extra spaces
        console.log(`\n🏁 Finish Line Detection: ${messageStr.toUpperCase()}`);
    
        const currentTime = Date.now();
        if (messageStr === "blue" || messageStr === "red") {
            if (currentTime - lastDetectionTime[messageStr] > detectionCooldown) {
                lastDetectionTime[messageStr] = currentTime;
                lapCounts[messageStr]++;
    
                // 📌 Log Lap Counts in Terminal
                console.log(`-------------------------------`);
                console.log(`🚗 Car ${messageStr.toUpperCase()} completed LAP ${lapCounts[messageStr]}`);
                console.log(`🔹 Car BLUE Laps: ${lapCounts.blue}`);
                console.log(`🔴 Car RED Laps: ${lapCounts.red}`);
                console.log(`-------------------------------\n`);
    
                // Send lap update to all clients
                io.emit("lap_update", { car: messageStr, laps: lapCounts[messageStr] });
    
                // Check if a car has won
                if (lapCounts[messageStr] >= lapThreshold) {
                    console.log(`🎉🚨 Car ${messageStr.toUpperCase()} WINS!`);
                    io.emit("race_winner", { winner: messageStr });
                    resetRace(); // Reset race after a win
                }
            }
        }
    });
    

    ws.on("close", () => {
        console.log("Finish Line ESP32 Disconnected");
    });
});

// Function to Reset the Race
function resetRace() {
    setTimeout(() => {
        lapCounts = { blue: 0, red: 0 };
        lastDetectionTime = { blue: 0, red: 0 };
        console.log("\n🏁🏁🏁 RACE RESET! 🏁🏁🏁\n");
        io.emit("race_reset", {});
    }, 5000); // Delay before reset
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
});

server.listen(5001, "0.0.0.0", () => {
    console.log("WebSocket server running on http://0.0.0.0:5001");
});

console.log("Finish Line WebSocket listening on port 8084");
