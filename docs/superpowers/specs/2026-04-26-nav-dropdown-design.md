# 导航栏 Hover 下拉菜单设计

## 背景

当前顶部导航的 **Toolkit** 和 **Posts** 是平铺链接，用户希望 hover 后能展开下拉面板，分别展示工具列表和文章分类标签。

## 目标

1. Toolkit hover 下拉显示 5 个工具的快捷链接
2. Posts hover 下拉显示 3 个文章分类标签（Tutorial / Troubleshooting / Comparison）
3. 交互体验：hover 延迟消失（防误触），键盘 Escape 关闭
4. 移动端适配：下拉菜单在 slide-out 菜单中变为点击展开/收起

## 方案选择

采用 **方案 B：CSS 主导 + JS 轻量增强**
- CSS 控制基本显示/隐藏和过渡动画
- JS 仅负责 mouseleave 延迟（200ms）和 Escape 键关闭

## HTML 结构变更

所有包含顶部导航的页面中，将 `.nav-menu` 内的 Toolkit 和 Posts `<li>` 改为嵌套结构：

```html
<li class="has-dropdown" data-dropdown>
  <a href="/tools/index.html">Toolkit</a>
  <ul class="dropdown-menu">
    <li><a href="/tools/vllm-generator.html">vLLM Command Generator</a></li>
    <li><a href="/tools/memory-calculator.html">VRAM Estimator</a></li>
    <li><a href="/tools/cost-calculator.html">Cost Calculator</a></li>
    <li><a href="/tools/deployment-errors.html">Common Errors & Fixes</a></li>
    <li><a href="/tools/deployment-advisor.html">Deployment Advisor</a></li>
  </ul>
</li>

<li class="has-dropdown" data-dropdown>
  <a href="/posts/index.html">Posts</a>
  <ul class="dropdown-menu">
    <li><a href="/posts/index.html?cat=Tutorial">Tutorial</a></li>
    <li><a href="/posts/index.html?cat=Troubleshooting">Troubleshooting</a></li>
    <li><a href="/posts/index.html?cat=Comparison">Comparison</a></li>
  </ul>
</li>
```

### 受影响页面

英文页面：
- `index.html`
- `about.html`, `faq.html`, `contact.html`
- `privacy-policy.html`, `terms-of-service.html`, `cookie-policy.html`
- `tools/index.html`, `tools/*.html`
- `posts/index.html`, `posts/*.html`

中文页面（`zh/` 目录下对应页面）同步修改。

## CSS 新增样式

```css
/* Dropdown container */
.has-dropdown {
  position: relative;
}

/* Dropdown panel */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--r);
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
  padding: .375rem;
  list-style: none;
  z-index: 100;

  opacity: 0;
  visibility: hidden;
  transform: translateY(6px);
  transition: opacity .18s ease, transform .18s ease, visibility .18s;
  pointer-events: none;
}

.has-dropdown:hover .dropdown-menu,
.has-dropdown.open .dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto;
}

.dropdown-menu a {
  display: block;
  padding: .5rem .75rem;
  border-radius: var(--r-sm);
  font-size: .85rem;
  color: var(--text-muted);
  white-space: nowrap;
  transition: all var(--t);
}

.dropdown-menu a:hover {
  color: var(--text);
  background: var(--bg-muted);
}

/* Chevron indicator on parent link */
.has-dropdown > a::after {
  content: '';
  display: inline-block;
  width: 6px; height: 6px;
  margin-left: 6px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg) translateY(-2px);
  opacity: .5;
  transition: transform .2s;
}

.has-dropdown:hover > a::after,
.has-dropdown.open > a::after {
  transform: rotate(-135deg) translateY(1px);
  opacity: .8;
}

/* Mobile: dropdown items stack inside slide-out menu */
@media (max-width: 768px) {
  .dropdown-menu {
    position: static;
    opacity: 1;
    visibility: visible;
    transform: none;
    pointer-events: auto;
    box-shadow: none;
    border: none;
    background: transparent;
    padding-left: 1rem;
    min-width: auto;
    display: none;
  }
  .has-dropdown.open .dropdown-menu {
    display: block;
  }
  .has-dropdown > a::after {
    float: right;
    margin-top: 6px;
  }
}
```

样式插入位置：`css/style.css` 中现有 `.nav-menu` 样式之后。

## JS 交互增强

在 `js/main.js` 中 mobile menu 代码之后新增：

```js
// ── Nav dropdowns (hover with delay) ───────────
document.querySelectorAll('[data-dropdown]').forEach(item => {
  let timer;
  const menu = item.querySelector('.dropdown-menu');

  item.addEventListener('mouseenter', () => {
    clearTimeout(timer);
    item.classList.add('open');
  });

  item.addEventListener('mouseleave', () => {
    timer = setTimeout(() => item.classList.remove('open'), 200);
  });

  if (menu) {
    menu.addEventListener('mouseenter', () => clearTimeout(timer));
    menu.addEventListener('mouseleave', () => {
      timer = setTimeout(() => item.classList.remove('open'), 200);
    });
  }
});

// Close dropdowns on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('[data-dropdown].open').forEach(el => el.classList.remove('open'));
  }
});
```

## 文章分类 URL 参数修复

`js/main.js` 中现有 URL filter 逻辑（第 128-132 行）只支持中文分类名，需扩展为同时支持英文：

```js
const urlParams = new URLSearchParams(window.location.search);
const urlCat = urlParams.get('cat');
const validCats = ['all', 'Tutorial', 'Troubleshooting', 'Comparison', '教程', '踩坑', '对比'];
if (urlCat && validCats.includes(urlCat)) {
  applyFilter(urlCat);
}
```

## 移动端行为

- 桌面端（>768px）：hover 触发下拉，mouseleave 延迟 200ms 消失
- 移动端（<=768px）：下拉子菜单默认折叠，点击父链接展开/收起（复用 `.open` 类）
- 移动端菜单关闭时，所有 dropdown 的 `.open` 类一并清除

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `css/style.css` | 新增 | dropdown 相关样式 |
| `js/main.js` | 修改 | 新增 dropdown 交互逻辑 + 修复 URL filter |
| `index.html` | 修改 | 导航 HTML 结构 |
| `about.html` | 修改 | 导航 HTML 结构 |
| `faq.html` | 修改 | 导航 HTML 结构 |
| `contact.html` | 修改 | 导航 HTML 结构 |
| `privacy-policy.html` | 修改 | 导航 HTML 结构 |
| `terms-of-service.html` | 修改 | 导航 HTML 结构 |
| `cookie-policy.html` | 修改 | 导航 HTML 结构 |
| `tools/index.html` | 修改 | 导航 HTML 结构 |
| `tools/*.html` (5个) | 修改 | 导航 HTML 结构 |
| `posts/index.html` | 修改 | 导航 HTML 结构 |
| `posts/*.html` (18个) | 修改 | 导航 HTML 结构 |
| `zh/index.html` | 修改 | 导航 HTML 结构 |
| `zh/*` (对应页面) | 修改 | 导航 HTML 结构 |
