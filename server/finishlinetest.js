const express = require('express');
const WebSocket = require('ws');

const app = express();
const port = 3000;

app.use(express.static('public'));

// WebSocket server for finish line ESP32 (port 8084)
const wssFinishLine = new WebSocket.Server({ port: 8084 });

wssFinishLine.on('connection', (ws) => {
    console.log('Finish line ESP32 connected.');

    ws.on('message', (message) => {
        console.log(`Detected color from finish line: ${message}`);
    });

    ws.on('close', () => {
        console.log('Finish line ESP32 disconnected.');
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
