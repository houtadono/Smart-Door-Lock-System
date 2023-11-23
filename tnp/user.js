

var videoElement = document.getElementById('video');
var processedVideoElement = document.getElementById('processedVideo');
var bothVideo = document.querySelectorAll('.video');
var mess = document.getElementById('message');

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
            mess.style.display = "block";
            videoElement.srcObject = stream;
            cameraOn = true;
            document.getElementById('toggleCamera').textContent = 'Stop Streaming';
            var elapsedTime = 0;  // Biến để theo dõi thời gian chạy camera
            sendFrame = setInterval( function() {
                // Tăng thời gian chạy
                elapsedTime += 100;
                var canvas = document.createElement('canvas');
                var context = canvas.getContext('2d');
                canvas.width = videoElement.clientWidth;
                canvas.height = videoElement.clientHeight;
                context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                var frameData = canvas.toDataURL('image/jpeg');
                socket.emit('video_frame', frameData);

                 // Kiểm tra sau 30 giây
                if (elapsedTime === 30000) {
                    console.log('Thông báo sau 30 giây');
                }
                if (elapsedTime === 60000) {
                    console.log('Dừng sau 1 phút');
                    toggleCamera();
                }

            } , 100);
//            sendFrame = setInterval(function() {
//                var canvas = document.createElement('canvas');
//                var context = canvas.getContext('2d');
//                canvas.width = videoElement.clientWidth;
//                canvas.height = videoElement.clientHeight;
//                context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
//                var frameData = canvas.toDataURL('image/jpeg', 0.7);
//                fetch('/iot/process_frame', {
//                        method: 'POST',
//                      headers: {
//                        'Content-Type': 'application/json',
//                      },
//                      body: JSON.stringify({ frameData: frameData }),
//                    })
//                    .then(response => response.json())
//                    .then(data => {
//                        const processedCtx = processedVideo.getContext('2d');
//                        const processedImage = new Image();
//                        processedImage.src = 'data:image/jpeg;base64,' + data.processed_frame;
//                        processedImage.onload = () => {
//                            processedCtx.drawImage(processedImage, 0, 0, processedVideoElement.width, processedVideoElement.height);
//                        };
//                    })
//            },100);

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
        mess.style.display = "none";
    }
}

socket.on('video_frame', function (frame_data) {
    const processedCtx = processedVideoElement.getContext('2d');
    const processedImage = new Image();
    processedImage.src =  frame_data;
    processedImage.onload = () => {
        processedCtx.drawImage(processedImage, 0, 0, processedVideoElement.width, processedVideoElement.height);
    };
});

socket.on('messages_from_server', function (data) {
    mess.innerHTML = data;
});

function logout() {
    window.location.href = '/iot/logout';
};

//
//emit('toast_notification', {'message': message, 'title', })



//
function showSuccessToast() {
    toast({
          title: "Thành công!",
          message: "Nhận diện khuôn mặt thành công.",
          type: "success",
          duration: 2000
    });
  }

function showErrorToast() {
    toast({
          title: "Thất bại!",
          message: "Có lỗi xảy ra, vui lòng liên hệ quản trị viên.",
          type: "error",
          duration: 5000
    });
}