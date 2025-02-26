const express = require('express');
const WebSocket = require('ws');
const readline = require('readline');

const app = express();
const port = 3000;

app.use(express.static('public'));

const wss = new WebSocket.Server({ port: 8080 });
let esp32Socket = null;

wss.on('connection', (ws) => {
    console.log('WebSocket client connected.');

    if (!esp32Socket) {
        esp32Socket = ws;
        console.log('ESP32 connected.');
    }

    ws.on('message', (message) => {
        console.log(`Message from ESP32: ${message}`);
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected.');
        if (ws === esp32Socket) {
            esp32Socket = null;
            console.log('ESP32 disconnected.');
        }
    });
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

console.log("Keybinds:\nW: Forward\nS: Reverse\nA: Left\nD: Right\nSTOP: Stop\nDEMO: Run demo sequence");

rl.on('line', (input) => {
    const command = input.trim().toLowerCase();

    if (!esp32Socket || esp32Socket.readyState !== WebSocket.OPEN) {
        console.log('ESP32 is not connected.');
        return;
    }

    switch (command) {
        case 'demo':
            console.log('Starting demo sequence...');
            demoCar(esp32Socket);
            break;
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
            console.log('Invalid command. Use W, A, S, D, STOP, or DEMO.');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

function demoCar(ws) {
    console.log("Starting demo...");

    ws.send("forward");
    console.log("Command: W (Drive forward)");
    setTimeout(() => {
        ws.send("stop");
        console.log("Command: STOP (Stop all movement)");

        setTimeout(() => {
            ws.send("left");
            console.log("Command: A (Turn left)");

            setTimeout(() => {
                ws.send("forward");
                console.log("Command: W (Drive forward with left turn)");

                setTimeout(() => {
                    ws.send("stop");
                    console.log("Command: STOP (Stop turning)");

                    ws.send("reverse");
                    console.log("Command: S (Reverse)");

                    setTimeout(() => {
                        ws.send("right");
                        console.log("Command: D (Turn right)");

                        setTimeout(() => {
                            ws.send("stop");
                            console.log("Command: STOP (Stop all movement)");

                            ws.send("forward");
                            console.log("Command: W (Drive forward)");

                            setTimeout(() => {
                                ws.send("stop");
                                console.log("Command: STOP (End of demo)");
                            }, 1000);
                        }, 1000);
                    }, 1000);
                }, 750);
            }, 1000);
        }, 1000);
    }, 1000);
}
