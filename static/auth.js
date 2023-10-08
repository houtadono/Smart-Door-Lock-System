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