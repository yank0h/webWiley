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


const I18N = {
  en: {
    "nav.home": "Home",
    "nav.resources": "Resources",
    "nav.forums": "Forums",
    "nav.tournaments": "Tournaments",
    "forums.latest": "Latest Discussions",
    "home.featuredTournament": "Featured Tournament",
    "home.featuredPost": "Featured Forum Post",
    "home.featuredCreator": "Featured Creator"
  },
  zh: {
    "nav.home": "主页",
    "nav.resources": "资源",
    "nav.forums": "论坛",
    "nav.tournaments": "锦标赛",
    "forums.latest": "最新讨论",
    "home.featuredTournament": "精选赛事",
    "home.featuredPost": "精选帖子",
    "home.featuredCreator": "推荐创作者"
  }
};

function getLanguage() {
  return localStorage.getItem('userLanguage') || 'en';
}

function setLanguage(lang) {
  localStorage.setItem('userLanguage', lang);
  applyLanguage(lang);
}

function applyLanguage(lang) {
  const dict = I18N[lang] || I18N.en;

  document.documentElement.lang = (lang === 'zh' ? 'zh-Hans' : 'en');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });

  const btn = document.getElementById('lang-toggle');
  if (btn) {
    const isZh = lang === 'zh';
    btn.textContent = isZh ? 'EN' : '中文';
    btn.setAttribute('aria-pressed', isZh ? 'true' : 'false');
    btn.setAttribute('aria-label', isZh ? 'Switch to English' : '切换到中文');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyLanguage(getLanguage());

  const btn = document.getElementById('lang-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      setLanguage(getLanguage() === 'en' ? 'zh' : 'en');
    });
  }
});
