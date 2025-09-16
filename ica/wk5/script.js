let info = false;

const expandBtn = document.querySelector('.expand-btn');
const details = document.querySelector('.card-content');

expandBtn.addEventListener('click', showInfo);

function showInfo() {
    console.log('test');
    if (info == false) {
        info = true;
        details.style.display = "block";
        expandBtn.textContent = "-";
    } else {
        info = false;
        details.style.display = "none";
        expandBtn.textContent = "+";
    }
}