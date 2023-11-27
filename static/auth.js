// Get references to the design and main-content elements
const design = document.querySelector(".design");
const mainContent = document.querySelector(".main-content");

let register = false;
function swapSections() {
    if (!register) {
        design.style.transform = "translateX(100%) rotateY(-180deg)";
        mainContent.style.transform = "translateX(-100%)";
    } else {
        design.style.transform = "translateX(0)";
        mainContent.style.transform = "translateX(0)";
    }
    register =!register;
}

//đổi tab sign-in, sign-up, forgot
function openTab(evt, tab_name) {
    const tab_contents = document.getElementsByClassName("tab-content");
    for (let tab_content of tab_contents) {
        tab_content.style.display = "none";
    }
    document.getElementById(tab_name).style.display = "flex";
    if(tab_name=='register' || register)
        swapSections();
}
document.getElementById('login').style.display = "flex";


const main = document.querySelector('body');
const textInputs = document.querySelectorAll('.js-text-input')

var inputs = document.querySelectorAll('input');
inputs.forEach(function(input) {
    input.addEventListener('focus', function() {
        this.parentElement.click();
    });
});

var eleFocus = document.createElement('div')
eleFocus.className = 'text-input-focus'
main.onclick = function(){
    for (let textInput of textInputs) {
        if(textInput.contains(eleFocus)){
            textInput.removeChild(eleFocus)
        }
    }
}

for (let textInput of textInputs) {
    const inputElement = textInput.querySelector('input');
    textInput.addEventListener('click', () => {
        textInput.appendChild(eleFocus);
        event.stopImmediatePropagation()
    });
}


document.getElementById('form-register').addEventListener('submit', function(event) {
    event.preventDefault(); // Ngăn chặn hành động mặc định của form

    // Lấy giá trị từ các trường input
    var username = this.elements['username-register'].value;
    var password = this.elements['password-register'].value;
    var confirmPassword = this.elements['confirmPassword-register'].value;
    console.log(username, password, confirmPassword);

    // Kiểm tra xác nhận mật khẩu
    if (password !== confirmPassword) {
        toast({
            title: "Warning",
            message: "Password and Confirm Password do not match",
            type: "warning",
        })
        return;
    }

    fetch('/iot/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password,
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.result == 1) {
        // Đăng ký thành công
            toast({
                title: "Thành công",
                message: "Tạo tài khoản thành công",
                type: "success",
            })
        } else if (data.result === 0) {
            // Tài khoản đã tồn tại
            toast({
                title: "Cảnh báo",
                message: "Tài khoản đã tồn tại",
                type: "warning",
            })
        } else {
            // Lỗi không xác định
            toast({
                title: "Lỗi không xác định",
                message: "Tạo tài khoản không thành công",
                type: "error",
            })
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});

