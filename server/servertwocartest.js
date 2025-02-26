const express = require('express');
const WebSocket = require('ws');
const readline = require('readline');

const app = express();
const port = 3000;

app.use(express.static('public'));

// WebSocket servers
const wssCar1 = new WebSocket.Server({ port: 8080 });  // Car 1
const wssCar2 = new WebSocket.Server({ port: 8082 });  // Car 2

let car1Socket = null;
let car2Socket = null;

// Handle Car 1 connection
wssCar1.on('connection', (ws) => {
    console.log('Car 1 connected.');
    car1Socket = ws;

    ws.on('message', (message) => {
        console.log(`Car 1 sent: ${message}`);
    });

    ws.on('close', () => {
        console.log('Car 1 disconnected.');
        car1Socket = null;
    });
});

// Handle Car 2 connection
wssCar2.on('connection', (ws) => {
    console.log('Car 2 connected.');
    car2Socket = ws;

    ws.on('message', (message) => {
        console.log(`Car 2 sent: ${message}`);
    });

    ws.on('close', () => {
        console.log('Car 2 disconnected.');
        car2Socket = null;
    });
});

// Setup manual command input (CLI)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

console.log("Commands:");
console.log("Car 1 - W: 1w | A: 1a | S: 1s | D: 1d | STOP: 1stop");
console.log("Car 2 - W: 2w | A: 2a | S: 2s | D: 2d | STOP: 2stop");

rl.on('line', (input) => {
    const command = input.trim().toLowerCase();
    
    if (command.startsWith("1")) { // Car 1 Commands
        if (!car1Socket || car1Socket.readyState !== WebSocket.OPEN) {
            console.log("Car 1 is not connected.");
            return;
        }
        const car1Command = command.substring(1); // Remove "1" from command
        console.log(`Sending to Car 1: ${car1Command}`);
        
	switch (car1Command) {
        	case 'w':
            		console.log('Sending: forward');
            		car1Socket.send('forward');
            		break;
        	case 's':
            		console.log('Sending: reverse');
           		car1Socket.send('reverse');
            		break;
        	case 'a':
            		console.log('Sending: left');
            		car1Socket.send('left');
            		break;
        	case 'd':
            		console.log('Sending: right');
            		car1Socket.send('right');
            		break;
        	case 'stop':
            		console.log('Sending: stop');
            		car1Socket.send('stop');
            		break;
        	default:
            		console.log('Invalid command. Use W, A, S, D, STOP.');
    	}
    } 
    else if (command.startsWith("2")) { // Car 2 Commands
        if (!car2Socket || car2Socket.readyState !== WebSocket.OPEN) {
            console.log("Car 2 is not connected.");
            return;
        }
        const car2Command = command.substring(1); // Remove "2" from command
        console.log(`Sending to Car 2: ${car2Command}`);
        car2Socket.send(car2Command);
    } 
    else {
        console.log("Invalid command. Use 1w/1a/1s/1d for Car 1, 2w/2a/2s/2d for Car 2.");
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
