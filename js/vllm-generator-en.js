/* vllm-generator.js — vLLM Command Generator */

const MODEL_PRESETS = [
  {
    id: 'qwen3-1.5b',
    name: 'Qwen3-1.5B-Instruct',
    hfId: 'Qwen/Qwen3-1.5B-Instruct',
    params: 1.5,
    hiddenSize: 1536,
    layers: 28,
    heads: 12,
    kvHeads: 4,
    maxContext: 32768,
    quantizations: ['none', 'awq', 'gptq'],
    tags: ['qwen', 'instruct'],
  },
  {
    id: 'qwen3-7b',
    name: 'Qwen3-7B-Instruct',
    hfId: 'Qwen/Qwen3-7B-Instruct',
    params: 7.6,
    hiddenSize: 3584,
    layers: 28,
    heads: 28,
    kvHeads: 4,
    maxContext: 131072,
    quantizations: ['none', 'awq', 'gptq'],
    tags: ['qwen', 'instruct'],
  },
  {
    id: 'qwen3-14b',
    name: 'Qwen3-14B-Instruct',
    hfId: 'Qwen/Qwen3-14B-Instruct',
    params: 14.2,
    hiddenSize: 5120,
    layers: 40,
    heads: 40,
    kvHeads: 8,
    maxContext: 131072,
    quantizations: ['none', 'awq', 'gptq'],
    tags: ['qwen', 'instruct'],
  },
  {
    id: 'qwen3-32b',
    name: 'Qwen3-32B-Instruct',
    hfId: 'Qwen/Qwen3-32B-Instruct',
    params: 32.8,
    hiddenSize: 5120,
    layers: 64,
    heads: 40,
    kvHeads: 8,
    maxContext: 131072,
    quantizations: ['none', 'awq', 'gptq'],
    tags: ['qwen', 'instruct'],
  },
  {
    id: 'qwen3-coder-7b',
    name: 'Qwen3-Coder-7B',
    hfId: 'Qwen/Qwen3-Coder-7B',
    params: 7.6,
    hiddenSize: 3584,
    layers: 28,
    heads: 28,
    kvHeads: 4,
    maxContext: 131072,
    quantizations: ['none', 'awq', 'gptq'],
    tags: ['qwen', 'coder'],
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek-V3',
    hfId: 'deepseek-ai/DeepSeek-V3',
    params: 671,
    hiddenSize: 7168,
    layers: 61,
    heads: 128,
    kvHeads: 128,
    maxContext: 65536,
    quantizations: ['none', 'fp8'],
    tags: ['deepseek', 'moe'],
    notes: 'MoE model, requires multiple GPUs',
  },
  {
    id: 'deepseek-r1-32b',
    name: 'DeepSeek-R1-Distill-Qwen-32B',
    hfId: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
    params: 32.8,
    hiddenSize: 5120,
    layers: 64,
    heads: 40,
    kvHeads: 8,
    maxContext: 131072,
    quantizations: ['none', 'awq', 'gptq'],
    tags: ['deepseek', 'reasoning'],
  },
  {
    id: 'deepseek-r1-14b',
    name: 'DeepSeek-R1-Distill-Qwen-14B',
    hfId: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B',
    params: 14.2,
    hiddenSize: 5120,
    layers: 48,
    heads: 40,
    kvHeads: 8,
    maxContext: 131072,
    quantizations: ['none', 'awq', 'gptq'],
    tags: ['deepseek', 'reasoning'],
  },
  {
    id: 'deepseek-r1-7b',
    name: 'DeepSeek-R1-Distill-Qwen-7B',
    hfId: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
    params: 7.6,
    hiddenSize: 3584,
    layers: 28,
    heads: 28,
    kvHeads: 4,
    maxContext: 131072,
    quantizations: ['none', 'awq', 'gptq'],
    tags: ['deepseek', 'reasoning'],
  },
  {
    id: 'deepseek-r1-1.5b',
    name: 'DeepSeek-R1-Distill-Qwen-1.5B',
    hfId: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B',
    params: 1.5,
    hiddenSize: 1536,
    layers: 28,
    heads: 12,
    kvHeads: 4,
    maxContext: 131072,
    quantizations: ['none', 'awq', 'gptq'],
    tags: ['deepseek', 'reasoning'],
  },
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

function getBytesPerParam(quantization) {
  const map = { none: 2.0, fp8: 1.0, awq: 0.55, gptq: 0.55, int8: 1.0 };
  return map[quantization] || 2.0;
}

function estimateWeightGb(paramsBillion, quantization) {
  return paramsBillion * getBytesPerParam(quantization);
}

function estimateKvCacheGb(layers, hiddenSize, heads, kvHeads, seqLen, batchSize) {
  const groupSize = heads / kvHeads;
  const bytesPerTokenPerLayer = 4 * hiddenSize / groupSize;
  const totalBytes = layers * bytesPerTokenPerLayer * seqLen * batchSize;
  return totalBytes / (1024 ** 3);
}

function estimateActivationGb(hiddenSize, seqLen, batchSize) {
  return Math.max(1.5, hiddenSize * seqLen * batchSize * 4 / (1024 ** 3));
}

function estimateCudaOverheadGb(gpuCount) {
  return 1.5 * gpuCount;
}

function estimateVram(state) {
  const model = state.customModel
    ? {
        params: state.customParams || 7,
        hiddenSize: state.customHiddenSize || 4096,
        layers: state.customLayers || 32,
        heads: state.customHeads || 32,
        kvHeads: state.customKvHeads || 32,
        maxContext: state.customMaxContext || 8192,
      }
    : MODEL_PRESETS.find(m => m.id === state.modelId) || MODEL_PRESETS[1];

  const gpu = GPU_PRESETS.find(g => g.id === state.gpuId) || GPU_PRESETS[3];
  const gpuCount = state.gpuCount || 1;
  const seqLen = state.contextLen || model.maxContext;
  const batchSize = state.concurrency || 16;
  const utilization = state.utilization || 0.9;

  const weightGb = estimateWeightGb(model.params, state.quantization);
  const kvCacheGb = estimateKvCacheGb(model.layers, model.hiddenSize, model.heads, model.kvHeads, seqLen, batchSize);
  const activationGb = estimateActivationGb(model.hiddenSize, seqLen, batchSize);
  const cudaOverheadGb = estimateCudaOverheadGb(gpuCount);

  const totalEstimateGb = weightGb + kvCacheGb + activationGb + cudaOverheadGb;
  const availableGb = gpuCount * gpu.vram * utilization;

  let status = 'safe';
  const marginGb = availableGb - totalEstimateGb;
  const marginRatio = marginGb / availableGb;

  if (marginRatio < 0) status = 'danger';
  else if (marginRatio < 0.1) status = 'warning';

  return {
    weightGb,
    kvCacheGb,
    activationGb,
    cudaOverheadGb,
    totalEstimateGb,
    availableGb,
    marginGb,
    marginRatio,
    status,
    gpuName: `${gpuCount}x ${gpu.name}`,
    perCardGb: totalEstimateGb / gpuCount,
  };
}

function generateCommand(state, format = 'native') {
  const model = state.customModel
    ? (state.customHfId || 'custom-model')
    : (MODEL_PRESETS.find(m => m.id === state.modelId)?.hfId || 'Qwen/Qwen3-7B-Instruct');

  const servedName = state.servedName || model.split('/').pop();
  const host = state.host || '0.0.0.0';
  const port = state.port || 8000;
  const maxModelLen = state.contextLen || 8192;
  const utilization = state.utilization || 0.9;
  const gpuCount = state.gpuCount || 1;

  const flags = [];
  flags.push(`--model ${model}`);
  flags.push(`--served-model-name ${servedName}`);
  flags.push(`--host ${host}`);
  flags.push(`--port ${port}`);
  flags.push(`--max-model-len ${maxModelLen}`);
  flags.push(`--gpu-memory-utilization ${utilization}`);

  if (gpuCount > 1) flags.push(`--tensor-parallel-size ${gpuCount}`);
  if (state.quantization && state.quantization !== 'none') flags.push(`--quantization ${state.quantization}`);
  if (state.dtype && state.dtype !== 'auto') flags.push(`--dtype ${state.dtype}`);
  if (state.kvCacheDtype && state.kvCacheDtype !== 'auto') flags.push(`--kv-cache-dtype ${state.kvCacheDtype}`);
  if (state.enablePrefixCaching) flags.push('--enable-prefix-caching');
  if (state.enableChunkedPrefill) flags.push('--enable-chunked-prefill');
  if (state.maxNumSeqs && state.maxNumSeqs !== 16) flags.push(`--max-num-seqs ${state.maxNumSeqs}`);
  if (state.trustRemoteCode) flags.push('--trust-remote-code');
  if (state.enableAutoToolChoice) flags.push('--enable-auto-tool-choice');
  if (state.pipelineParallel > 1) flags.push(`--pipeline-parallel-size ${state.pipelineParallel}`);
  if (state.loraModules) flags.push(`--lora-modules ${state.loraModules}`);
  if (state.chatTemplate) flags.push(`--chat-template ${state.chatTemplate}`);

  if (format === 'native') {
    return `python -m vllm.entrypoints.openai.api_server \\\n` + flags.map(f => `  ${f}`).join(' \\\n');
  }

  if (format === 'docker') {
    return `docker run --runtime nvidia --gpus all \\\n` +
      `  -v ~/.cache/huggingface:/root/.cache/huggingface \\\n` +
      `  -p ${port}:${port} \\\n` +
      `  --ipc=host \\\n` +
      `  vllm/vllm-openai:latest \\\n` +
      flags.map(f => `  ${f}`).join(' \\\n');
  }

  if (format === 'compose') {
    const cmdArray = flags.map(f => {
      const parts = f.split(' ');
      return `      - ${parts[0]}\n      - ${parts.slice(1).join(' ')}`;
    }).join('\n');
    return `version: '3.8'\nservices:\n  vllm:\n    image: vllm/vllm-openai:latest\n    runtime: nvidia\n    deploy:\n      resources:\n        reservations:\n          devices:\n            - driver: nvidia\n              count: all\n              capabilities: [gpu]\n    volumes:\n      - ~/.cache/huggingface:/root/.cache/huggingface\n    ports:\n      - "${port}:${port}"\n    ipc: host\n    command:\n${cmdArray}`;
  }

  return '';
}

function checkConflicts(state) {
  const conflicts = [];
  if (state.quantization === 'fp8' && state.dtype === 'fp16') {
    conflicts.push('FP8 quantization conflicts with fp16 dtype. Set dtype to auto or fp8.');
  }
  if ((state.quantization === 'awq' || state.quantization === 'gptq') && state.kvCacheDtype === 'fp8') {
    conflicts.push('4-bit quantized models may not be compatible with FP8 KV Cache');
  }
  const model = MODEL_PRESETS.find(m => m.id === state.modelId);
  if (model && state.contextLen > model.maxContext) {
    conflicts.push(`Context length exceeds model maximum ${model.maxContext}. It has been automatically truncated.`);
  }
  const tp = state.gpuCount || 1;
  const pp = state.pipelineParallel || 1;
  if (tp * pp > (state.gpuCount || 1)) {
    conflicts.push('Tensor parallelism x pipeline parallelism cannot exceed the number of GPUs');
  }
  return conflicts;
}

const state = {
  mode: 'simple',
  step: 1,
  modelId: 'qwen3-7b',
  customModel: false,
  customHfId: '',
  customParams: 7,
  customHiddenSize: 4096,
  customLayers: 32,
  customHeads: 32,
  customKvHeads: 32,
  customMaxContext: 8192,
  quantization: 'none',
  gpuId: 'rtx4090',
  gpuCount: 1,
  utilization: 0.9,
  servedName: '',
  contextLen: 0,
  concurrency: 16,
  dtype: 'auto',
  kvCacheDtype: 'auto',
  port: 8000,
  host: '0.0.0.0',
  enablePrefixCaching: false,
  enableChunkedPrefill: false,
  maxNumSeqs: 16,
  trustRemoteCode: false,
  enableAutoToolChoice: false,
  pipelineParallel: 1,
  loraModules: '',
  chatTemplate: '',
  commandFormat: 'native',
};

function initStateFromDefaults() {
  const model = MODEL_PRESETS.find(m => m.id === state.modelId);
  if (model && !state.customModel) {
    state.contextLen = model.maxContext > 32768 ? 32768 : model.maxContext;
    state.servedName = model.name.split('-Instruct')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
  syncAllInputs();
}

function $(sel) { return document.querySelector(sel); }
function $$_(sel) { return document.querySelectorAll(sel); }

function updateModelInfo() {
  const card = $('#modelInfoCard');
  if (!card) return;
  if (state.customModel) {
    card.innerHTML = `
      <div class="info-row"><span>Model</span><strong>Custom Model</strong></div>
      <div class="info-row"><span>HuggingFace ID</span><strong>${state.customHfId || 'Not specified'}</strong></div>
      <div class="info-row"><span>Parameters</span><strong>${state.customParams}B</strong></div>
      <div class="info-row"><span>Hidden Size</span><strong>${state.customHiddenSize}</strong></div>
      <div class="info-row"><span>Layers</span><strong>${state.customLayers}</strong></div>
      <div class="info-row"><span>Attention Heads</span><strong>${state.customHeads}</strong></div>
      <div class="info-row"><span>KV Heads</span><strong>${state.customKvHeads}</strong></div>
    `;
    return;
  }
  const model = MODEL_PRESETS.find(m => m.id === state.modelId);
  if (!model) return;
  card.innerHTML = `
    <div class="info-row"><span>Parameters</span><strong>${model.params}B</strong></div>
    <div class="info-row"><span>Max Context</span><strong>${model.maxContext.toLocaleString()}</strong></div>
    <div class="info-row"><span>Supported Quantization</span><strong>${model.quantizations.map(q => ({none:'None',awq:'AWQ',gptq:'GPTQ',fp8:'FP8'}[q])).join(' / ')}</strong></div>
    <div class="info-row"><span>Model ID</span><strong class="hf-id">${model.hfId}</strong></div>
    ${model.notes ? `<div class="info-note">${model.notes}</div>` : ''}
  `;
}

function updateQuantizationOptions() {
  const sel = $('#quantizationSelect');
  if (!sel) return;
  const model = MODEL_PRESETS.find(m => m.id === state.modelId);
  const supported = state.customModel ? ['none', 'awq', 'gptq', 'fp8', 'int8'] : (model?.quantizations || ['none']);

  sel.innerHTML = supported.map(q => {
    const label = { none: 'None (FP16/BF16)', awq: 'AWQ 4bit', gptq: 'GPTQ 4bit', fp8: 'FP8', int8: 'INT8' }[q];
    return `<option value="${q}">${label}</option>`;
  }).join('');
  if (!supported.includes(state.quantization)) {
    state.quantization = supported[0];
  }
  sel.value = state.quantization;
}

function updateGpuInfo() {
  const card = $('#gpuInfoCard');
  if (!card) return;
  const gpu = GPU_PRESETS.find(g => g.id === state.gpuId);
  if (!gpu) return;
  const total = gpu.vram * (state.gpuCount || 1);
  card.innerHTML = `
    <div class="info-row"><span>VRAM per Card</span><strong>${gpu.vram} GB</strong></div>
    <div class="info-row"><span>Total VRAM</span><strong>${total} GB</strong></div>
    <div class="info-row"><span>Category</span><strong>${gpu.category === 'consumer' ? 'Consumer' : gpu.category === 'datacenter' ? 'Data Center' : 'Apple Silicon'}</strong></div>
  `;
}

function renderVramCheck() {
  const container = $('#vramCheck');
  if (!container) return;

  const est = estimateVram(state);
  const conflicts = checkConflicts(state);

  let statusText = 'Safe, sufficient margin';
  let statusClass = 'safe';
  if (est.status === 'warning') { statusText = 'Tight, consider adjusting parameters'; statusClass = 'warning'; }
  if (est.status === 'danger') { statusText = 'Insufficient, current config may OOM'; statusClass = 'danger'; }

  const barPercent = Math.min(100, (est.totalEstimateGb / est.availableGb) * 100);

  container.innerHTML = `
    <div class="vram-check-header">
      <h4>VRAM Check</h4>
      <span class="vram-status ${statusClass}">${statusText}</span>
    </div>
    <div class="vram-breakdown">
      <div class="vram-row"><span>Model Weights</span><strong>${est.weightGb.toFixed(1)} GB</strong></div>
      <div class="vram-row"><span>KV Cache</span><strong>${est.kvCacheGb.toFixed(1)} GB</strong></div>
      <div class="vram-row"><span>Activations</span><strong>${est.activationGb.toFixed(1)} GB</strong></div>
      <div class="vram-row"><span>CUDA Overhead</span><strong>${est.cudaOverheadGb.toFixed(1)} GB</strong></div>
      <div class="vram-divider"></div>
      <div class="vram-row total"><span>Estimated Total</span><strong>${est.totalEstimateGb.toFixed(1)} GB</strong></div>
      <div class="vram-row"><span>Available VRAM</span><strong>${est.availableGb.toFixed(1)} GB (${est.gpuName})</strong></div>
    </div>
    <div class="vram-bar-wrap">
      <div class="vram-bar-track">
        <div class="vram-bar-fill ${statusClass}" style="width:${barPercent}%"></div>
      </div>
      <div class="vram-bar-labels">
        <span>0 GB</span>
        <span>${est.availableGb.toFixed(0)} GB</span>
      </div>
    </div>
    ${conflicts.length ? `<div class="vram-conflicts">${conflicts.map(c => `<p>⚠️ ${c}</p>`).join('')}</div>` : ''}
    ${est.status === 'danger' ? `<div class="vram-suggestions">
      <p>Suggestion: ${state.gpuCount === 1 && state.quantization === 'none' ? 'Try a quantized model (AWQ/GPTQ/FP8) or add more GPUs' : 'Reduce context length, concurrency, or add more GPUs'}</p>
    </div>` : ''}
  `;
}

function renderCommand() {
  const pre = $('#commandOutput');
  const format = state.commandFormat;
  if (!pre) return;
  pre.textContent = generateCommand(state, format);
}

function bindEvents() {
  // Mode toggle
  $$_('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.mode = btn.dataset.mode;
      $$_('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));
      $('#simpleMode').style.display = state.mode === 'simple' ? 'block' : 'none';
      $('#advancedMode').style.display = state.mode === 'advanced' ? 'block' : 'none';
      renderVramCheck();
      renderCommand();
    });
  });

  // Stepper navigation
  $$_('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const step = Number(btn.dataset.step);
      if (step >= 1 && step <= 3) {
        state.step = step;
        updateStepper();
      }
    });
  });

  $$_('.next-step').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.step < 3) { state.step++; updateStepper(); }
    });
  });

  $$_('.prev-step').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.step > 1) { state.step--; updateStepper(); }
    });
  });

  // Step 1: Model selection
  const modelSelect = $('#modelSelect');
  if (modelSelect) {
    modelSelect.innerHTML = MODEL_PRESETS.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    modelSelect.addEventListener('change', () => {
      state.modelId = modelSelect.value;
      state.customModel = false;
      initStateFromDefaults();
      updateModelInfo();
      updateQuantizationOptions();
      renderVramCheck();
    });
  }

  const quantSelect = $('#quantizationSelect');
  if (quantSelect) {
    quantSelect.addEventListener('change', () => {
      state.quantization = quantSelect.value;
      renderVramCheck();
      renderCommand();
    });
  }

  const customModelInput = $('#customModelInput');
  if (customModelInput) {
    customModelInput.addEventListener('input', () => {
      state.customHfId = customModelInput.value.trim();
      state.customModel = state.customHfId.length > 0;
      if (state.customModel) {
        state.modelId = '';
        state.quantization = 'none';
        updateQuantizationOptions();
      }
      updateModelInfo();
      renderVramCheck();
    });
  }

  // Custom model parameters
  ['customParams', 'customHiddenSize', 'customLayers', 'customHeads', 'customKvHeads', 'customMaxContext'].forEach(key => {
    const el = $(`#${key}`);
    if (el) el.addEventListener('input', () => { state[key] = Number(el.value) || 0; renderVramCheck(); });
  });

  // Step 2: Hardware selection
  const gpuSelect = $('#gpuSelect');
  if (gpuSelect) {
    gpuSelect.innerHTML = GPU_PRESETS.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    gpuSelect.addEventListener('change', () => { state.gpuId = gpuSelect.value; updateGpuInfo(); renderVramCheck(); });
  }

  const gpuCountInput = $('#gpuCount');
  if (gpuCountInput) {
    gpuCountInput.addEventListener('input', () => { state.gpuCount = Math.max(1, Math.min(8, Number(gpuCountInput.value) || 1)); renderVramCheck(); });
  }

  const utilizationInput = $('#utilization');
  if (utilizationInput) {
    utilizationInput.addEventListener('input', () => {
      state.utilization = Math.max(0.5, Math.min(0.95, Number(utilizationInput.value) || 0.9));
      renderVramCheck();
    });
  }

  // Step 3 / Advanced: Parameter adjustment
  const bindInput = (id, key, transform = v => v) => {
    const el = $(`#${id}`);
    if (el) el.addEventListener('input', () => { state[key] = transform(el.value); renderVramCheck(); renderCommand(); syncAllInputs(); });
  };

  bindInput('servedName', 'servedName');
  bindInput('contextLen', 'contextLen', v => Number(v) || 0);
  bindInput('concurrency', 'concurrency', v => Number(v) || 16);
  bindInput('dtype', 'dtype');
  bindInput('kvCacheDtype', 'kvCacheDtype');
  bindInput('port', 'port', v => Number(v) || 8000);
  bindInput('host', 'host');
  bindInput('maxNumSeqs', 'maxNumSeqs', v => Number(v) || 16);
  bindInput('pipelineParallel', 'pipelineParallel', v => Number(v) || 1);
  bindInput('loraModules', 'loraModules');
  bindInput('chatTemplate', 'chatTemplate');

  const bindToggle = (id, key) => {
    const el = $(`#${id}`);
    if (el) el.addEventListener('change', () => { state[key] = el.checked; renderVramCheck(); renderCommand(); });
  };

  bindToggle('enablePrefixCaching', 'enablePrefixCaching');
  bindToggle('enableChunkedPrefill', 'enableChunkedPrefill');
  bindToggle('trustRemoteCode', 'trustRemoteCode');
  bindToggle('enableAutoToolChoice', 'enableAutoToolChoice');

  // Command format toggle
  $$_('.format-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.commandFormat = tab.dataset.format;
      $$_('.format-tab').forEach(t => t.classList.toggle('active', t.dataset.format === state.commandFormat));
      renderCommand();
    });
  });

  // Copy button
  const copyBtn = $('#copyCommandBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const pre = $('#commandOutput');
      if (!pre) return;
      try {
        await navigator.clipboard.writeText(pre.textContent);
        copyBtn.textContent = 'Copied';
        setTimeout(() => copyBtn.textContent = 'Copy Command', 1500);
      } catch {
        copyBtn.textContent = 'Copy Failed';
      }
    });
  }

  // Generate button
  const genBtn = $('#generateBtn');
  if (genBtn) {
    genBtn.addEventListener('click', () => {
      state.step = 3;
      updateStepper();
      renderCommand();
      $('#commandSection').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Advanced mode bindings
  const advModelSelect = $('#advModelSelect');
  if (advModelSelect) {
    advModelSelect.innerHTML = MODEL_PRESETS.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    advModelSelect.addEventListener('change', () => {
      state.modelId = advModelSelect.value;
      state.customModel = false;
      initStateFromDefaults();
      updateModelInfo();
      updateQuantizationOptions();
      renderVramCheck();
      syncAllInputs();
    });
  }

  const advQuantSelect = $('#advQuantizationSelect');
  if (advQuantSelect) {
    advQuantSelect.addEventListener('change', () => {
      state.quantization = advQuantSelect.value;
      renderVramCheck();
      renderCommand();
      syncAllInputs();
    });
  }

  const advCustomModelInput = $('#advCustomModelInput');
  if (advCustomModelInput) {
    advCustomModelInput.addEventListener('input', () => {
      state.customHfId = advCustomModelInput.value.trim();
      state.customModel = advCustomModelInput.value.trim().length > 0;
      if (state.customModel) {
        state.modelId = '';
        state.quantization = 'none';
        updateQuantizationOptions();
      }
      updateModelInfo();
      renderVramCheck();
      syncAllInputs();
    });
  }

  const advGpuSelect = $('#advGpuSelect');
  if (advGpuSelect) {
    advGpuSelect.innerHTML = GPU_PRESETS.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    advGpuSelect.addEventListener('change', () => { state.gpuId = advGpuSelect.value; updateGpuInfo(); renderVramCheck(); syncAllInputs(); });
  }

  const advGpuCountInput = $('#advGpuCount');
  if (advGpuCountInput) {
    advGpuCountInput.addEventListener('input', () => { state.gpuCount = Math.max(1, Math.min(8, Number(advGpuCountInput.value) || 1)); renderVramCheck(); syncAllInputs(); });
  }

  const advUtilizationInput = $('#advUtilization');
  if (advUtilizationInput) {
    advUtilizationInput.addEventListener('input', () => {
      state.utilization = Math.max(0.5, Math.min(0.95, Number(advUtilizationInput.value) || 0.9));
      renderVramCheck();
      syncAllInputs();
    });
  }

  bindInput('advServedName', 'servedName');
  bindInput('advContextLen', 'contextLen', v => Number(v) || 0);
  bindInput('advDtype', 'dtype');
  bindInput('advKvCacheDtype', 'kvCacheDtype');
  bindInput('advPort', 'port', v => Number(v) || 8000);
  bindInput('advHost', 'host');
  bindInput('advMaxNumSeqs', 'maxNumSeqs', v => Number(v) || 16);
  bindInput('advPipelineParallel', 'pipelineParallel', v => Number(v) || 1);
  bindInput('advLoraModules', 'loraModules');
  bindInput('advChatTemplate', 'chatTemplate');

  bindToggle('advEnablePrefixCaching', 'enablePrefixCaching');
  bindToggle('advEnableChunkedPrefill', 'enableChunkedPrefill');
  bindToggle('advTrustRemoteCode', 'trustRemoteCode');
  bindToggle('advEnableAutoToolChoice', 'enableAutoToolChoice');
}

function updateStepper() {
  $$_('.step-content').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === state.step);
  });
  $$_('.stepper-step').forEach((el, i) => {
    el.classList.remove('active', 'completed');
    if (i + 1 === state.step) el.classList.add('active');
    else if (i + 1 < state.step) el.classList.add('completed');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initStateFromDefaults();
  updateModelInfo();
  updateQuantizationOptions();
  updateGpuInfo();
  bindEvents();
  renderVramCheck();
  renderCommand();
  syncAllInputs();
});

function syncAllInputs() {
  const pairs = [
    ['servedName', 'advServedName'],
    ['contextLen', 'advContextLen'],
    ['concurrency', 'advConcurrency'],
    ['dtype', 'advDtype'],
    ['kvCacheDtype', 'advKvCacheDtype'],
    ['port', 'advPort'],
    ['host', 'advHost'],
    ['maxNumSeqs', 'advMaxNumSeqs'],
    ['pipelineParallel', 'advPipelineParallel'],
    ['loraModules', 'advLoraModules'],
    ['chatTemplate', 'advChatTemplate'],
  ];
  pairs.forEach(([key, advId]) => {
    const sEl = $(`#${key}`);
    const aEl = $(`#${advId}`);
    const val = state[key] ?? '';
    if (sEl) sEl.value = val;
    if (aEl) aEl.value = val;
  });

  const togglePairs = [
    ['enablePrefixCaching', 'advEnablePrefixCaching'],
    ['enableChunkedPrefill', 'advEnableChunkedPrefill'],
    ['trustRemoteCode', 'advTrustRemoteCode'],
    ['enableAutoToolChoice', 'advEnableAutoToolChoice'],
  ];
  togglePairs.forEach(([key, advId]) => {
    const sEl = $(`#${key}`);
    const aEl = $(`#${advId}`);
    const val = !!state[key];
    if (sEl) sEl.checked = val;
    if (aEl) aEl.checked = val;
  });

  const modelSel = $('#modelSelect');
  const advModelSel = $('#advModelSelect');
  if (modelSel) modelSel.value = state.modelId || '';
  if (advModelSel) advModelSel.value = state.modelId || '';

  const quantSel = $('#quantizationSelect');
  const advQuantSel = $('#advQuantizationSelect');
  if (quantSel) quantSel.value = state.quantization || 'none';
  if (advQuantSel) advQuantSel.value = state.quantization || 'none';

  const gpuSel = $('#gpuSelect');
  const advGpuSel = $('#advGpuSelect');
  if (gpuSel) gpuSel.value = state.gpuId || '';
  if (advGpuSel) advGpuSel.value = state.gpuId || '';

  const gpuCountEl = $('#gpuCount');
  const advGpuCountEl = $('#advGpuCount');
  if (gpuCountEl) gpuCountEl.value = state.gpuCount || 1;
  if (advGpuCountEl) advGpuCountEl.value = state.gpuCount || 1;

  const utilEl = $('#utilization');
  const advUtilEl = $('#advUtilization');
  if (utilEl) utilEl.value = state.utilization || 0.9;
  if (advUtilEl) advUtilEl.value = state.utilization || 0.9;

  const customInput = $('#customModelInput');
  const advCustomInput = $('#advCustomModelInput');
  if (customInput) customInput.value = state.customHfId || '';
  if (advCustomInput) advCustomInput.value = state.customHfId || '';
}
