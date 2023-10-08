

var socket = io.connect('http://127.0.0.1:5000');

var videoElement = document.getElementById('video');
var processedVideoElement = document.getElementById('processedVideo');
var bothVideo = document.querySelectorAll('.video');


var stream = null;
var cameraOn = false;

let sendFrame;

async function toggleCamera() {
    if (!cameraOn) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            for(let v of bothVideo){
                v.style.display = "inline-block";
            }
            videoElement.srcObject = stream;
            cameraOn = true;
            document.getElementById('toggleCamera').textContent = 'Stop Streaming';
            sendFrame = setInterval( function() {
                var canvas = document.createElement('canvas');
                var context = canvas.getContext('2d');
                canvas.width = videoElement.clientWidth;
                canvas.height = videoElement.clientHeight;

                context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                var frameData = canvas.toDataURL('image/jpeg', 0.7);
                socket.emit('video_frame', frameData);
            } , 1);
        } catch (error) {
            console.error('Error accessing camera:', error);
        }
    } else {
        if (stream) {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            videoElement.srcObject = null;
        }
        cameraOn = false;
        document.getElementById('toggleCamera').textContent = 'Start Streaming';
        clearInterval(sendFrame);
        for(let v of bothVideo){
            v.style.display = "none";
        }
    }
}

socket.on('video_frame', function (frame_data) {
<!--            receivedVideoElement.src ='data:image/jpeg;base64,' + frame_data;-->
    const processedCtx = processedVideoElement.getContext('2d');
    const processedImage = new Image();
    processedImage.src =  frame_data;
    processedImage.onload = () => {
        processedCtx.drawImage(processedImage, 0, 0, processedVideoElement.width, processedVideoElement.height);
    };
});