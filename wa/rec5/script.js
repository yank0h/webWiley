const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('.nav-menu');
let isMenuBlock = window.getComputedStyle(menu).display === 'block';

if (toggle && menu) {
    toggle.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('active');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
}