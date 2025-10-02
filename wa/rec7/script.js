const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('.nav-menu');
let isMenuBlock = window.getComputedStyle(menu).display === 'block';

if (toggle && menu) {
    toggle.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('active');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
}





const textFilterButtons = document.querySelectorAll('.gallery-nav button');
const textCards = document.querySelectorAll('.text-card');

textFilterButtons.forEach(button => {
  button.addEventListener('click', (event) => {
    const filterValue = event.target.textContent.toLowerCase();
    filterTextCards(filterValue);
  });
});

function filterTextCards(category) {
  textCards.forEach(card => {
    if (category === 'all' || card.dataset.category === category) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

filterTextCards('all');
