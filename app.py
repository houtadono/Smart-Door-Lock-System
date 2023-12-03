import random
import cv2
import base64
import numpy as np
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash, make_response
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_principal import Principal, RoleNeed, identity_changed, Identity, Permission, UserNeed, identity_loaded
from datetime import timedelta, datetime

from face_detection import FaceDetection
from face_recognition import FaceRecognition
from mqtt_connector import MQTTConnector
from my_firebase import MyFirebase

pin = '123456'



FRAME_TRAIN = 40
FRAME_GET = 60

lst_people = None

admin_role = RoleNeed('admin')
user_role = RoleNeed('user')
admin_permission = Permission(admin_role)
user_permission = Permission(user_role)
image_permission = Permission(RoleNeed('images'))

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'iot'
app.permanent_session_lifetime = timedelta(minutes=10)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['CORS_HEADERS'] = 'Content-Type'
socketio = SocketIO(app, cors_allowed_origins="*")
principal = Principal(app)

face_detection = FaceDetection()
face_recognition = FaceRecognition()
list_img = []

@identity_loaded.connect_via(app)
def on_identity_loaded(sender, identity):
    # Thêm vai trò vào identity nếu có
    if 'role' in session:
        identity.provides.add(RoleNeed(session['role']))

## routes
@app.route('/')
def index():
    return render_template('user.html')

@app.route('/iot/admin/')
@admin_permission.require(http_exception=403)
def adminPage():
    return render_template('admin.html')
    pass

@app.route('/iot/admin/get-users', methods=['GET'])
@admin_permission.require(http_exception=403)
def adminGetUsers():
    lst_users = fb.get_users()
    print(lst_users)
    return jsonify({'users': lst_users})

@app.route('/iot/admin/get-people', methods=['GET'])
@admin_permission.require(http_exception=403)
def adminGetPeople():
    lst_people = fb.get_people()
    print(lst_people)
    return jsonify({'people': lst_people})

@app.route('/iot/admin/get-log', methods=['GET'])
@admin_permission.require(http_exception=403)
def adminGetLog():
    lst_log = fb.get_log()
    print(lst_log)
    return jsonify({'logs': lst_log})


@app.route('/iot/admin/add-people', methods=['POST'])
@admin_permission.require(http_exception=403)
def adminAddPeople():
    data = request.get_json()
    global list_img
    if len(list_img) == FRAME_GET:
        save_images = random.sample(list_img, FRAME_TRAIN)
        user_id = fb.add_people(userdata=data, images=save_images)
        session["images"] = []
        list_img = []
        return jsonify({'done': 1, 'user_id': user_id})
    else:
        return jsonify({'done': 0})

@app.route('/iot/process_frame', methods=['POST'])
def process_frame():
    # Get the base64-encoded frame from the client
    data = request.get_json()
    frame_data = data.get('frameData').split(',')[1]
    # Decode the frame data
    frame_bytes = base64.b64decode(frame_data)
    frame_np = np.frombuffer(frame_bytes, dtype=np.uint8)
    frame = cv2.imdecode(frame_np, cv2.IMREAD_COLOR)
    processed_frame = cv2.flip(frame, 1)

    processed_frame, faces = face_detection.findFaces(processed_frame, True)
    conf = None
    if faces:
        face = faces[0]
        conf = int(face['score'][0])
        x, y, w, h = face['bbox']
        cv2.rectangle(processed_frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

    _, processed_frame_data = cv2.imencode('.jpg', processed_frame)
    processed_frame_base64 = base64.b64encode(processed_frame_data).decode()
    return jsonify({'processed_frame': processed_frame_base64})

@app.route('/iot/logout', methods=['GET'])
def logout():
    session.pop("user", None)
    return redirect(url_for('showPageSign'))

@app.route('/iot/', methods=['POST', 'GET'])
def showPageSign():
    if request.method == 'GET':
        if 'user' in session:
            return render_template('{}.html'.format(session["role"]), username=session.get('user'))
        return render_template('auth.html')
    else:
        # username = request.form.get('username')
        # session["user"] = username
        # return render_template('user.html', username=session.get('user'))
        result = fb.authenticate_user(user_data=request.form.to_dict())
        username = request.form.get('username')
        if result == 0:
            flash('Login failed')
            return redirect(url_for('showPageSign'))
        else:
            session["user"] = username
            if result == 2:
                # admin role
                session["role"] = "admin"
            elif result == 1:
                session["role"] = "user"
            session['images'] = []
            identity = Identity(username)
            identity.provides.add(RoleNeed(session['role']))
            identity_changed.send(app, identity=identity)

            return render_template('{}.html'.format(session["role"]), username=session.get('user'))
    pass

@app.route('/iot/register', methods=['POST'])
def register():
    if request.method == 'POST':
        result = fb.register_user(user_data= request.json)
        return jsonify({'result': result})
    pass


## socket
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    join_room('all_clients')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')
    leave_room('all_clients')

@socketio.on('start_video_frame')
def start_video_frame():
    if 'images_no_auth' not in session:
        session['images_no_auth'] = []
    session['images_no_auth'] = []
    pass
@socketio.on('cant_video_frame')
def cant_video_frame():
    if len(session['images_no_auth']):
        emit('toast_notification',
             {'title': 'Cảnh báo', 'message': 'Xác thực không thành công', 'type': 'warning', })
        log_entry = {
            "timestamp": datetime.utcnow() + timedelta(hours=7),
            "user_id": 'NaN',
            "name": 'NaN',
            "status": "Nhận diện không thành công",
            "image_url": fb.upload_image_to_log(random.choice(session['images_no_auth']))
        }
        fb.add_log(log_entry=log_entry)
        pass
    pass
@socketio.on('video_frame')
def video_frame(frame_data):
    global lst_people
    processed_frame_base64 = frame_data.split(',')[1]
    # bbox = form.get('detections')
    # try:
    if processed_frame_base64 :
        # Decode the frame data
        frame_bytes = base64.b64decode(processed_frame_base64)
        processed_frame_base64 = None
        frame_np = np.frombuffer(frame_bytes, dtype=np.uint8)
        frame_bytes = None
        frame = cv2.imdecode(frame_np, cv2.IMREAD_COLOR)
        frame_np = None
        # frame = cv2.resize(frame, (640, 480))
        frame = cv2.flip(frame, 1)
        frame, faces = face_detection.findFaces(frame, False)
        if faces:
            for face in faces:
                faces_sorted = sorted(faces, key=lambda x: x['bbox'][3], reverse=True)

                largest_face_bbox = faces_sorted[0]['bbox']
                x, y, w, h = largest_face_bbox
                if h > 0.7 * frame.shape[0]:
                    largest_face_frame = frame[y:y + h, x:x + w]
                    gray = cv2.cvtColor(largest_face_frame, cv2.COLOR_BGR2GRAY)

                    equalized_img = cv2.equalizeHist(gray)
                    id, conf = face_recognition.recognizer.predict(equalized_img)
                    id_label = face_recognition.id_label.tolist()[int(id)] # id 0 -> n to id_label: id_user firebase
                    if lst_people is None:
                        lst_people = fb.get_people()
                        print(lst_people)
                    # name = None
                    print("id_label:", id_label)
                    for person in lst_people:
                        if person['user_id'] == id_label:
                            name = person['name']
                            print("name",name)
                            break

                    if conf < 120:
                        cv2.putText(frame, f"{name} {conf}", (x, y), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                    if conf < 30:
                        emit('toast_notification',
                             {'title': 'Thành công', 'message': 'Xác thực thành công', 'type': 'success', })
                        conn.send_turn_on()
                        emit('video_frame', 'done', broadcast=False)

                        log_entry = {
                            "timestamp": datetime.utcnow() +  timedelta(hours=7),
                            "user_id": id_label,
                            "name": name,
                            "status": "Nhận diện thành công",
                            "image_url": fb.upload_image_to_log(frame[y:y+h, x:x+h])
                        }
                        fb.add_log(log_entry=log_entry)
                        pass
                    else:
                        session['images_no_auth'].append(frame[y:y + h, x:x + h])
                        # emit('toast_notification',
                        #      {'title': 'Cảnh báo', 'message': 'Xác thực không thành công', 'type': 'warning', })
                        # log_entry = {
                        #     "timestamp": datetime.utcnow() + timedelta(hours=7),
                        #     "user_id": 'NaN',
                        #     "name": 'NaN',
                        #     "status": "Nhận diện không thành công",
                        #     "image_url": fb.upload_image_to_log(frame[y:y + h, x:x + h])
                        # }
                        # fb.add_log(log_entry=log_entry)
                else:
                    cv2.putText(frame, "Too far", (x, y), cv2.FONT_HERSHEY_SIMPLEX, 1,
                                (255, 0, 255), 2)
                    cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)

        _, processed_frame_data = cv2.imencode('.jpg', frame)
        frame = None
        processed_frame_base64 = base64.b64encode(processed_frame_data).decode()
    # except Exception as e:
    #     print(e)
    #     pass

    result = 'data:image/jpeg;base64,' + processed_frame_base64
    emit('video_frame', result, broadcast=False)

@socketio.on('video_frame_add')
def video_frame_add(frame_data):
    global list_img
    if 'images' not in session:
        session['images'] = []
    if not session['images']:
        list_img = []
    if len(session['images']) == FRAME_GET:
        emit('video_frame_add', {'done': 1}, broadcast=False)
        return
    processed_frame_base64 = frame_data.split(',')[1]
    frame_data = None
    # bbox = form.get('detections')
    try:
        # Decode the frame data
        frame_bytes = base64.b64decode(processed_frame_base64)
        frame_np = np.frombuffer(frame_bytes, dtype=np.uint8)
        frame = cv2.imdecode(frame_np, cv2.IMREAD_COLOR)
        # frame = cv2.resize(frame, (640, 480))
        frame = cv2.flip(frame, 1)
        frame, faces = face_detection.findFaces(frame, False)
        if faces:
            faces_sorted = sorted(faces, key=lambda x: x['bbox'][3], reverse=True)

            largest_face_bbox = faces_sorted[0]['bbox']
            x, y, w, h = largest_face_bbox
            if h > 0.7 * frame.shape[0]:
                largest_face_frame = frame[y:y + h, x:x + w]
                gray = cv2.cvtColor(largest_face_frame, cv2.COLOR_BGR2GRAY)
                equalized_img = cv2.equalizeHist(gray)
                session['images'].append(largest_face_frame)
                list_img.append(largest_face_frame)
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            else:
                cv2.putText(frame, "Too far", (x, y), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 255), 2)
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
        _, processed_frame_data = cv2.imencode('.jpg', frame)
        frame = None
        processed_frame_base64 = base64.b64encode(processed_frame_data).decode()
    except Exception:
        pass

    result_frame = 'data:image/jpeg;base64,' + processed_frame_base64
    face_frame_count = len(session['images'])
    result = {'done':0, 'percent': round(face_frame_count*100/FRAME_GET,2), 'frame': result_frame}
    emit('video_frame_add', result, broadcast=False)

@socketio.on('delete_user')
def delete_user(username):
    fb.delete_user(username)
    emit('toast_notification',{'title': 'Thành công','message': 'Xóa thành công','type': 'success',} )
    emit('message_server_admin', 'delete_user_ok')
    pass

@socketio.on('delete_people')
def delete_people(user_id):
    fb.delete_people(user_id)
    emit('toast_notification',{'title': 'Thành công','message': 'Xóa thành công','type': 'success',} )
    emit('message_server_admin', 'delete_people_ok')
    train_all()
    pass
@socketio.on('delete_cache_images')
def delete_cache_images():
    session["images"] = []
    return

@socketio.on('train_all')
def train_all():
    global  face_recognition
    features = []
    face_ids =  []
    docs = fb.db.collection("people").stream()
    for doc in docs:
        d = doc.to_dict()
        user_id = doc.id
        for i in range(FRAME_TRAIN):
            img = fb.get_image_from_storage(user_id, i)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            equalized_img = cv2.equalizeHist(gray)
            features.append(equalized_img)
            face_ids.append(user_id)
    id_label = list(set(face_ids))
    trans_label_to_id = {index:value for index, value in enumerate(id_label)}
    trans_id_to_label = {index:value for value, index in enumerate(id_label)}
    labels = [trans_id_to_label[i] for i in face_ids]
    result = face_recognition.update_model(features, labels, id_label)
    print("Done train all!!")
    face_recognition = FaceRecognition()
    face_recognition.load_model()
    socketio.emit('toast_notification', {'title': 'Thông báo',
                                        'message': 'Model đã được cập nhật','type': 'info',}, room='all_clients')
    return result

@socketio.on('check_pincode')
def check_pincode(pincode):
    global pin
    if pincode == pin:
        emit('toast_notification', {'title': 'Thành công', 'message': 'Xác thực thành công', 'type': 'success', })
        conn.send_turn_on()
    else:
        emit('toast_notification', {'title': 'Cảnh báo', 'message': 'Mã pin chưa chính xác', 'type': 'error', })
    status = "Đúng mã pin" if pincode == pin else "Sai mã pin"
    log_entry = {
        "timestamp": datetime.utcnow() + timedelta(hours=7),
        "user_id": 'NaN',
        "name": 'NaN',
        "status": status,
        "image_url": "NaN"
    }
    fb.add_log(log_entry=log_entry)
    pass

@socketio.on('request_lock_status')
def request_lock_status():
    if conn.msg is None:
        #TODO: request_lock_status from arduino
        conn.send_turn_off()
        socketio.emit('lock_status', {'data': 0}, room='all_clients')
        return
    mqtt_msg = conn.msg
    mqtt_data = mqtt_msg.get('payload')
    socketio.emit('lock_status', {'data': mqtt_data}, room='all_clients')

# other
state = None
def background_thread():
    global  state
    while True:
        try:
            if conn.get_msg == 0:
                continue
            conn.get_msg = 0
            mqtt_msg = conn.msg
            mqtt_data = mqtt_msg.get('payload')
            if state is None:
                state = mqtt_data
            else:
                if state != mqtt_data:
                    status = "Cửa mở" if mqtt_data==1 else "Cửa đóng"
                    log_entry = {
                        "timestamp": datetime.utcnow() + timedelta(hours=7),
                        "user_id": 'NaN',
                        "name": 'NaN',
                        "status": status,
                        "image_url": "NaN"
                    }
                    fb.add_log(log_entry)
                    print("Send log")
                state = mqtt_data
            socketio.emit('lock_status', {'data': mqtt_data}, room='all_clients')
        finally:
            socketio.sleep(1)  # Emit every second
    pass

if __name__ == '__main__':
    broker_address = "ed1cd23213b14ea2a47d388637fce5d1.s1.eu.hivemq.cloud"
    port = 8883
    username = "adminiot"
    password = "Adminiot123"

    broker_address = "mqtt-dashboard.com"
    port = 1883
    username = "b20dcat170"
    password = "Thanhtung170"

    #
    fb = MyFirebase()
    conn = MQTTConnector(broker_address, port, username, password)
    topic = "ESP32/MC38"
    conn.client.subscribe(topic, qos=0)
    try:
        if face_recognition.load_model() == 0:
            train_all()
    except Exception as e:
        print(e)

    socketio.start_background_task(target=conn.client.loop_forever)
    socketio.start_background_task(target=background_thread)
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
