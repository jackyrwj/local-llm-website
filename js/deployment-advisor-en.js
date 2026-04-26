/* Deployment Advisor — deployment-advisor-en.js */

// ── Data Definitions ───────────────────────────

const SOLUTIONS = {
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    icon: '🦙',
    tagline: 'The easiest way to run LLMs locally',
    description: 'Install with one command, switch models with one click. Great for personal experimentation and quick prototyping, but does not support high concurrency or a standardized API.',
    pros: ['Extremely easy install', 'Rich model library', 'Cross-platform support'],
    cons: ['No standard API', 'Weak concurrency', 'Not for production'],
    bestScenes: ['personal', 'dev'],
    minHardware: 'mac',
    maxConcurrency: 1,
    apiCompatible: false,
    opsCost: 'Very Low',
    learnCurve: 'Low',
    models: [
      { id: 'qwen3-7b', name: 'Qwen3-7B-Instruct', params: '7B', quant: 'Q4_K_M', vramGB: 6, tags: ['Strong Chinese', 'Good at code'] },
      { id: 'llama3-8b', name: 'Llama-3.1-8B-Instruct', params: '8B', quant: 'Q4_K_M', vramGB: 6, tags: ['Strong English', 'Great ecosystem'] }
    ]
  },
  vllm: {
    id: 'vllm',
    name: 'vLLM',
    icon: '⚡',
    tagline: 'Production-grade high-throughput model serving',
    description: 'OpenAI-compatible API, PagedAttention for efficient VRAM management, continuous batching. Best for scenarios requiring API services.',
    pros: ['High throughput', 'OpenAI API compatible', 'Multi-GPU parallel', 'Production-grade'],
    cons: ['Requires NVIDIA GPU', 'Complex configuration', 'High learning curve'],
    bestScenes: ['dev', 'team', 'prod'],
    minHardware: 'single',
    maxConcurrency: 10000,
    apiCompatible: true,
    opsCost: 'Medium',
    learnCurve: 'Medium-High',
    models: [
      { id: 'qwen3-7b-fp16', name: 'Qwen3-7B-Instruct', params: '7B', quant: 'FP16', vramGB: 16, tags: ['Strong Chinese', 'Good at code'] },
      { id: 'qwen3-32b-awq', name: 'Qwen3-32B-Instruct', params: '32B', quant: 'AWQ-4bit', vramGB: 24, tags: ['High capability', 'Strong Chinese'] },
      { id: 'deepseek-r1-32b', name: 'DeepSeek-R1-Distill-Qwen-32B', params: '32B', quant: 'AWQ-4bit', vramGB: 24, tags: ['Strong reasoning', 'Strong Chinese'] }
    ]
  },
  gpustack: {
    id: 'gpustack',
    name: 'GPUStack',
    icon: '🖥️',
    tagline: 'Team-level GPU resource and model management platform',
    description: 'Unified management of GPUs, models, and service instances, supporting multi-user and multi-model scheduling. Suitable for teams with operations experience.',
    pros: ['Team unified management', 'Multi-model scheduling', 'Resource allocation'],
    cons: ['Higher learning curve', 'Requires operations investment', 'Newer community'],
    bestScenes: ['team', 'prod'],
    minHardware: 'single',
    maxConcurrency: 1000,
    apiCompatible: true,
    opsCost: 'Medium',
    learnCurve: 'Medium-High',
    models: [
      { id: 'qwen3-7b-fp16', name: 'Qwen3-7B-Instruct', params: '7B', quant: 'FP16', vramGB: 16, tags: ['Strong Chinese'] },
      { id: 'qwen3-32b-awq', name: 'Qwen3-32B-Instruct', params: '32B', quant: 'AWQ-4bit', vramGB: 24, tags: ['High capability'] }
    ]
  },
  cloud_api: {
    id: 'cloud_api',
    name: 'Cloud API',
    icon: '☁️',
    tagline: 'Zero operations, ready to use',
    description: 'Cloud APIs such as OpenAI, Anthropic, Together AI, Groq, or any OpenAI-compatible provider. No hardware investment needed, pay-as-you-go, elastic scaling.',
    pros: ['Zero operations', 'Elastic scaling', 'Wide model selection', 'Fast to launch'],
    cons: ['Data leaves premises', 'High long-term cost', 'Network dependent', 'Latency unpredictable'],
    bestScenes: ['personal', 'dev'],
    minHardware: 'none',
    maxConcurrency: 100000,
    apiCompatible: true,
    opsCost: 'Pay-as-you-go',
    learnCurve: 'Low',
    models: []
  }
};

const HARDWARE_LEVELS = { none: 0, mac: 1, single: 2, multi: 3 };
const EXPERIENCE_LEVELS = { beginner: 0, intermediate: 1, advanced: 2 };
const LEARN_CURVE_LEVELS = { 'Low': 0, 'Medium': 1, 'Medium-High': 2, 'High': 3 };

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

// ── State ──────────────────────────────────────

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

// ── DOM References ─────────────────────────────

const stepper = document.getElementById('stepper');
const resultContainer = document.getElementById('resultContainer');
const resetBtn = document.getElementById('resetBtn');
const concurrencySlider = document.getElementById('concurrencySlider');
const concurrencyInput = document.getElementById('concurrencyInput');
const concurrencyLabelEl = document.getElementById('concurrencyLabel');

// ── Initialization ─────────────────────────────

function init() {
  bindStepper();
  bindInputs();
  bindNavigation();
  updateStepper();
  validateCurrentStep();
}

// ── Event Binding ──────────────────────────────

function bindStepper() {
  stepper.addEventListener('click', (e) => {
    const stepEl = e.target.closest('.stepper-step');
    if (!stepEl) return;
    const step = parseInt(stepEl.dataset.step, 10);
    // Only allow going back to completed steps
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
        // "none" is mutually exclusive
        if (checked.includes('none') && checked.length > 1) {
          grid.querySelectorAll('input[value="none"]').forEach(i => i.checked = false);
          state.modelNeeds = Array.from(grid.querySelectorAll('input:checked')).map(i => i.value);
        } else if (!checked.includes('none') && checked.length === 0) {
          // Allow empty
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
  let text = 'Personal Use';
  if (v >= 1000) text = 'Production';
  else if (v >= 100) text = 'Department';
  else if (v >= 10) text = 'Small Team';
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

// ── Step Navigation ────────────────────────────

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

// ── Validation ─────────────────────────────────

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
      // Concurrency and model needs are optional
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

  // Highlight unanswered questions
  document.querySelectorAll(`.step-content[data-step="${state.step}"] .advisor-question`).forEach(q => {
    const name = q.querySelector('.option-grid')?.dataset.name;
    if (!name) return;
    let answered = false;
    if (name === 'modelNeeds') {
      answered = true; // optional
    } else {
      answered = !!state[name];
    }
    q.classList.toggle('error', !answered && state.step !== 4);
  });
}

// ── Scoring Algorithm ──────────────────────────

function calculateScores() {
  const scores = [];

  for (const [key, sol] of Object.entries(SOLUTIONS)) {
    let score = 0;

    // 1. Scene match 25%
    const sceneMatch = sol.bestScenes.includes(state.purpose) ? 100 : 0;
    score += sceneMatch * 0.25;

    // 2. Hardware match 20%
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

    // 3. Concurrency match 15%
    const conScore = state.concurrency <= sol.maxConcurrency ? 100 : Math.max(0, 100 - Math.log10(state.concurrency / sol.maxConcurrency) * 50);
    score += conScore * 0.15;

    // 4. Experience match 15%
    const expUser = EXPERIENCE_LEVELS[state.experience] || 0;
    const expNeed = LEARN_CURVE_LEVELS[sol.learnCurve] || 0;
    const expScore = Math.max(0, 100 - Math.abs(expUser - expNeed) * 33);
    score += expScore * 0.15;

    // 5. Priority match 15%
    const prioScore = PRIORITY_SCORES[state.priority]?.[key] || 50;
    score += prioScore * 0.15;

    // 6. Deployment preference 10%
    const isCloud = key === 'cloud_api';
    const pref = PREFERENCE_SCORES[state.preference] || { local: 80, cloud: 80 };
    const prefScore = isCloud ? pref.cloud : pref.local;
    score += prefScore * 0.10;

    // Budget adjustment
    const isLocal = !isCloud;
    const adjust = BUDGET_ADJUST[state.budget] || { local: 0, cloud: 0 };
    score += isLocal ? adjust.local : adjust.cloud;

    // Model needs filter penalty
    if (state.modelNeeds.length > 0 && !state.modelNeeds.includes('none')) {
      const hasMatch = sol.models.some(m => state.modelNeeds.some(n => m.tags.includes(
        n === 'chinese' ? 'Strong Chinese' : n === 'code' ? 'Good at code' : n === 'multimodal' ? 'Multimodal' : n === 'tools' ? 'Tool calling' : n
      )));
      if (!hasMatch && sol.models.length > 0) score -= 10;
    }

    scores.push({ id: key, ...sol, score: Math.round(Math.max(0, Math.min(100, score))) });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores;
}

// ── Result Rendering ───────────────────────────

function renderResult() {
  const scores = calculateScores();
  const best = scores[0];
  const alternatives = scores.slice(1, 3);

  let html = '';

  // Alert area
  if (best.score < 40) {
    html += `<div class="advisor-alert advisor-alert-warning">
      <strong>⚠️ Current conditions are quite limiting</strong>
      <p>Consider adjusting your hardware configuration or lowering concurrency expectations for a better deployment recommendation.</p>
    </div>`;
  }
  if (state.hardware === 'none' && state.purpose === 'prod') {
    html += `<div class="advisor-alert advisor-alert-info">
      <strong>💡 Tip</strong>
      <p>No GPU but need production-grade deployment? Cloud API is the most suitable choice.</p>
    </div>`;
  }
  if (state.hardware === 'mac' && state.purpose === 'prod') {
    html += `<div class="advisor-alert advisor-alert-warning">
      <strong>⚠️ Hardware Warning</strong>
      <p>Current hardware cannot support production-level concurrency. Consider upgrading your GPU before production deployment.</p>
    </div>`;
  }

  // Section 1: Best recommendation card
  const matchReasons = [];
  if (best.bestScenes.includes(state.purpose)) matchReasons.push('Scene Match');
  if ((HARDWARE_LEVELS[state.hardware] || 0) >= (HARDWARE_LEVELS[best.minHardware] || 0)) matchReasons.push('Hardware OK');
  if (state.priority === 'performance' && best.id === 'vllm') matchReasons.push('Performance First');
  if (state.priority === 'simple' && best.id === 'ollama') matchReasons.push('Simplicity First');
  if (state.priority === 'privacy' && best.id !== 'cloud_api') matchReasons.push('Privacy First');

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
            <span class="score-label">Best Match</span>
            <span class="score-value">${best.score}%</span>
          </div>
        </div>
        <div class="best-card-reasons">
          ${matchReasons.map(r => `<span class="reason-pill">✓ ${r}</span>`).join('')}
        </div>
        <div class="best-card-pros-cons">
          <div class="pros">
            <h4>Pros</h4>
            <ul>${best.pros.map(p => `<li>✅ ${p}</li>`).join('')}</ul>
          </div>
          <div class="cons">
            <h4>Cons</h4>
            <ul>${best.cons.map(c => `<li>❌ ${c}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="best-card-meta">
          <div class="meta-item">
            <span>Est. VRAM</span>
            <strong>${best.models.length > 0 ? `Single GPU ${best.models[0].vramGB}-${best.models[best.models.length - 1].vramGB}GB` : 'No VRAM needed'}</strong>
          </div>
          <div class="meta-item">
            <span>Ops Cost</span>
            <strong>${best.opsCost}</strong>
          </div>
        </div>
      </div>

      <div class="advisor-comparison">
        <h3>Alternative Comparison</h3>
        <div class="comparison-table-wrap">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Dimension</th>
                <th class="col-best">${best.icon} ${best.name}</th>
                ${alternatives.map(alt => `<th>${alt.icon} ${alt.name}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr><td>Match Score</td><td class="col-best"><strong>${best.score}%</strong></td>${alternatives.map(a => `<td>${a.score}%</td>`).join('')}</tr>
              <tr><td>Best For</td><td class="col-best">${best.bestScenes.map(s => sceneLabel(s)).join(', ')}</td>${alternatives.map(a => `<td>${a.bestScenes.map(s => sceneLabel(s)).join(', ')}</td>`).join('')}</tr>
              <tr><td>Hardware Req.</td><td class="col-best">${hwLabel(best.minHardware)}</td>${alternatives.map(a => `<td>${hwLabel(a.minHardware)}</td>`).join('')}</tr>
              <tr><td>Learning Curve</td><td class="col-best">${best.learnCurve}</td>${alternatives.map(a => `<td>${a.learnCurve}</td>`).join('')}</tr>
              <tr><td>Concurrency</td><td class="col-best">${concurrencyLabel(best.maxConcurrency)}</td>${alternatives.map(a => `<td>${concurrencyLabel(a.maxConcurrency)}</td>`).join('')}</tr>
              <tr><td>API Compatible</td><td class="col-best">${best.apiCompatible ? 'OpenAI' : 'None'}</td>${alternatives.map(a => `<td>${a.apiCompatible ? 'OpenAI' : 'None'}</td>`).join('')}</tr>
              <tr><td>Ops Cost</td><td class="col-best">${best.opsCost}</td>${alternatives.map(a => `<td>${a.opsCost}</td>`).join('')}</tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Section 3: Recommended models
  if (best.models.length > 0) {
    const filteredModels = filterModels(best.models, state.modelNeeds);
    html += `
      <div class="advisor-models">
        <h3>Recommended Models</h3>
        <div class="model-grid">
          ${filteredModels.map(m => `
            <div class="model-card">
              <div class="model-header">
                <strong>${m.name}</strong>
                <span class="model-params">${m.params} ${m.quant}</span>
              </div>
              <div class="model-vram">VRAM required: ~${m.vramGB}GB</div>
              <div class="model-tags">${m.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</div>
              ${best.id === 'vllm' ? `<a href="/tools/vllm-generator.html?model=${encodeURIComponent(m.name)}" class="btn btn-primary btn-sm">Generate Startup Command</a>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Section 4: Next steps
  html += `
    <div class="advisor-next-steps">
      <h3>Next Steps</h3>
      <ol>
        <li><span class="step-icon">🔍</span> Use the <strong>VRAM Estimator</strong> to confirm your hardware meets model requirements</li>
        <li><span class="step-icon">⚡</span> Use the <strong>vLLM Command Generator</strong> to generate startup commands in one click</li>
        <li><span class="step-icon">📚</span> Running into errors? Check <strong>Common Errors: Causes &amp; Fixes</strong></li>
      </ol>
      <div class="next-step-actions">
        <a href="/tools/memory-calculator.html" class="btn btn-secondary">Open VRAM Estimator</a>
        ${best.id === 'vllm' ? `<a href="/tools/vllm-generator.html" class="btn btn-primary">Open vLLM Command Generator</a>` : ''}
        <a href="/tools/deployment-errors.html" class="btn btn-secondary">View Deployment Error KB</a>
      </div>
    </div>
  `;

  resultContainer.innerHTML = html;
}

// ── Helpers ────────────────────────────────────

function sceneLabel(v) {
  const map = { personal: 'Personal', dev: 'Development', team: 'Team API', prod: 'Production' };
  return map[v] || v;
}

function hwLabel(v) {
  const map = { none: 'No GPU', mac: 'Mac/Integrated', single: 'Single GPU', multi: 'Multi-GPU/Server' };
  return map[v] || v;
}

function concurrencyLabel(v) {
  if (v >= 10000) return 'High';
  if (v >= 1000) return 'Med-High';
  if (v >= 100) return 'Medium';
  if (v >= 10) return 'Low';
  return 'Very Low';
}

function filterModels(models, needs) {
  if (!needs || needs.length === 0 || needs.includes('none')) return models.slice(0, 3);
  const tagMap = { chinese: 'Strong Chinese', code: 'Good at code', multimodal: 'Multimodal', tools: 'Tool calling' };
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

// ── Startup ────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
