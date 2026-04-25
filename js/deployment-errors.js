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
    keywords: ['max_model_len', 'context length', 'sequence length', 'rope', 'sliding window', "exceeds model's max"],
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
  {
    id: 'python-dependency-conflict',
    title: 'Python 依赖冲突 / 版本不兼容',
    keywords: ['dependency', 'version conflict', 'transformers', 'torch', 'numpy', 'pydantic', 'install', 'requirement', 'no module named', 'attributeerror', 'import error'],
    category: 'vllm',
    tags: ['startup', 'version', 'config'],
    severity: 'error',
    symptoms: '导入或启动时报错 "No module named xxx"、"AttributeError"、"ImportError"，或 pip install 时提示版本冲突无法解决依赖。',
    cause: 'vLLM、transformers、torch 等核心库的版本矩阵复杂，某一库升级后可能破坏与其他库的兼容性。常见问题包括：transformers 版本太新/太旧、torch CUDA 版本与本地不匹配、pydantic v1/v2 API 变更导致不兼容。',
    fix: [
      '使用虚拟环境隔离依赖（venv / conda），避免与系统 Python 混用',
      '按 vLLM 官方文档安装指定版本的 torch 和 transformers',
      '遇到 pydantic 冲突时，统一升级到 v2：pip install "pydantic>=2.0"',
      '使用 pip install 时加 --no-deps 然后手动安装缺失依赖',
      '必要时删除环境重建，按官方 requirements 重新安装'
    ],
    commands: [
      { desc: '查看当前关键包版本', cmd: 'pip show torch transformers vllm pydantic' },
      { desc: '按 vLLM 推荐版本安装', cmd: 'pip install vllm torch transformers --upgrade' }
    ],
    related: ['cuda-driver-mismatch', 'model-quantization-incompatible']
  },
  {
    id: 'model-download-slow',
    title: '模型下载慢或中断',
    keywords: ['download slow', 'huggingface', 'connection timeout', 'ssl', 'connection reset', 'download interrupted', 'snapshot download', 'hf-mirror'],
    category: 'model',
    tags: ['startup', 'config'],
    severity: 'warning',
    symptoms: 'huggingface-cli download 或首次启动时下载模型极慢（几 KB/s）、频繁超时中断，或报错 SSL/连接重置。',
    cause: '国内网络访问 HuggingFace 官方服务器不稳定，或模型文件过大（数十 GB）导致下载时间长、容易中断。也可能是本地磁盘空间不足导致写入失败。',
    fix: [
      '使用 HuggingFace 镜像站：export HF_ENDPOINT=https://hf-mirror.com',
      '使用模型站（如 ModelScope）下载后转放到本地目录',
      '使用 huggingface-cli 的 --resume-download 断点续传',
      '预先在网速好的机器下载，通过硬盘/U盘/内网传输到目标机器',
      '检查磁盘剩余空间是否大于模型文件 2 倍以上（下载时需要临时空间）'
    ],
    commands: [
      { desc: '使用镜像站下载', cmd: 'export HF_ENDPOINT=https://hf-mirror.com\nhuggingface-cli download Qwen/Qwen3-7B-Instruct --local-dir ./models/qwen3-7b' },
      { desc: '断点续传下载', cmd: 'huggingface-cli download Qwen/Qwen3-7B-Instruct --resume-download --local-dir ./models/qwen3-7b' }
    ],
    related: ['vllm-model-not-found', 'model-gated-permission']
  },
  {
    id: 'nccl-multi-gpu-error',
    title: 'NCCL 多卡通信错误',
    keywords: ['nccl', 'multi gpu', 'tensor parallel', 'communication', 'allreduce', 'rank', 'distributed', 'timeout', 'ibv'],
    category: 'cuda',
    tags: ['startup', 'config', 'performance'],
    severity: 'error',
    symptoms: '多卡启动（--tensor-parallel-size > 1）时报错 "NCCL error"、"unhandled system error"、"connection refused by rank" 或进程卡死。',
    cause: 'NCCL（NVIDIA Collective Communications Library）需要 GPU 之间通过 PCIe 或 NVLink 进行通信。常见原因：IB/RDMA 网络配置错误、防火墙阻止 NCCL 端口、多卡环境下 NCCL 超时、或显卡不在同一 NUMA 节点导致通信异常。',
    fix: [
      '确认所有 GPU 可被 nvidia-smi 正常识别',
      '设置 NCCL 环境变量使用 TCP 而非 IB：export NCCL_IB_DISABLE=1',
      '设置 NCCL 调试日志定位问题：export NCCL_DEBUG=INFO',
      '检查防火墙是否阻止了 NCCL 使用的端口范围',
      '确认多卡在同一物理机内，跨机分布式需要额外的网络配置'
    ],
    commands: [
      { desc: '禁用 IB 使用纯 TCP', cmd: 'export NCCL_IB_DISABLE=1\npython -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --tensor-parallel-size 2' },
      { desc: '开启 NCCL 调试日志', cmd: 'export NCCL_DEBUG=INFO\npython -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --tensor-parallel-size 2 2>&1 | grep NCCL' }
    ],
    related: ['cuda-no-device', 'cuda-oom']
  },
  {
    id: 'file-permission-denied',
    title: '文件/目录权限不足',
    keywords: ['permission denied', 'access denied', 'readonly', 'write permission', 'mkdir', 'cache', 'huggingface hub'],
    category: 'model',
    tags: ['startup', 'permission', 'config'],
    severity: 'warning',
    symptoms: '启动时报错 "Permission denied"、"Read-only file system"，或模型下载到一半报错无法写入，无法创建缓存目录。',
    cause: '当前用户没有模型目录或 HuggingFace 缓存目录的写入权限；磁盘以只读方式挂载；或使用了 sudo 下载模型后普通用户无法读取。也可能是 Docker 容器内用户 UID 与宿主机不一致导致权限问题。',
    fix: [
      '检查并修改目录权限：chmod -R u+rw /path/to/models',
      '确认磁盘未以只读挂载：mount | grep 对应分区',
      '设置 HuggingFace 缓存目录到用户有权限的位置：export HF_HOME=/home/$(whoami)/.cache/huggingface',
      '避免混用 root 和普通用户下载模型',
      'Docker 运行时添加 --user $(id -u):$(id -g) 或使用相同 UID 的镜像用户'
    ],
    commands: [
      { desc: '修复模型目录权限', cmd: 'chmod -R u+rw ./models\nchown -R $(whoami):$(whoami) ./models' },
      { desc: '设置自定义缓存目录', cmd: 'export HF_HOME=$HOME/.cache/huggingface\nexport TRANSFORMERS_CACHE=$HOME/.cache/huggingface' }
    ],
    related: ['vllm-model-not-found', 'docker-gpu-mount']
  },
];

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
  els.categoryTags.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const isActive = activeCategory === key;
    return `<span class="error-kb-tag${isActive ? ' active' : ''}" data-category="${key}">${cat.icon ? `<span class="tag-icon">${cat.icon}</span>` : ''}${cat.label}</span>`;
  }).join('');

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

  if (els.searchInput) {
    els.searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value.trim();
      renderGrid();
    }, 200));
  }

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
        if (window.location.hash === `#${id}`) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        expandedCards.add(id);
        history.replaceState(null, '', `#${id}`);
      }
      renderGrid();
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
