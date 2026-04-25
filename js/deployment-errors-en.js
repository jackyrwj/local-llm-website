/* Deployment Error KB — deployment-errors-en.js */

const CATEGORIES = {
  all:    { label: 'All', icon: '', color: '' },
  cuda:   { label: 'CUDA', icon: '🔥', color: '#e74c3c' },
  docker: { label: 'Docker', icon: '🐳', color: '#3498db' },
  vllm:   { label: 'vLLM', icon: '⚡', color: '#f39c12' },
  model:  { label: 'Model Loading', icon: '📦', color: '#9b59b6' },
  network:{ label: 'Network', icon: '🌐', color: '#27ae60' },
};

const TAG_LABELS = {
  oom: 'OOM',
  startup: 'Startup Failure',
  inference: 'Inference Error',
  config: 'Config Issue',
  permission: 'Permission Denied',
  performance: 'Performance',
  version: 'Version Incompatibility',
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
    symptoms: 'torch.cuda.OutOfMemoryError is thrown during startup or inference. nvidia-smi shows GPU memory near 100%, and the service crashes or hangs.',
    cause: 'Model weights, KV Cache, concurrent requests, or context length exceed available GPU memory. Although vLLM\'s PagedAttention efficiently manages memory, sufficient contiguous memory is still required when initially loading weights and during warmup.',
    fix: [
      'Reduce --max-model-len (e.g., from 8192 to 4096 or 2048)',
      'Reduce concurrency --max-num-seqs (e.g., from 16 to 4-8)',
      'Use a quantized model (AWQ/GPTQ 4bit can reduce weight memory by 50-60%)',
      'Lower --gpu-memory-utilization (e.g., from 0.9 to 0.85 to reserve more safety margin)',
      'Enable --tensor-parallel-size on multi-GPU setups to distribute weights'
    ],
    commands: [
      { desc: 'Check current GPU memory usage', cmd: 'nvidia-smi' },
      { desc: 'Launch with limited context and concurrency', cmd: 'python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --max-model-len 4096 --max-num-seqs 8 --gpu-memory-utilization 0.85' }
    ],
    related: ['cuda-driver-mismatch', 'vllm-context-overflow']
  },
  {
    id: 'cuda-driver-mismatch',
    title: 'CUDA Driver Version Mismatch',
    keywords: ['cuda driver', 'driver version', 'libcuda', 'cuda runtime', 'insufficient driver', 'nvidia-smi failed'],
    category: 'cuda',
    tags: ['startup', 'version'],
    severity: 'critical',
    symptoms: 'Error contains "CUDA driver version is insufficient for runtime version" or "no CUDA-capable device is detected". nvidia-smi fails to run or shows abnormal output.',
    cause: 'The host NVIDIA driver version is lower than the minimum required by PyTorch / CUDA runtime, or the CUDA Toolkit inside the container is incompatible with the host driver. Common after updating PyTorch without updating the driver, or when using pre-built images with mismatched versions.',
    fix: [
      'Run nvidia-smi to confirm the host driver version',
      'Check PyTorch official docs for the minimum driver version required by your CUDA version',
      'Upgrade the host NVIDIA driver to the recommended version (usually 525+ for CUDA 12.x)',
      'If using Docker, ensure the image CUDA version does not exceed what the host driver supports',
      'Downgrade PyTorch to a version compatible with the current driver (e.g., torch built with CUDA 11.8)'
    ],
    commands: [
      { desc: 'Check driver and CUDA versions', cmd: 'nvidia-smi\npython -c "import torch; print(torch.version.cuda, torch.cuda.is_available())"' },
      { desc: 'Downgrade PyTorch to CUDA 11.8', cmd: 'pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118' }
    ],
    related: ['cuda-no-device', 'docker-gpu-mount']
  },
  {
    id: 'cuda-no-device',
    title: 'No CUDA Device Detected',
    keywords: ['no cuda gpus', 'cuda not available', 'no device', 'cuda initialization failed', 'nvidia-smi not found'],
    category: 'cuda',
    tags: ['startup', 'config'],
    severity: 'critical',
    symptoms: 'torch.cuda.is_available() returns False. The program falls back to CPU execution (extremely slow) or directly errors with "No CUDA GPUs are available".',
    cause: 'NVIDIA driver is not installed, the GPU is not properly seated, Above 4G Decoding is disabled in BIOS, or the GPU is not allocated in a VM/cloud instance. Could also be that nvidia-modprobe is not loaded.',
    fix: [
      'Confirm the physical GPU is properly installed and powered',
      'Run nvidia-smi on the host to confirm the driver is working',
      'Check BIOS settings: enable Above 4G Decoding and Resizable BAR',
      'Load the nvidia kernel module: sudo modprobe nvidia',
      'For cloud servers, confirm the instance type includes a GPU and the corresponding driver is installed'
    ],
    commands: [
      { desc: 'Check CUDA availability', cmd: 'python -c "import torch; print(torch.cuda.is_available(), torch.cuda.device_count())"' },
      { desc: 'Load NVIDIA module', cmd: 'sudo modprobe nvidia && nvidia-smi' }
    ],
    related: ['cuda-driver-mismatch', 'docker-gpu-mount']
  },
  {
    id: 'docker-gpu-mount',
    title: 'Docker GPU Mount Failure',
    keywords: ['nvidia-container', 'could not select device driver', 'docker gpu', 'runtime nvidia', 'nvidia-docker'],
    category: 'docker',
    tags: ['startup', 'config'],
    severity: 'error',
    symptoms: 'docker run --gpus all errors with "could not select device driver" or "nvidia-container-cli: initialization error". nvidia-smi is not found inside the container.',
    cause: 'NVIDIA Container Toolkit is not installed or Docker is not configured with the nvidia runtime. Could also be that the Docker version is too old to support the --gpus flag.',
    fix: [
      'Install NVIDIA Container Toolkit (follow official docs to configure apt/yum sources)',
      'Configure Docker daemon to use nvidia runtime: /etc/docker/daemon.json',
      'Restart Docker service',
      'Use --runtime=nvidia instead of --gpus all (for older versions)',
      'Verify: docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi'
    ],
    commands: [
      { desc: 'Test GPU container', cmd: 'docker run --rm --gpus all nvidia/cuda:12.0-base-ubuntu22.04 nvidia-smi' },
      { desc: 'Check Docker runtimes', cmd: 'docker info | grep -i runtime' }
    ],
    related: ['cuda-no-device', 'docker-image-pull']
  },
  {
    id: 'docker-image-pull',
    title: 'Docker Image Pull Failure',
    keywords: ['pull access denied', 'manifest unknown', 'docker pull', 'image not found', 'unauthorized', 'net/http'],
    category: 'docker',
    tags: ['startup', 'config'],
    severity: 'warning',
    symptoms: 'docker pull errors with "pull access denied", "manifest unknown", or hangs for a long time before a network timeout.',
    cause: 'Incorrect image name/tag spelling, image does not exist, registry login required, network connectivity issues (Docker Hub access is unstable in some regions), or the image tag has been removed.',
    fix: [
      'Check if the image name and tag are spelled correctly',
      'Confirm the image is publicly available on the registry',
      'If private image, run docker login first',
      'For users in regions with unstable Docker Hub access, configure a mirror registry (e.g., Alibaba Cloud, DaoCloud)',
      'Check network connectivity: curl -v https://registry-1.docker.io/v2/'
    ],
    commands: [
      { desc: 'Login to Docker Hub', cmd: 'docker login' },
      { desc: 'Configure Alibaba Cloud mirror', cmd: 'sudo mkdir -p /etc/docker\nsudo tee /etc/docker/daemon.json <<\'EOF\'\n{\n  "registry-mirrors": ["https://<your-id>.mirror.aliyuncs.com"]\n}\nEOF\nsudo systemctl restart docker' }
    ],
    related: ['docker-gpu-mount']
  },
  {
    id: 'vllm-context-overflow',
    title: 'Context Length Exceeds Limit',
    keywords: ['max_model_len', 'context length', 'sequence length', 'rope', 'sliding window', "exceeds model's max"],
    category: 'vllm',
    tags: ['inference', 'config', 'oom'],
    severity: 'error',
    symptoms: 'Request returns "The prompt is too long" or an error indicating sequence length exceeds the model\'s max_model_len. Generated output is truncated.',
    cause: 'The sum of input prompt and generated length exceeds the --max-model-len set at vLLM startup, or exceeds the original max context length defined in the model config file. Some models (e.g., Qwen3-235B) declare a very long context in their config but are architecturally limited.',
    fix: [
      'Reduce the max_tokens parameter in requests so that prompt + max_tokens < max-model-len',
      'Shorten the input prompt by removing unnecessary context',
      'Increase --max-model-len at startup (ensure sufficient VRAM)',
      'Use chunking for long documents to avoid overly long single requests',
      'Check if max_position_embeddings in the model config.json reflects the true supported value'
    ],
    commands: [
      { desc: 'Check the model\'s true context limit', cmd: 'python -c "from transformers import AutoConfig; c=AutoConfig.from_pretrained(\'Qwen/Qwen3-7B-Instruct\'); print(c.max_position_embeddings)"' },
      { desc: 'Launch with higher context limit (requires sufficient VRAM)', cmd: 'python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --max-model-len 32768' }
    ],
    related: ['cuda-oom', 'vllm-scheduling-timeout']
  },
  {
    id: 'vllm-scheduling-timeout',
    title: 'vLLM Scheduling Timeout / Request Hang',
    keywords: ['scheduling timeout', 'preemption', 'request hang', 'timeout', 'engine iteration timeout', 'pipeline timeout'],
    category: 'vllm',
    tags: ['inference', 'performance'],
    severity: 'error',
    symptoms: 'Requests hang for a long time without response. Logs show "Scheduling timeout" or "Preemption" warnings. Some requests get stuck under concurrent load.',
    cause: 'Concurrent requests exceed GPU processing capacity, causing the scheduler to fail to complete scheduling iterations within the time limit. Or some requests consume large amounts of memory (long context), blocking subsequent requests. Could also be that --max-num-seqs is set too high, causing frequent preemption.',
    fix: [
      'Reduce --max-num-seqs to a concurrency level the GPU can handle stably (usually 4-16)',
      'Enable --enable-chunked-prefill to improve throughput',
      'Shorten --max-model-len to reduce per-request memory usage',
      'Add client-side request timeout and retry mechanisms',
      'Monitor GPU utilization to confirm it is fully loaded'
    ],
    commands: [
      { desc: 'Enable Chunked Prefill optimization', cmd: 'python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --enable-chunked-prefill --max-num-seqs 8' },
      { desc: 'Monitor GPU utilization', cmd: 'watch -n 1 nvidia-smi' }
    ],
    related: ['cuda-oom', 'vllm-context-overflow']
  },
  {
    id: 'vllm-model-not-found',
    title: 'Model Path or Name Does Not Exist',
    keywords: ['model not found', 'no such file', 'config.json', 'cannot find', 'path does not exist', 'oserror'],
    category: 'vllm',
    tags: ['startup', 'config'],
    severity: 'error',
    symptoms: 'Startup errors with "Model path does not exist" or "Cannot find config.json". HuggingFace download fails or local path is incorrect.',
    cause: 'Incorrect model ID spelling, local path does not exist, HuggingFace model was not downloaded to local cache, or the mount path is inconsistent between inside and outside the container. Could also be corrupted or incomplete model files.',
    fix: [
      'Confirm the model ID is spelled correctly (case-sensitive)',
      'Use absolute paths for local directories to avoid relative path resolution errors',
      'When running Docker, ensure the model directory is correctly mounted into the container',
      'Use huggingface-cli download to pre-download the model',
      'Check that config.json and pytorch_model.bin / safetensors files exist in the directory'
    ],
    commands: [
      { desc: 'Pre-download model', cmd: 'huggingface-cli download Qwen/Qwen3-7B-Instruct --local-dir ./models/qwen3-7b' },
      { desc: 'Check model file integrity', cmd: 'ls -lah ./models/qwen3-7b/' }
    ],
    related: ['model-gated-permission', 'docker-gpu-mount']
  },
  {
    id: 'model-quantization-incompatible',
    title: 'Quantization Format Incompatible with Runtime',
    keywords: ['awq', 'gptq', 'bitsandbytes', 'quantization', 'quant_config', 'load_in_4bit', 'load_in_8bit', 'gguf'],
    category: 'model',
    tags: ['startup', 'version', 'config'],
    severity: 'error',
    symptoms: 'Loading a quantized model errors with "AWQ is not supported", "GPTQ quantization config not found", or bitsandbytes-related errors.',
    cause: 'The vLLM / transformers version does not support this quantization format, or the corresponding quantization support library is missing (autoawq, optimum, bitsandbytes). Could also be a missing or incompatible quantization config file.',
    fix: [
      'Confirm whether the current vLLM version supports this quantization format (check official docs)',
      'Install the corresponding quantization library: pip install autoawq / auto-gptq / bitsandbytes',
      'Use a quantization method natively supported by vLLM (e.g., AWQ, GPTQ, FP8)',
      'Confirm the quantization config file (quant_config.json) exists in the model directory',
      'If the format is unsupported, consider re-quantizing or switching to a non-quantized version'
    ],
    commands: [
      { desc: 'Install AWQ support', cmd: 'pip install autoawq' },
      { desc: 'Check vLLM supported quantization types', cmd: 'python -m vllm.entrypoints.openai.api_server --help | grep -i quant' }
    ],
    related: ['vllm-model-not-found']
  },
  {
    id: 'model-gated-permission',
    title: 'Gated Model / HuggingFace Permission Denied',
    keywords: ['gated repo', 'access token', '401', '403', 'unauthorized', 'permission', 'login', 'huggingface'],
    category: 'model',
    tags: ['startup', 'permission'],
    severity: 'warning',
    symptoms: 'Downloading the model errors with "401 Client Error", "Gated repo", or "You need to login", indicating a HuggingFace access token is required.',
    cause: 'The model requires agreeing to terms of use before download (e.g., Meta-Llama, some DeepSeek models), or the user\'s HuggingFace token is not set / expired. Could also be insufficient token permissions.',
    fix: [
      'On the HuggingFace website, find the model and click Accept License Agreement',
      'Generate a HuggingFace access token (Settings → Access Tokens)',
      'Log in with huggingface-cli login, or set the HF_TOKEN environment variable',
      'Add --hf-overrides to the vLLM launch command or ensure the environment variable is passed',
      'When running Docker, pass the token with -e HF_TOKEN=$HF_TOKEN'
    ],
    commands: [
      { desc: 'Login to HuggingFace', cmd: 'huggingface-cli login' },
      { desc: 'Launch vLLM with token', cmd: 'HF_TOKEN=hf_xxx python -m vllm.entrypoints.openai.api_server --model meta-llama/Meta-Llama-3-8B-Instruct' }
    ],
    related: ['vllm-model-not-found', 'docker-image-pull']
  },
  {
    id: 'network-port-in-use',
    title: 'Port Already in Use',
    keywords: ['address already in use', 'port is already allocated', 'bind', 'eaddrinuse', 'port 8000'],
    category: 'network',
    tags: ['startup', 'config'],
    severity: 'warning',
    symptoms: 'Startup errors with "Address already in use". The specified port is occupied by another process, and the service cannot start.',
    cause: 'A previous vLLM / Ollama / other service process did not exit cleanly and is still occupying the port in the background. Or another system application is using that port.',
    fix: [
      'Find the process using the port: lsof -i :8000 or ss -tlnp',
      'Kill the occupying process: kill -9 <PID>',
      'Or use a different port: --port 8001',
      'Check if a systemd service automatically restarted the old process',
      'When mapping Docker ports, ensure the host port is not occupied'
    ],
    commands: [
      { desc: 'Find process using the port', cmd: 'lsof -i :8000' },
      { desc: 'Launch on a different port', cmd: 'python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --port 8001' }
    ],
    related: ['network-tunnel-502']
  },
  {
    id: 'network-tunnel-502',
    title: 'Cloudflare Tunnel / Reverse Proxy 502',
    keywords: ['502', 'bad gateway', 'cloudflare', 'tunnel', 'connection refused', 'origin', 'nginx', 'reverse proxy'],
    category: 'network',
    tags: ['startup', 'config'],
    severity: 'error',
    symptoms: 'Accessing the service via domain or tunnel returns 502 Bad Gateway, while direct access via IP:port works fine.',
    cause: 'The reverse proxy/tunnel origin address is misconfigured or the port does not match; the local service is not running; the service is bound to 127.0.0.1 instead of 0.0.0.0 (making it inaccessible externally); or a firewall is blocking the connection.',
    fix: [
      'Confirm the local service is running and bound to 0.0.0.0 (--host 0.0.0.0)',
      'Check that the Tunnel / Nginx origin port matches the local service port',
      'Test the local service directly: curl http://127.0.0.1:8000/v1/models',
      'Check cloudflared tunnel status: cloudflared tunnel list',
      'Confirm the firewall is not blocking the port (ufw / iptables / cloud security groups)'
    ],
    commands: [
      { desc: 'Test local service', cmd: 'curl -v http://127.0.0.1:8000/v1/models' },
      { desc: 'Check tunnel status', cmd: 'cloudflared tunnel list' },
      { desc: 'Bind to all interfaces', cmd: 'python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --host 0.0.0.0 --port 8000' }
    ],
    related: ['network-port-in-use']
  },
  {
    id: 'python-dependency-conflict',
    title: 'Python Dependency Conflict / Version Incompatibility',
    keywords: ['dependency', 'version conflict', 'transformers', 'torch', 'numpy', 'pydantic', 'install', 'requirement', 'no module named', 'attributeerror', 'import error'],
    category: 'vllm',
    tags: ['startup', 'version', 'config'],
    severity: 'error',
    symptoms: 'Import or startup errors with "No module named xxx", "AttributeError", "ImportError", or pip install shows version conflicts that cannot be resolved.',
    cause: 'The version matrix of vLLM, transformers, torch, and other core libraries is complex. Upgrading one library may break compatibility with others. Common issues include: transformers version too new/too old, torch CUDA version mismatch with local environment, pydantic v1/v2 API changes causing incompatibility.',
    fix: [
      'Use a virtual environment to isolate dependencies (venv / conda), avoid mixing with system Python',
      'Install the specified versions of torch and transformers according to vLLM official docs',
      'When encountering pydantic conflicts, upgrade uniformly to v2: pip install "pydantic>=2.0"',
      'Use pip install --no-deps then manually install missing dependencies',
      'If necessary, delete the environment and recreate it, reinstalling according to official requirements'
    ],
    commands: [
      { desc: 'Check current key package versions', cmd: 'pip show torch transformers vllm pydantic' },
      { desc: 'Install vLLM recommended versions', cmd: 'pip install vllm torch transformers --upgrade' }
    ],
    related: ['cuda-driver-mismatch', 'model-quantization-incompatible']
  },
  {
    id: 'model-download-slow',
    title: 'Model Download Slow or Interrupted',
    keywords: ['download slow', 'huggingface', 'connection timeout', 'ssl', 'connection reset', 'download interrupted', 'snapshot download', 'hf-mirror'],
    category: 'model',
    tags: ['startup', 'config'],
    severity: 'warning',
    symptoms: 'huggingface-cli download or first-time startup model download is extremely slow (a few KB/s), frequently times out, or errors with SSL/connection reset.',
    cause: 'Network access to HuggingFace official servers is unstable in some regions, or the model files are very large (tens of GB) causing long download times and easy interruption. Could also be insufficient local disk space causing write failures.',
    fix: [
      'Use a HuggingFace mirror: export HF_ENDPOINT=https://hf-mirror.com',
      'Download from alternative model hubs (e.g., ModelScope) and move to local directory',
      'Use huggingface-cli --resume-download for resumable downloads',
      'Pre-download on a machine with good network, then transfer to the target machine via hard drive/USB/local network',
      'Check that remaining disk space is more than 2x the model file size (temporary space needed during download)'
    ],
    commands: [
      { desc: 'Download using mirror', cmd: 'export HF_ENDPOINT=https://hf-mirror.com\nhuggingface-cli download Qwen/Qwen3-7B-Instruct --local-dir ./models/qwen3-7b' },
      { desc: 'Resumable download', cmd: 'huggingface-cli download Qwen/Qwen3-7B-Instruct --resume-download --local-dir ./models/qwen3-7b' }
    ],
    related: ['vllm-model-not-found', 'model-gated-permission']
  },
  {
    id: 'nccl-multi-gpu-error',
    title: 'NCCL Multi-GPU Communication Error',
    keywords: ['nccl', 'multi gpu', 'tensor parallel', 'communication', 'allreduce', 'rank', 'distributed', 'timeout', 'ibv'],
    category: 'cuda',
    tags: ['startup', 'config', 'performance'],
    severity: 'error',
    symptoms: 'Multi-GPU startup (--tensor-parallel-size > 1) errors with "NCCL error", "unhandled system error", "connection refused by rank", or processes hang.',
    cause: 'NCCL (NVIDIA Collective Communications Library) requires communication between GPUs via PCIe or NVLink. Common causes: IB/RDMA network misconfiguration, firewall blocking NCCL ports, NCCL timeout in multi-GPU environments, or GPUs not on the same NUMA node causing communication issues.',
    fix: [
      'Confirm all GPUs are recognized normally by nvidia-smi',
      'Set NCCL environment variable to use TCP instead of IB: export NCCL_IB_DISABLE=1',
      'Set NCCL debug logging to diagnose: export NCCL_DEBUG=INFO',
      'Check if the firewall is blocking the port range used by NCCL',
      'Confirm multi-GPU is within the same physical machine; cross-machine distributed requires additional network configuration'
    ],
    commands: [
      { desc: 'Disable IB, use pure TCP', cmd: 'export NCCL_IB_DISABLE=1\npython -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --tensor-parallel-size 2' },
      { desc: 'Enable NCCL debug logging', cmd: 'export NCCL_DEBUG=INFO\npython -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-7B-Instruct --tensor-parallel-size 2 2>&1 | grep NCCL' }
    ],
    related: ['cuda-no-device', 'cuda-oom']
  },
  {
    id: 'file-permission-denied',
    title: 'File/Directory Permission Denied',
    keywords: ['permission denied', 'access denied', 'readonly', 'write permission', 'mkdir', 'cache', 'huggingface hub'],
    category: 'model',
    tags: ['startup', 'permission', 'config'],
    severity: 'warning',
    symptoms: 'Startup errors with "Permission denied", "Read-only file system", or model download fails halfway with write errors, unable to create cache directory.',
    cause: 'The current user does not have write permission for the model directory or HuggingFace cache directory; the disk is mounted read-only; or the model was downloaded with sudo and the regular user cannot read it. Could also be a Docker container user UID mismatch with the host causing permission issues.',
    fix: [
      'Check and fix directory permissions: chmod -R u+rw /path/to/models',
      'Confirm the disk is not mounted read-only: mount | grep corresponding partition',
      'Set HuggingFace cache directory to a location the user has permission for: export HF_HOME=/home/$(whoami)/.cache/huggingface',
      'Avoid mixing root and regular user for model downloads',
      'When running Docker, add --user $(id -u):$(id -g) or use an image user with the same UID'
    ],
    commands: [
      { desc: 'Fix model directory permissions', cmd: 'chmod -R u+rw ./models\nchown -R $(whoami):$(whoami) ./models' },
      { desc: 'Set custom cache directory', cmd: 'export HF_HOME=$HOME/.cache/huggingface\nexport TRANSFORMERS_CACHE=$HOME/.cache/huggingface' }
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
    return a.title.localeCompare(b.title, 'en');
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
    parts.push(`<button class="error-kb-clear-btn" data-clear-all>Clear All</button>`);
  }
  els.activeFilters.innerHTML = parts.join('');
}

function renderGrid() {
  const entries = getFilteredEntries();
  els.count.textContent = `${entries.length} errors documented`;

  if (entries.length === 0) {
    els.grid.innerHTML = `
      <div class="error-kb-empty">
        <div class="error-kb-empty-icon">🔍</div>
        <h3>No matching errors found</h3>
        <p>Try different keywords or clear the filters</p>
        <button class="btn btn-primary" onclick="clearAllFilters()">Clear All Filters</button>
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
            <button class="error-kb-command-copy" data-copy="${escapeHtml(cmd.cmd)}">Copy</button>
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
          <h4>Root Cause</h4>
          <p class="error-kb-cause">${escapeHtml(entry.cause)}</p>
          <h4>Fix Steps</h4>
          <ol class="error-kb-fix-list">${fixList}</ol>
          ${commandsHtml ? `<h4>Common Commands</h4>${commandsHtml}` : ''}
          ${relatedHtml ? `<h4>Related Errors</h4><div class="error-kb-related">${relatedHtml}</div>` : ''}
          <button class="error-kb-card-toggle" data-toggle="${entry.id}">Collapse</button>
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
          ${!isExpanded ? `<button class="error-kb-card-toggle" data-toggle="${entry.id}">Expand Details</button>` : ''}
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
        copyBtn.textContent = 'Copied ✓';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 1500);
      }).catch(() => {
        copyBtn.textContent = 'Copy Failed';
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
