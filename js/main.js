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
if (urlCat && ['教程', '踩坑', '对比'].includes(urlCat)) {
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

const memoryForm = document.getElementById('memoryForm');
if (memoryForm) {
  const calculateMemory = () => {
    const paramsB = getFormNumber(memoryForm, 'paramsB', 7);
    const bytesPerParam = getFormNumber(memoryForm, 'precision', 2);
    const contextLen = getFormNumber(memoryForm, 'contextLen', 8192);
    const concurrency = getFormNumber(memoryForm, 'concurrency', 4);
    const hiddenSize = getFormNumber(memoryForm, 'hiddenSize', 4096);
    const layers = getFormNumber(memoryForm, 'layers', 32);
    const gpuCount = getFormNumber(memoryForm, 'gpuCount', 1);
    const gpuMemory = getFormNumber(memoryForm, 'gpuMemory', 24);
    const weightGb = paramsB * bytesPerParam;
    const kvCacheGb = contextLen * concurrency * hiddenSize * layers * 2 * 2 / 1024 ** 3;
    const runtimeGb = Math.max(2, weightGb * 0.12);
    const totalGb = weightGb + kvCacheGb + runtimeGb;
    const availableGb = gpuCount * gpuMemory * 0.9;
    const perGpuGb = totalGb / gpuCount;
    const headroomGb = availableGb - totalGb;

    renderMetrics(document.getElementById('memoryResult'), [
      ['模型权重估算', formatGb(weightGb)],
      ['KV Cache 估算', formatGb(kvCacheGb)],
      ['运行时预留', formatGb(runtimeGb)],
      ['总显存需求', formatGb(totalGb)],
      ['每卡平均压力', formatGb(perGpuGb)],
      ['可用显存余量', formatGb(headroomGb)],
    ]);

    const advice = [];
    if (headroomGb < 0) advice.push('当前配置大概率会 OOM，优先降低上下文长度、并发数或使用 4bit 量化。');
    else if (headroomGb < availableGb * .15) advice.push('显存余量较少，建议预留更多空间给峰值请求和 CUDA 上下文。');
    else advice.push('显存余量看起来健康，可以进入启动测试和并发压测。');
    if (concurrency * contextLen > 65536) advice.push('并发和上下文乘积较大，KV Cache 会成为主要显存来源。');
    document.getElementById('memoryAdvice').textContent = advice.join(' ');
  };
  memoryForm.addEventListener('submit', (e) => { e.preventDefault(); calculateMemory(); });
  calculateMemory();
}

const costForm = document.getElementById('costForm');
if (costForm) {
  const calculateCost = () => {
    const hardwareCost = getFormNumber(costForm, 'hardwareCost', 35000);
    const months = getFormNumber(costForm, 'months', 24);
    const powerW = getFormNumber(costForm, 'powerW', 900);
    const hoursPerDay = getFormNumber(costForm, 'hoursPerDay', 12);
    const electricity = getFormNumber(costForm, 'electricity', .8);
    const opsCost = getFormNumber(costForm, 'opsCost', 300);
    const requests = getFormNumber(costForm, 'requests', 300000);
    const tokensPerReq = getFormNumber(costForm, 'tokensPerReq', 2000);
    const apiPrice = getFormNumber(costForm, 'apiPrice', 8);
    const depreciation = hardwareCost / months;
    const powerCost = powerW / 1000 * hoursPerDay * 30 * electricity;
    const localMonthly = depreciation + powerCost + opsCost;
    const millionTokens = requests * tokensPerReq / 1_000_000;
    const apiMonthly = millionTokens * apiPrice;
    const diff = apiMonthly - localMonthly;
    const payback = diff > 0 ? hardwareCost / diff : Infinity;

    renderMetrics(document.getElementById('costResult'), [
      ['本地月成本', formatMoney(localMonthly)],
      ['云 API 月成本', formatMoney(apiMonthly)],
      ['每月差额', formatMoney(Math.abs(diff)) + (diff >= 0 ? ' 本地更省' : ' API 更省')],
      ['月 token 规模', millionTokens.toFixed(1) + 'M'],
      ['预计回本周期', Number.isFinite(payback) ? payback.toFixed(1) + ' 个月' : '暂不回本'],
    ]);

    const advice = diff > 0
      ? `按当前调用量，自建每月约省 ${formatMoney(diff)}，但需要承担运维、故障和模型升级成本。`
      : `按当前调用量，云 API 每月约省 ${formatMoney(Math.abs(diff))}，先用 API 或按需租 GPU 更稳。`;
    document.getElementById('costAdvice').textContent = advice;
  };
  costForm.addEventListener('submit', (e) => { e.preventDefault(); calculateCost(); });
  calculateCost();
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
