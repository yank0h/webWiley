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
    "site.brand": "Front Range Table Tennis",
    "site.title": "Front Range Table Tennis",

    "nav.home": "Home",
    "nav.resources": "Resources",
    "nav.forums": "Forums",
    "nav.tournaments": "Tournaments",

    "home.featuredTournament": "Featured Tournament",
    "home.featuredPost": "Featured Forum Post",
    "home.featuredCreator": "Featured Creator",

    "forums.title": "Forums",
    "forums.latest": "Latest Discussions",
    "forums.filter.all": "All",
    "forums.filter.advice": "Advice",
    "forums.filter.offTopic": "Off-Topic",

    "tournaments.title": "Tournaments",
    "tournaments.filter.all": "All",
    "tournaments.filter.co": "colorado",
    "tournaments.filter.fl": "florida",
    "tournaments.filter.ga": "georgia",

    "resources.title": "Resources",
    "resources.written": "Renowned Written Resources",
    "resources.gear": "Reliable Places for Gear",
    "resources.media": "Adam Bobrow & WTT",
  },

  zh: {
    "site.brand": "前沿地区乒乓球",
    "site.title": "前沿地区乒乓球",

    "nav.home": "主页",
    "nav.resources": "资源",
    "nav.forums": "论坛",
    "nav.tournaments": "锦标赛",

    "home.featuredTournament": "精选赛事",
    "home.featuredPost": "精选帖子",
    "home.featuredCreator": "推荐创作者",

    "forums.title": "论坛",
    "forums.latest": "最新讨论",
    "forums.filter.all": "全部",
    "forums.filter.advice": "建议",
    "forums.filter.offTopic": "闲聊",

    "tournaments.title": "锦标赛",
    "tournaments.filter.all": "全部",
    "tournaments.filter.co": "科罗拉多",
    "tournaments.filter.fl": "佛罗里达",
    "tournaments.filter.ga": "佐治亚州",

    "resources.title": "资源",
    "resources.written": "权威文字资源",
    "resources.gear": "可靠的器材商店",
    "resources.media": "Adam Bobrow 与 WTT",
  }
};

const LANG_KEY = "userLanguage";
const DEFAULT_LANG = "en";

function applyLanguage(lang) {
  const dict = I18N[lang] || I18N[DEFAULT_LANG];

  document.documentElement.lang = (lang === "zh" ? "zh-Hans" : "en");
  if (dict["site.title"]) document.title = dict["site.title"];

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key && typeof dict[key] !== "undefined") {
      el.textContent = dict[key];
    }
  });

  const btn = document.getElementById("lang-toggle");
  if (btn) {
    const isZh = lang === "zh";
    btn.textContent = isZh ? "EN" : "中文";
    btn.setAttribute("aria-pressed", isZh ? "true" : "false");
    btn.setAttribute("aria-label", isZh ? "Switch to English" : "切换到中文");
  }
}

function setLanguage(lang) {
  const chosen = I18N[lang] ? lang : DEFAULT_LANG;
  localStorage.setItem(LANG_KEY, chosen);
  applyLanguage(chosen);
}

document.addEventListener("DOMContentLoaded", () => {
  const stored = localStorage.getItem(LANG_KEY);
  const initial = stored || DEFAULT_LANG;
  applyLanguage(initial);

  const btn = document.getElementById("lang-toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const current = localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
      setLanguage(current === "zh" ? "en" : "zh");
    });
  }
});
