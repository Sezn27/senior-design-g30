# R.A.C.E - Remote Access Control for Electric Cars

### **Senior Design Project - University of Central Florida**
#### **Team Members:**
- Austin Silva
- Jesvany Colon
- Michael Mallette
- Sean Chaney

## **Project Overview**
R.A.C.E (Remote Access Control for Electric Cars) is a senior design project aimed at creating an **internet-controlled RC car racing system**. The project consists of a **web-based interface** that allows users to remotely control RC cars via **WebSockets**, stream live video from the car’s onboard camera, and track lap times in a competitive racing environment.

### **Key Features:**
- **Live Video Streaming:** The ESP32-CAM streams real-time video to the website.
- **Web-Based Car Control:** Users can control cars remotely via the browser using keyboard inputs (WASD).
- **Multi-Car System:** The first two users to join the game are assigned Car 1 and Car 2.
- **Race Lap Tracking:** (Planned feature) The system will track lap times, positions, and race completion.

## **Project Structure**
The repository consists of three main folders:

### **1. flaskServer/** (Handles Camera Streaming)
- Contains `app.py`, a **Flask-based server** responsible for retrieving video frames from the ESP32-CAM and serving them as an MJPEG stream.
- Uses `OpenCV` (`cv2`) and `requests` to fetch and process frames from the ESP32.
- Runs on **port 5000** by default.

### **2. localServer/** (Manages WebSockets and Control Logic)
- Contains `server.js`, a **Node.js** application that handles **WebSocket communication** between the website and the RC cars.
- Uses **Socket.io** to receive and forward user control commands to the ESP32-based cars.
- Runs on **port 5001** by default.

### **3. website/** (Frontend Web Interface)
- Contains `index.html` (Landing Page) and `play.html` (Control Page).
- `index.html`: Landing page with a YouTube demo video and project overview.
- `play.html`: The main control interface where users can select a car, view the live feed, and control the RC car using keyboard inputs.
- Utilizes **JavaScript WebSockets** to communicate with `server.js`.

## **Setup & Installation**
### **1. Install Dependencies**
Ensure you have the required dependencies installed.

#### **Python (For Flask Server)**
```sh
pip install flask opencv-python requests flask-cors
```
#### **Node.js (For WebSocket Server)**
```sh
npm install express socket.io axios cors
```

### **2. Running the Project**
#### **Start Flask Camera Server**
```sh
cd flaskServer
python app.py
```

#### **Start Node.js WebSocket Server**
```sh
cd localServer
node server.js
```

#### **Run the Website Locally**
Open `index.html` in a browser or use a simple Python server:
```sh
cd website
python -m http.server 8080
```
Then navigate to `http://localhost:8080` in your browser.

## **Future Enhancements**
- Implement **race lap tracking and leaderboard**.
- Introduce **power-ups and multiplayer battle mode**.
- Improve **ESP32 video streaming efficiency** for higher frame rates.

---
This project is developed as part of the **Senior Design Program at the University of Central Florida**.

