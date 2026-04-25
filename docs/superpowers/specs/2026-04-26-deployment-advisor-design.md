# 部署选型助手 — 设计文档

**日期**: 2026-04-26
**主题**: 将内联"部署选型助手"拆分为独立页面，升级为向导式多方案对比+模型推荐
**状态**: 待用户审核

---

## 1. 设计目标

| 目标 | 说明 |
|------|------|
| **拆分独立页面** | 从 tools/index.html 内联区块拆分为 tools/deployment-advisor.html |
| **向导式交互** | 4 步 Stepper 向导，每步 1-3 个问题，降低决策压力 |
| **多方案对比** | 不仅推荐一个方案，还用对比表格展示备选方案的差异 |
| **模型推荐** | 根据最佳方案推荐 2-3 个具体模型，含显存需求和特点标签 |
| **可执行下一步** | 结果页提供明确的行动路径（显存估算 → 命令生成 → 错误排查） |

---

## 2. 页面结构

```
tools/deployment-advisor.html
├── Header（固定导航，与站点一致）
├── Breadcrumb: 首页 > 工具箱 > 部署选型助手
├── Page Hero
│   ├── 标题: "模型部署选型助手"
│   └── 副标题: "根据你的场景、硬件和团队条件，推荐最适合的部署方案"
├── Stepper 向导（4 步）
│   ├── Step 1: 场景与目标
│   ├── Step 2: 硬件与规模
│   ├── Step 3: 经验与偏好
│   └── Step 4: 选型结果
├── 结果展示区（Step 4 动态渲染）
│   ├── 最佳推荐卡片
│   ├── 备选方案对比表格
│   ├── 推荐模型列表
│   └── 下一步行动建议
├── 关联工具推荐
│   └── vLLM 命令生成器、显存估算器、部署错误知识库
└── Footer
```

**响应式断点**:
- ≥768px: Stepper 水平排列，结果区双列（推荐卡片 + 对比表格并排）
- <768px: Stepper 可横向滑动，单列布局，对比表格横向滚动

---

## 3. Stepper 向导设计

### 3.1 Step 1: 场景与目标

**主要用途**（单选，卡片式网格，2×2）

| 选项 | value | 描述 |
|------|-------|------|
| 个人试用 / 本地聊天 | `personal` | 自己想体验大模型，或本地运行聊天机器人 |
| 开发调试 / 原型验证 | `dev` | 做 AI 应用开发，需要 API 接口测试 |
| 团队内部 API | `team` | 给团队/部门提供统一模型服务入口 |
| 生产级高并发服务 | `prod` | 面向用户的产品级部署，需要稳定性和吞吐 |

**优先目标**（单选，卡片式）

| 选项 | value |
|------|-------|
| 简单省心 | `simple` |
| 长期低成本 | `cost` |
| 吞吐和延迟 | `performance` |
| 数据隐私 | `privacy` |

### 3.2 Step 2: 硬件与规模

**硬件条件**（单选，卡片式，带图标）

| 选项 | value | 图标 |
|------|-------|------|
| 暂无 GPU | `none` | 💻 |
| Mac / 集成显卡 | `mac` | 🍎 |
| 单张消费级 GPU (8-24GB) | `single` | 🎮 |
| 多张 GPU / 服务器 | `multi` | 🖥️ |

**预计并发**（数字输入 + Slider 联动）
- 范围: 1-10000
- 默认值: 5
- 显示标签: 1=`个人使用`, 10=`小团队`, 100=`部门级`, 1000+=`生产级`

**特定模型需求**（多选，可选）

| 选项 | value |
|------|-------|
| 需要中文能力强 | `chinese` |
| 需要代码能力 | `code` |
| 需要多模态 | `multimodal` |
| 需要工具调用(Function Calling) | `tools` |
| 没有特殊要求 | `none` |

### 3.3 Step 3: 经验与偏好

**部署经验**（单选）

| 选项 | value |
|------|-------|
| 刚开始部署 | `beginner` |
| 会 Docker 和基础 Linux | `intermediate` |
| 熟悉 GPU 服务和监控 | `advanced` |

**部署偏好**（单选）

| 选项 | value |
|------|-------|
| 优先本地/私有部署 | `local` |
| 云端也可以接受 | `both` |
| 优先云端（不想运维） | `cloud` |

**预算敏感度**（单选）

| 选项 | value |
|------|-------|
| 预算有限，尽量省钱 | `tight` |
| 中等，性价比优先 | `medium` |
| 预算充足，追求体验 | `high` |

### 3.4 Step 4: 选型结果

自动展示，无需用户输入。包含 4 个信息区域（详见第 4 节）。

### 3.5 导航按钮

- 每步底部有"上一步"（Step 2-4）和"下一步"（Step 1-3）
- Step 4 显示"重新选型"按钮，点击重置所有选择回到 Step 1
- Step 1 的"下一步"在选项未选时禁用

---

## 4. 结果页设计

### 4.1 区域 1: 最佳推荐卡片

```
┌─────────────────────────────────────────────┐
│  ⚡ vLLM                          最匹配 95% │
│  生产级高吞吐模型服务                          │
│                                              │
│  匹配理由: 场景匹配 ✓ 硬件满足 ✓ 性能优先 ✓     │
│                                              │
│  ✅ 高吞吐  ✅ OpenAI API 兼容  ✅ 多卡并行    │
│  ❌ 需要 NVIDIA GPU  ❌ 配置较复杂             │
│                                              │
│  预估显存: 单卡 16-24GB 可跑 7B-32B 模型      │
│  运维成本: 中                                 │
└─────────────────────────────────────────────┘
```

- 左侧大图标 + 方案名称
- 右上角 `最匹配` 标签 + 推荐指数百分比
- 一句话 tagline
- 匹配理由 pills（显示评分维度中得分高的项）
- 优劣势列表（✅/❌ 图标）
- 预估显存需求和运维成本

### 4.2 区域 2: 备选方案对比表格

| 维度 | 最佳推荐 | 备选 A | 备选 B |
|------|---------|--------|--------|
| 方案 | ⚡ vLLM | 🦙 Ollama | 🖥️ GPUStack |
| 推荐指数 | 95% | 72% | 68% |
| 适用场景 | 高并发 API | 本地试用 | 团队管理 |
| 硬件要求 | NVIDIA GPU | Mac/任意 | NVIDIA GPU |
| 学习成本 | 中高 | 低 | 中高 |
| 并发能力 | 高 | 低 | 中 |
| API 兼容 | OpenAI | 无 | OpenAI |
| 运维成本 | 中 | 极低 | 中 |

- 表格首列固定，横向滚动时保持可见
- 最佳推荐列用高亮背景区分

### 4.3 区域 3: 推荐模型列表

按最佳推荐方案过滤，展示 2-3 个模型：

```
┌─────────────────────────────────────────────┐
│ Qwen3-7B-Instruct                    7B FP16 │
│ 显存需求: ~16GB                              │
│ 特点: 中文强 · 代码好                        │
│ [生成启动命令]                               │
└─────────────────────────────────────────────┘
```

- 模型名 + 参数量 + 量化方式
- 显存需求（用显存估算器的计算公式）
- 特点标签 pills
- **生成启动命令**按钮：点击跳转到 vLLM 命令生成器，预填模型名

### 4.4 区域 4: 下一步行动建议

编号列表：
1. 🔍 用**显存估算器**确认你的硬件是否满足模型需求
2. ⚡ 用**vLLM 命令生成器**一键生成启动命令
3. 📚 部署中遇到报错？查看**部署错误知识库**

### 4.5 重新选型

底部居中放置"重新选型"按钮，点击后：
- 清空所有选择状态
- 回到 Step 1
- 平滑滚动到页面顶部

---

## 5. 数据结构

### 5.1 方案数据

```javascript
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
```

### 5.2 硬件等级映射

```javascript
const HARDWARE_LEVELS = { none: 0, mac: 1, single: 2, multi: 3 };
```

### 5.3 经验等级映射

```javascript
const EXPERIENCE_LEVELS = { beginner: 0, intermediate: 1, advanced: 2 };
```

### 5.4 学习曲线映射

```javascript
const LEARN_CURVE_LEVELS = { 低: 0, 中: 1, 中高: 2, 高: 3 };
```

---

## 6. 决策评分逻辑

### 6.1 评分维度与权重

| 维度 | 权重 | 评分逻辑 |
|------|------|---------|
| 场景匹配 | 25% | purpose 是否在 SOLUTION.bestScenes 中，匹配 100，否则 0 |
| 硬件满足 | 20% | HARDWARE_LEVELS[hardware] >= HARDWARE_LEVELS[minHardware] ? 100 : (差 1 级 50，差 2 级 20，差 3 级 0) |
| 并发满足 | 15% | concurrency <= maxConcurrency ? 100 : (超出倍数反向扣分，最低 0) |
| 经验匹配 | 15% | 100 - abs(EXPERIENCE_LEVELS[experience] - LEARN_CURVE_LEVELS[learnCurve]) * 33 |
| 优先级匹配 | 15% | 根据 priority 与方案特性匹配（见下表） |
| 部署偏好 | 10% | local/cloud/both 与方案类型匹配度 |

### 6.2 优先级匹配细则

| priority | vLLM | Ollama | GPUStack | 云端 API |
|----------|------|--------|----------|----------|
| simple | 40 | 100 | 30 | 80 |
| cost | 70 | 90 | 60 | 40 |
| performance | 100 | 20 | 70 | 60 |
| privacy | 90 | 100 | 80 | 0 |

### 6.3 部署偏好匹配

| preference | 本地方案(Ollama/vLLM/GPUStack) | 云端 API |
|------------|-------------------------------|----------|
| local | 100 | 0 |
| both | 80 | 80 |
| cloud | 30 | 100 |

### 6.4 预算敏感度调整

| budget | 本地方案 | 云端 API |
|--------|---------|----------|
| tight | +10 | -20 |
| medium | 0 | 0 |
| high | 0 | +10 |

### 6.5 模型需求过滤

如果用户选择了特定模型需求（chinese/code/multimodal/tools），在推荐模型列表中优先展示包含对应 tags 的模型。如果某方案没有任何模型匹配用户需求，该方案扣 10 分。

### 6.6 输出排序

按总分降序排列，取前 3 名：
- 第 1 名: 最佳推荐
- 第 2-3 名: 备选方案

---

## 7. 与其他页面的关系

| 页面 | 变更 |
|------|------|
| `tools/index.html` | 移除 `#deployment-advisor` 内联区块，工具卡片链接改为 `deployment-advisor.html` |
| `js/main.js` | 移除 `advisorForm` 逻辑 |
| `index.html` | 首页"部署选型助手"卡片链接更新 |
| `tools/vllm-generator.html` | 关联工具区链接更新 |
| `tools/deployment-errors.html` | 关联工具区添加部署选型助手链接 |

---

## 8. 边界情况

| 场景 | 处理 |
|------|------|
| 用户未选完所有问题就点下一步 | 禁用下一步按钮，未选问题标红提示 |
| 所有方案得分都很低（<40） | 显示警告："当前条件限制较多，建议调整硬件或降低并发期望" |
| 硬件为 none 但选 production | 强制云端 API 为最佳推荐，显示提示 |
| 用户硬件只满足 Ollama 但选 production | 最佳推荐 Ollama，但显示黄色警告："当前硬件无法支撑生产级并发，建议升级 GPU" |
| 模型需求无匹配 | 静默忽略不匹配的模型，不因此隐藏方案 |
| JavaScript 禁用 | 页面降级为全部问题展开的长表单，提交后显示静态结果（所有方案并列展示） |

---

*设计确认后，下一步：编写实现计划。*
