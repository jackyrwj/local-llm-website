# vLLM 命令生成器独立页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 vLLM 命令生成器从 `tools/index.html` 中拆分为独立的 `tools/vllm-generator.html` 页面，实现分步向导、显存预检、多格式命令输出，并同步更新所有相关引用链接。

**Architecture:** 独立 HTML 页面引用独立的 `js/vllm-generator.js` 模块。JS 模块内聚管理模型/GPU 预设数据库、显存估算公式、命令生成逻辑和分步向导状态机。CSS 追加到现有 `css/style.css` 中，以 `--vllm-*` 命名空间隔离。

**Tech Stack:** 纯静态 HTML/CSS/JavaScript，无后端依赖，无构建工具。浏览器本地计算。

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `js/vllm-generator.js` | **Create** | 模型/GPU 预设数据库、显存计算、命令生成（原生/Docker/docker-compose）、分步向导状态机、事件绑定 |
| `css/style.css` | **Modify** | 追加 vLLM 页面专用样式：模式切换、stepper、显存预检面板、命令输出标签页、显存可视化条 |
| `tools/vllm-generator.html` | **Create** | 完整的独立页面（header + breadcrumb + hero + 简单/高级模式 + 显存预检 + 命令输出 + 关联工具 + footer） |
| `tools/index.html` | **Modify** | 移除内联的 `#vllm-generator` section；将工具导航卡片中 vLLM 的链接从 `#vllm-generator` 改为 `vllm-generator.html` |
| `js/main.js` | **Modify** | 移除 `vllmForm` 相关的所有代码（约 lines 164–198） |
| `index.html` | **Modify** | 将首页 vLLM 工具卡片的 `href` 从 `tools/index.html#vllm-generator` 改为 `tools/vllm-generator.html` |

---

### Task 1: 创建 vllm-generator.js — 数据与计算层

**Files:**
- Create: `js/vllm-generator.js`

- [ ] **Step 1: 写入模型与 GPU 预设数据库**

```javascript
/* vllm-generator.js — vLLM 命令生成器独立逻辑 */

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
    notes: 'MoE 模型，需要多卡运行',
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
  { id: 'm3-pro', name: 'M3 Pro (36GB 统一内存)', vram: 36, category: 'apple' },
  { id: 'm3-max', name: 'M3 Max (128GB 统一内存)', vram: 128, category: 'apple' },
  { id: 'm4-max', name: 'M4 Max (128GB 统一内存)', vram: 128, category: 'apple' },
];
```

- [ ] **Step 2: 写入显存估算与命令生成工具函数**

```javascript
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
    gpuName: `${gpuCount}× ${gpu.name}`,
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
    return `version: '3.8'
services:
  vllm:
    image: vllm/vllm-openai:latest
    runtime: nvidia
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    volumes:
      - ~/.cache/huggingface:/root/.cache/huggingface
    ports:
      - "${port}:${port}"
    ipc: host
    command:
${cmdArray}`;
  }

  return '';
}

function checkConflicts(state) {
  const conflicts = [];
  if (state.quantization === 'fp8' && state.dtype === 'fp16') {
    conflicts.push('FP8 量化与 fp16 dtype 冲突，建议 dtype 设为 auto 或 fp8');
  }
  if ((state.quantization === 'awq' || state.quantization === 'gptq') && state.kvCacheDtype === 'fp8') {
    conflicts.push('4bit 量化模型与 FP8 KV Cache 可能不兼容');
  }
  const model = MODEL_PRESETS.find(m => m.id === state.modelId);
  if (model && state.contextLen > model.maxContext) {
    conflicts.push(`上下文长度超过模型最大支持 ${model.maxContext}，已自动截断`);
  }
  const tp = state.gpuCount || 1;
  const pp = state.pipelineParallel || 1;
  if (tp * pp > (state.gpuCount || 1)) {
    conflicts.push('张量并行 × 流水线并行不能超过 GPU 数量');
  }
  return conflicts;
}
```

- [ ] **Step 3: 写入状态管理与 UI 渲染核心**

```javascript
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
}

function $(sel) { return document.querySelector(sel); }
function $$$(sel) { return document.querySelectorAll(sel); }

function updateModelInfo() {
  const card = $('#modelInfoCard');
  if (!card) return;
  if (state.customModel) {
    card.innerHTML = `
      <div class="info-row"><span>模型</span><strong>自定义模型</strong></div>
      <div class="info-row"><span>HuggingFace ID</span><strong>${state.customHfId || '未指定'}</strong></div>
      <div class="info-row"><span>参数量</span><strong>${state.customParams}B</strong></div>
      <div class="info-row"><span>隐藏层</span><strong>${state.customHiddenSize}</strong></div>
      <div class="info-row"><span>层数</span><strong>${state.customLayers}</strong></div>
      <div class="info-row"><span>注意力头</span><strong>${state.customHeads}</strong></div>
      <div class="info-row"><span>KV 头</span><strong>${state.customKvHeads}</strong></div>
    `;
    return;
  }
  const model = MODEL_PRESETS.find(m => m.id === state.modelId);
  if (!model) return;
  card.innerHTML = `
    <div class="info-row"><span>参数量</span><strong>${model.params}B</strong></div>
    <div class="info-row"><span>最大上下文</span><strong>${model.maxContext.toLocaleString()}</strong></div>
    <div class="info-row"><span>支持量化</span><strong>${model.quantizations.map(q => ({none:'无',awq:'AWQ',gptq:'GPTQ',fp8:'FP8'}[q])).join(' / ')}</strong></div>
    <div class="info-row"><span>模型 ID</span><strong class="hf-id">${model.hfId}</strong></div>
    ${model.notes ? `<div class="info-note">${model.notes}</div>` : ''}
  `;
}

function updateQuantizationOptions() {
  const sel = $('#quantizationSelect');
  if (!sel) return;
  const model = MODEL_PRESETS.find(m => m.id === state.modelId);
  const supported = state.customModel ? ['none', 'awq', 'gptq', 'fp8', 'int8'] : (model?.quantizations || ['none']);

  sel.innerHTML = supported.map(q => {
    const label = { none: '无 (FP16/BF16)', awq: 'AWQ 4bit', gptq: 'GPTQ 4bit', fp8: 'FP8', int8: 'INT8' }[q];
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
    <div class="info-row"><span>单卡显存</span><strong>${gpu.vram} GB</strong></div>
    <div class="info-row"><span>总显存</span><strong>${total} GB</strong></div>
    <div class="info-row"><span>类别</span><strong>${gpu.category === 'consumer' ? '消费级' : gpu.category === 'datacenter' ? '数据中心' : '苹果芯片'}</strong></div>
  `;
}

function renderVramCheck() {
  const container = $('#vramCheck');
  if (!container) return;

  const est = estimateVram(state);
  const conflicts = checkConflicts(state);

  let statusText = '安全，余量充足';
  let statusClass = 'safe';
  if (est.status === 'warning') { statusText = '紧张，建议调整参数'; statusClass = 'warning'; }
  if (est.status === 'danger') { statusText = '不足，当前配置可能 OOM'; statusClass = 'danger'; }

  const barPercent = Math.min(100, (est.totalEstimateGb / est.availableGb) * 100);

  container.innerHTML = `
    <div class="vram-check-header">
      <h4>显存预检</h4>
      <span class="vram-status ${statusClass}">${statusText}</span>
    </div>
    <div class="vram-breakdown">
      <div class="vram-row"><span>模型权重</span><strong>${est.weightGb.toFixed(1)} GB</strong></div>
      <div class="vram-row"><span>KV Cache</span><strong>${est.kvCacheGb.toFixed(1)} GB</strong></div>
      <div class="vram-row"><span>激活值</span><strong>${est.activationGb.toFixed(1)} GB</strong></div>
      <div class="vram-row"><span>CUDA 开销</span><strong>${est.cudaOverheadGb.toFixed(1)} GB</strong></div>
      <div class="vram-divider"></div>
      <div class="vram-row total"><span>预估总需求</span><strong>${est.totalEstimateGb.toFixed(1)} GB</strong></div>
      <div class="vram-row"><span>可用显存</span><strong>${est.availableGb.toFixed(1)} GB (${est.gpuName})</strong></div>
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
      <p>建议：${state.gpuCount === 1 && state.quantization === 'none' ? '尝试量化模型（AWQ/GPTQ/FP8）或增加 GPU 数量' : '降低上下文长度、并发数，或增加 GPU'}</p>
    </div>` : ''}
  `;
}

function renderCommand() {
  const pre = $('#commandOutput');
  const format = state.commandFormat;
  if (!pre) return;
  pre.textContent = generateCommand(state, format);
}
```

- [ ] **Step 4: 写入事件绑定与初始化**

```javascript
function bindEvents() {
  // 模式切换
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

  // Stepper 导航
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

  // Step 1: 模型选择
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

  // 自定义模型参数
  ['customParams', 'customHiddenSize', 'customLayers', 'customHeads', 'customKvHeads', 'customMaxContext'].forEach(key => {
    const el = $(`#${key}`);
    if (el) el.addEventListener('input', () => { state[key] = Number(el.value) || 0; renderVramCheck(); });
  });

  // Step 2: 硬件选择
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

  // Step 3 / Advanced: 参数调整
  const bindInput = (id, key, transform = v => v) => {
    const el = $(`#${id}`);
    if (el) el.addEventListener('input', () => { state[key] = transform(el.value); renderVramCheck(); renderCommand(); });
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

  // 命令格式切换
  $$_('.format-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.commandFormat = tab.dataset.format;
      $$_('.format-tab').forEach(t => t.classList.toggle('active', t.dataset.format === state.commandFormat));
      renderCommand();
    });
  });

  // 复制按钮
  const copyBtn = $('#copyCommandBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const pre = $('#commandOutput');
      if (!pre) return;
      try {
        await navigator.clipboard.writeText(pre.textContent);
        copyBtn.textContent = '已复制';
        setTimeout(() => copyBtn.textContent = '复制命令', 1500);
      } catch {
        copyBtn.textContent = '复制失败';
      }
    });
  }

  // 生成按钮
  const genBtn = $('#generateBtn');
  if (genBtn) {
    genBtn.addEventListener('click', () => {
      state.step = 3;
      updateStepper();
      renderCommand();
      $('#commandSection').scrollIntoView({ behavior: 'smooth' });
    });
  }
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
});
```

- [ ] **Step 5: 验证文件内容完整**

确认 `js/vllm-generator.js` 包含以上四个代码块且拼接后无语法错误（无重复声明、无未闭合括号）。

---

### Task 2: 追加 vLLM 页面专用 CSS

**Files:**
- Modify: `css/style.css`（在文件末尾追加）

- [ ] **Step 1: 追加 vLLM 生成器样式到 style.css 末尾**

```css
/* ── vLLM Generator Page ─────────────────────── */
.vllm-page { padding: 48px 0 80px; }

.vllm-breadcrumb {
  font-size: .875rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}
.vllm-breadcrumb a { color: var(--text-muted); }
.vllm-breadcrumb a:hover { color: var(--primary); }

.vllm-hero { margin-bottom: 2.5rem; }
.vllm-hero h1 {
  font-family: var(--font-heading);
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -.03em;
  margin-bottom: .5rem;
}
.vllm-hero p { color: var(--text-muted); font-size: 1.0625rem; max-width: 640px; }

/* Mode toggle */
.mode-toggle {
  display: inline-flex;
  background: var(--bg-muted);
  border-radius: var(--r);
  padding: 4px;
  gap: 4px;
  margin-top: 1.25rem;
}
.mode-btn {
  padding: .5rem 1.25rem;
  border-radius: var(--r-sm);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-weight: 600;
  font-size: .875rem;
  cursor: pointer;
  transition: all var(--t);
  font-family: var(--font);
}
.mode-btn.active {
  background: var(--bg);
  color: var(--text);
  box-shadow: var(--shadow-xs);
}

/* Stepper */
.stepper {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: 2rem;
  padding: 1rem 1.25rem;
  background: var(--bg-subtle);
  border-radius: var(--r-lg);
  border: 1px solid var(--border);
}
.stepper-step {
  display: flex;
  align-items: center;
  gap: .5rem;
  font-size: .875rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--t);
}
.stepper-step .num {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: var(--bg-muted);
  border: 1.5px solid var(--border-strong);
  font-size: .8125rem;
  font-weight: 700;
  transition: all var(--t);
}
.stepper-step.active { color: var(--primary); }
.stepper-step.active .num { background: var(--primary); color: white; border-color: var(--primary); }
.stepper-step.completed { color: var(--text); }
.stepper-step.completed .num { background: var(--primary-subtle); color: var(--primary); border-color: var(--primary-light); }
.stepper-divider {
  flex: 1;
  height: 1px;
  background: var(--border);
  max-width: 40px;
}

/* Step content */
.step-content { display: none; }
.step-content.active { display: block; }

.step-actions {
  display: flex;
  gap: .75rem;
  margin-top: 1.5rem;
}

/* Form enhancements */
.vllm-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.vllm-form-grid.full { grid-template-columns: 1fr; }

.vllm-form-grid label {
  display: flex;
  flex-direction: column;
  gap: .375rem;
  color: var(--text-2);
  font-size: .875rem;
  font-weight: 600;
}
.vllm-form-grid input,
.vllm-form-grid select {
  width: 100%;
  border: 1.5px solid var(--border);
  border-radius: var(--r);
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: .9375rem;
  padding: .7rem .875rem;
  transition: border-color var(--t), box-shadow var(--t);
}
.vllm-form-grid input:focus,
.vllm-form-grid select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.vllm-form-grid .hint {
  font-size: .8125rem;
  color: var(--text-light);
  font-weight: 400;
}

/* Toggle switch */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .875rem 0;
  border-bottom: 1px solid var(--border);
}
.toggle-row:last-child { border-bottom: none; }
.toggle-row label { font-weight: 600; font-size: .9375rem; color: var(--text); }
.toggle-row .hint { font-size: .8125rem; color: var(--text-muted); font-weight: 400; }

.switch {
  position: relative;
  display: inline-block;
  width: 44px; height: 24px;
}
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--border-strong);
  border-radius: 24px;
  transition: background var(--t);
}
.slider::before {
  content: '';
  position: absolute;
  height: 18px; width: 18px;
  left: 3px; bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: transform var(--t);
}
.switch input:checked + .slider { background: var(--primary); }
.switch input:checked + .slider::before { transform: translateX(20px); }

/* Info cards */
.info-card {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 1rem;
  margin-top: 1rem;
}
.info-card .info-row {
  display: flex;
  justify-content: space-between;
  padding: .375rem 0;
  font-size: .875rem;
}
.info-card .info-row span { color: var(--text-muted); }
.info-card .info-row strong { color: var(--text); font-weight: 600; }
.info-card .info-row strong.hf-id { font-family: var(--mono); font-size: .8125rem; }
.info-card .info-note {
  margin-top: .5rem;
  padding: .5rem .75rem;
  background: var(--c-bug-bg);
  color: var(--c-bug);
  border-radius: var(--r-sm);
  font-size: .8125rem;
}

/* VRAM check */
.vram-check {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 1.5rem;
  margin: 2rem 0;
}
.vram-check-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.vram-check-header h4 {
  font-family: var(--font-heading);
  font-size: 1.0625rem;
  font-weight: 700;
}
.vram-status {
  font-size: .8125rem;
  font-weight: 700;
  padding: .25rem .625rem;
  border-radius: var(--r-xs);
}
.vram-status.safe { background: #DCFCE7; color: #15803D; }
.vram-status.warning { background: #FEF3C7; color: #B45309; }
.vram-status.danger { background: #FEE2E2; color: #B91C1C; }

.vram-breakdown { display: grid; gap: .375rem; margin-bottom: 1rem; }
.vram-row {
  display: flex;
  justify-content: space-between;
  font-size: .875rem;
}
.vram-row span { color: var(--text-muted); }
.vram-row strong { color: var(--text); font-weight: 600; }
.vram-row.total { padding-top: .375rem; border-top: 1px solid var(--border); margin-top: .25rem; }
.vram-row.total strong { font-size: 1rem; }
.vram-divider { height: 1px; background: var(--border); margin: .25rem 0; }

.vram-bar-wrap { margin-top: .75rem; }
.vram-bar-track {
  height: 8px;
  background: var(--bg-muted);
  border-radius: 4px;
  overflow: hidden;
}
.vram-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width .3s ease;
}
.vram-bar-fill.safe { background: #22C55E; }
.vram-bar-fill.warning { background: #F59E0B; }
.vram-bar-fill.danger { background: #EF4444; }
.vram-bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: .75rem;
  color: var(--text-light);
  margin-top: .375rem;
}

.vram-conflicts { margin-top: .875rem; }
.vram-conflicts p {
  font-size: .8125rem;
  color: var(--c-bug);
  background: var(--c-bug-bg);
  padding: .5rem .75rem;
  border-radius: var(--r-sm);
  margin-bottom: .375rem;
}
.vram-suggestions { margin-top: .875rem; }
.vram-suggestions p {
  font-size: .8125rem;
  color: var(--text-muted);
}

/* Command output */
.command-section { margin-top: 2rem; }
.command-section h3 {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.format-tabs {
  display: flex;
  gap: .25rem;
  margin-bottom: .75rem;
}
.format-tab {
  padding: .5rem 1rem;
  border-radius: var(--r-sm);
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--text-muted);
  font-weight: 600;
  font-size: .875rem;
  cursor: pointer;
  transition: all var(--t);
  font-family: var(--font);
}
.format-tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}
.format-tab:hover:not(.active) { border-color: var(--border-strong); color: var(--text); }

.command-box {
  background: #020617;
  border-radius: var(--r-lg);
  padding: 1.5rem;
  overflow-x: auto;
}
.command-box pre {
  margin: 0;
  color: #E2E8F0;
  font-family: var(--mono);
  font-size: .875rem;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
.command-actions {
  display: flex;
  gap: .75rem;
  margin-top: 1rem;
}

/* Related tools */
.related-tools {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}
.related-tools h3 {
  font-family: var(--font-heading);
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 1rem;
}
.related-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.related-card {
  display: flex;
  flex-direction: column;
  gap: .375rem;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--bg);
  color: var(--text);
  transition: all var(--t);
}
.related-card:hover { border-color: var(--primary); box-shadow: var(--shadow-sm); }
.related-card strong { font-weight: 600; font-size: .9375rem; }
.related-card span { font-size: .8125rem; color: var(--text-muted); }

/* Advanced mode layout */
.advanced-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, .85fr);
  gap: 2rem;
  align-items: start;
}
.advanced-form { display: grid; gap: 1.25rem; }
.advanced-group {
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 1.25rem;
  background: var(--bg);
}
.advanced-group h4 {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  padding-bottom: .5rem;
  border-bottom: 1px solid var(--border);
}

/* Responsive */
@media (max-width: 1024px) {
  .vllm-form-grid { grid-template-columns: 1fr; }
  .advanced-grid { grid-template-columns: 1fr; }
  .related-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .vllm-hero h1 { font-size: 1.75rem; }
  .stepper { overflow-x: auto; padding: .75rem; }
  .stepper-divider { max-width: 20px; }
  .vram-check { padding: 1rem; }
  .command-box { padding: 1rem; }
}
```

---

### Task 3: 创建独立 HTML 页面

**Files:**
- Create: `tools/vllm-generator.html`

- [ ] **Step 1: 创建完整页面**

写入以下内容到 `tools/vllm-generator.html`（保留站点一致的 header/footer/导航结构）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="vLLM 启动命令生成器 — 根据模型和 GPU 一键生成原生、Docker 和 docker-compose 格式的 vLLM 启动命令，附带显存预检。">
    <meta name="keywords" content="vLLM,命令生成器,GPU显存预检,Qwen,DeepSeek,本地部署">
    <title>vLLM 启动命令生成器 — AI 部署手记</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>

    <header class="site-header">
        <div class="container">
            <div class="logo">
                <a href="../index.html">
                    <span class="logo-mark" aria-hidden="true">
                        <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="2" width="6" height="6" rx="1" fill="white"/>
                            <rect x="10" y="2" width="6" height="6" rx="1" fill="white" fill-opacity=".5"/>
                            <rect x="2" y="10" width="6" height="6" rx="1" fill="white" fill-opacity=".5"/>
                            <rect x="10" y="10" width="6" height="6" rx="1" fill="white"/>
                        </svg>
                    </span>
                    AI 部署手记
                </a>
            </div>
            <nav class="main-nav" aria-label="主导航">
                <button class="mobile-menu-toggle" aria-label="切换菜单" aria-expanded="false">
                    <span></span><span></span><span></span>
                </button>
                <ul class="nav-menu">
                    <li><a href="../index.html">首页</a></li>
                    <li><a href="index.html">工具箱</a></li>
                    <li><a href="../posts/index.html">文章</a></li>
                    <li><a href="../about.html">关于</a></li>
                    <li><a href="../faq.html">FAQ</a></li>
                    <li><a href="../contact.html">联系</a></li>
                </ul>
                <a href="index.html" class="nav-cta">返回工具箱</a>
            </nav>
        </div>
    </header>

    <main class="vllm-page">
        <div class="container">
            <nav class="vllm-breadcrumb" aria-label="面包屑">
                <a href="../index.html">首页</a> &gt; <a href="index.html">工具箱</a> &gt; vLLM 命令生成器
            </nav>

            <div class="vllm-hero">
                <h1>vLLM 启动命令生成器</h1>
                <p>根据你的硬件和模型，一键生成可复制的 vLLM 启动命令。支持原生、Docker 和 docker-compose 三种格式。</p>
                <div class="mode-toggle">
                    <button class="mode-btn active" data-mode="simple">简单模式</button>
                    <button class="mode-btn" data-mode="advanced">高级模式</button>
                </div>
            </div>

            <!-- 显存预检（常驻） -->
            <div class="vram-check" id="vramCheck"></div>

            <!-- 简单模式：分步向导 -->
            <div id="simpleMode" style="display:block">
                <div class="stepper">
                    <div class="stepper-step active" data-step="1"><span class="num">1</span>选择模型</div>
                    <div class="stepper-divider"></div>
                    <div class="stepper-step" data-step="2"><span class="num">2</span>选择硬件</div>
                    <div class="stepper-divider"></div>
                    <div class="stepper-step" data-step="3"><span class="num">3</span>调整参数</div>
                </div>

                <div class="step-content active" data-step="1">
                    <div class="vllm-form-grid">
                        <label>模型
                            <select id="modelSelect"></select>
                            <span class="hint">从预设库选择，或在下框输入自定义模型</span>
                        </label>
                        <label>量化方式
                            <select id="quantizationSelect"></select>
                        </label>
                        <label class="full">自定义模型路径（可选，覆盖上方选择）
                            <input type="text" id="customModelInput" placeholder="例如：org/model-name 或本地路径">
                            <span class="hint">HuggingFace 模型 ID 或本地绝对路径</span>
                        </label>
                    </div>
                    <div class="info-card" id="modelInfoCard"></div>
                    <div class="step-actions">
                        <button class="btn btn-primary next-step">下一步：选择硬件</button>
                    </div>
                </div>

                <div class="step-content" data-step="2">
                    <div class="vllm-form-grid">
                        <label>GPU 类型
                            <select id="gpuSelect"></select>
                        </label>
                        <label>GPU 数量
                            <input type="number" id="gpuCount" min="1" max="8" value="1">
                        </label>
                        <label>显存利用率
                            <input type="number" id="utilization" min="0.5" max="0.95" step="0.01" value="0.9">
                            <span class="hint">建议 0.85–0.9，生产环境不要超过 0.92</span>
                        </label>
                    </div>
                    <div class="info-card" id="gpuInfoCard"></div>
                    <div class="step-actions">
                        <button class="btn btn-secondary prev-step">上一步</button>
                        <button class="btn btn-primary next-step">下一步：调整参数</button>
                    </div>
                </div>

                <div class="step-content" data-step="3">
                    <div class="vllm-form-grid">
                        <label>服务模型名
                            <input type="text" id="servedName" placeholder="自动推断">
                        </label>
                        <label>上下文长度
                            <input type="number" id="contextLen" min="512" max="200000" step="512">
                            <span class="hint">自动填入模型推荐值，可按需调低</span>
                        </label>
                        <label>并发数
                            <input type="number" id="concurrency" min="1" max="512" value="16">
                        </label>
                        <label>数据类型 (dtype)
                            <select id="dtype">
                                <option value="auto" selected>auto</option>
                                <option value="fp16">fp16</option>
                                <option value="bf16">bf16</option>
                                <option value="fp8">fp8</option>
                            </select>
                        </label>
                        <label>KV Cache 数据类型
                            <select id="kvCacheDtype">
                                <option value="auto" selected>auto</option>
                                <option value="fp8">fp8</option>
                                <option value="fp16">fp16</option>
                            </select>
                        </label>
                        <label>端口
                            <input type="number" id="port" min="1" max="65535" value="8000">
                        </label>
                        <label>主机
                            <input type="text" id="host" value="0.0.0.0">
                        </label>
                    </div>
                    <div class="toggle-row">
                        <div>
                            <label>启用前缀缓存</label>
                            <span class="hint">--enable-prefix-caching，适合多轮对话</span>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="enablePrefixCaching">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="toggle-row">
                        <div>
                            <label>启用 Chunked Prefill</label>
                            <span class="hint">--enable-chunked-prefill，提升吞吐</span>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="enableChunkedPrefill">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="step-actions">
                        <button class="btn btn-secondary prev-step">上一步</button>
                        <button class="btn btn-primary" id="generateBtn">生成命令</button>
                    </div>
                </div>
            </div>

            <!-- 高级模式 -->
            <div id="advancedMode" style="display:none">
                <div class="advanced-grid">
                    <div class="advanced-form">
                        <div class="advanced-group">
                            <h4>模型与量化</h4>
                            <div class="vllm-form-grid">
                                <label>模型
                                    <select id="advModelSelect"></select>
                                </label>
                                <label>量化方式
                                    <select id="advQuantizationSelect"></select>
                                </label>
                                <label class="full">自定义模型路径
                                    <input type="text" id="advCustomModelInput" placeholder="HuggingFace ID 或本地路径">
                                </label>
                            </div>
                        </div>

                        <div class="advanced-group">
                            <h4>硬件配置</h4>
                            <div class="vllm-form-grid">
                                <label>GPU 类型
                                    <select id="advGpuSelect"></select>
                                </label>
                                <label>GPU 数量
                                    <input type="number" id="advGpuCount" min="1" max="8" value="1">
                                </label>
                                <label>显存利用率
                                    <input type="number" id="advUtilization" min="0.5" max="0.95" step="0.01" value="0.9">
                                </label>
                                <label>张量并行 (TP)
                                    <input type="number" id="advTensorParallel" min="1" max="8" value="1">
                                    <span class="hint">通常等于 GPU 数量</span>
                                </label>
                                <label>流水线并行 (PP)
                                    <input type="number" id="advPipelineParallel" min="1" max="8" value="1">
                                </label>
                            </div>
                        </div>

                        <div class="advanced-group">
                            <h4>服务参数</h4>
                            <div class="vllm-form-grid">
                                <label>服务模型名
                                    <input type="text" id="advServedName" placeholder="自动推断">
                                </label>
                                <label>上下文长度
                                    <input type="number" id="advContextLen" min="512" max="200000" step="512">
                                </label>
                                <label>并发数 (max-num-seqs)
                                    <input type="number" id="advMaxNumSeqs" min="1" max="512" value="16">
                                </label>
                                <label>数据类型
                                    <select id="advDtype">
                                        <option value="auto">auto</option>
                                        <option value="fp16">fp16</option>
                                        <option value="bf16">bf16</option>
                                        <option value="fp8">fp8</option>
                                    </select>
                                </label>
                                <label>KV Cache 数据类型
                                    <select id="advKvCacheDtype">
                                        <option value="auto">auto</option>
                                        <option value="fp8">fp8</option>
                                        <option value="fp16">fp16</option>
                                    </select>
                                </label>
                                <label>端口
                                    <input type="number" id="advPort" min="1" max="65535" value="8000">
                                </label>
                                <label>主机
                                    <input type="text" id="advHost" value="0.0.0.0">
                                </label>
                                <label>LoRA 适配器路径
                                    <input type="text" id="advLoraModules" placeholder="可选">
                                </label>
                                <label>聊天模板路径
                                    <input type="text" id="advChatTemplate" placeholder="可选，自动推断留空">
                                </label>
                            </div>
                        </div>

                        <div class="advanced-group">
                            <h4>高级开关</h4>
                            <div class="toggle-row">
                                <div><label>启用前缀缓存</label></div>
                                <label class="switch"><input type="checkbox" id="advEnablePrefixCaching"><span class="slider"></span></label>
                            </div>
                            <div class="toggle-row">
                                <div><label>启用 Chunked Prefill</label></div>
                                <label class="switch"><input type="checkbox" id="advEnableChunkedPrefill"><span class="slider"></span></label>
                            </div>
                            <div class="toggle-row">
                                <div><label>信任远程代码</label></div>
                                <label class="switch"><input type="checkbox" id="advTrustRemoteCode"><span class="slider"></span></label>
                            </div>
                            <div class="toggle-row">
                                <div><label>自动工具选择</label></div>
                                <label class="switch"><input type="checkbox" id="advEnableAutoToolChoice"><span class="slider"></span></label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div class="info-card" id="advModelInfoCard"></div>
                        <div class="info-card" id="advGpuInfoCard"></div>
                    </div>
                </div>
            </div>

            <!-- 命令输出 -->
            <div class="command-section" id="commandSection">
                <h3>生成结果</h3>
                <div class="format-tabs">
                    <button class="format-tab active" data-format="native">原生命令</button>
                    <button class="format-tab" data-format="docker">Docker</button>
                    <button class="format-tab" data-format="compose">docker-compose</button>
                </div>
                <div class="command-box">
                    <pre><code id="commandOutput"></code></pre>
                </div>
                <div class="command-actions">
                    <button class="btn btn-primary" id="copyCommandBtn">复制命令</button>
                </div>
            </div>

            <!-- 关联工具 -->
            <div class="related-tools">
                <h3>相关工具</h3>
                <div class="related-grid">
                    <a href="index.html#memory-calculator" class="related-card">
                        <strong>显存估算器</strong>
                        <span>不确定显存够不够？做更详细的显存分析。</span>
                    </a>
                    <a href="index.html#error-diagnoser" class="related-card">
                        <strong>报错诊断器</strong>
                        <span>部署遇到问题？粘贴报错快速定位。</span>
                    </a>
                    <a href="index.html#deployment-advisor" class="related-card">
                        <strong>部署选型助手</strong>
                        <span>不确定选 vLLM 还是 Ollama？先做个选型。</span>
                    </a>
                </div>
            </div>
        </div>
    </main>

    <footer class="site-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-about">
                    <div class="footer-logo">
                        <span class="footer-logo-mark" aria-hidden="true">
                            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="1" y="1" width="6" height="6" rx="1" fill="white"/>
                                <rect x="9" y="1" width="6" height="6" rx="1" fill="white" fill-opacity=".5"/>
                                <rect x="1" y="9" width="6" height="6" rx="1" fill="white" fill-opacity=".5"/>
                                <rect x="9" y="9" width="6" height="6" rx="1" fill="white"/>
                            </svg>
                        </span>
                        AI 部署手记
                    </div>
                    <p>本地大模型部署实战经验分享，涵盖 vLLM、GPUStack、Qwen 等工具的真实踩坑记录与解决方案。</p>
                </div>
                <div class="footer-links">
                    <h4>快速链接</h4>
                    <ul>
                        <li><a href="../index.html">首页</a></li>
                        <li><a href="index.html">工具箱</a></li>
                        <li><a href="../posts/index.html">文章归档</a></li>
                        <li><a href="../faq.html">FAQ</a></li>
                    </ul>
                </div>
                <div class="footer-legal">
                    <h4>法律信息</h4>
                    <ul>
                        <li><a href="../privacy-policy.html">隐私政策</a></li>
                        <li><a href="../terms-of-service.html">使用条款</a></li>
                        <li><a href="../cookie-policy.html">Cookie 政策</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 AI 部署手记. 保留所有权利。</p>
            </div>
        </div>
    </footer>

    <script src="../js/main.js"></script>
    <script src="../js/vllm-generator.js"></script>
</body>
</html>
```

---

### Task 4: 修改 tools/index.html

**Files:**
- Modify: `tools/index.html`

- [ ] **Step 1: 移除内联的 vLLM 生成器 section**

在 `tools/index.html` 中，删除从 `<section class="tool-section" id="vllm-generator">` 到其对应的 `</section>` 标签之间的全部内容（即当前文件中的 lines 124–181）。

- [ ] **Step 2: 更新工具导航卡片链接**

在 `tools/index.html` 中，找到 `tool-link-grid` 区域，将 vLLM 卡片从锚点链接改为独立页面链接：

```html
<!-- 替换前 -->
<a href="#vllm-generator" class="tool-link-card">
    <strong>vLLM 启动命令生成器</strong>
    <span>按模型、显卡、上下文和量化方式生成可复制命令。</span>
</a>

<!-- 替换后 -->
<a href="vllm-generator.html" class="tool-link-card">
    <strong>vLLM 启动命令生成器</strong>
    <span>按模型、显卡、上下文和量化方式生成可复制命令。</span>
</a>
```

- [ ] **Step 3: 更新导航 CTA**

将 header 中的 nav-cta 从 `#vllm-generator` 改为 `vllm-generator.html`：

```html
<a href="vllm-generator.html" class="nav-cta">生成 vLLM 命令</a>
```

---

### Task 5: 修改 js/main.js

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: 移除 vllmForm 相关代码**

在 `js/main.js` 中，删除 `const vllmForm = document.getElementById('vllmForm');` 到其对应的闭合大括号之间的全部代码块（当前文件 lines 164–198）。保留前后的 `formatMoney`、`formatGb`、`getFormNumber`、`renderMetrics` 等共享工具函数，以及其他工具表单逻辑不受影响。

---

### Task 6: 修改 index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 更新首页 vLLM 卡片链接**

在 `index.html` 的 `homepage-tools` 区域，将 vLLM 卡片链接更新为指向独立页面：

```html
<!-- 替换前 -->
<a href="tools/index.html#vllm-generator" class="homepage-tool-card" data-stage="start">

<!-- 替换后 -->
<a href="tools/vllm-generator.html" class="homepage-tool-card" data-stage="start">
```

---

### Task 7: 手动测试验证

**Files:** 无需修改，仅验证

- [ ] **Step 1: 打开 tools/vllm-generator.html**

用浏览器打开 `tools/vllm-generator.html`（可用 `python3 -m http.server 8080` 在项目根目录启动本地服务器，然后访问 `http://localhost:8080/tools/vllm-generator.html`）。

验证清单：
1. 页面加载无 JS 报错（浏览器 DevTools Console）。
2. 模型下拉框包含全部 10 个预设模型。
3. 选择 "Qwen3-7B-Instruct" 后，模型信息卡片显示参数量 7.6B、最大上下文 131072、支持量化方式。
4. 量化下拉框自动过滤为该模型支持的选项（none / awq / gptq）。
5. 选择 "DeepSeek-V3" 后，量化下拉只显示 none / fp8，信息卡片显示 MoE 备注。
6. GPU 下拉框包含全部 14 个预设 GPU。
7. 显存预检面板实时显示：模型权重、KV Cache、激活值、CUDA 开销、总需求、可用显存、状态标签、显存条。
8. 将 GPU 改为 "RTX 3060 Ti 8GB"、量化选 "none"、模型选 "Qwen3-7B"，显存预检应显示红色 "不足" 状态。
9. 将量化改为 "awq"，状态应变为绿色 "安全"。
10. 简单模式 3 个步骤可以前后切换。
11. 点击 "生成命令" 后命令输出区域显示完整命令。
12. 命令格式切换（原生 / Docker / docker-compose）时输出内容正确变化。
13. 点击 "复制命令" 按钮，剪贴板内容正确。
14. 模式切换按钮（简单 / 高级）可以正常切换显示区域。
15. 响应式：缩小窗口到 < 768px，布局变为单列，无横向溢出。

- [ ] **Step 2: 验证 tools/index.html**

访问 `http://localhost:8080/tools/index.html`，验证：
1. 页面内不再有 vLLM 生成器的内联表单。
2. 工具导航卡片中 "vLLM 启动命令生成器" 链接指向 `vllm-generator.html`，点击可正常跳转。
3. 导航栏 CTA "生成 vLLM 命令" 点击可正常跳转。

- [ ] **Step 3: 验证 index.html**

访问 `http://localhost:8080/index.html`，验证：
1. 首页 "vLLM 命令生成器" 卡片点击后跳转到独立页面，而非工具箱锚点。

---

## Spec Coverage Self-Review

| 设计文档章节 | 实现任务 |
|-------------|---------|
| 独立页面 (tools/vllm-generator.html) | Task 3 |
| 新手友好分步向导 (3 steps) | Task 3 (HTML) + Task 1 (JS state machine) |
| 专家高效高级模式 | Task 3 (HTML advanced grid) + Task 1 (mode toggle logic) |
| 显存预检实时计算 | Task 1 (estimateVram) + Task 3 (vramCheck panel) |
| 多格式输出 (native/docker/compose) | Task 1 (generateCommand) + Task 3 (format tabs) |
| 预设模型数据库 (10 models) | Task 1 Step 1 |
| 预设 GPU 库 (14 GPUs) | Task 1 Step 1 |
| 显存计算逻辑 (weight/KV/activation/overhead) | Task 1 Step 2 |
| 参数冲突检测 | Task 1 Step 2 (checkConflicts) |
| 自定义模型模式 | Task 1 (customModelInput + custom params) + Task 3 (custom inputs) |
| 边界情况处理 (OOM 提示、Apple 芯片) | Task 1 (status logic) + Task 3 (GPU presets) |
| 响应式设计 | Task 2 (CSS media queries) |
| 文件变更范围 (index.html / tools/index.html / main.js / style.css) | Task 4, 5, 6 |

## Placeholder Scan

- 无 "TBD"、"TODO"、"implement later"。
- 无 "Add appropriate error handling" 等模糊描述。
- 所有代码块包含完整实现。
- 所有文件路径精确。

## Type Consistency Check

- `state` 对象属性名在 Task 1 Step 3/4 和 Task 3 HTML 的 `id` 属性之间一一对应。
- `generateCommand` 的 `format` 参数取值 (`native`/`docker`/`compose`) 与 Task 3 中 `data-format` 属性一致。
- 显存估算函数签名与 Step 2 实现和 Step 3 调用一致。

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-25-vllm-generator.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

**Which approach do you prefer?**
