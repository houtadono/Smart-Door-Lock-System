

// tab
function openTab(evt, tab_name) {
    const tab_contents = document.getElementsByClassName("tab-content");
    for (let tab_content of tab_contents) {
        tab_content.style.display = "none";
    }
    var buttons = document.querySelectorAll('.btn-select-tab');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('btn-selected');
    }
    event.currentTarget.classList.add('btn-selected');

    document.getElementById(tab_name).style.display = "flex";
    if(cameraOn && tab_name!="tab-camera"){
        toggleCamera();
    }
    if(tab_name == 'tab-pincodes'){
        getPincode();
    }
    if(tab_name == 'tab-users'){
        getUsers();
    }
    if(tab_name == 'tab-faces'){
        getPeople();
    }
     if(tab_name == 'tab-log'){
        getLog();
//        setInterval(getLog, 5000);
    }
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
            socket.emit('start_video_frame');
            videoElement.srcObject = stream;
            cameraOn = true;
            document.getElementById('toggleCamera').textContent = 'Ngừng xác thực';
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

//                  if (elapsedTime === 7000) {
////                    console.log('Thông báo sau 7 giây');
//                    toast({
//                        type: "warning",
//                        title: 'Cảnh báo!',
//                        message: 'Chưa nhận diện được khuôn mặt',
//                        duration: 3000
//                    })
//                }
//                if (elapsedTime === 14000) {
////                    console.log('Dừng sau 14 s');
//                    toast({
//                        type: "error",
//                        title: 'Thất bại!',
//                        message: 'Xác thực không thành công! Vui lòng thử lại...',
//                        duration: 3000
//                    })
//                    socket.emit('cant_video_frame');
//                    toggleCamera();
//                }

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
    if (frame_data == 'done' & cameraOn){
        toggleCamera();
    }else if (cameraOn & frame_data != 'done'){
        const processedCtx = processedVideoElement.getContext('2d');
        const processedImage = new Image();
        processedImage.src =  frame_data;
        processedImage.onload = () => {
            processedCtx.drawImage(processedImage, 0, 0, processedVideoElement.width, processedVideoElement.height);
        };
    }
});

// socket.on('')

// other
function updateLoader(percentage) {
  const loader = document.getElementById('loader');
  const percentageElement = document.getElementById('percentage');

  loader.style.width = percentage + '%';
  percentageElement.innerHTML = percentage + '%';
}

updateLoader(0);

function logout() {
    window.location.href = '/iot/logout';
};
// pincode
function formatTime(seconds) {
    const days =  Math.floor(seconds / 3600 / 24);
    const hours = Math.floor((seconds/3600) %24);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${days}ngày ${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

function getPincode() {
    fetch('/iot/admin/get-pincode', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        var tableBody = document.getElementById('table-body-pincode');
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
        lst_pincode = data.pincodes;
        lst_pincode.forEach(pincode => {
            const row = tableBody.insertRow();

            row.insertCell(0).textContent = pincode.code;
            row.insertCell(1).textContent = pincode.note;
            row.insertCell(2).textContent = pincode.init_time;
            row.insertCell(3).textContent = pincode.expiry_time;
            row.insertCell(4).textContent = 0;
            const expiryTime = new Date(pincode.expiry_time);
             const intervalId = setInterval(function () {
                const currentTime = new Date();
                const timeDifference = expiryTime - currentTime - 7*3600000;
                const remainingSeconds = Math.floor(timeDifference / 1000);
                row.cells[4].textContent = formatTime(remainingSeconds);
                if (remainingSeconds <= 0) {
                    clearInterval(intervalId);
                    tableBody.removeChild(row);
                }
            }, 1000);

            const deleteCell = row.insertCell(5);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Xóa';
            deleteButton.addEventListener('click', function() {
                socket.emit('delete_pincode', pincode.id);
            });
            deleteCell.appendChild(deleteButton);
        });
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

document.getElementById('form-pincode').addEventListener('submit', function(event) {
    event.preventDefault();
    var pincode = document.getElementById('code').value;
    var note = document.getElementById('note').value;
    var expiry = document.getElementById('expiry').value;
    var data = {
        code: pincode,
        note: note,
        expiry: expiry,
    };
    fetch('/iot/admin/add-pincode', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(data => {
        if (data.done == 0){
             toast({
                title: "Lỗi không xác định",
                message: "Thêm mã pin không thành công",
                type: "error",
                duration: 2000,
            })
        }else{
            toast({
                title: "Thành công",
                message: `Thêm mã pin thành công`,
                type: "success",
            })
            document.getElementById('btn-manager-pincode').click();
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});

// user
function getUsers() {
    fetch('/iot/admin/get-users', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        var tableBody = document.getElementById('table-body-users');
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
        lst_users = data.users;
        lst_users.forEach(user => {
            const row = tableBody.insertRow();

            const userCell = row.insertCell(0);
            const passwordCell = row.insertCell(1);
            const roleCell = row.insertCell(2);

            userCell.textContent = user.username;
            passwordCell.textContent = user.password;
            roleCell.textContent = user.role;

            const deleteCell = row.insertCell(3);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Xóa';
            deleteButton.addEventListener('click', function() {
                socket.emit('delete_user', user.username);
            });
            deleteCell.appendChild(deleteButton);
        });
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

// faces
function getPeople() {
    fetch('/iot/admin/get-people', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        var tableBody = document.getElementById('table-body-people');
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
        lst_people = data.people;
        lst_people.forEach(user => {
            const row = tableBody.insertRow();

            row.insertCell(0).textContent = user.user_id;
            row.insertCell(1).textContent = user.name;
            row.insertCell(2).textContent = user.gender;
            row.insertCell(3).textContent = user.age;
            row.insertCell(4).textContent = user.room;

            const deleteCell = row.insertCell(5);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Xóa';
            deleteButton.addEventListener('click', function() {
                socket.emit('delete_people', user.user_id);
            });

            // Thêm nút xóa vào cell
            deleteCell.appendChild(deleteButton);
        });
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

//log
function getLog() {
     fetch('/iot/admin/get-log', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        var tableBody = document.getElementById('table-body-log');
        while (tableBody.firstChild) {
            tableBody.removeChild(tableBody.firstChild);
        }
        lst_log = data.logs;
        lst_log.forEach(log => {
            const row = tableBody.insertRow();

            var imageURL = log.image_url;
            var imgElement = document.createElement('img');
            imgElement.src = imageURL;

            row.insertCell(0).textContent = log.timestamp;
            row.insertCell(1).textContent = log.user_id;
            row.insertCell(2).textContent = log.name;
            row.insertCell(3).textContent = log.status;
            row.insertCell(4).appendChild(imgElement);
            if (log.status == 'Cửa mở') {
                row.classList.add('open-status');
            }
            if (log.status == 'Nhận diện thành công' || log.status == 'Đúng mã pin') {
                row.classList.add('success-status');
            }
            if (log.status == 'Cửa đóng') {
                row.classList.add('closed-status');
            }
            if (log.status == 'Nhận diện không thành công' || log.status == 'Sai mã pin') {
                row.classList.add('failure-status');
            }

        });
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

// modal
const modals = document.querySelectorAll('.js-modal')
const modalContainers = document.querySelectorAll('.js-modal-container')
const closeBtns = document.querySelectorAll('.js-modal-close')

function hideModal(modalClass){
    modalClass.classList.remove('open')
    if (cameraOnAdd) {
        toggleCamera_add();
    }
    var inputFields = modalClass.querySelectorAll('input, textarea, select');

    // Duyệt qua từng phần tử và đặt giá trị về rỗng
    inputFields.forEach(function (input) {
        input.value = '';
    });
    updateLoader(0);
    socket.emit('delete_cache_images');
}

function showModal(modalClass) {
    modalClass.classList.add('open')
}

function click_showModal(modalClass) {
    var x = document.querySelector(modalClass);
    showModal(x);
}

closeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const modal = this.closest('.js-modal');
        hideModal(modal);
    });
});

modals.forEach(modal => {
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            hideModal(modal);
        }
    });
});

modalContainers.forEach(container => {
    container.addEventListener('click', function (event) {
        event.stopImmediatePropagation();
    });
});


// add person people
function openLoad(evt,tabname){
    const tabloads = document.querySelectorAll('.tab-load')
    for (let tabload of tabloads){
        tabload.style.display = "none";
    }

    var buttons = document.querySelectorAll('.btn-addPeople');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('btn-selected');
    }
    event.currentTarget.classList.add('btn-selected');

    document.getElementById(tabname).style.display = "flex";

//    document.querySelector('.tab-camera-add').classList.toggle("show-off");
//    document.querySelector('.btn-addPeople').classList.toggle("btn-selected");
}


var videoElementAdd = document.getElementById('video-add');
var processedVideoElementAdd = document.getElementById('processedVideo-add');
var bothVideoAdd = document.querySelectorAll('.video-add');
var timerElementAdd = document.getElementById('timer-add');
var stream = null;
var cameraOnAdd = false;
async function toggleCamera_add() {
    if (!cameraOnAdd) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            for(let v of bothVideoAdd){
                v.style.display = "inline-block";
            }
            timerElementAdd.style.display = "block";

            videoElementAdd.srcObject = stream;
            cameraOnAdd = true;
            document.getElementById('toggleCamera-add').textContent = 'Ngừng quét';
            var elapsedTime = 0;  // Biến để theo dõi thời gian chạy camera
            sendFrame = setInterval( function() {
                // Tăng thời gian chạy
                elapsedTime += 100;
                 // Cập nhật giá trị thời gian
                var hours = Math.floor(elapsedTime / 3600000);
                var minutes = Math.floor((elapsedTime % 3600000) / 60000);
                var seconds = Math.floor((elapsedTime % 60000) / 1000);

                timerElementAdd.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                var canvas = document.createElement('canvas');
                var context = canvas.getContext('2d');
                canvas.width = videoElementAdd.clientWidth;
                canvas.height = videoElementAdd.clientHeight;
                context.drawImage(videoElementAdd, 0, 0, canvas.width, canvas.height);
                var frameData = canvas.toDataURL('image/jpeg');
                socket.emit('video_frame_add', frameData);

                 // Kiểm tra sau 30 giây
//                if (elapsedTime === 3000) {
//                    console.log('Thông báo sau 10 giây');
//                }
//                if (elapsedTime === 5000) {
//                    console.log('Dừng sau 1/4 phút');
//                    toast({
//                        type: "error",
//                        title: 'Thất bại!',
//                        message: 'Xác thực không thành công! Vui lòng thử lại...',
//                        duration: 3000
//                    })
//                    toggleCamera();
//                }

            } , 100);
        } catch (error) {
            console.error('Error accessing camera:', error);
        }
    } else {
        if (stream) {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            videoElementAdd.srcObject = null;
        }
        cameraOnAdd = false;
        document.getElementById('toggleCamera-add').textContent = 'Bắt đầu quét camera';
        clearInterval(sendFrame);
        for(let v of bothVideoAdd){
            v.style.display = "none";
        }
        timerElementAdd.style.display = "none";
    }
}

socket.on('video_frame_add', function (data) {
    if (data.done == 0 && cameraOnAdd ){
        updateLoader(data.percent);
        frame_data = data.frame;
        const processedCtx = processedVideoElementAdd.getContext('2d');
        const processedImage = new Image();
        processedImage.src =  frame_data;
        processedImage.onload = () => {
            processedCtx.drawImage(processedImage, 0, 0, processedVideoElementAdd.width, processedVideoElementAdd.height);
        };
    }else if(cameraOnAdd){
        toggleCamera_add();
        toast({
            title: "Thành công",
            message: "Quét khuôn mặt thành công",
            type: "success",
        })
    }
    if(data.done==0){
         updateLoader(data.percent);
    }
});

function resetCamera_add() {
    socket.emit('delete_cache_images');
    updateLoader(0);
}

document.getElementById('form-add').addEventListener('submit', function(event) {
    event.preventDefault();
    var loaderValue = document.getElementById('percentage').textContent;
    // Check if the loader is at 100%
    if (loaderValue == "100%") {
        var name = document.getElementById('name-add').value;
        var age = document.getElementById('age-add').value;
        var room = document.getElementById('room-add').value;
        var gender = document.getElementById('gender-add').value;
        if (gender == 'male')
            gender = 'Nam';
        else gender = 'Nữ';
        var data = {
            name: name,
            age: age,
            gender: gender,
            room: room
        };
        console.log(data);
        fetch('/iot/admin/add-people', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(data => {
            if (data.done == 0){
                 toast({
                    title: "Lỗi không xác định",
                    message: "Đăng kí khuôn mặt không thành công",
                    type: "error",
                    duration: 2000,
                })
            }else{
                toast({
                    title: "Thành công",
                    message: `Đăng kí khuôn mặt thành công với id ${data.user_id}`,
                    type: "success",
                })
                document.getElementById('btn-manager-face').click();
                socket.emit('train_all');
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    } else {
        toast({
            title: "Lỗi không xác định",
            message: "Đăng kí khuôn mặt không thành công",
            type: "error",
            duration: 2000,
        })
    }
})

var tabPincode = document.getElementById('tab-pincode')
if (tabPincode){
    tabPincode.style.display = "flex";
}
socket.emit('request_lock_status');

socket.on('message_server_admin', function(data){
    if(data=='delete_people_ok'){
        document.querySelector('#btn-manager-face').click();
    };
     if(data=='delete_user_ok'){
        document.querySelector('#btn-manager-user').click();
    };
    if(data=='delete_pincode_ok'){
        document.querySelector('#btn-manager-pincode').click();
    }
})

function uploadFile() {
    var formData = new FormData(document.getElementById('uploadForm'));
    socket.emit('join-room', 'room-upload-file');
    fetch('/iot/admin/load-file', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        // Handle the response as needed
    })
    .catch(error => {
        console.error(error);
        // Handle errors
    });
}