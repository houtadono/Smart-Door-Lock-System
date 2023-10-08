from fdlite import FaceDetection
from PIL import Image
import cv2

class FaceDetectionLite:
    def __init__(self, minDetectionCon=0.5, modelSelection=0):
        self.minDetectionCon = minDetectionCon
        self.modelSelection = modelSelection
        self.faceDetection =  FaceDetection(model_type=self.modelSelection)
        pass

    def findFaces(self, image_cv2 , draw=True):
        image_pil = Image.fromarray(cv2.cvtColor(image_cv2, cv2.COLOR_BGR2RGB))
        faces = self.faceDetection(image_pil)
        bboxs = []
        if faces:
            for id, face in enumerate(faces):
                if face.score > self.minDetectionCon:
                    bboxC = face.bbox
                    ih, iw, ic = image_cv2.shape
                    bbox = int(bboxC.xmin * iw), int(bboxC.ymin * ih), \
                        int((bboxC.xmax-bboxC.xmin )* iw), int((bboxC.ymax-bboxC.ymin) * ih)
                    cx, cy = bbox[0] + (bbox[2] // 2), \
                             bbox[1] + (bbox[3] // 2)
                    bboxInfo = {"id": id, "bbox": bbox, "score": face.score, "center": (cx, cy)}
                    bboxs.append(bboxInfo)
                    if draw:
                        img = cv2.rectangle(image_cv2, bbox, (255, 0, 255), 2)

                        cv2.putText(img, f'{int(face.score * 100)}%',
                                    (bbox[0], bbox[1] - 20), cv2.FONT_HERSHEY_PLAIN,
                                    2, (255, 0, 255), 2)
        return image_cv2, bboxs
