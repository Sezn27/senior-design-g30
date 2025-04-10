from flask import Flask, Response, render_template
import cv2
import requests
import numpy as np

app = Flask(__name__)

# Function to fetch frames from ESP32-CAM
def generate_frames(car_ip):
    ESP32_URL = f"http://{car_ip}/capture"
    while True:
        try:
            response = requests.get(ESP32_URL, timeout=2)
            if response.status_code == 200:
                img_np = np.frombuffer(response.content, dtype=np.uint8)
                img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)

                _, buffer = cv2.imencode('.jpg', img)

                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

        except Exception as e:
            print(f"Error fetching image from {car_ip}: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/play')
def play():
    return render_template('play.html')

@app.route('/leaderboard')
def leaderboard():
    return render_template('leaderboard.html')

@app.route('/video_feed/<car_ip>')
def video_feed(car_ip):
    return Response(generate_frames(car_ip), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
