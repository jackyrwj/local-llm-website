/* Cost Calculator — cost-calculator-en.js */

const formatMoney = (value) => '$' + Math.round(value).toLocaleString('en-US');

function getInput(id, fallback = 0) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const v = Number(el.value);
  return Number.isFinite(v) ? v : fallback;
}

// ── Calculation Engine ───────────────────────────────────

function calculate() {
  const hardwareCost = getInput('hardwareCost', 5000);
  const months = getInput('depreciationMonths', 24);
  const powerW = getInput('powerW', 450);
  const hoursPerDay = getInput('hoursPerDay', 12);
  const electricity = getInput('electricityPrice', 0.15);
  const opsCost = getInput('opsCost', 50);
  const requests = getInput('requests', 300000);
  const tokensPerReq = getInput('tokensPerReq', 2000);
  const apiPrice = getInput('apiPrice', 2);

  const depreciation = hardwareCost / months;
  const powerCost = powerW / 1000 * hoursPerDay * 30 * electricity;
  const localMonthly = depreciation + powerCost + opsCost;
  const millionTokens = requests * tokensPerReq / 1_000_000;
  const apiMonthly = millionTokens * apiPrice;
  const diff = apiMonthly - localMonthly;
  const payback = diff > 0 ? hardwareCost / diff : Infinity;

  return {
    hardwareCost, months, depreciation, powerCost, opsCost,
    localMonthly, apiMonthly, diff, payback,
    millionTokens, requests, tokensPerReq, apiPrice,
  };
}

// ── Rendering ───────────────────────────────────────

function renderAll() {
  const r = calculate();

  //  verdict
  const verdictEl = document.getElementById('costVerdict');
  const savingEl = document.getElementById('costSaving');
  if (verdictEl) {
    if (r.diff > 0) {
      verdictEl.textContent = '✅ Self-hosting Saves More';
      verdictEl.className = 'cost-verdict local-win';
      savingEl.textContent = `Save ${formatMoney(r.diff)} per month`;
    } else if (r.diff < 0) {
      verdictEl.textContent = '☁️ Cloud API Saves More';
      verdictEl.className = 'cost-verdict api-win';
      savingEl.textContent = `Save ${formatMoney(Math.abs(r.diff))} per month`;
    } else {
      verdictEl.textContent = '➖ Costs are equal';
      verdictEl.className = 'cost-verdict tie';
      savingEl.textContent = '';
    }
  }

  // metrics
  const metricsEl = document.getElementById('costMetrics');
  if (metricsEl) {
    metricsEl.innerHTML = [
      ['Local Monthly Cost', formatMoney(r.localMonthly)],
      ['Cloud API Monthly Cost', formatMoney(r.apiMonthly)],
      ['Monthly Token Volume', r.millionTokens.toFixed(1) + 'M'],
      ['Estimated Payback Period', Number.isFinite(r.payback) ? r.payback.toFixed(1) + ' months' : 'No payback'],
      ['Hardware Depreciation/Month', formatMoney(r.depreciation)],
      ['Electricity/Month', formatMoney(r.powerCost)],
    ].map(([label, value]) => `
      <div class="cost-metric">
        <span class="cost-metric-label">${label}</span>
        <strong class="cost-metric-value">${value}</strong>
      </div>
    `).join('');
  }

  // compare bars
  renderCompareBars(r);

  // pie chart
  renderPie(r);

  // trend chart
  renderTrend(r);

  // advice
  const adviceEl = document.getElementById('costAdviceText');
  const adviceBox = document.getElementById('costAdviceBox');
  if (adviceEl) {
    if (r.diff > 0) {
      adviceEl.textContent = `At the current call volume, self-hosting saves approximately ${formatMoney(r.diff)} per month, with an estimated payback period of ${r.payback.toFixed(1)} months. However, note that self-hosting requires handling operations, troubleshooting, model upgrades, and hardware depreciation risks. If call volume fluctuates significantly or your team lacks GPU ops experience, consider starting with a small-scale pilot.`;
      adviceBox.style.display = 'block';
    } else if (r.diff < 0) {
      adviceEl.textContent = `At the current call volume, cloud API saves approximately ${formatMoney(Math.abs(r.diff))} per month. Building a GPU server is not cost-effective at this scale; continue using cloud API or rent GPUs on demand (e.g., RunPod, Lambda Labs, Vast.ai). Self-hosting becomes cost-competitive when monthly requests reach approximately ${Math.ceil(r.localMonthly * 1_000_000 / (r.tokensPerReq * r.apiPrice)).toLocaleString('en-US')}.`;
      adviceBox.style.display = 'block';
    } else {
      adviceBox.style.display = 'none';
    }
  }
}

function renderCompareBars(r) {
  const el = document.getElementById('compareBars');
  if (!el) return;

  const max = Math.max(r.localMonthly, r.apiMonthly, 1);
  const localPct = (r.localMonthly / max) * 100;
  const apiPct = (r.apiMonthly / max) * 100;

  el.innerHTML = `
    <div class="cost-bar-row">
      <span class="cost-bar-label">Local Monthly Cost</span>
      <div class="cost-bar-track">
        <div class="cost-bar-fill local" style="width:${localPct}%"></div>
      </div>
      <span class="cost-bar-value">${formatMoney(r.localMonthly)}</span>
    </div>
    <div class="cost-bar-row">
      <span class="cost-bar-label">Cloud API Monthly Cost</span>
      <div class="cost-bar-track">
        <div class="cost-bar-fill api" style="width:${apiPct}%"></div>
      </div>
      <span class="cost-bar-value">${formatMoney(r.apiMonthly)}</span>
    </div>
    ${r.diff !== 0 ? `
    <div class="cost-bar-row diff">
      <span class="cost-bar-label">${r.diff > 0 ? 'Local Savings' : 'API Savings'}</span>
      <div class="cost-bar-track">
        <div class="cost-bar-fill diff" style="width:${(Math.abs(r.diff) / max) * 100}%"></div>
      </div>
      <span class="cost-bar-value">${formatMoney(Math.abs(r.diff))}</span>
    </div>
    ` : ''}
  `;
}

function renderPie(r) {
  const pie = document.getElementById('costPie');
  const legend = document.getElementById('pieLegend');
  if (!pie || !legend) return;

  const total = r.depreciation + r.powerCost + r.opsCost;
  if (total <= 0) { pie.style.display = 'none'; legend.innerHTML = ''; return; }
  pie.style.display = 'block';

  const dPct = r.depreciation / total;
  const pPct = r.powerCost / total;
  const oPct = r.opsCost / total;

  // conic-gradient for pie
  const dDeg = dPct * 360;
  const pDeg = pPct * 360;
  pie.style.background = `conic-gradient(
    var(--cost-local) 0deg ${dDeg}deg,
    var(--cost-power) ${dDeg}deg ${dDeg + pDeg}deg,
    var(--cost-ops) ${dDeg + pDeg}deg 360deg
  )`;

  legend.innerHTML = [
    ['Hardware Depreciation', r.depreciation, 'var(--cost-local)'],
    ['Electricity', r.powerCost, 'var(--cost-power)'],
    ['Ops & Bandwidth', r.opsCost, 'var(--cost-ops)'],
  ].map(([label, value, color]) => `
    <div class="pie-legend-item">
      <span class="pie-dot" style="background:${color}"></span>
      <span class="pie-label">${label}</span>
      <strong class="pie-value">${formatMoney(value)} (${((value / total) * 100).toFixed(0)}%)</strong>
    </div>
  `).join('');
}

function renderTrend(r) {
  const el = document.getElementById('trendChart');
  if (!el) return;

  // generate 5 data points around current requests
  const ratios = [0.25, 0.5, 1, 2, 4];
  const points = ratios.map(ratio => {
    const req = Math.max(1, Math.round(r.requests * ratio));
    const mt = req * r.tokensPerReq / 1_000_000;
    const api = mt * r.apiPrice;
    return { req, local: r.localMonthly, api };
  });

  const maxCost = Math.max(...points.map(p => Math.max(p.local, p.api)), 1);

  // Build a simple bar-line hybrid chart using CSS
  const rows = points.map((p, i) => {
    const localH = (p.local / maxCost) * 100;
    const apiH = (p.api / maxCost) * 100;
    const isCurrent = i === 2;
    return `
      <div class="trend-col${isCurrent ? ' current' : ''}">
        <div class="trend-bars">
          <div class="trend-bar local" style="height:${localH}%" title="Local ${formatMoney(p.local)}"></div>
          <div class="trend-bar api" style="height:${apiH}%" title="API ${formatMoney(p.api)}"></div>
        </div>
        <div class="trend-xlabel">${formatReq(p.req)}</div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="trend-y-axis">
      <span>${formatMoney(maxCost)}</span>
      <span>${formatMoney(maxCost / 2)}</span>
      <span>0</span>
    </div>
    <div class="trend-cols">${rows}</div>
  `;
}

function formatReq(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 0) + 'K';
  return String(n);
}

// ── Event Binding ───────────────────────────────────

function init() {
  const ids = [
    'hardwareCost', 'depreciationMonths', 'powerW', 'hoursPerDay',
    'electricityPrice', 'opsCost', 'requests', 'tokensPerReq', 'apiPrice',
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderAll);
  });
  renderAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
