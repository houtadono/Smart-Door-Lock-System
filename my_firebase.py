import asyncio
import base64
import shutil
import os
import time
from datetime import datetime, timedelta

import firebase_admin
from firebase_admin import db,credentials, firestore, storage
import numpy as np
import cv2
import uuid

class MyFirebase:
    def __init__(self):
        cred = credentials.Certificate("credentials.json")
        firebase_admin.initialize_app(cred,
          {
              "databaseURL": "https://iot-ai-facerecognition-default-rtdb.asia-southeast1.firebasedatabase.app/",
              "storageBucket": "iot-ai-facerecognition.appspot.com"
          })
        self.bucket = storage.bucket()
        self.db = firestore.client()
        pass

    def upload_image(self,source_file_name, destination_blob_name):
        blob = self.bucket.blob(destination_blob_name)
        blob.upload_from_filename(source_file_name)

        image_data = blob.download_as_bytes()
        image_array = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        cv2.imshow("img", image)
        pass

    def register_user(self, user_data):
        try:
            user_ref = self.db.collection("users").document(user_data["username"])
            find_user = user_ref.get().to_dict()
            if find_user is None:
                user_ref.set(
                    {
                        "username": user_data["username"],
                        "password": user_data["password"],
                    }
                )
                return 1
            else:
                return 0
        except Exception:
            return -1

    def authenticate_user(self, user_data):
        user_ref = self.db.collection("users").document(user_data["username"])
        find_user = user_ref.get().to_dict()
        try:
            if find_user["password"] == user_data["password"]:
                role = find_user["role"]
                if role == "admin":
                    return 2
                else:
                    return 1
        except:
            return 0
        pass

    def get_users(self):
        docs = self.db.collection("users").stream()
        return list(doc.to_dict() for doc in docs)
        pass

    def get_people(self):
        docs = self.db.collection("people").stream()
        lst_people = []
        for doc in docs:
            d = doc.to_dict()
            user_id = doc.id
            d['user_id'] = user_id
            lst_people.append(d)
            path = 'dataset/{}'.format(user_id)
            if not os.path.exists(path):
                os.makedirs(path)
                for i in range(40):
                    img = self.get_image_from_storage(user_id, i)
                    cv2.imwrite(f'{path}/image{i}.jpg', img)
        return lst_people

    def get_log(self):
        docs = self.db.collection("logs").stream()
        lst_log = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            lst_log.append(d)
        sorted_lst_log = sorted(lst_log, key=lambda x: x['timestamp'], reverse=True)
        return sorted_lst_log

    def delete_people(self, user_id):
        doc_ref = self.db.collection('people').document(user_id)
        image_collection_ref = doc_ref.collection('images')
        docs = image_collection_ref.stream()
        for doc in docs:
            doc.reference.delete()
        doc_ref.delete()
        blobs = self.bucket.list_blobs(prefix=user_id)
        for blob in blobs:
            blob.delete()
        try:
            shutil.rmtree(f'dataset/{user_id}')
            print(f"Folder '{user_id}' deleted successfully.")
        except OSError as e:
            print(f"Error: {e}. Failed to delete folder '{user_id}'.")
        pass

    def upload_image_to_log(self, image_data):
        try:
            image_name = f"LogImages/{uuid.uuid4()}.jpg"
            blob = self.bucket.blob(image_name)
            _, img_encoded = cv2.imencode('.jpg', image_data)
            img_bytes = img_encoded.tobytes()
            blob.upload_from_string(img_bytes, content_type="image/jpg")
            expiration_time = datetime.utcnow() + timedelta(minutes=10000)
            expiration_time_gmt7 = expiration_time + timedelta(hours=7)

            download_url = blob.generate_signed_url(expiration=expiration_time_gmt7 )
            return download_url
        except Exception as e:
            print(f"Error uploading image: {e}")
            return None

    def upload_image_to_storage(self, image_data, user_id, frame_index):
        try:
            image_name = f"{user_id}/image{frame_index}.jpg"
            blob = self.bucket.blob(image_name)
            _, img_encoded = cv2.imencode('.jpg', image_data)
            img_bytes = img_encoded.tobytes()
            blob.upload_from_string(img_bytes, content_type="image/jpg")
            image_url = blob.public_url
            return image_url
        except Exception as e:
            print(f"Error uploading image: {e}")
            return None

    def add_people(self, userdata, images):
        # timestamp = time.time()
        # userdata = {
        #     "name": "John Doe",
        #     "age": 2512,
        #     "gender": "male",
        #     "room": room
        # }
        timestamp = int(time.time())
        userdata["timestamp"] = timestamp
        try:
            res = self.db.collection("people").add(userdata)
            user_id = res[1].id
            images_collection_ref = self.db.collection("people").document(user_id).collection("images")
            path = 'dataset/{}'.format(user_id)
            if not os.path.exists(path):
                os.makedirs(path)
            # Thêm từng frame vào collection "frames"
            for index, frame in enumerate(images):
                # Lưu ảnh lên Storage và nhận URL
                image_url = self.upload_image_to_storage(frame, user_id, index)
                cv2.imwrite(f'{path}/image{index}.jpg', frame)

                # Nếu lưu ảnh thành công
                if image_url:
                    frame_data = {
                        "{}".format(index): image_url
                    }
                    images_collection_ref.add(frame_data)
            return user_id
        except Exception as e:
            print(f"Error: {e}")
            return None

    def add_log(self, log_entry):
        logs_collection = self.db.collection('logs')
        logs_collection.add(log_entry)

    def get_image_from_storage(self, user_id, frame_index):
        path = f'dataset/{user_id}/image{frame_index}.jpg'
        try:
            if os.path.exists(path):
                return cv2.imread(path)
            image_name = f"{user_id}/image{frame_index}.jpg"
            blob = self.bucket.blob(image_name)
            img_bytes = blob.download_as_bytes()
            img_np = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
            return img
        except Exception as e:
            print(f"Error downloading image: {e}")
            return None

    def update_person(self, person_id, img_count=40, description=None):
        pass

if __name__ == '__main__':
    myFirebase = MyFirebase()
    user_data = {
        "username": "abc",
        "email": "example@example.com",
        "password": "123",
    }

    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": "123456",
        "name": "H",
        "status": "Nhận diện thành công",
        "image_url": "https://example.com/path/to/face_image.jpg"
    }
    myFirebase.add_log(log_entry)
    # downloaded_image = myFirebase.download_image_from_storage('myWbW5P7lEW6LZvFyFxt', 3)
    # print(downloaded_image.shape)
    # cv2.imshow('asadas', downloaded_image)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()
    # myFirebase.add_people(None)
    # myFirebase.register_user(user_data)
    # print(myFirebase.db.get('/users', 'abc'))