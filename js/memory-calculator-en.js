/* VRAM Estimator — memory-calculator.js */

// ── Data Definitions ───────────────────────────────────

const MODEL_PRESETS = [
  { id: 'qwen3-1.5b', name: 'Qwen3-1.5B-Instruct', params: 1.5, hiddenSize: 1536, layers: 28, heads: 12, kvHeads: 4, maxContext: 32768, quantizations: ['none', 'awq', 'gptq'] },
  { id: 'qwen3-7b', name: 'Qwen3-7B-Instruct', params: 7.6, hiddenSize: 3584, layers: 28, heads: 28, kvHeads: 4, maxContext: 131072, quantizations: ['none', 'awq', 'gptq'] },
  { id: 'qwen3-14b', name: 'Qwen3-14B-Instruct', params: 14.2, hiddenSize: 5120, layers: 40, heads: 40, kvHeads: 8, maxContext: 131072, quantizations: ['none', 'awq', 'gptq'] },
  { id: 'qwen3-32b', name: 'Qwen3-32B-Instruct', params: 32.8, hiddenSize: 5120, layers: 64, heads: 40, kvHeads: 8, maxContext: 131072, quantizations: ['none', 'awq', 'gptq'] },
  { id: 'qwen3-coder-7b', name: 'Qwen3-Coder-7B', params: 7.6, hiddenSize: 3584, layers: 28, heads: 28, kvHeads: 4, maxContext: 131072, quantizations: ['none', 'awq', 'gptq'] },
  { id: 'deepseek-v3', name: 'DeepSeek-V3', params: 671, hiddenSize: 7168, layers: 61, heads: 128, kvHeads: 128, maxContext: 65536, quantizations: ['none', 'fp8'] },
  { id: 'deepseek-r1-32b', name: 'DeepSeek-R1-Distill-Qwen-32B', params: 32.8, hiddenSize: 5120, layers: 64, heads: 40, kvHeads: 8, maxContext: 131072, quantizations: ['none', 'awq', 'gptq'] },
  { id: 'deepseek-r1-14b', name: 'DeepSeek-R1-Distill-Qwen-14B', params: 14.2, hiddenSize: 5120, layers: 48, heads: 40, kvHeads: 8, maxContext: 131072, quantizations: ['none', 'awq', 'gptq'] },
  { id: 'deepseek-r1-7b', name: 'DeepSeek-R1-Distill-Qwen-7B', params: 7.6, hiddenSize: 3584, layers: 28, heads: 28, kvHeads: 4, maxContext: 131072, quantizations: ['none', 'awq', 'gptq'] },
  { id: 'deepseek-r1-1.5b', name: 'DeepSeek-R1-Distill-Qwen-1.5B', params: 1.5, hiddenSize: 1536, layers: 28, heads: 12, kvHeads: 4, maxContext: 131072, quantizations: ['none', 'awq', 'gptq'] },
];

const GPU_PRESETS = [
  { id: 'rtx3060', name: 'RTX 3060 12GB', vram: 12, category: 'consumer' },
  { id: 'rtx3060ti', name: 'RTX 3060 Ti 8GB', vram: 8, category: 'consumer' },
  { id: 'rtx3090', name: 'RTX 3090 24GB', vram: 24, category: 'consumer' },
  { id: 'rtx4090', name: 'RTX 4090 24GB', vram: 24, category: 'consumer' },
  { id: 'rtx5080', name: 'RTX 5080 16GB', vram: 16, category: 'consumer' },
  { id: 'rtx5090', name: 'RTX 5090 32GB', vram: 32, category: 'consumer' },
  { id: 'a10', name: 'A10 24GB', vram: 24, category: 'datacenter' },
  { id: 'a100-40', name: 'A100 40GB', vram: 40, category: 'datacenter' },
  { id: 'a100-80', name: 'A100 80GB', vram: 80, category: 'datacenter' },
  { id: 'l40s', name: 'L40S 48GB', vram: 48, category: 'datacenter' },
  { id: 'h100', name: 'H100 80GB', vram: 80, category: 'datacenter' },
  { id: 'm3-pro', name: 'M3 Pro (36GB Unified Memory)', vram: 36, category: 'apple' },
  { id: 'm3-max', name: 'M3 Max (128GB Unified Memory)', vram: 128, category: 'apple' },
  { id: 'm4-max', name: 'M4 Max (128GB Unified Memory)', vram: 128, category: 'apple' },
];

const QUANT_OPTIONS = [
  { value: 'none', label: 'FP16 / BF16', bytes: 2.0 },
  { value: 'fp8', label: 'FP8', bytes: 1.0 },
  { value: 'int8', label: 'INT8', bytes: 1.0 },
  { value: 'awq', label: 'AWQ / GPTQ 4bit', bytes: 0.55 },
];

// ── State ───────────────────────────────────────

const state = {
  useCustom: false,
  modelId: 'qwen3-7b',
  quantization: 'none',
  customParams: 7.6,
  customHiddenSize: 3584,
  customLayers: 28,
  customHeads: 28,
  customKvHeads: 4,
  contextLen: 8192,
  concurrency: 4,
  utilization: 0.9,
  gpuId: 'rtx4090',
  gpuCount: 1,
};

// ── DOM References ───────────────────────────────────

const els = {};

function cacheEls() {
  const ids = [
    'modelPreset', 'customModelToggle', 'customModelToggleWrap', 'quantization',
    'customParamsGroup', 'customParams', 'customHiddenSize', 'customLayers',
    'customHeads', 'customKvHeads', 'customMaxContext',
    'contextLen', 'concurrency', 'utilization',
    'gpuPreset', 'gpuCount', 'gpuVram',
    'statusCard', 'statusBadge', 'totalVram', 'availableVram',
    'statusBarFill', 'usagePercent',
    'stackedBar', 'segWeight', 'segKv', 'segActivation', 'segOverhead',
    'legendWeight', 'legendKv', 'legendActivation', 'legendOverhead',
    'gpuAllocation', 'gpuCards',
    'suggestions', 'suggestionList',
  ];
  ids.forEach(id => { els[id] = document.getElementById(id); });
}

// ── Initialization ─────────────────────────────────────

function init() {
  cacheEls();
  populateSelects();
  bindEvents();
  calculate();
}

function populateSelects() {
  const modelSel = els.modelPreset;
  MODEL_PRESETS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (${m.params}B, ${m.hiddenSize}dim, ${m.layers} layers)`;
    modelSel.appendChild(opt);
  });
  modelSel.value = state.modelId;

  const gpuSel = els.gpuPreset;
  GPU_PRESETS.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    gpuSel.appendChild(opt);
  });
  gpuSel.value = state.gpuId;

  updateQuantOptions();
}

function updateQuantOptions() {
  const sel = els.quantization;
  const model = MODEL_PRESETS.find(m => m.id === state.modelId) || MODEL_PRESETS[1];
  const supported = model.quantizations;

  sel.innerHTML = '';
  QUANT_OPTIONS.forEach(q => {
    if (!supported.includes(q.value)) return;
    const opt = document.createElement('option');
    opt.value = q.value;
    opt.textContent = q.label;
    sel.appendChild(opt);
  });

  // Keep current selection if valid
  if (Array.from(sel.options).some(o => o.value === state.quantization)) {
    sel.value = state.quantization;
  } else {
    state.quantization = sel.value;
  }
}

// ── Event Binding ───────────────────────────────────

function bindEvents() {
  els.modelPreset.addEventListener('change', () => {
    state.modelId = els.modelPreset.value;
    const model = MODEL_PRESETS.find(m => m.id === state.modelId);
    if (model && !state.useCustom) {
      state.contextLen = Math.min(model.maxContext, 32768);
      els.contextLen.value = state.contextLen;
    }
    updateQuantOptions();
    calculate();
  });

  els.customModelToggle.addEventListener('change', () => {
    state.useCustom = els.customModelToggle.checked;
    els.customParamsGroup.style.display = state.useCustom ? 'block' : 'none';
    els.customModelToggleWrap.style.display = state.useCustom ? 'none' : 'block';
    calculate();
  });

  els.quantization.addEventListener('change', () => {
    state.quantization = els.quantization.value;
    calculate();
  });

  ['customParams', 'customHiddenSize', 'customLayers', 'customHeads', 'customKvHeads', 'customMaxContext',
   'contextLen', 'concurrency', 'utilization', 'gpuCount'].forEach(id => {
    if (els[id]) {
      els[id].addEventListener('input', () => {
        state[id] = parseFloat(els[id].value) || 0;
        calculate();
      });
    }
  });

  els.gpuPreset.addEventListener('change', () => {
    state.gpuId = els.gpuPreset.value;
    const gpu = GPU_PRESETS.find(g => g.id === state.gpuId);
    if (gpu) {
      els.gpuVram.value = gpu.vram;
    }
    calculate();
  });

  els.gpuVram.addEventListener('input', () => {
    // When user manually changes VRAM, deselect GPU preset
    const vram = parseFloat(els.gpuVram.value);
    const matched = GPU_PRESETS.find(g => g.vram === vram);
    if (matched) state.gpuId = matched.id;
    calculate();
  });
}

// ── VRAM Estimation Engine ───────────────────────────────

function getModel() {
  if (state.useCustom) {
    return {
      params: state.customParams || 7,
      hiddenSize: state.customHiddenSize || 4096,
      layers: state.customLayers || 32,
      heads: state.customHeads || 32,
      kvHeads: state.customKvHeads || 32,
    };
  }
  return MODEL_PRESETS.find(m => m.id === state.modelId) || MODEL_PRESETS[1];
}

function getGpu() {
  const vram = parseFloat(els.gpuVram.value) || 24;
  return GPU_PRESETS.find(g => g.vram === vram) || { name: `Custom ${vram}GB`, vram };
}

function getBytesPerParam(quant) {
  const map = { none: 2.0, fp8: 1.0, awq: 0.55, gptq: 0.55, int8: 1.0 };
  return map[quant] || 2.0;
}

function calculate() {
  const model = getModel();
  const gpu = getGpu();
  const gpuCount = state.gpuCount || 1;
  const seqLen = state.contextLen || 8192;
  const batchSize = state.concurrency || 4;
  const utilization = state.utilization || 0.9;
  const quant = state.quantization;

  const bytesPerParam = getBytesPerParam(quant);
  const weightGb = model.params * bytesPerParam;

  // KV Cache: layers * seqLen * batchSize * hiddenSize * 2 (K+V) * 2bytes / (kvHeads/heads GQA factor)
  const gqaFactor = model.heads / model.kvHeads;
  const kvCacheGb = model.layers * seqLen * batchSize * model.hiddenSize * 2 * 2 / (gqaFactor * 1024 ** 3);

  // Activation
  const activationGb = Math.max(1.5, model.hiddenSize * seqLen * batchSize * 4 / (1024 ** 3));

  // CUDA overhead
  const overheadGb = 1.5 * gpuCount;

  const totalGb = weightGb + kvCacheGb + activationGb + overheadGb;
  const availableGb = gpuCount * gpu.vram * utilization;
  const perCardGb = totalGb / gpuCount;
  const marginGb = availableGb - totalGb;
  const marginRatio = marginGb / availableGb;
  const usageRatio = totalGb / availableGb;

  let status = 'safe';
  if (marginRatio < 0) status = 'danger';
  else if (marginRatio < 0.1) status = 'warning';

  const result = {
    weightGb, kvCacheGb, activationGb, overheadGb,
    totalGb, availableGb, perCardGb, marginGb, marginRatio, usageRatio, status,
    gpuName: gpu.name, gpuCount,
    model, gpu, seqLen, batchSize, bytesPerParam,
  };

  renderResult(result);
  renderSuggestions(result);
}

// ── Result Rendering ───────────────────────────────────

function renderResult(r) {
  // Status card
  const statusLabels = { safe: '✅ Sufficient VRAM', warning: '⚠️ Margin Tight', danger: '❌ Insufficient VRAM' };
  const statusClasses = { safe: 'safe', warning: 'warning', danger: 'danger' };

  els.statusBadge.textContent = statusLabels[r.status];
  els.statusBadge.className = 'status-badge ' + statusClasses[r.status];
  els.statusCard.className = 'memory-status-card ' + statusClasses[r.status];

  els.totalVram.textContent = r.totalGb.toFixed(1);
  els.availableVram.textContent = r.availableGb.toFixed(1);

  const barPercent = Math.min(100, Math.max(0, r.usageRatio * 100));
  els.statusBarFill.style.width = barPercent + '%';
  els.statusBarFill.className = 'status-bar-fill ' + statusClasses[r.status];
  els.usagePercent.textContent = barPercent.toFixed(0) + '%';

  // Stacked bar chart (using availableGb as 100% baseline)
  const maxScale = Math.max(r.totalGb, r.availableGb);
  const wPct = (r.weightGb / maxScale) * 100;
  const kPct = (r.kvCacheGb / maxScale) * 100;
  const aPct = (r.activationGb / maxScale) * 100;
  const oPct = (r.overheadGb / maxScale) * 100;

  setSeg(els.segWeight, wPct, r.weightGb, 'Weights');
  setSeg(els.segKv, kPct, r.kvCacheGb, 'KV');
  setSeg(els.segActivation, aPct, r.activationGb, 'Activation');
  setSeg(els.segOverhead, oPct, r.overheadGb, 'Overhead');

  els.legendWeight.textContent = r.weightGb.toFixed(1) + ' GB';
  els.legendKv.textContent = r.kvCacheGb.toFixed(1) + ' GB';
  els.legendActivation.textContent = r.activationGb.toFixed(1) + ' GB';
  els.legendOverhead.textContent = r.overheadGb.toFixed(1) + ' GB';

  // Multi-GPU allocation
  if (r.gpuCount > 1) {
    els.gpuAllocation.style.display = 'block';
    let html = '';
    for (let i = 0; i < r.gpuCount; i++) {
      const pct = Math.min(100, (r.perCardGb / (r.gpu.vram * r.utilization)) * 100);
      let cardClass = 'gpu-card';
      if (pct > 100) cardClass += ' danger';
      else if (pct > 85) cardClass += ' warning';

      html += `
        <div class="${cardClass}">
          <div class="gpu-card-header">GPU ${i + 1}</div>
          <div class="gpu-card-vram">${r.perCardGb.toFixed(1)} GB</div>
          <div class="gpu-card-bar"><div class="gpu-card-fill" style="width:${Math.min(100, pct)}%"></div></div>
          <div class="gpu-card-pct">${pct.toFixed(0)}%</div>
        </div>
      `;
    }
    els.gpuCards.innerHTML = html;
  } else {
    els.gpuAllocation.style.display = 'none';
  }
}

function setSeg(el, pct, val, label) {
  el.style.width = pct + '%';
  const showLabel = pct > 8;
  el.querySelector('.seg-label').textContent = showLabel ? `${label} ${val.toFixed(1)}` : '';
}

// ── Optimization Suggestions ───────────────────────────────────

function renderSuggestions(r) {
  const list = [];

  if (r.status === 'safe') {
    if (r.marginRatio > 0.3) {
      list.push('VRAM margin is sufficient. Consider increasing context length or concurrency to improve throughput.');
    }
    if (r.kvCacheGb > r.weightGb * 1.5) {
      list.push('KV Cache is taking a large share. If you do not need long context, consider lowering it to save VRAM.');
    }
  }

  if (r.status === 'danger' || r.status === 'warning') {
    // Reverse-calculate context length
    const availableForKv = r.availableGb - r.weightGb - r.activationGb - r.overheadGb;
    if (availableForKv > 0) {
      const maxCtx = Math.floor(availableForKv * (1024 ** 3) * r.model.kvHeads / (r.model.layers * r.batchSize * r.model.hiddenSize * 2 * 2 * r.model.heads));
      if (maxCtx >= 512 && maxCtx < r.seqLen) {
        list.push(`Reduce context length to ${maxCtx.toLocaleString()} to fit within current configuration.`);
      }
    }

    // Reverse-calculate quantization
    const quants = [
      { value: 'fp8', label: 'FP8', bytes: 1.0 },
      { value: 'int8', label: 'INT8', bytes: 1.0 },
      { value: 'awq', label: 'AWQ/GPTQ 4bit', bytes: 0.55 },
    ];
    const model = getModel();
    const supported = model.quantizations || ['none', 'awq', 'gptq'];
    for (const q of quants) {
      if (!supported.includes(q.value)) continue;
      if (q.bytes >= r.bytesPerParam) continue;
      const newWeight = model.params * q.bytes;
      const newTotal = newWeight + r.kvCacheGb + r.activationGb + r.overheadGb;
      if (newTotal < r.availableGb) {
        const saved = r.weightGb - newWeight;
        list.push(`Switch to ${q.label} quantization to save ${saved.toFixed(1)} GB VRAM.`);
        break; // Only suggest the first feasible option
      }
    }

    // Reverse-calculate concurrency
    const availableForKv2 = r.availableGb - r.weightGb - r.activationGb - r.overheadGb;
    if (availableForKv2 > 0) {
      const gqaFactor = r.model.heads / r.model.kvHeads;
      const maxConcurrency = Math.floor(availableForKv2 * (1024 ** 3) * gqaFactor / (r.model.layers * r.seqLen * r.model.hiddenSize * 2 * 2));
      if (maxConcurrency >= 1 && maxConcurrency < r.batchSize) {
        list.push(`Reduce concurrent requests to ${maxConcurrency} to fit within current configuration.`);
      }
    }

    // Reverse-calculate GPU
    const neededPerCard = r.totalGb / r.gpuCount;
    const minVram = Math.ceil(neededPerCard / r.utilization);
    const betterGpu = GPU_PRESETS.filter(g => g.vram >= minVram).sort((a, b) => a.vram - b.vram)[0];
    if (betterGpu && betterGpu.vram > r.gpu.vram) {
      list.push(`You need a GPU with at least ${betterGpu.vram}GB VRAM (e.g., ${betterGpu.name}).`);
    } else if (!betterGpu) {
      list.push(`Current single-GPU configuration is insufficient. Consider adding more GPUs or using multi-GPU parallelism.`);
    }
  }

  if (list.length === 0) {
    els.suggestions.style.display = 'none';
  } else {
    els.suggestions.style.display = 'block';
    els.suggestionList.innerHTML = list.map(s => `<li><span class="suggestion-icon">💡</span>${s}</li>`).join('');
  }
}

// ── Startup ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
