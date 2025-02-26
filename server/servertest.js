const express = require('express');
const WebSocket = require('ws');
const readline = require('readline');

const app = express();
const port = 3000;

app.use(express.static('public'));

// WebSocket servers
const wssWebsite = new WebSocket.Server({ port: 8081 }); // Website clients
const wssESP32 = new WebSocket.Server({ port: 8080 });   // ESP32 connection

let esp32Socket = null;

// Handle ESP32 connection
wssESP32.on('connection', (ws) => {
    console.log('ESP32 connected.');
    esp32Socket = ws;

    ws.on('message', (message) => {
        console.log(`Message from ESP32: ${message}`);
    });

    ws.on('close', () => {
        console.log('ESP32 disconnected.');
        esp32Socket = null;
    });
});

// Handle website connections
wssWebsite.on('connection', (ws) => {
    console.log('Website client connected.');

    ws.on('message', (message) => {
        console.log(`Command from website: ${message}`);

        // Ensure ESP32 is connected before forwarding the command
        if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
            console.log(`Forwarding to ESP32: ${message}`);
            esp32Socket.send(message.toString());
        } else {
            console.log('ESP32 is not connected. Cannot forward command.');
        }
    });

    ws.on('close', () => {
        console.log('Website client disconnected.');
    });
});

// Terminal input for manual control
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

console.log("Keybinds:\nW: Forward\nS: Reverse\nA: Left\nD: Right\nSTOP: Stop");

rl.on('line', (input) => {
    const command = input.trim().toLowerCase();

    if (!esp32Socket || esp32Socket.readyState !== WebSocket.OPEN) {
        console.log('ESP32 is not connected.');
        return;
    }

    switch (command) {
        case 'w':
            console.log('Sending: forward');
            esp32Socket.send('forward');
            break;
        case 's':
            console.log('Sending: reverse');
            esp32Socket.send('reverse');
            break;
        case 'a':
            console.log('Sending: left');
            esp32Socket.send('left');
            break;
        case 'd':
            console.log('Sending: right');
            esp32Socket.send('right');
            break;
        case 'stop':
            console.log('Sending: stop');
            esp32Socket.send('stop');
            break;
        default:
            console.log('Invalid command. Use W, A, S, D, STOP.');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
