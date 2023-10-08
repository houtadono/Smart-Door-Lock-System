import cv2
import base64
import numpy as np
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_socketio import SocketIO, emit
from datetime import timedelta
from face_detection import FaceDetection

app = Flask(__name__,static_folder='static', template_folder='templates')
app.secret_key = 'iot'
app.permanent_session_lifetime = timedelta(minutes=1)

app.config['CORS_HEADERS'] = 'Content-Type'
socketio = SocketIO(app, cors_allowed_origins="*")
face_detection = FaceDetection()

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@app.route('/')
def index():
    return render_template('user.html')

@socketio.on('video_frame')
def video_frame(frame_data):
    processed_frame_base64 = frame_data.split(',')[1]
    # bbox = form.get('detections')
    # try:
        # Decode the frame data
    frame_bytes = base64.b64decode(processed_frame_base64)
    frame_np = np.frombuffer(frame_bytes, dtype=np.uint8)
    frame = cv2.imdecode(frame_np, cv2.IMREAD_COLOR)
    # frame = cv2.resize(frame, (640, 480))
    frame = cv2.flip(frame, 1)
    frame, faces = face_detection.findFaces(frame, False)
    if faces:
        for face in faces:
            x, y, w, h = face['bbox']
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

    _, processed_frame_data = cv2.imencode('.jpg', frame)
    processed_frame_base64 = base64.b64encode(processed_frame_data).decode()
    # except Exception:
    #     print(Exception)
    #     pass

    result = 'data:image/jpeg;base64,' + processed_frame_base64
    emit('video_frame', result, broadcast=False)

@app.route('/iot', methods=['POST', 'GET'])
def showPageSign():
    if request.method == 'GET':
        return render_template('auth.html')
    else:
        if check():
            session["user"] = request.form['user']
            return render_template('user.html', username = session.get('user'))
        else:
            flash('Login failed')
            return redirect(url_for('showPageSign'))

def check():
    return 1

@app.route('/iot/logout', methods=['GET'])
def logout():
    session.pop("user",None)
    return redirect(url_for('iot'))


if __name__ == '__main__':
    # app.run()
    socketio.run(app,debug=True,allow_unsafe_werkzeug=True)


