import {
  FaceDetector,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0"

const demosSection = document.getElementById("demos")

let faceDetector
let runningMode = "VIDEO"

// Initialize the object detector
const initializefaceDetector = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  )
  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
      delegate: "GPU"
    },
    runningMode: runningMode
  })
  demosSection.classList.remove("invisible")
}
initializefaceDetector()

let video = document.getElementById("webcam")
const liveView = document.getElementById("liveView")
let enableWebcamButton

// Check if webcam access is supported.
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia

var children = []

if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton")
  enableWebcamButton.addEventListener("click", enableCam)
} else {
  console.warn("getUserMedia() is not supported by your browser")
}

async function enableCam(event) {
  if (!faceDetector) {
    alert("Face Detector is still loading. Please try again..")
    return
  }
  enableWebcamButton.classList.add("removed")

  // Activate the webcam stream.
  navigator.mediaDevices
    .getUserMedia( {video: true} )
    .then(function(stream) {
      video.srcObject = stream
      video.addEventListener("loadeddata", predictWebcam)
    })
    .catch(err => {
      console.error(err)
    })
}

let lastVideoTime = -1
async function predictWebcam() {
  let startTimeMs = performance.now()

  // Detect faces using detectForVideo
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime
    const detections = faceDetector.detectForVideo(video, startTimeMs).detections
    displayVideoDetections(detections)
  }

  window.requestAnimationFrame(predictWebcam)
}

function displayVideoDetections(detections) {

    for (let child of children) {
        liveView.removeChild(child)
    }
    children.splice(0)

//  // Iterate through predictions and draw them to the live view
    if (detections && detections.length > 0) {
        let detection = detections[0];
        let detectionData = {
            x_min: video.offsetWidth -detection.boundingBox.width -detection.boundingBox.originX,
            y_min: detection.boundingBox.originY,
            width: detection.boundingBox.width - 10,
            height: detection.boundingBox.height
        };
        sendFrame(detectionData);
        const p = document.createElement("p")
        p.innerText =
          "Confidence: " +
          Math.round(parseFloat(detection.categories[0].score) * 100) +
          "% ."
        p.style =
          "left: " +
          (video.offsetWidth -
            detection.boundingBox.width -
            detection.boundingBox.originX) +
          "px;" +
          "top: " +
          (detection.boundingBox.originY - 30) +
          "px; " +
          "width: " +
          (detection.boundingBox.width - 10) +
          "px;"


        const highlighter = document.createElement("div")
        highlighter.setAttribute("class", "highlighter")
        highlighter.style =
          "left: " +
          (video.offsetWidth -
            detection.boundingBox.width -
            detection.boundingBox.originX) +
          "px;" +
          "top: " +
          detection.boundingBox.originY +
          "px;" +
          "width: " +
          (detection.boundingBox.width - 10) +
          "px;" +
          "height: " +
          detection.boundingBox.height +
          "px;"

        liveView.appendChild(highlighter)
        liveView.appendChild(p)

        // Store drawn objects in memory so
    }
}

var socket = io.connect('http://127.0.0.1:5000');
var canvas = document.createElement('canvas');
var context = canvas.getContext('2d');
const processedVideo = document.getElementById('processedVideo');

function sendFrame(detectionData) {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    var frameData = canvas.toDataURL('image/jpeg');
    var requestData = JSON.stringify({ frame: frameData, detections: detectionData });
    fetch('/process_frame', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: requestData,
    })
    .then(response => response.json())
    .then( data => {
        const processedCtx = processedVideo.getContext('2d');
        const processedImage = new Image();
        processedImage.src = 'data:image/jpeg;base64,' +  data.processed_frame;
        processedImage.onload = () => {
            processedCtx.drawImage(processedImage, 0, 0, processedVideo.width, processedVideo.height);
        };
    } )
    .catch(error => console.error('Error:', error));
}they are queued to delete at next call
        children.push(highlighter)
        children.push(p)
