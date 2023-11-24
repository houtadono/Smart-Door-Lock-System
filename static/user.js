
socket.emit('request_lock_status');

// tab
function openTab(evt, tab_name) {
    const tab_contents = document.getElementsByClassName("tab-content");
    for (let tab_content of tab_contents) {
        tab_content.style.display = "none";
    }
    document.getElementById(tab_name).style.display = "flex";
}

// lock
var lock_status = document.getElementById('lock-status');
var lock = document.getElementById('lock');
var lock_top = document.getElementById('lock-top');

socket.on('lock_status', function (data) {
    console.log('lock_status')
    if(data.data == 1){
        lock_top.style.top = '-8rem'; // open
        lock_status.innerHTML = "Cửa mở";
    }else{
        lock_top.style.top = '-6rem'; // close
        lock_status.innerHTML = "Cửa khóa";
    }
});

// pin code
let pincode = document.getElementById("pincode");

function clickPincode(value) {
  pincode.value += value;
}

function backspace() {
  pincode.value = pincode.value.slice(0, -1);
}

function check_pincode() {
    socket.emit('check_pincode', pincode.value);
}


// camera
var videoElement = document.getElementById('video');
var processedVideoElement = document.getElementById('processedVideo');
var bothVideo = document.querySelectorAll('.video');
var timerElement = document.getElementById('timer');
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
            timerElement.style.display = "block";

            videoElement.srcObject = stream;
            cameraOn = true;
            document.getElementById('toggleCamera').textContent = 'Stop Streaming';
            var elapsedTime = 0;  // Biến để theo dõi thời gian chạy camera
            lock.classList.toggle('no-animation');
            sendFrame = setInterval( function() {
                // Tăng thời gian chạy
                elapsedTime += 100;
                 // Cập nhật giá trị thời gian
                var hours = Math.floor(elapsedTime / 3600000);
                var minutes = Math.floor((elapsedTime % 3600000) / 60000);
                var seconds = Math.floor((elapsedTime % 60000) / 1000);

                timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                var canvas = document.createElement('canvas');
                var context = canvas.getContext('2d');
                canvas.width = videoElement.clientWidth;
                canvas.height = videoElement.clientHeight;
                context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                var frameData = canvas.toDataURL('image/jpeg');
                socket.emit('video_frame', frameData);

                 // Kiểm tra sau 30 giây
                if (elapsedTime === 3000) {
                    console.log('Thông báo sau 10 giây');
                }
                if (elapsedTime === 5000) {
                    console.log('Dừng sau 1/4 phút');
                    toast({
                        type: "error",
                        title: 'Thất bại!',
                        message: 'Xác thực không thành công! Vui lòng thử lại...',
                        duration: 3000
                    })
                    toggleCamera();
                }

            } , 100);
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
        timerElement.style.display = "none";
        lock.classList.toggle('no-animation');
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

// socket.on('')

// other
function logout() {
    window.location.href = '/iot/logout';
};
