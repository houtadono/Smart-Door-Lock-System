import cv2
import mediapipe as mp

class FaceDetection:
    def __init__(self, minDetectionCon=0.5, modelSelection=0):
        self.minDetectionCon = minDetectionCon
        self.modelSelection = modelSelection
        self.mpFaceDetection = mp.solutions.face_detection
        self.faceDetection = self.mpFaceDetection.FaceDetection(min_detection_confidence=self.minDetectionCon,
                                                                model_selection=self.modelSelection)
        pass

    def findFaces(self, img, draw=True):
        results = self.faceDetection.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        bboxs = []
        if results.detections:
            for id, detection in enumerate(results.detections):
                if detection.score[0] > self.minDetectionCon:
                    bboxC = detection.location_data.relative_bounding_box
                    ih, iw, ic = img.shape
                    bbox = int(bboxC.xmin * iw), int(bboxC.ymin * ih), \
                        int(bboxC.width * iw), int(bboxC.height * ih)
                    cx, cy = bbox[0] + (bbox[2] // 2), \
                             bbox[1] + (bbox[3] // 2)
                    bboxInfo = {"id": id, "bbox": bbox, "score": detection.score, "center": (cx, cy)}
                    bboxs.append(bboxInfo)
                    if draw:
                        img = cv2.rectangle(img, bbox, (255, 0, 255), 2)

                        cv2.putText(img, f'{int(detection.score[0] * 100)}%',
                                    (bbox[0], bbox[1] - 20), cv2.FONT_HERSHEY_PLAIN,
                                    2, (255, 0, 255), 2)
        return img, bboxs

