# 部署错误知识库 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可搜索、按标签筛选的交互式部署错误知识库独立页面，替换原有的"报错诊断器"内联工具。

**Architecture:** 静态 HTML 页面 + 独立 JS 文件。JS 内含完整的错误数据数组和渲染/过滤逻辑。标签过滤采用多标签交集（AND），搜索支持防抖实时过滤。卡片采用折叠/展开交互，支持 URL 锚点定位。

**Tech Stack:** HTML5, CSS3 (追加到现有 style.css), Vanilla JavaScript (无框架)

---

## 文件映射

| 文件 | 操作 | 说明 |
|------|------|------|
| `css/style.css` | 追加 | 部署错误知识库的所有页面样式 |
| `js/deployment-errors.js` | 新建 | 错误数据 + 搜索/过滤/渲染/交互逻辑 |
| `tools/deployment-errors.html` | 新建 | 独立页面（结构参照 vllm-generator.html） |
| `tools/index.html` | 修改 | 移除 `#error-diagnoser` 内联区块，更新工具卡片链接 |
| `js/main.js` | 修改 | 移除 `diagnoseForm` 逻辑（约 60 行） |
| `index.html` | 修改 | 更新"报错诊断器"首页工具卡片为"部署错误知识库" |
| `tools/vllm-generator.html` | 修改 | 更新关联工具区"报错诊断器"链接为 deployment-errors.html |

---

### Task 1: 追加部署错误知识库样式到 CSS

**Files:**
- Modify: `css/style.css`（追加到文件末尾）

- [ ] **Step 1: 追加页面布局与 Hero 样式**

在 `css/style.css` 文件末尾追加：

```css
/* =============================================
   部署错误知识库 — Deployment Error KB
   ============================================= */

.error-kb-page { padding: 0 0 48px; }

.error-kb-breadcrumb {
  font-size: 13px;
  color: var(--text-muted);
  margin: 16px 0 24px;
}
.error-kb-breadcrumb a {
  color: var(--text-muted);
  text-decoration: none;
}
.error-kb-breadcrumb a:hover { color: var(--primary); }

.error-kb-hero {
  margin-bottom: 32px;
}
.error-kb-hero h1 {
  font-size: 32px;
  font-weight: 800;
  color: var(--navy);
  margin-bottom: 8px;
}
.error-kb-hero p {
  color: var(--text-muted);
  font-size: 16px;
  margin-bottom: 12px;
}
.error-kb-count {
  font-size: 14px;
  color: var(--primary);
  font-weight: 600;
}
```

- [ ] **Step 2: 追加搜索栏与标签云样式**

继续追加：

```css
.error-kb-search {
  margin-bottom: 20px;
}
.error-kb-search input {
  width: 100%;
  max-width: 520px;
  padding: 12px 16px;
  font-size: 15px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
}
.error-kb-search input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}
.error-kb-search input::placeholder {
  color: var(--text-light);
}

.error-kb-tags {
  margin-bottom: 16px;
}
.error-kb-tags-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.error-kb-tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.error-kb-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  font-size: 13px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}
.error-kb-tag:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.error-kb-tag.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}
.error-kb-tag .tag-icon {
  font-size: 12px;
}

.error-kb-active-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  min-height: 28px;
}
.error-kb-active-filters:empty { display: none; }
.error-kb-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 12px;
  border-radius: 12px;
  background: var(--primary-subtle);
  color: var(--primary);
}
.error-kb-pill button {
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
}
.error-kb-clear-btn {
  font-size: 12px;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}
.error-kb-clear-btn:hover { color: var(--primary); }
```

- [ ] **Step 3: 追加错误卡片网格与卡片样式**

继续追加：

```css
.error-kb-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media (max-width: 767px) {
  .error-kb-grid { grid-template-columns: 1fr; }
  .error-kb-tag-group {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }
}

.error-kb-card {
  position: relative;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
.error-kb-card:hover {
  box-shadow: 0 4px 16px rgba(15,23,42,0.08);
  border-color: var(--border-strong);
}
.error-kb-card.severity-warning { border-left: 4px solid #f59e0b; }
.error-kb-card.severity-error { border-left: 4px solid #ef4444; }
.error-kb-card.severity-critical { border-left: 4px solid #b91c1c; }
.error-kb-card.expanded { cursor: default; }

.error-kb-card-inner {
  padding: 16px;
}
.error-kb-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.error-kb-card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--navy);
  line-height: 1.4;
}
.error-kb-card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.error-kb-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}
.error-kb-badge.category {
  background: #eff6ff;
  color: #1d4ed8;
}
.error-kb-badge.tag {
  background: #f1f5f9;
  color: #475569;
}

.error-kb-card-symptoms {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.error-kb-card.expanded .error-kb-card-symptoms {
  -webkit-line-clamp: unset;
  display: block;
}

.error-kb-card-toggle {
  margin-top: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.error-kb-card-toggle:hover { text-decoration: underline; }

/* 展开态详情区域 */
.error-kb-details {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.error-kb-details h4 {
  font-size: 13px;
  font-weight: 700;
  color: var(--navy);
  margin: 16px 0 8px;
}
.error-kb-details h4:first-child { margin-top: 0; }
.error-kb-cause {
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.7;
}
.error-kb-fix-list {
  margin: 0;
  padding-left: 18px;
}
.error-kb-fix-list li {
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.7;
  margin-bottom: 4px;
}

/* 命令块 */
.error-kb-command {
  margin-bottom: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.error-kb-command-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-muted);
  border-bottom: 1px solid var(--border);
}
.error-kb-command-desc {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}
.error-kb-command-copy {
  font-size: 12px;
  font-weight: 600;
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.error-kb-command-copy:hover {
  background: var(--primary-subtle);
}
.error-kb-command-copy.copied {
  color: #16a34a;
}
.error-kb-command pre {
  margin: 0;
  padding: 12px;
  background: #0f172a;
  color: #e2e8f0;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 12.5px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre;
}
.error-kb-command code {
  font-family: inherit;
  background: none;
  padding: 0;
}

/* 相关错误 */
.error-kb-related {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.error-kb-related a {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--primary);
  background: var(--primary-subtle);
  border-radius: 6px;
  text-decoration: none;
}
.error-kb-related a:hover {
  background: var(--primary-light);
}
```

- [ ] **Step 4: 追加空状态与关联工具区样式**

继续追加：

```css
/* 空状态 */
.error-kb-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted);
}
.error-kb-empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}
.error-kb-empty h3 {
  font-size: 18px;
  color: var(--navy);
  margin-bottom: 8px;
}
.error-kb-empty p {
  font-size: 14px;
  margin-bottom: 16px;
}

/* 关联工具推荐 */
.error-kb-related-tools {
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid var(--border);
}
.error-kb-related-tools h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 16px;
}
.error-kb-related-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 767px) {
  .error-kb-related-grid { grid-template-columns: 1fr; }
}
.error-kb-related-card {
  display: block;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  text-decoration: none;
  background: var(--bg);
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.error-kb-related-card:hover {
  box-shadow: 0 2px 12px rgba(15,23,42,0.06);
  border-color: var(--primary);
}
.error-kb-related-card strong {
  display: block;
  font-size: 14px;
  color: var(--navy);
  margin-bottom: 4px;
}
.error-kb-related-card span {
  font-size: 13px;
  color: var(--text-muted);
}

/* No-JS fallback: all cards expanded, tags hidden */
.no-js .error-kb-card .error-kb-details { display: block !important; }
.no-js .error-kb-card-toggle { display: none; }
.no-js .error-kb-search, .no-js .error-kb-tags, .no-js .error-kb-active-filters { display: none; }
```

- [ ] **Step 5: 验证样式语法并提交**

运行：确保追加的 CSS 没有语法错误（不需要编译，纯 CSS）。

```bash
git add css/style.css
git commit -m "feat: add deployment error KB styles"
```

---

### Task 2: 创建部署错误知识库 JS 逻辑

**Files:**
- Create: `js/deployment-errors.js`

- [ ] **Step 1: 写入完整错误数据与常量和工具函数**

创建 `js/deployment-errors.js`，写入以下内容：

```javascript
/* 部署错误知识库 — Deployment Error KB */

const CATEGORIES = {
  all:    { label: '全部', icon: '', color: '' },
  cuda:   { label: 'CUDA', icon: '🔥', color: '#e74c3c' },
  docker: { label: 'Docker', icon: '🐳', color: '#3498db' },
  vllm:   { label: 'vLLM', icon: '⚡', color: '#f39c12' },
  model:  { label: '模型加载', icon: '📦', color: '#9b59b6' },
  network:{ label: '网络代理', icon: '🌐', color: '#27ae60' },
};

const TAG_LABELS = {
  oom: 'OOM',
  startup: '启动失败',
  inference: '推理异常',
  config: '配置问题',
  permission: '权限拒绝',
  performance: '性能问题',
  version: '版本不兼容',
};

const SEVERITY_ORDER = { critical: 0, error: 1, warning: 2 };

const ERROR_ENTRIES = [
  {
    id: 'cuda-oom',
    title: 'CUDA OutOfMemoryError',
    keywords: ['outofmemory', 'cuda out of memory', 'oom', 'cannot allocate memory', 'cuda oom'],
    category: 'cuda',
    tags: ['oom', 'startup', 'inference'],
    severity: 'error',
    symptoms: '启动或推理时抛出 torch.cuda.OutOfMemoryError，nvidia-smi 显示显存接近 100%，服务崩溃或响应卡住。',
    cause: '模型权重、KV Cache、并发请求或上下文长度超过了 GPU 可用显存。vLLM 的 PagedAttention 虽然能高效管理显存，但在初始加载权重和预热时仍需要足够的连续显存空间。',
    fix: [
      '降低 --max-model-len（如从 8192 降到 4096 或 2048）',
      '减小并发数 --max-num-seqs（如从 16 降到 4-8）',
      '使用量化模型（AWQ/GPTQ 4bit 可减少 50-60% 权重显存）',
      '降低 --gpu-memory-utilization（如从 0.9 降到 0.85，预留更多安全空间）',
      '多卡时启用 --tensor-parallel-size 分散权重'
    ],
    commands: [
      { desc: '查看当前显存占用', cmd: 'nvidia-smi' },
      { desc: '限制上下文和并发启动', cmd: 'python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --max-model-len 4096 --max-num-seqs 8 --gpu-memory-utilization 0.85' }
    ],
    related: ['cuda-driver-mismatch', 'vllm-context-overflow']
  },
  {
    id: 'cuda-driver-mismatch',
    title: 'CUDA 驱动版本不匹配',
    keywords: ['cuda driver', 'driver version', 'libcuda', 'cuda runtime', 'insufficient driver', 'nvidia-smi failed'],
    category: 'cuda',
    tags: ['startup', 'version'],
    severity: 'critical',
    symptoms: '报错包含 "CUDA driver version is insufficient for runtime version" 或 "no CUDA-capable device is detected"，nvidia-smi 无法运行或显示异常。',
    cause: '宿主机 NVIDIA 驱动版本低于 PyTorch / CUDA 运行时所需的最低版本，或容器内的 CUDA Toolkit 与宿主机驱动不兼容。常见于更新 PyTorch 后未同步更新驱动，或使用预构建镜像时版本不匹配。',
    fix: [
      '运行 nvidia-smi 确认宿主机驱动版本',
      '查阅 PyTorch 官方文档，确认所需 CUDA 版本对应的最低驱动版本',
      '升级宿主机 NVIDIA 驱动到推荐版本（通常 525+ 对应 CUDA 12.x）',
      '如果使用 Docker，确保镜像 CUDA 版本不超过宿主机驱动支持范围',
      '降级 PyTorch 到与当前驱动兼容的版本（如 torch 用 CUDA 11.8 构建）'
    ],
    commands: [
      { desc: '查看驱动和 CUDA 版本', cmd: 'nvidia-smi\npython -c "import torch; print(torch.version.cuda, torch.cuda.is_available())"' },
      { desc: '降级 PyTorch 到 CUDA 11.8', cmd: 'pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118' }
    ],
    related: ['cuda-no-device', 'docker-gpu-mount']
  },
  {
    id: 'cuda-no-device',
    title: '未检测到 CUDA 设备',
    keywords: ['no cuda gpus', 'cuda not available', 'no device', 'cuda initialization failed', 'nvidia-smi not found'],
    category: 'cuda',
    tags: ['startup', 'config'],
    severity: 'critical',
    symptoms: 'torch.cuda.is_available() 返回 False，程序回退到 CPU 运行（极慢）或直接报错 "No CUDA GPUs are available"。',
    cause: 'NVIDIA 驱动未安装、GPU 未正确插入、BIOS 中禁用了 Above 4G Decoding，或在虚拟机/云实例中未分配 GPU。也可能是 nvidia-modprobe 未加载。',
    fix: [
      '确认物理 GPU 已正确安装且供电正常',
      '在宿主机运行 nvidia-smi 确认驱动正常工作',
      '检查 BIOS 设置：启用 Above 4G Decoding 和 Resizable BAR',
      '加载 nvidia 内核模块：sudo modprobe nvidia',
      '云服务器确认实例规格包含 GPU，并安装了对应驱动'
    ],
    commands: [
      { desc: '检查 CUDA 可用性', cmd: 'python -c "import torch; print(torch.cuda.is_available(), torch.cuda.device_count())"' },
      { desc: '加载 NVIDIA 模块', cmd: 'sudo modprobe nvidia && nvidia-smi' }
    ],
    related: ['cuda-driver-mismatch', 'docker-gpu-mount']
  },
  {
    id: 'docker-gpu-mount',
    title: 'Docker GPU 挂载失败',
    keywords: ['nvidia-container', 'could not select device driver', 'docker gpu', 'runtime nvidia', 'nvidia-docker'],
    category: 'docker',
    tags: ['startup', 'config'],
    severity: 'error',
    symptoms: 'docker run --gpus all 时报错 "could not select device driver" 或 "nvidia-container-cli: initialization error"，容器内 nvidia-smi 找不到。',
    cause: 'NVIDIA Container Toolkit 未安装或 Docker 未配置 nvidia 运行时。也可能是 Docker 版本过旧不支持 --gpus 参数。',
    fix: [
      '安装 NVIDIA Container Toolkit（按官方文档配置 apt/yum 源）',
      '配置 Docker daemon 使用 nvidia 运行时：/etc/docker/daemon.json',
      '重启 Docker 服务',
      '使用 --runtime=nvidia 替代 --gpus all（旧版本兼容）',
      '验证：docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi'
    ],
    commands: [
      { desc: '测试 GPU 容器', cmd: 'docker run --rm --gpus all nvidia/cuda:12.0-base-ubuntu22.04 nvidia-smi' },
      { desc: '查看 Docker 运行时', cmd: 'docker info | grep -i runtime' }
    ],
    related: ['cuda-no-device', 'docker-image-pull']
  },
  {
    id: 'docker-image-pull',
    title: 'Docker 镜像拉取失败',
    keywords: ['pull access denied', 'manifest unknown', 'docker pull', 'image not found', 'unauthorized', 'net/http'],
    category: 'docker',
    tags: ['startup', 'config'],
    severity: 'warning',
    symptoms: 'docker pull 时报错 "pull access denied"、"manifest unknown" 或长时间卡住后网络超时。',
    cause: '镜像名称拼写错误、镜像不存在、需要登录 registry、网络连接问题（国内访问 Docker Hub 不稳定），或镜像 tag 已被删除。',
    fix: [
      '检查镜像名和 tag 拼写是否正确',
      '确认镜像在 registry 上公开可用',
      '如需私有镜像，先 docker login',
      '国内用户配置镜像加速源（阿里云、DaoCloud 等）',
      '检查网络连接：curl -v https://registry-1.docker.io/v2/'
    ],
    commands: [
      { desc: '登录 Docker Hub', cmd: 'docker login' },
      { desc: '配置阿里云镜像加速', cmd: 'sudo mkdir -p /etc/docker\nsudo tee /etc/docker/daemon.json <<\'EOF\'\n{\n  "registry-mirrors": ["https://<your-id>.mirror.aliyuncs.com"]\n}\nEOF\nsudo systemctl restart docker' }
    ],
    related: ['docker-gpu-mount']
  },
  {
    id: 'vllm-context-overflow',
    title: '上下文长度超出限制',
    keywords: ['max_model_len', 'context length', 'sequence length', 'rope', 'sliding window', 'exceeds model\'s max'],
    category: 'vllm',
    tags: ['inference', 'config', 'oom'],
    severity: 'error',
    symptoms: '请求时返回 "The prompt is too long" 或报错提示 sequence length 超过模型支持的 max_model_len，生成结果被截断。',
    cause: '输入 prompt + 生成长度之和超过了 vLLM 启动时设定的 --max-model-len，或超过了模型配置文件中定义的原始最大上下文长度。部分模型（如 Qwen3-235B）在配置文件中声明了很长的上下文，但实际受架构限制。',
    fix: [
      '降低请求的 max_tokens 参数，确保 prompt + max_tokens < max-model-len',
      '缩短输入 prompt，移除不必要的上下文',
      '启动时提高 --max-model-len（需确保显存足够）',
      '对长文档使用分块处理，避免单条请求过长',
      '检查模型 config.json 中的 max_position_embeddings 是否为真实支持值'
    ],
    commands: [
      { desc: '查看模型真实上下文限制', cmd: 'python -c "from transformers import AutoConfig; c=AutoConfig.from_pretrained(\'Qwen/Qwen3-7B-Instruct\'); print(c.max_position_embeddings)"' },
      { desc: '提高上下文限制启动（需显存足够）', cmd: 'python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --max-model-len 32768' }
    ],
    related: ['cuda-oom', 'vllm-scheduling-timeout']
  },
  {
    id: 'vllm-scheduling-timeout',
    title: 'vLLM 调度超时 / 请求卡住',
    keywords: ['scheduling timeout', 'preemption', 'request hang', 'timeout', 'engine iteration timeout', 'pipeline timeout'],
    category: 'vllm',
    tags: ['inference', 'performance'],
    severity: 'error',
    symptoms: '请求长时间无响应，日志中出现 "Scheduling timeout" 或 "Preemption" 相关警告，并发请求时部分请求卡住。',
    cause: '并发请求数超过 GPU 处理能力，导致调度器无法在规定时间内完成调度迭代。或某些请求占用了大量显存（长上下文），阻塞了后续请求。也可能是 --max-num-seqs 设置过高，导致频繁抢占。',
    fix: [
      '降低 --max-num-seqs 到 GPU 能稳定处理的并发数（通常 4-16）',
      '启用 --enable-chunked-prefill 提升吞吐',
      '缩短 --max-model-len 减少单请求显存占用',
      '添加客户端请求超时和重试机制',
      '监控 GPU 利用率，确认是否已满载'
    ],
    commands: [
      { desc: '启用 Chunked Prefill 优化', cmd: 'python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --enable-chunked-prefill --max-num-seqs 8' },
      { desc: '监控 GPU 利用率', cmd: 'watch -n 1 nvidia-smi' }
    ],
    related: ['cuda-oom', 'vllm-context-overflow']
  },
  {
    id: 'vllm-model-not-found',
    title: '模型路径或名称不存在',
    keywords: ['model not found', 'no such file', 'config.json', 'cannot find', 'path does not exist', 'oserror'],
    category: 'vllm',
    tags: ['startup', 'config'],
    severity: 'error',
    symptoms: '启动时报错 "Model path does not exist" 或 "Cannot find config.json"，HuggingFace 下载失败或本地路径错误。',
    cause: '模型 ID 拼写错误、本地路径不存在、HuggingFace 模型未被下载到本地缓存、或挂载路径在容器内外不一致。也可能是模型文件损坏或不完整。',
    fix: [
      '确认模型 ID 拼写正确（区分大小写）',
      '本地路径使用绝对路径，避免相对路径解析错误',
      'Docker 运行时确保模型目录正确挂载到容器内',
      '使用 huggingface-cli download 预先下载模型',
      '检查目录下是否存在 config.json 和 pytorch_model.bin / safetensors 文件'
    ],
    commands: [
      { desc: '预下载模型', cmd: 'huggingface-cli download Qwen/Qwen3-7B-Instruct --local-dir ./models/qwen3-7b' },
      { desc: '检查模型文件完整性', cmd: 'ls -lah ./models/qwen3-7b/' }
    ],
    related: ['model-gated-permission', 'docker-gpu-mount']
  },
  {
    id: 'model-quantization-incompatible',
    title: '量化格式与运行时不兼容',
    keywords: ['awq', 'gptq', 'bitsandbytes', 'quantization', 'quant_config', 'load_in_4bit', 'load_in_8bit', 'gguf'],
    category: 'model',
    tags: ['startup', 'version', 'config'],
    severity: 'error',
    symptoms: '加载量化模型时报错 "AWQ is not supported"、"GPTQ quantization config not found" 或 bitsandbytes 相关错误。',
    cause: 'vLLM / transformers 版本不支持该量化格式，或缺少对应的量化支持库（autoawq、optimum、bitsandbytes）。也可能是量化配置文件缺失或格式不兼容。',
    fix: [
      '确认当前 vLLM 版本是否支持该量化格式（查阅官方文档）',
      '安装对应的量化库：pip install autoawq / auto-gptq / bitsandbytes',
      '使用 vLLM 原生支持的量化方式（如 AWQ、GPTQ、FP8）',
      '确认量化配置文件（quant_config.json）存在于模型目录',
      '如格式不支持，考虑重新量化或切换到非量化版本'
    ],
    commands: [
      { desc: '安装 AWQ 支持', cmd: 'pip install autoawq' },
      { desc: '查看 vLLM 支持的量化类型', cmd: 'python -m vllm.entrypoints.openai.api_server --help | grep -i quant' }
    ],
    related: ['vllm-model-not-found']
  },
  {
    id: 'model-gated-permission',
    title: 'Gated Model / HuggingFace 权限不足',
    keywords: ['gated repo', 'access token', '401', '403', 'unauthorized', 'permission', 'login', 'huggingface'],
    category: 'model',
    tags: ['startup', 'permission'],
    severity: 'warning',
    symptoms: '下载模型时报错 "401 Client Error"、"Gated repo" 或 "You need to login"，提示需要 HuggingFace 访问令牌。',
    cause: '该模型需要同意使用条款后才能下载（如 Meta-Llama、部分 DeepSeek 模型），或用户的 HuggingFace token 未设置/已过期。也可能是 token 权限不足。',
    fix: [
      '在 HuggingFace 网页上找到该模型，点击 Accept License Agreement',
      '生成 HuggingFace access token（Settings → Access Tokens）',
      '使用 huggingface-cli login 登录，或设置 HF_TOKEN 环境变量',
      '在 vLLM 启动命令中添加 --hf-overrides 或确保环境变量已传递',
      'Docker 运行时使用 -e HF_TOKEN=$HF_TOKEN 传递 token'
    ],
    commands: [
      { desc: '登录 HuggingFace', cmd: 'huggingface-cli login' },
      { desc: '带 token 启动 vLLM', cmd: 'HF_TOKEN=hf_xxx python -m vllm.entrypoints.openai.api_server --model meta-llama/Meta-Llama-3-8B-Instruct' }
    ],
    related: ['vllm-model-not-found', 'docker-image-pull']
  },
  {
    id: 'network-port-in-use',
    title: '端口已被占用',
    keywords: ['address already in use', 'port is already allocated', 'bind', 'eaddrinuse', 'port 8000'],
    category: 'network',
    tags: ['startup', 'config'],
    severity: 'warning',
    symptoms: '启动服务时报错 "Address already in use"，指定端口已被其他进程占用，服务无法启动。',
    cause: '之前的 vLLM / Ollama / 其他服务进程未正常退出，仍在后台占用端口。或系统其他应用使用了该端口。',
    fix: [
      '查找占用端口的进程：lsof -i :8000 或 ss -tlnp',
      '结束占用进程：kill -9 <PID>',
      '或改用其他端口：--port 8001',
      '检查是否有 systemd 服务自动重启了旧进程',
      'Docker 映射端口时确保宿主机端口未被占用'
    ],
    commands: [
      { desc: '查找占用端口的进程', cmd: 'lsof -i :8000' },
      { desc: '使用其他端口启动', cmd: 'python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --port 8001' }
    ],
    related: ['network-tunnel-502']
  },
  {
    id: 'network-tunnel-502',
    title: 'Cloudflare Tunnel / 反向代理 502',
    keywords: ['502', 'bad gateway', 'cloudflare', 'tunnel', 'connection refused', 'origin', 'nginx', 'reverse proxy'],
    category: 'network',
    tags: ['startup', 'config'],
    severity: 'error',
    symptoms: '通过域名或 Tunnel 访问服务时返回 502 Bad Gateway，直接访问 IP:端口正常。',
    cause: '反向代理/Tunnel 配置的 origin 地址错误或端口不匹配；本地服务未启动；服务绑定到了 127.0.0.1 而不是 0.0.0.0（导致外部无法访问）；或防火墙阻止了连接。',
    fix: [
      '确认本地服务已启动且绑定到 0.0.0.0（--host 0.0.0.0）',
      '检查 Tunnel / Nginx 配置的 origin 端口是否与本地服务一致',
      '直接 curl http://127.0.0.1:8000/v1/models 测试本地服务',
      '检查 cloudflared tunnel 状态：cloudflared tunnel list',
      '确认防火墙未阻止端口（ufw / iptables / 云安全组）'
    ],
    commands: [
      { desc: '测试本地服务', cmd: 'curl -v http://127.0.0.1:8000/v1/models' },
      { desc: '查看 tunnel 状态', cmd: 'cloudflared tunnel list' },
      { desc: '绑定所有接口启动', cmd: 'python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --host 0.0.0.0 --port 8000' }
    ],
    related: ['network-port-in-use']
  },
];
```

- [ ] **Step 2: 追加搜索、过滤、渲染逻辑**

继续追加到同一文件：

```javascript
// ── State ────────────────────────────────────
let activeCategory = 'all';
let activeTags = new Set();
let searchQuery = '';
let expandedCards = new Set();

// ── DOM refs ─────────────────────────────────
const els = {
  searchInput: document.getElementById('kbSearch'),
  categoryTags: document.getElementById('kbCategoryTags'),
  subTags: document.getElementById('kbSubTags'),
  activeFilters: document.getElementById('kbActiveFilters'),
  grid: document.getElementById('kbGrid'),
  count: document.getElementById('kbCount'),
};

// ── Debounce ─────────────────────────────────
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ── Filtering ────────────────────────────────
function getFilteredEntries() {
  return ERROR_ENTRIES.filter(entry => {
    if (activeCategory !== 'all' && entry.category !== activeCategory) return false;
    if (activeTags.size > 0) {
      for (const t of activeTags) {
        if (!entry.tags.includes(t)) return false;
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hay = [
        entry.title,
        ...(entry.keywords || []),
        entry.symptoms,
        entry.cause,
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 99;
    const sb = SEVERITY_ORDER[b.severity] ?? 99;
    if (sa !== sb) return sa - sb;
    return a.title.localeCompare(b.title, 'zh-CN');
  });
}

// ── Rendering ────────────────────────────────
function renderTags() {
  // 主分类标签
  els.categoryTags.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const isActive = activeCategory === key;
    return `<span class="error-kb-tag${isActive ? ' active' : ''}" data-category="${key}">${cat.icon ? `<span class="tag-icon">${cat.icon}</span>` : ''}${cat.label}</span>`;
  }).join('');

  // 子标签（按使用频次排序）
  const tagCounts = {};
  ERROR_ENTRIES.forEach(e => {
    e.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });
  const sortedTags = Object.entries(TAG_LABELS)
    .sort((a, b) => (tagCounts[b[0]] || 0) - (tagCounts[a[0]] || 0));

  els.subTags.innerHTML = sortedTags.map(([key, label]) => {
    const isActive = activeTags.has(key);
    const count = tagCounts[key] || 0;
    return `<span class="error-kb-tag${isActive ? ' active' : ''}" data-tag="${key}">${label}${count > 0 ? ` (${count})` : ''}</span>`;
  }).join('');
}

function renderActiveFilters() {
  const parts = [];
  if (activeCategory !== 'all') {
    const cat = CATEGORIES[activeCategory];
    parts.push(`<span class="error-kb-pill">${cat.icon ? cat.icon + ' ' : ''}${cat.label} <button data-clear-category>×</button></span>`);
  }
  activeTags.forEach(tag => {
    parts.push(`<span class="error-kb-pill">${TAG_LABELS[tag]} <button data-clear-tag="${tag}">×</button></span>`);
  });
  if (parts.length > 0) {
    parts.push(`<button class="error-kb-clear-btn" data-clear-all>清除全部</button>`);
  }
  els.activeFilters.innerHTML = parts.join('');
}

function renderGrid() {
  const entries = getFilteredEntries();
  els.count.textContent = `当前收录 ${entries.length} 条错误`;

  if (entries.length === 0) {
    els.grid.innerHTML = `
      <div class="error-kb-empty">
        <div class="error-kb-empty-icon">🔍</div>
        <h3>未找到匹配的错误</h3>
        <p>尝试其他关键词，或清除筛选条件</p>
        <button class="btn btn-primary" onclick="clearAllFilters()">清除全部筛选</button>
      </div>
    `;
    return;
  }

  els.grid.innerHTML = entries.map(entry => {
    const isExpanded = expandedCards.has(entry.id);
    const cat = CATEGORIES[entry.category];
    const tagPills = entry.tags.map(t => `<span class="error-kb-badge tag">${TAG_LABELS[t] || t}</span>`).join('');

    let detailsHtml = '';
    if (isExpanded) {
      const fixList = entry.fix.map((f, i) => `<li>${f}</li>`).join('');
      const commandsHtml = (entry.commands || []).map(cmd => `
        <div class="error-kb-command">
          <div class="error-kb-command-header">
            <span class="error-kb-command-desc">${cmd.desc}</span>
            <button class="error-kb-command-copy" data-copy="${escapeHtml(cmd.cmd)}">复制</button>
          </div>
          <pre><code>${escapeHtml(cmd.cmd)}</code></pre>
        </div>
      `).join('');
      const relatedHtml = (entry.related || []).map(rid => {
        const rel = ERROR_ENTRIES.find(e => e.id === rid);
        return rel ? `<a href="#${rid}" data-related="${rid}">${rel.title}</a>` : '';
      }).filter(Boolean).join('');

      detailsHtml = `
        <div class="error-kb-details">
          <h4>根因分析</h4>
          <p class="error-kb-cause">${escapeHtml(entry.cause)}</p>
          <h4>修复步骤</h4>
          <ol class="error-kb-fix-list">${fixList}</ol>
          ${commandsHtml ? `<h4>常用命令</h4>${commandsHtml}` : ''}
          ${relatedHtml ? `<h4>相关错误</h4><div class="error-kb-related">${relatedHtml}</div>` : ''}
          <button class="error-kb-card-toggle" data-toggle="${entry.id}">收起</button>
        </div>
      `;
    }

    return `
      <article class="error-kb-card severity-${entry.severity}${isExpanded ? ' expanded' : ''}" id="${entry.id}" data-id="${entry.id}">
        <div class="error-kb-card-inner">
          <div class="error-kb-card-header">
            <div class="error-kb-card-title">${escapeHtml(entry.title)}</div>
          </div>
          <div class="error-kb-card-badges">
            <span class="error-kb-badge category">${cat.icon} ${cat.label}</span>
            ${tagPills}
          </div>
          <p class="error-kb-card-symptoms">${escapeHtml(entry.symptoms)}</p>
          ${!isExpanded ? `<button class="error-kb-card-toggle" data-toggle="${entry.id}">展开详情</button>` : ''}
          ${detailsHtml}
        </div>
      </article>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clearAllFilters() {
  activeCategory = 'all';
  activeTags.clear();
  searchQuery = '';
  if (els.searchInput) els.searchInput.value = '';
  renderAll();
}

function renderAll() {
  renderTags();
  renderActiveFilters();
  renderGrid();
}

// ── Event handlers ───────────────────────────
function init() {
  if (!els.grid) return;

  renderAll();

  // Search
  if (els.searchInput) {
    els.searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value.trim();
      renderGrid();
    }, 200));
  }

  // Tag clicks (delegation)
  document.addEventListener('click', (e) => {
    const catTag = e.target.closest('[data-category]');
    if (catTag) {
      activeCategory = catTag.dataset.category;
      renderAll();
      return;
    }
    const subTag = e.target.closest('[data-tag]');
    if (subTag) {
      const t = subTag.dataset.tag;
      if (activeTags.has(t)) activeTags.delete(t);
      else activeTags.add(t);
      renderAll();
      return;
    }
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      const id = toggle.dataset.toggle;
      if (expandedCards.has(id)) {
        expandedCards.delete(id);
        // Remove hash when collapsing
        if (window.location.hash === `#${id}`) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        expandedCards.add(id);
        history.replaceState(null, '', `#${id}`);
      }
      renderGrid();
      // Scroll into view after render
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      return;
    }
    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) {
      const text = copyBtn.dataset.copy;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '已复制 ✓';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = '复制';
          copyBtn.classList.remove('copied');
        }, 1500);
      }).catch(() => {
        copyBtn.textContent = '复制失败';
      });
      return;
    }
    const related = e.target.closest('[data-related]');
    if (related) {
      const id = related.dataset.related;
      expandedCards.add(id);
      renderGrid();
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      return;
    }
    const clearCat = e.target.closest('[data-clear-category]');
    if (clearCat) { activeCategory = 'all'; renderAll(); return; }
    const clearTag = e.target.closest('[data-clear-tag]');
    if (clearTag) { activeTags.delete(clearTag.dataset.clearTag); renderAll(); return; }
    const clearAll = e.target.closest('[data-clear-all]');
    if (clearAll) { clearAllFilters(); return; }

    // Card expand by clicking card body (but not interactive elements)
    const card = e.target.closest('.error-kb-card');
    if (card && !e.target.closest('.error-kb-details') && !e.target.closest('[data-toggle]') && !e.target.closest('[data-copy]') && !e.target.closest('[data-related]')) {
      const id = card.dataset.id;
      if (!expandedCards.has(id)) {
        expandedCards.add(id);
        history.replaceState(null, '', `#${id}`);
        renderGrid();
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    }
  });

  // URL hash on load
  const hash = window.location.hash.slice(1);
  if (hash) {
    const entry = ERROR_ENTRIES.find(e => e.id === hash);
    if (entry) {
      expandedCards.add(hash);
      renderGrid();
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

- [ ] **Step 3: 验证 JS 语法并提交**

运行：

```bash
node --check js/deployment-errors.js
```

Expected: 无输出（通过）或语法错误信息。

```bash
git add js/deployment-errors.js
git commit -m "feat: add deployment error KB data and logic"
```

---

### Task 3: 创建部署错误知识库独立页面

**Files:**
- Create: `tools/deployment-errors.html`

- [ ] **Step 1: 写入完整 HTML 页面结构**

创建 `tools/deployment-errors.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="部署错误知识库 — 本地大模型部署中常见的 CUDA、Docker、vLLM、模型加载和网络错误，含根因分析与修复方案。">
    <meta name="keywords" content="CUDA错误,Docker报错,vLLM故障,模型加载失败,部署排错,OOM修复">
    <title>部署错误知识库 — AI 部署手记</title>
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

    <main class="error-kb-page">
        <div class="container">
            <nav class="error-kb-breadcrumb" aria-label="面包屑">
                <a href="../index.html">首页</a> &gt; <a href="index.html">工具箱</a> &gt; 部署错误知识库
            </nav>

            <div class="error-kb-hero">
                <h1>部署错误知识库</h1>
                <p>本地大模型部署中常见的错误、根因分析与修复方案</p>
                <div class="error-kb-count" id="kbCount">当前收录 12 条错误</div>
            </div>

            <div class="error-kb-search">
                <input type="text" id="kbSearch" placeholder="搜索错误关键词，如 OOM、端口、CUDA..." autocomplete="off">
            </div>

            <div class="error-kb-tags">
                <div class="error-kb-tags-label">技术分类</div>
                <div class="error-kb-tag-group" id="kbCategoryTags"></div>
                <div class="error-kb-tags-label">问题类型</div>
                <div class="error-kb-tag-group" id="kbSubTags"></div>
            </div>

            <div class="error-kb-active-filters" id="kbActiveFilters"></div>

            <div class="error-kb-grid" id="kbGrid"></div>

            <div class="error-kb-related-tools">
                <h3>相关工具</h3>
                <div class="error-kb-related-grid">
                    <a href="vllm-generator.html" class="error-kb-related-card">
                        <strong>vLLM 命令生成器</strong>
                        <span>生成正确的启动命令，从源头减少配置错误。</span>
                    </a>
                    <a href="index.html#memory-calculator" class="error-kb-related-card">
                        <strong>显存估算器</strong>
                        <span>部署前估算显存需求，提前规避 OOM。</span>
                    </a>
                    <a href="index.html#deployment-advisor" class="error-kb-related-card">
                        <strong>部署选型助手</strong>
                        <span>不确定选什么方案？先做选型。</span>
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
    <script src="../js/deployment-errors.js"></script>
</body>
</html>
```

- [ ] **Step 2: 在浏览器中验证页面可正常打开**

运行本地服务器（在项目根目录）：

```bash
python3 -m http.server 8080 &
```

然后用浏览器打开 `http://localhost:8080/tools/deployment-errors.html`，验证：
1. 页面标题和面包屑正确
2. 搜索框、标签云、错误卡片都正常渲染
3. 12 条错误全部显示
4. 默认按严重程度排序（critical 在前）

- [ ] **Step 3: 提交**

```bash
git add tools/deployment-errors.html
git commit -m "feat: add deployment error KB standalone page"
```

---

### Task 4: 清理 tools/index.html 中的报错诊断器内联区块

**Files:**
- Modify: `tools/index.html`

- [ ] **Step 1: 移除 hero 区域的诊断按钮**

将第 70 行：

```html
                        <a href="#error-diagnoser" class="btn btn-hero-outline">诊断报错</a>
```

替换为：

```html
                        <a href="deployment-errors.html" class="btn btn-hero-outline">查看错误百科</a>
```

- [ ] **Step 2: 更新工具导航卡片中的报错诊断器**

将第 112-115 行：

```html
                    <a href="#error-diagnoser" class="tool-link-card">
                        <strong>部署报错诊断器</strong>
                        <span>粘贴 vLLM、Docker、CUDA、Cloudflare 常见报错并定位原因。</span>
                    </a>
```

替换为：

```html
                    <a href="deployment-errors.html" class="tool-link-card">
                        <strong>部署错误知识库</strong>
                        <span>浏览/搜索常见部署错误，含根因分析和可执行的修复方案。</span>
                    </a>
```

- [ ] **Step 3: 移除整个 error-diagnoser 内联区块**

将第 227-249 行（整个 `<section class="tool-section alt" id="error-diagnoser">...</section>` 区块）删除。

- [ ] **Step 4: 更新 meta 描述中的工具列表**

将第 6 行的 meta description：

```html
    <meta name="description" content="AI 部署工具箱：vLLM 启动命令生成器、显存估算器、本地模型成本计算器、报错诊断器和部署选型助手。">
```

替换为：

```html
    <meta name="description" content="AI 部署工具箱：vLLM 启动命令生成器、显存估算器、本地模型成本计算器、部署错误知识库和部署选型助手。">
```

- [ ] **Step 5: 更新 hero 描述中的"报错"提法**

将第 67 行的描述：

```html
                    <p>把 vLLM 命令、显存、成本、报错和选型这些反复查的问题，变成可直接操作的工具。适合部署 Qwen、Llama、DeepSeek、Ollama、GPUStack 和自建 API 服务时使用。</p>
```

替换为：

```html
                    <p>把 vLLM 命令、显存、成本、错误排查和选型这些反复查的问题，变成可直接操作的工具。适合部署 Qwen、Llama、DeepSeek、Ollama、GPUStack 和自建 API 服务时使用。</p>
```

- [ ] **Step 6: 验证并提交**

确认 `tools/index.html` 中不再包含 `error-diagnoser`、`diagnoseForm` 或 `部署报错诊断器` 相关内容。

```bash
grep -n "error-diagnoser\|diagnoseForm\|部署报错诊断器" tools/index.html || echo "Clean"
```

Expected: `Clean`

```bash
git add tools/index.html
git commit -m "refactor: remove inline error diagnoser, link to standalone KB"
```

---

### Task 5: 从 js/main.js 中移除 diagnoseForm 逻辑

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: 移除 diagnoseForm 相关代码**

删除第 240-302 行的整个 `diagnoseForm` 代码块（从 `const diagnoseForm = document.getElementById('diagnoseForm');` 到该代码块结束，包含 rules 数组和 diagnose 函数）。

- [ ] **Step 2: 验证并提交**

确认 `js/main.js` 中不再包含 `diagnoseForm` 或 `diagnoseResult`：

```bash
grep -n "diagnoseForm\|diagnoseResult" js/main.js || echo "Clean"
```

Expected: `Clean`

```bash
git add js/main.js
git commit -m "refactor: remove diagnoseForm logic from main.js"
```

---

### Task 6: 更新首页 index.html 中的工具卡片

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 找到首页中的报错诊断器卡片并更新**

在 `index.html` 中搜索包含"报错诊断"或"诊断"的卡片区域。通常位于 `.homepage-tool-card` 或类似的工具展示区域。将对应的卡片：

```html
<!-- 修改前（类似结构） -->
<a href="tools/index.html#error-diagnoser" class="homepage-tool-card">
    <strong>部署报错诊断器</strong>
    <span>粘贴报错快速定位原因</span>
</a>
```

替换为：

```html
<a href="tools/deployment-errors.html" class="homepage-tool-card">
    <strong>部署错误知识库</strong>
    <span>浏览常见部署错误与修复方案</span>
</a>
```

如果首页中不存在独立的工具卡片（而是通过链接跳转到工具箱），则只需要更新 meta 描述中的工具列表。

- [ ] **Step 2: 更新 meta 描述**

确认 `index.html` 中的 meta description 和 keywords 已更新：

将第 6 行的：

```html
    <meta name="description" content="AI 部署手记 — 本地大模型部署工具箱：vLLM 命令生成器、显存估算器、成本计算器、报错诊断器和部署选型助手。">
```

替换为：

```html
    <meta name="description" content="AI 部署手记 — 本地大模型部署工具箱：vLLM 命令生成器、显存估算器、成本计算器、部署错误知识库和部署选型助手。">
```

- [ ] **Step 3: 验证并提交**

```bash
grep -n "报错诊断\|error-diagnoser" index.html || echo "Clean"
```

Expected: `Clean`（或只匹配到历史内容，确保链接已更新）

```bash
git add index.html
git commit -m "refactor: update homepage card and meta for error KB"
```

---

### Task 7: 更新 vllm-generator.html 中的关联工具链接

**Files:**
- Modify: `tools/vllm-generator.html`

- [ ] **Step 1: 更新关联工具区的报错诊断器链接**

将第 305-308 行：

```html
                    <a href="index.html#error-diagnoser" class="related-card">
                        <strong>报错诊断器</strong>
                        <span>部署遇到问题？粘贴报错快速定位。</span>
                    </a>
```

替换为：

```html
                    <a href="deployment-errors.html" class="related-card">
                        <strong>部署错误知识库</strong>
                        <span>部署遇到问题？搜索常见错误和修复方案。</span>
                    </a>
```

- [ ] **Step 2: 验证并提交**

```bash
grep -n "error-diagnoser" tools/vllm-generator.html || echo "Clean"
```

Expected: `Clean`

```bash
git add tools/vllm-generator.html
git commit -m "refactor: update vllm generator related tools link to error KB"
```

---

## 功能验收清单

部署完成后，在浏览器中逐项验证：

- [ ] 打开 `tools/deployment-errors.html`，看到 12 条错误卡片
- [ ] 默认按严重程度排序（critical 红色在前）
- [ ] 点击"CUDA"标签，只显示 CUDA 相关的 3 条错误
- [ ] 再点击"OOM"子标签，显示同时满足 CUDA + OOM 的错误（cuda-oom）
- [ ] 点击"清除全部"，恢复全部显示
- [ ] 搜索框输入"端口"，显示 network-port-in-use
- [ ] 展开 cuda-oom 卡片，看到根因分析、5 条修复步骤、2 个命令块
- [ ] 点击命令块的"复制"按钮，显示"已复制 ✓"，1.5 秒后恢复
- [ ] 展开卡片底部有相关错误链接，点击跳转到相关卡片并展开
- [ ] URL 带 `#cuda-oom` 时页面加载自动滚动到该卡片并展开
- [ ] 搜索/过滤后无结果时显示空状态提示和"清除全部筛选"按钮
- [ ] `tools/index.html` 中不再显示报错诊断器内联区块
- [ ] `tools/index.html` 的"部署错误知识库"卡片链接到 deployment-errors.html
- [ ] 首页和 vLLM 生成器的关联链接已更新
- [ ] 响应式：缩小浏览器到 <768px，卡片变为单列，标签云可横向滑动

---

## Spec Coverage Check

| 设计文档章节 | 对应任务 |
|-------------|---------|
| 2. 页面结构（Hero, 搜索, 标签云, 卡片网格, 关联工具） | Task 3 |
| 3. 错误数据结构（12 条完整数据） | Task 2 |
| 4. 标签体系（6 主分类 + 7 子标签） | Task 2 |
| 5.1 标签过滤（多标签 AND 交集） | Task 2 |
| 5.2 搜索（debounce 200ms, 大小写不敏感） | Task 2 |
| 5.3 排序（severity 降序） | Task 2 |
| 6.1 折叠态（色条, 标签 pills, 症状摘要） | Task 1 + Task 2 |
| 6.2 展开态（根因, 修复步骤, 命令块, 相关错误） | Task 1 + Task 2 |
| 6.3 展开行为（点击展开, 平滑动画, URL 锚点） | Task 2 |
| 7. 初始内容（12 条） | Task 2 |
| 8. 与其他页面的关系 | Task 4, 5, 6, 7 |
| 9. 边界情况（无结果, URL 锚点, 相关 ID 不存在, 命令为空） | Task 2 |

## Placeholder Scan

- 无 "TBD", "TODO", "implement later", "fill in details"
- 无 "Add appropriate error handling" 等模糊指令
- 无 "Similar to Task N" 引用
- 所有代码块包含完整可运行代码

## Type Consistency

- `severity` 值始终为 `'warning' | 'error' | 'critical'`，与 CSS 类名 `severity-warning/error/critical` 一致
- `category` 值与 `CATEGORIES` 对象键一致
- `tags` 值与 `TAG_LABELS` 对象键一致
- `related` 数组中的 ID 均存在于 `ERROR_ENTRIES` 中（network-port-in-use ↔ network-tunnel-502 互相引用；cuda-oom ↔ cuda-driver-mismatch ↔ vllm-context-overflow 形成链）
