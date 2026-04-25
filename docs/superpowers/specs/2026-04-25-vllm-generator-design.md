# vLLM 命令生成器 — 独立页面设计文档

**日期**: 2026-04-25
**主题**: vLLM 命令生成器拆分为独立页面 + 功能打磨
**状态**: 待用户审核

---

## 1. 设计目标

| 目标 | 说明 |
|------|------|
| **独立页面** | 从 `tools/index.html` 中拆分出来，成为 `tools/vllm-generator.html` |
| **新手友好** | 分步向导引导用户完成命令生成，降低使用门槛 |
| **专家高效** | 高级模式平铺全部参数，一步到位 |
| **显存预检** | 生成命令前验证配置是否会 OOM，避免运行时失败 |
| **多格式输出** | 同时提供原生启动命令、Docker 命令、docker-compose.yml |
| **符合实际场景** | 预设主流模型和 GPU，参数覆盖生产环境常用配置 |

---

## 2. 页面结构

```
tools/vllm-generator.html
├── Header (固定导航)
├── Breadcrumb: 首页 > 工具箱 > vLLM 命令生成器
├── Page Hero
│   ├── 标题: "vLLM 启动命令生成器"
│   ├── 副标题: "根据你的硬件和模型，一键生成可复制的 vLLM 启动命令"
│   └── 模式切换: [  简单模式  |  高级模式  ]
├── Main Content
│   ├── [简单模式] 分步向导 (Stepper)
│   │   ├── Step 1: 选择模型
│   │   ├── Step 2: 选择硬件
│   │   └── Step 3: 调整参数 & 生成命令
│   └── [高级模式] 全参数表单
├── 显存预检面板 (常驻，两种模式均显示)
├── 命令输出区域
│   ├── 格式切换: [ 原生命令 ] [ Docker ] [ docker-compose ]
│   ├── 命令展示框 + 一键复制
│   └── 显存使用可视化条
└── 关联工具推荐
    └── "不确定显存够不够？试试显存估算器"
```

---

## 3. 分步向导详细流程

### Step 1: 选择模型

**表单字段:**

| 字段 | 类型 | 说明 |
|------|------|------|
| 模型 | 下拉选择 (扁平列表) | 预设模型库，见第 6 节 |
| 量化方式 | 下拉选择 | 无 / AWQ / GPTQ / FP8 |
| 自定义模型路径 | 文本输入 (可选) | 覆盖预设模型，用于 HuggingFace 私有模型或本地路径 |

**选中模型后展示的信息卡片:**
- 参数量
- 官方推荐最大上下文长度
- 支持的量化方式列表
- 模型来源 (HuggingFace 模型 ID)

**交互:**
- 选择模型后，量化下拉只显示该模型支持的量化选项
- 选择量化后，Step 2 的显存预检自动更新
- 填写自定义模型路径时，量化选项变为全部可选，参数字段显示手动输入框

### Step 2: 选择硬件

**表单字段:**

| 字段 | 类型 | 说明 |
|------|------|------|
| GPU 类型 | 下拉选择 | 预设 GPU 库，见第 7 节 |
| GPU 数量 | 数字输入 (1-8) | 默认 1 |
| 显存利用率 | 滑块 (0.5 - 0.95) | 默认 0.9 |

**选中 GPU 后展示:**
- 单卡显存容量
- 总显存 = 单卡显存 × GPU 数量

**显存预检 (实时):**
```
模型权重: 14.2 GB (Qwen3-7B FP16)
系统开销: ~3.0 GB
KV Cache 预留: 动态
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
预估最低显存: 17.2 GB
可用显存: 24.0 GB (1× RTX 4090)
状态: ✅ 安全，余量 6.8 GB
```

**状态颜色:**
- ✅ 安全 (绿色): 预估需求 < 可用显存 × 0.85
- ⚠️ 紧张 (黄色): 预估需求 < 可用显存 × 0.95
- ❌ 不足 (红色): 预估需求 > 可用显存

### Step 3: 调整参数 & 生成命令

**表单字段:**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| 服务模型名 | 文本输入 | 模型名简写 | `--served-model-name` |
| 上下文长度 | 数字输入 / 滑块 | 模型推荐值 | `--max-model-len` |
| 并发数 | 数字输入 | 16 | `--max-num-seqs` |
| 数据类型 | 下拉 | auto | `--dtype` (auto/fp16/bf16/fp8) |
| KV Cache 数据类型 | 下拉 | auto | `--kv-cache-dtype` (auto/fp8/fp16) |
| 端口 | 数字输入 | 8000 | `--port` |
| 主机 | 文本输入 | 0.0.0.0 | `--host` |
| 启用前缀缓存 | 开关 | 关 | `--enable-prefix-caching` |
| 启用 chunked prefill | 开关 | 关 | `--enable-chunked-prefill` |

**生成按钮**: 点击后更新命令输出区域

---

## 4. 高级模式

切换为高级模式后，所有参数平铺展示，不强制分步。新增以下高级参数:

| 参数 | 对应 CLI Flag | 默认值 |
|------|--------------|--------|
| 流水线并行数 | `--pipeline-parallel-size` | 1 |
| 流水线并行层分配 | `--pp-partition-layer` | 自动 |
| 调度策略 | `--scheduling-policy` | fcfs |
| 请求超时 | `--max-model-len` 相关 | - |
| 预分配 KV Cache 比例 | `--gpu-memory-utilization` | 0.9 |
| 是否启用 Ray | `--ray-workers-use-nsight` | 否 |
| LoRA 适配器路径 | `--lora-modules` | 空 |
| 聊天模板 | `--chat-template` | 自动 |
| 信任远程代码 | `--trust-remote-code` | 否 |
| 工具调用 | `--enable-auto-tool-choice` | 否 |

---

## 5. 显存预检计算逻辑

### 5.1 模型权重显存

```
weight_gb = params_billion * bytes_per_param

bytes_per_param:
  - 无 (FP16/BF16): 2.0
  - FP8: 1.0
  - AWQ 4bit: 0.55  (含 overhead)
  - GPTQ 4bit: 0.55  (含 overhead)
  - INT8: 1.0
```

### 5.2 KV Cache 显存

```javascript
function estimateKvCacheGb(model, seqLen, batchSize) {
  const { layers, hiddenSize, heads, kvHeads } = model;
  const headDim = hiddenSize / heads;
  const groupSize = heads / kvHeads;
  
  // 2 (K+V) * kvHeads * headDim * 2 bytes (FP16)
  // = 2 * (hiddenSize / groupSize) * 2
  // = 4 * hiddenSize / groupSize bytes per token per layer
  const bytesPerTokenPerLayer = 4 * hiddenSize / groupSize;
  
  const totalBytes = layers * bytesPerTokenPerLayer * seqLen * batchSize;
  return totalBytes / (1024 ** 3);
}
```

### 5.3 激活值显存

```
activation_gb = max(1.5, hiddenSize * seqLen * batchSize * 4 / (1024 ** 3))
```

### 5.4 系统开销

```
cuda_overhead_gb = 1.5 * gpuCount
```

### 5.5 总估算

```
total_estimate_gb = weight_gb + kv_cache_gb + activation_gb + cuda_overhead_gb
available_gb = gpuCount * gpuMemoryPerCard * gpuUtilization

margin_gb = available_gb - total_estimate_gb
margin_ratio = margin_gb / available_gb

if margin_ratio < 0:
    status = "不足" → 建议: 使用量化、降低上下文、增加 GPU
else if margin_ratio < 0.1:
    status = "紧张" → 建议: 降低并发或上下文长度
else:
    status = "安全"
```

### 5.6 多卡情况

- **张量并行** (`--tensor-parallel-size`): 模型权重均分到各卡，KV cache 也均分
- **流水线并行** (`--pipeline-parallel-size`): 模型层均分到各组 GPU，每卡负载不同
- 估算时假设均分，实际可能有轻微偏差

---

## 6. 预设模型数据库

### 6.1 数据结构

```javascript
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
```

### 6.2 自定义模型模式

当用户输入自定义模型路径时:
- 显示手动参数输入框: 参数量、隐藏层大小、层数、注意力头数、KV 头数
- 提供 "从 HuggingFace config 推断" 按钮（可选，需要用户粘贴 config.json 内容）
- 量化选项变为全部可选

---

## 7. GPU 预设库

```javascript
const GPU_PRESETS = [
  // 消费级显卡
  { id: 'rtx3060', name: 'RTX 3060 12GB', vram: 12, category: 'consumer' },
  { id: 'rtx3060ti', name: 'RTX 3060 Ti 8GB', vram: 8, category: 'consumer' },
  { id: 'rtx3090', name: 'RTX 3090 24GB', vram: 24, category: 'consumer' },
  { id: 'rtx4090', name: 'RTX 4090 24GB', vram: 24, category: 'consumer' },
  { id: 'rtx5080', name: 'RTX 5080 16GB', vram: 16, category: 'consumer' },
  { id: 'rtx5090', name: 'RTX 5090 32GB', vram: 32, category: 'consumer' },
  
  // 服务器/专业卡
  { id: 'a10', name: 'A10 24GB', vram: 24, category: 'datacenter' },
  { id: 'a100-40', name: 'A100 40GB', vram: 40, category: 'datacenter' },
  { id: 'a100-80', name: 'A100 80GB', vram: 80, category: 'datacenter' },
  { id: 'l40s', name: 'L40S 48GB', vram: 48, category: 'datacenter' },
  { id: 'h100', name: 'H100 80GB', vram: 80, category: 'datacenter' },
  
  // 苹果芯片
  { id: 'm3-pro', name: 'M3 Pro (36GB 统一内存)', vram: 36, category: 'apple' },
  { id: 'm3-max', name: 'M3 Max (128GB 统一内存)', vram: 128, category: 'apple' },
  { id: 'm4-max', name: 'M4 Max (128GB 统一内存)', vram: 128, category: 'apple' },
];
```

---

## 8. 命令生成逻辑

### 8.1 基础命令

```bash
python -m vllm.entrypoints.openai.api_server \
  --model <model_id> \
  --served-model-name <served_name> \
  --host <host> \
  --port <port> \
  --max-model-len <max_len> \
  --gpu-memory-utilization <utilization>
```

### 8.2 条件追加参数

| 条件 | 追加参数 |
|------|---------|
| gpuCount > 1 | `--tensor-parallel-size <gpuCount>` |
| quantization !== 'none' | `--quantization <quantization>` |
| dtype !== 'auto' | `--dtype <dtype>` |
| kvCacheDtype !== 'auto' | `--kv-cache-dtype <kvCacheDtype>` |
| enablePrefixCaching | `--enable-prefix-caching` |
| enableChunkedPrefill | `--enable-chunked-prefill` |
| loraModules | `--lora-modules <loraModules>` |
| pipelineParallel > 1 | `--pipeline-parallel-size <pipelineParallel>` |
| trustRemoteCode | `--trust-remote-code` |
| enableAutoToolChoice | `--enable-auto-tool-choice` |
| customChatTemplate | `--chat-template <chatTemplate>` |
| maxNumSeqs !== 16 | `--max-num-seqs <maxNumSeqs>` |

### 8.3 Docker 命令

```bash
docker run --runtime nvidia --gpus all \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -p <port>:<port> \
  --ipc=host \
  vllm/vllm-openai:latest \
  --model <model_id> \
  [其他参数...]
```

**注意:**
- 苹果芯片 (M3/M4) 不支持 Docker CUDA 运行时，需特殊提示
- 多卡场景使用 `--gpus all`

### 8.4 docker-compose.yml

```yaml
version: '3.8'
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
      - "<port>:<port>"
    ipc: host
    command:
      - --model
      - <model_id>
      [其他参数...]
```

---

## 9. 边界情况与错误处理

### 9.1 模型与硬件不匹配

| 场景 | 处理 |
|------|------|
| 模型权重 > 单卡显存 × 0.8，且 GPU 数量 = 1，且无量化 | 显存预检显示 ❌，提示"需要使用量化模型或多卡并行" |
| 模型权重 > 总显存 × 0.8，即使多卡 | 显存预检显示 ❌，提示"即使多卡也不足，必须使用量化" |
| DeepSeek-V3 (671B) 选择单卡消费级 GPU | 显存预检显示 ❌，提示"该模型需要至少 8×A100 80GB 或 FP8 量化后 2×H100" |
| 苹果芯片选择 CUDA-only 参数 | 自动过滤或提示"MPS 后端不支持此参数" |

### 9.2 参数冲突

| 冲突 | 处理 |
|------|------|
| FP8 量化 + dtype = fp16 | 提示"FP8 量化与 fp16 dtype 冲突，建议 dtype 设为 auto 或 fp8" |
| AWQ/GPTQ + kvCacheDtype = fp8 | 提示"4bit 量化模型与 FP8 KV Cache 可能不兼容" |
| contextLen > model.maxContext | 自动截断到模型最大上下文，并提示 |
| tensorParallel × pipelineParallel > gpuCount | 提示"并行度乘积不能超过 GPU 数量" |

### 9.3 自定义模型

- 如果用户输入自定义路径但缺少关键参数，显存预检显示"无法估算，请补充模型参数"
- 提供 "粘贴 config.json 内容自动推断" 功能（可选增强）

---

## 10. 响应式设计

| 断点 | 布局 |
|------|------|
| ≥1024px | 分步向导左右分栏（左侧表单，右侧显存预检 + 命令输出） |
| 768-1023px | 分步向导上下堆叠，显存预检在表单下方 |
| <768px | 单列布局，步骤指示器变为图标 + 文字简化版 |

---

## 11. 文件变更范围

| 文件 | 操作 | 说明 |
|------|------|------|
| `tools/vllm-generator.html` | **新建** | 独立页面，包含完整工具 |
| `tools/index.html` | **修改** | 移除 vLLM 命令生成器内容，保留目录导航卡片（链接改为指向独立页面） |
| `css/style.css` | **修改** | 新增 vLLM 生成器专用样式（stepper、显存条、命令输出框等） |
| `js/vllm-generator.js` | **新建** | 独立 JS 文件，包含模型数据库、GPU 库、显存计算、命令生成逻辑 |
| `js/main.js` | **修改** | 保留共享功能（导航、cookie、平滑滚动），移除 vLLM 相关逻辑 |

---

## 12. 与其他工具的关系

| 工具 | 关联方式 |
|------|---------|
| 显存估算器 | 页面底部推荐链接，"需要更详细的显存分析？" |
| 报错诊断器 | 页面底部推荐链接，"部署遇到问题？" |
| 部署选型助手 | 页面底部推荐链接，"不确定选 vLLM 还是 Ollama？" |

---

*设计确认后，下一步：编写实现计划。*
