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

const diagnoseForm = document.getElementById('diagnoseForm');
if (diagnoseForm) {
  const rules = [
    {
      title: '显存不足 / CUDA OOM',
      match: /outofmemory|cuda out of memory|oom|cannot allocate memory/i,
      body: '通常是模型权重、上下文长度、并发或 KV Cache 超过显存。先降低 max-model-len 和并发，再考虑量化或多卡。',
      command: 'nvidia-smi\n# 然后尝试：--max-model-len 4096 --gpu-memory-utilization 0.85'
    },
    {
      title: 'CUDA 驱动或运行时版本不匹配',
      match: /cuda driver|driver version|libcuda|cuda runtime|no cuda gpus/i,
      body: '常见于宿主机驱动、容器 CUDA 版本和 PyTorch 编译版本不一致。',
      command: 'nvidia-smi\npython -c "import torch; print(torch.version.cuda, torch.cuda.is_available())"'
    },
    {
      title: '端口被占用',
      match: /address already in use|port is already allocated|bind.*address/i,
      body: '已有进程占用了服务端口。换端口或结束旧进程后再启动。',
      command: 'lsof -i :8000\n# 或改用 --port 8001'
    },
    {
      title: '模型路径或权限问题',
      match: /no such file|not found|repository not found|gated repo|permission denied|401|403/i,
      body: '检查模型名、Hugging Face 权限、访问 token、挂载路径和文件权限。',
      command: 'huggingface-cli login\nls -lah /path/to/model'
    },
    {
      title: 'Docker 镜像或 GPU 挂载问题',
      match: /docker|nvidia-container|could not select device driver|pull access denied|manifest unknown/i,
      body: '确认镜像名、网络、NVIDIA Container Toolkit 和 docker run 的 GPU 参数。',
      command: 'docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi'
    },
    {
      title: 'Cloudflare Tunnel / 反向代理 502',
      match: /502|bad gateway|cloudflare|tunnel|connection refused|origin/i,
      body: '通常是本地服务没启动、端口不一致、绑定到了 127.0.0.1 之外的错误地址，或 tunnel 配置指向了错误 origin。',
      command: 'curl -v http://127.0.0.1:8000/v1/models\ncloudflared tunnel list'
    },
    {
      title: '上下文长度或 RoPE 配置问题',
      match: /max_model_len|context length|sequence length|rope|sliding window/i,
      body: '模型声明的最大上下文、vLLM 参数和显存预算可能不一致。先回到模型默认上下文，再逐步拉长。',
      command: 'python -m vllm.entrypoints.openai.api_server --model <model> --max-model-len 4096'
    },
  ];

  const diagnose = () => {
    const text = String(new FormData(diagnoseForm).get('errorText') || '').trim();
    const matches = rules.filter(rule => rule.match.test(text));
    const result = document.getElementById('diagnoseResult');
    const picked = matches.length ? matches : [{
      title: '暂未命中明确规则',
      body: '建议补充完整启动命令、模型名、GPU 型号、vLLM 版本和完整 traceback。也可以先从端口、模型路径、显存、CUDA 版本四类问题排查。',
      command: 'nvidia-smi\npython -m vllm.entrypoints.openai.api_server --help'
    }];
    result.innerHTML = picked.map(item => (
      `<article class="diagnose-item"><h3>${item.title}</h3><p>${item.body}</p><code>${item.command}</code></article>`
    )).join('');
  };
  diagnoseForm.addEventListener('submit', (e) => { e.preventDefault(); diagnose(); });
  diagnose();
}

const advisorForm = document.getElementById('advisorForm');
if (advisorForm) {
  const advise = () => {
    const data = new FormData(advisorForm);
    const purpose = data.get('purpose');
    const concurrency = getFormNumber(advisorForm, 'concurrency', 5);
    const hardware = data.get('hardware');
    const experience = data.get('experience');
    const priority = data.get('priority');
    let title = 'Ollama';
    let score = '简单优先';
    let body = '适合个人本地聊天、模型尝鲜和小规模开发验证。安装简单，但不适合严肃高并发 API 服务。';
    let next = '先用 Ollama 跑通模型，再根据真实调用量决定是否迁移到 vLLM。';

    if (purpose === 'prod' || concurrency >= 30 || priority === 'performance') {
      title = 'vLLM';
      score = '吞吐优先';
      body = '适合 OpenAI-compatible API、高并发、连续批处理和多卡服务。需要更认真地处理显存、监控、限流和日志。';
      next = '从单模型 API 服务开始压测，确认 max-model-len、并发和 gpu-memory-utilization。';
    } else if (purpose === 'team' && (hardware === 'multi' || experience !== 'beginner')) {
      title = 'GPUStack';
      score = '团队管理优先';
      body = '适合团队内部统一管理 GPU、模型和服务实例。比手写命令更适合多人协作和资源调度。';
      next = '先把常用模型接入 GPUStack，再给团队提供统一访问入口。';
    } else if (hardware === 'none' && priority !== 'privacy') {
      title = '云端 API';
      score = '上线速度优先';
      body = '没有 GPU 或调用量不稳定时，API 通常更省心。缺点是长期高调用量可能更贵，数据也会出站。';
      next = '先用 API 验证业务价值，再用成本计算器判断是否值得自建。';
    } else if (hardware === 'mac' || purpose === 'dev') {
      title = 'Ollama / LM Studio';
      score = '开发体验优先';
      body = '适合 Mac、本地原型和低并发测试。部署门槛低，方便快速比较模型效果。';
      next = '先确认模型效果和 prompt，再迁移到服务器部署。';
    }

    if (priority === 'privacy' && hardware !== 'none') {
      next += ' 你选择了隐私优先，建议避免把敏感数据发到外部 API。';
    }
    if (priority === 'cost' && concurrency >= 10) {
      next += ' 调用量稳定时，自建更值得继续评估。';
    }

    document.getElementById('advisorResult').innerHTML = `
      <article class="advisor-card">
        <span class="advisor-score">${score}</span>
        <h3>${title}</h3>
        <p>${body}</p>
        <p>${next}</p>
      </article>
    `;
  };
  advisorForm.addEventListener('submit', (e) => { e.preventDefault(); advise(); });
  advise();
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
