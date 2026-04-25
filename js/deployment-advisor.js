/* 模型部署选型助手 — deployment-advisor.js */

// ── 数据定义 ───────────────────────────────────

const SOLUTIONS = {
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    icon: '🦙',
    tagline: '本地运行大模型最简单的方式',
    description: '一行命令安装，一键切换模型。适合个人体验和快速原型，但不支持高并发和标准化 API。',
    pros: ['安装极简单', '模型库丰富', '跨平台支持'],
    cons: ['无标准 API', '并发能力弱', '不适合生产'],
    bestScenes: ['personal', 'dev'],
    minHardware: 'mac',
    maxConcurrency: 1,
    apiCompatible: false,
    opsCost: '极低',
    learnCurve: '低',
    models: [
      { id: 'qwen3-7b', name: 'Qwen3-7B-Instruct', params: '7B', quant: 'Q4_K_M', vramGB: 6, tags: ['中文强', '代码好'] },
      { id: 'llama3-8b', name: 'Llama-3.1-8B-Instruct', params: '8B', quant: 'Q4_K_M', vramGB: 6, tags: ['英文强', '生态好'] }
    ]
  },
  vllm: {
    id: 'vllm',
    name: 'vLLM',
    icon: '⚡',
    tagline: '生产级高吞吐模型服务',
    description: 'OpenAI-compatible API、PagedAttention 高效显存管理、连续批处理。最适合需要 API 服务的场景。',
    pros: ['高吞吐', 'OpenAI API 兼容', '多卡并行', '生产级'],
    cons: ['需要 NVIDIA GPU', '配置较复杂', '学习成本高'],
    bestScenes: ['dev', 'team', 'prod'],
    minHardware: 'single',
    maxConcurrency: 10000,
    apiCompatible: true,
    opsCost: '中',
    learnCurve: '中高',
    models: [
      { id: 'qwen3-7b-fp16', name: 'Qwen3-7B-Instruct', params: '7B', quant: 'FP16', vramGB: 16, tags: ['中文强', '代码好'] },
      { id: 'qwen3-32b-awq', name: 'Qwen3-32B-Instruct', params: '32B', quant: 'AWQ-4bit', vramGB: 24, tags: ['能力强', '中文强'] },
      { id: 'deepseek-r1-32b', name: 'DeepSeek-R1-Distill-Qwen-32B', params: '32B', quant: 'AWQ-4bit', vramGB: 24, tags: ['推理强', '中文强'] }
    ]
  },
  gpustack: {
    id: 'gpustack',
    name: 'GPUStack',
    icon: '🖥️',
    tagline: '团队级 GPU 资源与模型管理平台',
    description: '统一管理 GPU、模型和服务实例，支持多用户和多模型调度。适合有运维基础的团队。',
    pros: ['团队统一管理', '多模型调度', '资源分配'],
    cons: ['学习成本较高', '需要运维投入', '社区较新'],
    bestScenes: ['team', 'prod'],
    minHardware: 'single',
    maxConcurrency: 1000,
    apiCompatible: true,
    opsCost: '中',
    learnCurve: '中高',
    models: [
      { id: 'qwen3-7b-fp16', name: 'Qwen3-7B-Instruct', params: '7B', quant: 'FP16', vramGB: 16, tags: ['中文强'] },
      { id: 'qwen3-32b-awq', name: 'Qwen3-32B-Instruct', params: '32B', quant: 'AWQ-4bit', vramGB: 24, tags: ['能力强'] }
    ]
  },
  cloud_api: {
    id: 'cloud_api',
    name: '云端 API',
    icon: '☁️',
    tagline: '零运维，即开即用',
    description: '阿里云百炼、火山引擎、SiliconFlow 等云端 API。无需硬件投入，按量付费，弹性扩展。',
    pros: ['零运维', '弹性扩展', '模型选择多', '快速上线'],
    cons: ['数据出站', '长期成本高', '网络依赖', '延迟不可控'],
    bestScenes: ['personal', 'dev'],
    minHardware: 'none',
    maxConcurrency: 100000,
    apiCompatible: true,
    opsCost: '按量付费',
    learnCurve: '低',
    models: []
  }
};

const HARDWARE_LEVELS = { none: 0, mac: 1, single: 2, multi: 3 };
const EXPERIENCE_LEVELS = { beginner: 0, intermediate: 1, advanced: 2 };
const LEARN_CURVE_LEVELS = { '低': 0, '中': 1, '中高': 2, '高': 3 };

const PRIORITY_SCORES = {
  simple:    { vllm: 40, ollama: 100, gpustack: 30, cloud_api: 80 },
  cost:      { vllm: 70, ollama: 90, gpustack: 60, cloud_api: 40 },
  performance: { vllm: 100, ollama: 20, gpustack: 70, cloud_api: 60 },
  privacy:   { vllm: 90, ollama: 100, gpustack: 80, cloud_api: 0 }
};

const PREFERENCE_SCORES = {
  local:  { local: 100, cloud: 0 },
  both:   { local: 80, cloud: 80 },
  cloud:  { local: 30, cloud: 100 }
};

const BUDGET_ADJUST = {
  tight:   { local: 10, cloud: -20 },
  medium:  { local: 0,  cloud: 0 },
  high:    { local: 0,  cloud: 10 }
};

// ── 状态 ───────────────────────────────────────

let state = {
  step: 1,
  purpose: '',
  priority: '',
  hardware: '',
  concurrency: 5,
  modelNeeds: [],
  experience: '',
  preference: '',
  budget: ''
};

// ── DOM 引用 ───────────────────────────────────

const stepper = document.getElementById('stepper');
const resultContainer = document.getElementById('resultContainer');
const resetBtn = document.getElementById('resetBtn');
const concurrencySlider = document.getElementById('concurrencySlider');
const concurrencyInput = document.getElementById('concurrencyInput');
const concurrencyLabelEl = document.getElementById('concurrencyLabel');

// ── 初始化 ─────────────────────────────────────

function init() {
  bindStepper();
  bindInputs();
  bindNavigation();
  updateStepper();
  validateCurrentStep();
}

// ── 事件绑定 ───────────────────────────────────

function bindStepper() {
  stepper.addEventListener('click', (e) => {
    const stepEl = e.target.closest('.stepper-step');
    if (!stepEl) return;
    const step = parseInt(stepEl.dataset.step, 10);
    // 只允许回到已完成的步骤
    if (step < state.step) {
      goToStep(step);
    }
  });
}

function bindInputs() {
  document.querySelectorAll('.option-grid').forEach(grid => {
    grid.addEventListener('change', () => {
      const name = grid.dataset.name;
      if (name === 'modelNeeds') {
        const checked = Array.from(grid.querySelectorAll('input:checked')).map(i => i.value);
        state.modelNeeds = checked;
        // "none" 互斥
        if (checked.includes('none') && checked.length > 1) {
          grid.querySelectorAll('input[value="none"]').forEach(i => i.checked = false);
          state.modelNeeds = Array.from(grid.querySelectorAll('input:checked')).map(i => i.value);
        } else if (!checked.includes('none') && checked.length === 0) {
          // 允许为空
        }
      } else {
        const input = grid.querySelector('input:checked');
        if (input) state[name] = input.value;
      }
      validateCurrentStep();
    });
  });

  if (concurrencySlider && concurrencyInput) {
    const updateConcurrency = (val) => {
      const v = Math.max(1, Math.min(10000, parseInt(val, 10) || 1));
      state.concurrency = v;
      concurrencySlider.value = v;
      concurrencyInput.value = v;
      updateConcurrencyLabel(v);
    };
    concurrencySlider.addEventListener('input', () => updateConcurrency(concurrencySlider.value));
    concurrencyInput.addEventListener('input', () => updateConcurrency(concurrencyInput.value));
    updateConcurrencyLabel(state.concurrency);
  }
}

function updateConcurrencyLabel(v) {
  if (!concurrencyLabelEl) return;
  let text = '个人使用';
  if (v >= 1000) text = '生产级';
  else if (v >= 100) text = '部门级';
  else if (v >= 10) text = '小团队';
  concurrencyLabelEl.textContent = text;
}

function bindNavigation() {
  document.querySelectorAll('.next-step').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.step < 4) goToStep(state.step + 1);
    });
  });
  document.querySelectorAll('.prev-step').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.step > 1) goToStep(state.step - 1);
    });
  });
  if (resetBtn) {
    resetBtn.addEventListener('click', reset);
  }
}

// ── 步骤导航 ───────────────────────────────────

function goToStep(step) {
  state.step = step;
  document.querySelectorAll('.step-content').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.step, 10) === step);
  });
  updateStepper();
  validateCurrentStep();
  if (step === 4) {
    renderResult();
  }
}

function updateStepper() {
  document.querySelectorAll('.stepper-step').forEach(el => {
    const s = parseInt(el.dataset.step, 10);
    el.classList.remove('active', 'completed');
    if (s === state.step) el.classList.add('active');
    else if (s < state.step) el.classList.add('completed');
  });
}

// ── 验证 ───────────────────────────────────────

function validateCurrentStep() {
  const nextBtn = document.querySelector(`.step-content[data-step="${state.step}"] .next-step`);
  if (!nextBtn) return;

  let valid = false;
  switch (state.step) {
    case 1:
      valid = !!(state.purpose && state.priority);
      break;
    case 2:
      valid = !!(state.hardware);
      // 并发和模型需求是可选的
      valid = valid && !!state.hardware;
      break;
    case 3:
      valid = !!(state.experience && state.preference && state.budget);
      break;
    case 4:
      valid = true;
      break;
  }
  nextBtn.disabled = !valid;

  // 标红未选的问题
  document.querySelectorAll(`.step-content[data-step="${state.step}"] .advisor-question`).forEach(q => {
    const name = q.querySelector('.option-grid')?.dataset.name;
    if (!name) return;
    let answered = false;
    if (name === 'modelNeeds') {
      answered = true; // 可选
    } else {
      answered = !!state[name];
    }
    q.classList.toggle('error', !answered && state.step !== 4);
  });
}

// ── 评分算法 ───────────────────────────────────

function calculateScores() {
  const scores = [];

  for (const [key, sol] of Object.entries(SOLUTIONS)) {
    let score = 0;

    // 1. 场景匹配 25%
    const sceneMatch = sol.bestScenes.includes(state.purpose) ? 100 : 0;
    score += sceneMatch * 0.25;

    // 2. 硬件满足 20%
    const hwUser = HARDWARE_LEVELS[state.hardware] || 0;
    const hwMin = HARDWARE_LEVELS[sol.minHardware] || 0;
    let hwScore = 0;
    if (hwUser >= hwMin) hwScore = 100;
    else {
      const diff = hwMin - hwUser;
      if (diff === 1) hwScore = 50;
      else if (diff === 2) hwScore = 20;
      else hwScore = 0;
    }
    score += hwScore * 0.20;

    // 3. 并发满足 15%
    const conScore = state.concurrency <= sol.maxConcurrency ? 100 : Math.max(0, 100 - Math.log10(state.concurrency / sol.maxConcurrency) * 50);
    score += conScore * 0.15;

    // 4. 经验匹配 15%
    const expUser = EXPERIENCE_LEVELS[state.experience] || 0;
    const expNeed = LEARN_CURVE_LEVELS[sol.learnCurve] || 0;
    const expScore = Math.max(0, 100 - Math.abs(expUser - expNeed) * 33);
    score += expScore * 0.15;

    // 5. 优先级匹配 15%
    const prioScore = PRIORITY_SCORES[state.priority]?.[key] || 50;
    score += prioScore * 0.15;

    // 6. 部署偏好 10%
    const isCloud = key === 'cloud_api';
    const pref = PREFERENCE_SCORES[state.preference] || { local: 80, cloud: 80 };
    const prefScore = isCloud ? pref.cloud : pref.local;
    score += prefScore * 0.10;

    // 预算调整
    const isLocal = !isCloud;
    const adjust = BUDGET_ADJUST[state.budget] || { local: 0, cloud: 0 };
    score += isLocal ? adjust.local : adjust.cloud;

    // 模型需求过滤扣分
    if (state.modelNeeds.length > 0 && !state.modelNeeds.includes('none')) {
      const hasMatch = sol.models.some(m => state.modelNeeds.some(n => m.tags.includes(
        n === 'chinese' ? '中文强' : n === 'code' ? '代码好' : n === 'multimodal' ? '多模态' : n === 'tools' ? '工具调用' : n
      )));
      if (!hasMatch && sol.models.length > 0) score -= 10;
    }

    scores.push({ id: key, ...sol, score: Math.round(Math.max(0, Math.min(100, score))) });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores;
}

// ── 结果渲染 ───────────────────────────────────

function renderResult() {
  const scores = calculateScores();
  const best = scores[0];
  const alternatives = scores.slice(1, 3);

  let html = '';

  // 警告区
  if (best.score < 40) {
    html += `<div class="advisor-alert advisor-alert-warning">
      <strong>⚠️ 当前条件限制较多</strong>
      <p>建议调整硬件配置或降低并发期望，以获得更合适的部署方案。</p>
    </div>`;
  }
  if (state.hardware === 'none' && state.purpose === 'prod') {
    html += `<div class="advisor-alert advisor-alert-info">
      <strong>💡 提示</strong>
      <p>没有 GPU 但选择了生产级部署，云端 API 是最合适的选择。</p>
    </div>`;
  }
  if (state.hardware === 'mac' && state.purpose === 'prod') {
    html += `<div class="advisor-alert advisor-alert-warning">
      <strong>⚠️ 硬件警告</strong>
      <p>当前硬件无法支撑生产级并发，建议升级 GPU 后再考虑生产部署。</p>
    </div>`;
  }

  // 区域 1: 最佳推荐卡片
  const matchReasons = [];
  if (best.bestScenes.includes(state.purpose)) matchReasons.push('场景匹配');
  if ((HARDWARE_LEVELS[state.hardware] || 0) >= (HARDWARE_LEVELS[best.minHardware] || 0)) matchReasons.push('硬件满足');
  if (state.priority === 'performance' && best.id === 'vllm') matchReasons.push('性能优先');
  if (state.priority === 'simple' && best.id === 'ollama') matchReasons.push('简单优先');
  if (state.priority === 'privacy' && best.id !== 'cloud_api') matchReasons.push('隐私优先');

  html += `
    <div class="advisor-result-layout">
      <div class="advisor-best-card">
        <div class="best-card-header">
          <div class="best-card-icon">${best.icon}</div>
          <div class="best-card-title">
            <h2>${best.name}</h2>
            <p>${best.tagline}</p>
          </div>
          <div class="best-card-score">
            <span class="score-label">最匹配</span>
            <span class="score-value">${best.score}%</span>
          </div>
        </div>
        <div class="best-card-reasons">
          ${matchReasons.map(r => `<span class="reason-pill">✓ ${r}</span>`).join('')}
        </div>
        <div class="best-card-pros-cons">
          <div class="pros">
            <h4>优势</h4>
            <ul>${best.pros.map(p => `<li>✅ ${p}</li>`).join('')}</ul>
          </div>
          <div class="cons">
            <h4>劣势</h4>
            <ul>${best.cons.map(c => `<li>❌ ${c}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="best-card-meta">
          <div class="meta-item">
            <span>预估显存</span>
            <strong>${best.models.length > 0 ? `单卡 ${best.models[0].vramGB}-${best.models[best.models.length - 1].vramGB}GB` : '无需显存'}</strong>
          </div>
          <div class="meta-item">
            <span>运维成本</span>
            <strong>${best.opsCost}</strong>
          </div>
        </div>
      </div>

      <div class="advisor-comparison">
        <h3>备选方案对比</h3>
        <div class="comparison-table-wrap">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>维度</th>
                <th class="col-best">${best.icon} ${best.name}</th>
                ${alternatives.map(alt => `<th>${alt.icon} ${alt.name}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr><td>推荐指数</td><td class="col-best"><strong>${best.score}%</strong></td>${alternatives.map(a => `<td>${a.score}%</td>`).join('')}</tr>
              <tr><td>适用场景</td><td class="col-best">${best.bestScenes.map(s => sceneLabel(s)).join(', ')}</td>${alternatives.map(a => `<td>${a.bestScenes.map(s => sceneLabel(s)).join(', ')}</td>`).join('')}</tr>
              <tr><td>硬件要求</td><td class="col-best">${hwLabel(best.minHardware)}</td>${alternatives.map(a => `<td>${hwLabel(a.minHardware)}</td>`).join('')}</tr>
              <tr><td>学习成本</td><td class="col-best">${best.learnCurve}</td>${alternatives.map(a => `<td>${a.learnCurve}</td>`).join('')}</tr>
              <tr><td>并发能力</td><td class="col-best">${concurrencyLabel(best.maxConcurrency)}</td>${alternatives.map(a => `<td>${concurrencyLabel(a.maxConcurrency)}</td>`).join('')}</tr>
              <tr><td>API 兼容</td><td class="col-best">${best.apiCompatible ? 'OpenAI' : '无'}</td>${alternatives.map(a => `<td>${a.apiCompatible ? 'OpenAI' : '无'}</td>`).join('')}</tr>
              <tr><td>运维成本</td><td class="col-best">${best.opsCost}</td>${alternatives.map(a => `<td>${a.opsCost}</td>`).join('')}</tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // 区域 3: 推荐模型列表
  if (best.models.length > 0) {
    const filteredModels = filterModels(best.models, state.modelNeeds);
    html += `
      <div class="advisor-models">
        <h3>推荐模型</h3>
        <div class="model-grid">
          ${filteredModels.map(m => `
            <div class="model-card">
              <div class="model-header">
                <strong>${m.name}</strong>
                <span class="model-params">${m.params} ${m.quant}</span>
              </div>
              <div class="model-vram">显存需求: ~${m.vramGB}GB</div>
              <div class="model-tags">${m.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</div>
              ${best.id === 'vllm' ? `<a href="vllm-generator.html?model=${encodeURIComponent(m.name)}" class="btn btn-primary btn-sm">生成启动命令</a>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 区域 4: 下一步行动建议
  html += `
    <div class="advisor-next-steps">
      <h3>下一步行动建议</h3>
      <ol>
        <li><span class="step-icon">🔍</span> 用<strong>显存估算器</strong>确认你的硬件是否满足模型需求</li>
        <li><span class="step-icon">⚡</span> 用<strong>vLLM 命令生成器</strong>一键生成启动命令</li>
        <li><span class="step-icon">📚</span> 部署中遇到报错？查看<strong>部署错误知识库</strong></li>
      </ol>
      <div class="next-step-actions">
        <a href="index.html#memory-calculator" class="btn btn-secondary">打开显存估算器</a>
        ${best.id === 'vllm' ? `<a href="vllm-generator.html" class="btn btn-primary">打开 vLLM 命令生成器</a>` : ''}
        <a href="deployment-errors.html" class="btn btn-secondary">查看部署错误知识库</a>
      </div>
    </div>
  `;

  resultContainer.innerHTML = html;
}

// ── 辅助函数 ───────────────────────────────────

function sceneLabel(v) {
  const map = { personal: '个人试用', dev: '开发调试', team: '团队 API', prod: '生产服务' };
  return map[v] || v;
}

function hwLabel(v) {
  const map = { none: '无 GPU', mac: 'Mac/集成显卡', single: '单卡 GPU', multi: '多卡/服务器' };
  return map[v] || v;
}

function concurrencyLabel(v) {
  if (v >= 10000) return '高';
  if (v >= 1000) return '中高';
  if (v >= 100) return '中';
  if (v >= 10) return '低';
  return '极低';
}

function filterModels(models, needs) {
  if (!needs || needs.length === 0 || needs.includes('none')) return models.slice(0, 3);
  const tagMap = { chinese: '中文强', code: '代码好', multimodal: '多模态', tools: '工具调用' };
  const needTags = needs.map(n => tagMap[n] || n).filter(Boolean);
  const scored = models.map(m => {
    const matchCount = m.tags.filter(t => needTags.includes(t)).length;
    return { ...m, matchCount };
  });
  scored.sort((a, b) => b.matchCount - a.matchCount);
  return scored.slice(0, 3);
}

function reset() {
  state = {
    step: 1,
    purpose: '',
    priority: '',
    hardware: '',
    concurrency: 5,
    modelNeeds: [],
    experience: '',
    preference: '',
    budget: ''
  };
  document.querySelectorAll('.option-grid input').forEach(i => { i.checked = false; });
  if (concurrencySlider) concurrencySlider.value = 5;
  if (concurrencyInput) concurrencyInput.value = 5;
  updateConcurrencyLabel(5);
  goToStep(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── 启动 ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
