/* AI 部署手记 — main.js */

// ── Mobile menu ──────────────────────────────
const menuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    menuToggle.setAttribute('aria-expanded', navMenu.classList.contains('active'));
  });
  document.addEventListener('click', (e) => {
    if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
      navMenu.classList.remove('active');
    }
  });
}

// ── Nav dropdowns (hover with delay) ───────────
document.querySelectorAll('[data-dropdown]').forEach(item => {
  let timer;
  const menu = item.querySelector('.dropdown-menu');

  item.addEventListener('mouseenter', () => {
    clearTimeout(timer);
    item.classList.add('open');
  });

  item.addEventListener('mouseleave', () => {
    timer = setTimeout(() => item.classList.remove('open'), 200);
  });

  if (menu) {
    menu.addEventListener('mouseenter', () => clearTimeout(timer));
    menu.addEventListener('mouseleave', () => {
      timer = setTimeout(() => item.classList.remove('open'), 200);
    });
  }
});

// Close dropdowns on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('[data-dropdown].open').forEach(el => el.classList.remove('open'));
  }
});

// ── Header shadow on scroll ──────────────────
const siteHeader = document.querySelector('.site-header');
if (siteHeader) {
  window.addEventListener('scroll', () => {
    siteHeader.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
}

// ── Reading progress bar ─────────────────────
const progressBar = document.getElementById('readingProgress');
if (progressBar) {
  const updateProgress = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = docHeight > 0
      ? Math.min((scrollTop / docHeight) * 100, 100) + '%'
      : '0%';
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

// ── Category badge colors ────────────────────
const CAT_MAP = {
  // 新分类
  '教程': 'cat-tut',
  '踩坑': 'cat-bug',
  '对比': 'cat-cmp',
  // 旧分类保留兼容
  '人工智能': 'cat-ai',
  'Web开发':  'cat-web',
  '网络安全': 'cat-sec',
  '云计算':   'cat-cloud',
  '编程':     'cat-prog',
  '数字生活': 'cat-life',
  '开源':     'cat-open',
};

document.querySelectorAll('.post-category').forEach(el => {
  const key = Object.keys(CAT_MAP).find(k => el.textContent.includes(k));
  if (key) el.classList.add(CAT_MAP[key]);
});

// ── Cookie consent ───────────────────────────
const cookieBanner = document.getElementById('cookieConsent');
const acceptBtn = document.getElementById('acceptCookies');

if (cookieBanner && !localStorage.getItem('cookiesAccepted')) {
  setTimeout(() => cookieBanner.classList.add('active'), 1200);
}

if (acceptBtn) {
  acceptBtn.addEventListener('click', () => {
    localStorage.setItem('cookiesAccepted', 'true');
    cookieBanner.classList.remove('active');
  });
}

// ── Smooth scroll for anchor links ───────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});

// ── Newsletter form ───────────────────────────
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', e => {
    e.preventDefault();
    const input = newsletterForm.querySelector('input[type="email"]');
    if (input) input.value = '';
    const btn = newsletterForm.querySelector('button');
    if (btn) { btn.textContent = '已订阅 ✓'; btn.disabled = true; }
  });
}

// ── Contact form ──────────────────────────────
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    if (btn) { btn.textContent = '已发送 ✓'; btn.disabled = true; }
  });
}

// ── Post category filter ─────────────────────
const postList = document.querySelector('.post-list');
const filterButtons = document.querySelectorAll('.filter-btn');

function applyFilter(category) {
  if (!postList) return;
  const items = postList.querySelectorAll('.post-item');
  items.forEach(item => {
    const catEl = item.querySelector('.post-category');
    const match = category === 'all' || (catEl && catEl.textContent.trim() === category);
    item.style.display = match ? '' : 'none';
  });
  filterButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === category);
  });
}

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
});

const urlParams = new URLSearchParams(window.location.search);
const urlCat = urlParams.get('cat');
const validCats = ['all', 'Tutorial', 'Troubleshooting', 'Comparison', '教程', '踩坑', '对比'];
if (urlCat && validCats.includes(urlCat)) {
  applyFilter(urlCat);
}

// ── Scroll reveal animations ──────────────────
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// ── AI deployment tools ───────────────────────
const formatMoney = (value) => '¥' + Math.round(value).toLocaleString('zh-CN');
const formatGb = (value) => value.toFixed(value >= 10 ? 1 : 2) + ' GB';

function getFormNumber(form, name, fallback = 0) {
  const value = Number(new FormData(form).get(name));
  return Number.isFinite(value) ? value : fallback;
}

function renderMetrics(target, metrics) {
  if (!target) return;
  target.innerHTML = metrics.map(([label, value]) => (
    `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`
  )).join('');
}

document.querySelectorAll('.copy-btn[data-copy-target]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const target = document.getElementById(btn.dataset.copyTarget);
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.textContent);
      const oldText = btn.textContent;
      btn.textContent = '已复制';
      setTimeout(() => { btn.textContent = oldText; }, 1200);
    } catch (err) {
      btn.textContent = '复制失败';
    }
  });
});

// ── Homepage stage filter ────────────────────
const stageFilterButtons = document.querySelectorAll('.stage-filter-btn');
const toolCards = document.querySelectorAll('.homepage-tool-card');
const toolsRows = document.querySelectorAll('.tools-grid-row');

function applyStageFilter(stage) {
  toolCards.forEach(card => {
    const match = stage === 'all' || card.dataset.stage === stage;
    card.style.display = match ? '' : 'none';
  });

  // Rebalance row visibility: hide empty rows
  toolsRows.forEach(row => {
    const visibleCards = row.querySelectorAll('.homepage-tool-card:not([style*="display: none"])');
    row.style.display = visibleCards.length ? '' : 'none';
  });

  stageFilterButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === stage);
  });

  // Sync URL without reload
  const url = new URL(window.location);
  if (stage === 'all') {
    url.searchParams.delete('stage');
  } else {
    url.searchParams.set('stage', stage);
  }
  window.history.replaceState({}, '', url);
}

stageFilterButtons.forEach(btn => {
  btn.addEventListener('click', () => applyStageFilter(btn.dataset.filter));
});

// Initialize from URL on page load
const stageParam = new URLSearchParams(window.location.search).get('stage');
if (stageParam && ['prep', 'start', 'run'].includes(stageParam)) {
  applyStageFilter(stageParam);
}
