# 部署错误知识库 — 设计文档

**日期**: 2026-04-25
**主题**: 替换原有"报错诊断器"为可搜索/按标签筛选的交互式部署错误知识库
**状态**: 待用户审核

---

## 1. 设计目标

| 目标 | 说明 |
|------|------|
| **替换报错诊断器** | 从"粘贴报错匹配规则"改为"浏览/搜索常见错误百科" |
| **标签化组织** | 按技术栈主分类 + 现象/阶段子标签混合组织 |
| **快速定位** | 标签云为主、搜索为辅的过滤方式 |
| **可执行修复** | 每条错误附带根因分析、修复步骤和可复制命令 |
| **扩展友好** | 数据结构支持未来增加错误条目，无需改代码 |

---

## 2. 页面结构

```
tools/deployment-errors.html
├── Header（固定导航，与站点一致）
├── Breadcrumb: 首页 > 工具箱 > 部署错误知识库
├── Page Hero
│   ├── 标题: "部署错误知识库"
│   ├── 副标题: "本地大模型部署中常见的错误、根因分析与修复方案"
│   └── 统计: "当前收录 X 条错误"
├── 主内容区
│   ├── 搜索栏
│   │   └── 输入框 + 搜索按钮（placeholder: 搜索错误关键词，如 OOM、端口、CUDA...）
│   ├── 标签云过滤栏
│   │   ├── 主分类标签: 全部 | CUDA | Docker | vLLM | 模型加载 | 网络代理
│   │   └── 子标签: OOM | 启动失败 | 推理异常 | 配置问题 | 权限拒绝 | 性能问题 | 版本不兼容
│   ├── 活跃过滤器展示
│   │   └── 已选标签 pill + "×"移除 + "清除全部"按钮
│   └── 错误卡片网格
│       └── 每个卡片: 标题 + 严重程度色条 + 分类标签 + 症状摘要
│           └── 展开后: 根因分析 + 编号修复步骤 + 可复制命令块 + 相关错误链接
├── 关联工具推荐
│   └── 显存估算器、vLLM 命令生成器、部署选型助手
└── Footer
```

**响应式断点**:
- ≥768px: 标签云水平排列，卡片双列网格
- <768px: 标签云可横向滑动，卡片单列，展开后全宽

---

## 3. 错误数据结构

```javascript
const ERROR_ENTRIES = [
  {
    id: 'cuda-oom',
    title: 'CUDA OutOfMemoryError',
    keywords: ['outofmemory', 'cuda out of memory', 'oom', 'cannot allocate memory'],
    category: 'cuda',
    tags: ['oom', 'startup', 'inference'],
    severity: 'error',        // 'warning' | 'error' | 'critical'
    symptoms: '启动或推理时抛出 torch.cuda.OutOfMemoryError，nvidia-smi 显示显存接近 100%',
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
  }
];
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | URL-friendly 唯一标识 |
| `title` | string | 是 | 错误名称，卡片标题 |
| `keywords` | string[] | 是 | 搜索匹配词，包含常见报错文本片段 |
| `category` | string | 是 | 主分类，必须是预定义分类之一 |
| `tags` | string[] | 是 | 子标签，从预定义标签池中选择 |
| `severity` | string | 是 | `warning`（黄色）/ `error`（红色）/ `critical`（深红） |
| `symptoms` | string | 是 | 用户看到的现象描述，折叠态展示 |
| `cause` | string | 是 | 根因分析，展开态展示 |
| `fix` | string[] | 是 | 修复步骤数组，每条渲染为编号列表项 |
| `commands` | {desc, cmd}[] | 否 | 可复制命令块，每条含描述和命令 |
| `related` | string[] | 否 | 相关错误 ID 数组 |

---

## 4. 标签体系

### 4.1 主分类（技术栈）

每个错误必须有且仅有一个主分类。

| 分类 | ID | 图标 | 颜色 | 说明 |
|------|-----|------|------|------|
| 全部 | `all` | — | — | 伪分类，显示全部 |
| CUDA | `cuda` | 🔥 | `#e74c3c` | CUDA 驱动、运行时、显存 |
| Docker | `docker` | 🐳 | `#3498db` | 容器、镜像、GPU 挂载 |
| vLLM | `vllm` | ⚡ | `#f39c12` | 模型服务、API、调度 |
| 模型加载 | `model` | 📦 | `#9b59b6` | 权重加载、量化、路径 |
| 网络代理 | `network` | 🌐 | `#27ae60` | 端口、代理、Tunnel、防火墙 |

### 4.2 子标签（现象/阶段）

一个错误可以有多个子标签。

| 标签 | ID | 说明 |
|------|-----|------|
| OOM | `oom` | 显存/内存不足 |
| 启动失败 | `startup` | 服务无法正常启动 |
| 推理异常 | `inference` | 运行中生成报错或结果异常 |
| 配置问题 | `config` | 参数设置不当 |
| 权限拒绝 | `permission` | 认证、文件访问、gated model |
| 性能问题 | `performance` | 过慢、超时、卡住 |
| 版本不兼容 | `version` | 驱动、CUDA、Python 版本冲突 |

---

## 5. 过滤与搜索逻辑

### 5.1 标签过滤

- 标签云展示所有主分类 + 去重后的子标签（按使用频次排序）
- 点击标签 → 高亮该标签，卡片网格实时过滤
- **多标签交集（AND）**: 同时选中多个标签时，只显示满足全部条件的错误
- 已选标签旁显示 "×"，点击移除
- 提供"清除全部"按钮
- 无匹配结果时显示提示和"清除全部筛选"按钮

### 5.2 搜索

- 实时搜索（debounce 200ms）
- 搜索范围：`title`、`keywords`、`symptoms`、`cause`
- 大小写不敏感，包含匹配（非精确匹配）
- 搜索与标签过滤可叠加使用（搜索在已过滤结果中进一步筛选）

### 5.3 排序（可选增强）

- 默认：按 `severity` 降序（critical > error > warning），同 severity 按 title 字母序
- 可选：按 title 字母序

---

## 6. 卡片交互

### 6.1 折叠态（默认）

- 顶部：严重程度色条（左侧 4px 竖条）
- 标题 + 分类标签 pill + 子标签 pills
- `symptoms` 前 100 字（超长截断加"..."）
- 右下角："展开详情" 按钮

### 6.2 展开态

- 显示完整内容区域：
  - **根因分析**: `cause` 文本
  - **修复步骤**: `fix` 数组渲染为编号列表（1. 2. 3.）
  - **常用命令**: `commands` 渲染为代码块
    - 左上角：`desc` 作为标签
    - 右上角：复制按钮 → 点击后 "已复制 ✓"（1.5s 后恢复）
    - 命令文本支持水平滚动
  - **相关错误**: `related` 对应错误的小型卡片（仅标题），点击滚动定位并自动展开
- 底部："收起" 按钮

### 6.3 展开行为

- 点击卡片任意区域（标签和复制按钮除外）展开/折叠
- 平滑动画展开
- 非手风琴模式：可同时展开多个卡片
- 展开某卡片后，URL 可选追加 `#error-id` 锚点，支持直接链接到特定错误

---

## 7. 初始内容范围（精简版：12 条）

### CUDA（3 条）
1. `cuda-oom` — CUDA OutOfMemoryError
2. `cuda-driver-mismatch` — CUDA 驱动版本不匹配
3. `cuda-no-device` — 未检测到 CUDA 设备

### Docker（2 条）
4. `docker-gpu-mount` — Docker GPU 挂载失败 / nvidia-container 错误
5. `docker-image-pull` — Docker 镜像拉取失败

### vLLM（3 条）
6. `vllm-context-overflow` — 上下文长度超出限制
7. `vllm-scheduling-timeout` — vLLM 调度超时 / 请求卡住
8. `vllm-model-not-found` — 模型路径或名称不存在

### 模型加载（2 条）
9. `model-quantization-incompatible` — 量化格式与运行时不兼容
10. `model-gated-permission` — Gated model / HuggingFace 权限不足

### 网络代理（2 条）
11. `network-port-in-use` — 端口被占用
12. `network-tunnel-502` — Cloudflare Tunnel / 反向代理 502

---

## 8. 与其他页面的关系

| 页面 | 变更 |
|------|------|
| `tools/index.html` | 移除 `#error-diagnoser` 内联区块，工具卡片链接改为 `deployment-errors.html` |
| `js/main.js` | 移除 `diagnoseForm` 逻辑（约 60 行） |
| `index.html` | 首页"报错诊断器"卡片改为"部署错误知识库"，链接更新 |

---

## 9. 边界情况

| 场景 | 处理 |
|------|------|
| 过滤后无结果 | 显示空状态提示 + "清除全部筛选"按钮 |
| 搜索无结果 | 同上，提示尝试其他关键词 |
| URL 带 `#error-id` 锚点 | 页面加载后滚动到对应卡片并自动展开 |
| `related` 中的 ID 不存在 | 静默忽略，不渲染该链接 |
| `commands` 为空 | 不渲染命令区域 |
| JavaScript 禁用 | 页面降级为全部展开的长列表，标签云失效 |

---

*设计确认后，下一步：编写实现计划。*
