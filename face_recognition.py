import os
import cv2
import numpy as np
from _testcapi import DBL_MAX

from face_detection import  FaceDetection
from sklearn.utils import shuffle
class FaceRecognition:
    def __init__(self, count_frame_face=40):
        self.face_detection = FaceDetection()
        self.count_frame_face = count_frame_face
        self.recognizer = cv2.face_LBPHFaceRecognizer.create(radius = 1,neighbors = 8,grid_x = 8,grid_y = 8,threshold = DBL_MAX)
        self.features = []
        self.labels = []
        self.id_label = {}

        pass


    def load_model(self, model_path='face_train.yml'):
        if os.path.exists(model_path):
            self.recognizer = cv2.face.LBPHFaceRecognizer_create()
            self.recognizer.read(model_path)
            self.features = np.load('features.npy', allow_pickle=True)
            self.labels = np.load('labels.npy')
            self.id_label = np.load('id_label.npy')
            print("Model loaded successfully.")
            return 1
        else:
            return 0
        pass
    def update_model(self, features, labels, id_label):
        self.features = np.array(features, dtype='object')
        self.labels = np.array(labels)
        self.id_label = id_label
        self.features, self.labels = shuffle(self.features, self.labels, random_state=42)

        print(len(self.features), self.labels, len(self.id_label))
        self.recognizer.train(self.features, self.labels)
        self.recognizer.save('face_train.yml')
        np.save('features.npy', self.features)
        np.save('labels.npy', self.labels)
        np.save('id_label.npy', self.id_label)
        return True
        pass

    def trans_a_video(self, path_video, path_image='Data\Images'):
        label = path_video.split('\\')[-1].split('.')[0]
        print(label)
        path_image_person = os.path.join(path_image,label)
        print(path_image_person)
        if not os.path.exists(path_image_person):
            os.mkdir(path_image_person)
        else:
            # If the folder exists, remove all files inside it
            for filename in os.listdir(path_image_person):
                file_path = os.path.join(path_image_person, filename)
                try:
                    if os.path.isfile(file_path):
                        os.unlink(file_path)
                except Exception as e:
                    print(f"Error deleting {file_path}: {e}")

        count_frame_face = 0
        cap = cv2.VideoCapture(path_video)
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            # frame = cv2.flip(frame, 1)
            frame, faces = self.face_detection.findFaces(frame, draw=False)
            if faces:
                for face in faces:
                    x, y, w, h = face['bbox']
                    face_img = frame[y:y + h, x:x + w]
                    gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
                    cv2.imwrite(os.path.join(path_image_person,f'{count_frame_face}.jpg'),gray)
                    count_frame_face+=1

            if count_frame_face == self.count_frame_face:
                break
            # cv2.imshow("gray", frame)
            cv2.waitKey(1)

    def trans_video_to_frame(self, path='Data\Video', folder=True):
        if folder:
            files = os.listdir(path)
            for file in files:
                path_video = os.path.join(path, file)
                if path_video.endswith(".mp4"):
                    self.trans_a_video(path_video)
        else:
            if path.endswith(".mp4"):
                self.trans_a_video(path)


if  __name__ == '__main__':
    a = FaceRecognition()
    a.load_model()
    # a.trans_video_to_frame()
