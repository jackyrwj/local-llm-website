# Nav Dropdown Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hover dropdown menus to "Toolkit" and "Posts" in the top navigation, with 5 tools and 3 article category filters respectively.

**Architecture:** Pure CSS for visibility transitions + lightweight JS for mouseleave delay (200ms) and Escape key closing. Dropdown HTML uses nested `<ul>` inside `<li class="has-dropdown">`. Mobile uses click-to-toggle within the slide-out menu.

**Tech Stack:** Static HTML, CSS, vanilla JS (no frameworks)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `css/style.css` | Modify (append) | Dropdown styles: positioning, transitions, hover states, mobile collapse |
| `js/main.js` | Modify (insert + edit) | Dropdown interaction logic (delay + Escape); fix URL filter for English category names |
| `index.html` | Modify | English homepage nav structure (template for other pages) |
| `about.html`, `faq.html`, `contact.html`, `privacy-policy.html`, `terms-of-service.html`, `cookie-policy.html`, `404.html` | Modify | English content pages nav |
| `tools/index.html`, `tools/*.html` (5 files) | Modify | English tool pages nav |
| `posts/index.html`, `posts/*.html` (18 files) | Modify | English post pages nav |
| `zh/index.html`, `zh/*.html` (9 files) | Modify | Chinese content pages nav |
| `zh/tools/index.html`, `zh/tools/*.html` (5 files) | Modify | Chinese tool pages nav |
| `zh/posts/index.html`, `zh/posts/*.html` (18 files) | Modify | Chinese post pages nav |

---

### Task 1: Add Dropdown CSS Styles

**Files:**
- Modify: `css/style.css` (append after existing `.nav-menu a.active` styles, around line 185)

- [ ] **Step 1: Append dropdown styles**

Insert the following CSS after the existing `.nav-menu a.active` rule (around line 185, before the `.nav-cta` rule):

```css
/* ── Dropdown menus ─────────────────────────── */
.has-dropdown {
  position: relative;
}

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
```

- [ ] **Step 2: Add mobile dropdown styles**

In the existing mobile media query block (around line 1630, where `.mobile-menu-toggle { display: flex; }` is), insert inside the `@media (max-width: 768px)` block:

```css
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
```

- [ ] **Step 3: Verify and commit**

Run: `git diff css/style.css`
Expected: Only additions, no deletions of existing styles.

```bash
git add css/style.css
git commit -m "feat: add dropdown menu styles"
```

---

### Task 2: Add Dropdown JS + Fix URL Filter

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Insert dropdown interaction logic**

After the existing mobile menu code block (after line 17, before `// ── Header shadow on scroll`), insert:

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

- [ ] **Step 2: Fix URL filter to support English categories**

Replace lines 128-132 (the existing URL params filter logic):

```js
const urlParams = new URLSearchParams(window.location.search);
const urlCat = urlParams.get('cat');
if (urlCat && ['教程', '踩坑', '对比'].includes(urlCat)) {
  applyFilter(urlCat);
}
```

With:

```js
const urlParams = new URLSearchParams(window.location.search);
const urlCat = urlParams.get('cat');
const validCats = ['all', 'Tutorial', 'Troubleshooting', 'Comparison', '教程', '踩坑', '对比'];
if (urlCat && validCats.includes(urlCat)) {
  applyFilter(urlCat);
}
```

- [ ] **Step 3: Verify and commit**

Run: `git diff js/main.js`
Expected: New dropdown code block inserted after mobile menu; URL filter condition updated.

```bash
git add js/main.js
git commit -m "feat: dropdown interaction + fix URL filter for English categories"
```

---

### Task 3: Update English Homepage Nav (Template)

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace Toolkit and Posts nav items**

Find this block in `index.html` (around line 51-58):

```html
                <ul class="nav-menu">
                    <li><a href="/index.html" class="active">Home</a></li>
                    <li><a href="/tools/index.html">Toolkit</a></li>
                    <li><a href="/posts/index.html">Posts</a></li>
                    <li><a href="/about.html">About</a></li>
                    <li><a href="/faq.html">FAQ</a></li>
                    <li><a href="/contact.html">Contact</a></li>
                </ul>
```

Replace with:

```html
                <ul class="nav-menu">
                    <li><a href="/index.html" class="active">Home</a></li>
                    <li class="has-dropdown" data-dropdown>
                        <a href="/tools/index.html">Toolkit</a>
                        <ul class="dropdown-menu">
                            <li><a href="/tools/vllm-generator.html">vLLM Command Generator</a></li>
                            <li><a href="/tools/memory-calculator.html">VRAM Estimator</a></li>
                            <li><a href="/tools/cost-calculator.html">Cost Calculator</a></li>
                            <li><a href="/tools/deployment-errors.html">Common Errors &amp; Fixes</a></li>
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
                    <li><a href="/about.html">About</a></li>
                    <li><a href="/faq.html">FAQ</a></li>
                    <li><a href="/contact.html">Contact</a></li>
                </ul>
```

- [ ] **Step 2: Verify in browser**

Open `index.html` in a browser (or run a local server).
- Hover over "Toolkit" → dropdown appears with 5 tool links
- Hover over "Posts" → dropdown appears with 3 category links
- Move mouse away → dropdown disappears after ~200ms
- Press Escape → any open dropdown closes
- Click a category link → should navigate to posts page with that filter active

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add dropdown nav to English homepage"
```

---

### Task 4: Update All Other English Pages

**Files:**
- Modify: `about.html`, `faq.html`, `contact.html`, `privacy-policy.html`, `terms-of-service.html`, `cookie-policy.html`, `404.html`
- Modify: `tools/index.html`, `tools/vllm-generator.html`, `tools/memory-calculator.html`, `tools/cost-calculator.html`, `tools/deployment-advisor.html`, `tools/deployment-errors.html`
- Modify: `posts/index.html`
- Modify: `posts/qwen-context-overflow-fix.html`, `posts/gpustack-getting-started.html`, `posts/local-chatgpt-system-guide.html`, `posts/local-model-expose-api-guide.html`, `posts/cloudflare-tunnel-local-ai.html`, `posts/vllm-vs-ollama-comparison.html`, `posts/gpu-oom-optimization.html`, `posts/cloudflare-tunnel-common-issues.html`, `posts/lobechat-connect-local-model.html`, `posts/qwen36-vs-qwen3coder.html`, `posts/local-model-slow-performance-fix.html`, `posts/deploy-qwen36-full-guide.html`, `posts/local-vs-cloud-model.html`, `posts/docker-deploy-ai-service.html`, `posts/qwen-disable-thinking-mode.html`, `posts/vllm-startup-failure-fix.html`, `posts/docker-pull-failure-solutions.html`, `posts/vllm-deploy-llm-step-by-step.html`, `posts/max-model-len-best-practice.html`

Total: 7 + 6 + 1 + 18 = 32 files

- [ ] **Step 1: Bulk replace using sed**

Run from project root. This replaces the two flat nav items with dropdown structures across all English HTML files:

```bash
# First, verify the pattern matches
find . -maxdepth 1 -name '*.html' -o -path './tools/*.html' -o -path './posts/*.html' | grep -v '/zh/' | sort
```

For each English HTML file, find this exact block:

```html
                    <li><a href="/tools/index.html">Toolkit</a></li>
                    <li><a href="/posts/index.html">Posts</a></li>
```

And replace with:

```html
                    <li class="has-dropdown" data-dropdown>
                        <a href="/tools/index.html">Toolkit</a>
                        <ul class="dropdown-menu">
                            <li><a href="/tools/vllm-generator.html">vLLM Command Generator</a></li>
                            <li><a href="/tools/memory-calculator.html">VRAM Estimator</a></li>
                            <li><a href="/tools/cost-calculator.html">Cost Calculator</a></li>
                            <li><a href="/tools/deployment-errors.html">Common Errors &amp; Fixes</a></li>
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

Note: Some pages may have an `active` class on Toolkit or Posts links. Check each file first:

```bash
grep -l 'class="active"' about.html faq.html contact.html privacy-policy.html terms-of-service.html cookie-policy.html 404.html tools/*.html posts/*.html 2>/dev/null
```

If `Toolkit` or `Posts` has `class="active"`, preserve it on the `<a>` tag in the replacement.

- [ ] **Step 2: Verify no missed files**

```bash
grep -r '<li><a href="/tools/index.html">Toolkit</a></li>' --include='*.html' . | grep -v '/zh/'
```
Expected: No output (all English files should have been updated).

- [ ] **Step 3: Commit**

```bash
git add about.html faq.html contact.html privacy-policy.html terms-of-service.html cookie-policy.html 404.html tools/ posts/
git commit -m "feat: add dropdown nav to all English pages"
```

---

### Task 5: Update All Chinese Pages

**Files:**
- Modify: `zh/index.html`, `zh/about.html`, `zh/faq.html`, `zh/contact.html`, `zh/privacy-policy.html`, `zh/terms-of-service.html`, `zh/cookie-policy.html`, `zh/404.html`
- Modify: `zh/tools/index.html`, `zh/tools/vllm-generator.html`, `zh/tools/memory-calculator.html`, `zh/tools/cost-calculator.html`, `zh/tools/deployment-advisor.html`, `zh/tools/deployment-errors.html`
- Modify: `zh/posts/index.html`
- Modify: All 18 `zh/posts/*.html` files

Total: 8 + 6 + 1 + 18 = 33 files

- [ ] **Step 1: Bulk replace Chinese nav items**

For each Chinese HTML file, find:

```html
                    <li><a href="/zh/tools/index.html">工具箱</a></li>
                    <li><a href="/zh/posts/index.html">文章</a></li>
```

And replace with:

```html
                    <li class="has-dropdown" data-dropdown>
                        <a href="/zh/tools/index.html">工具箱</a>
                        <ul class="dropdown-menu">
                            <li><a href="/zh/tools/vllm-generator.html">vLLM 启动命令生成器</a></li>
                            <li><a href="/zh/tools/memory-calculator.html">大模型显存估算器</a></li>
                            <li><a href="/zh/tools/cost-calculator.html">本地 vs API 成本计算器</a></li>
                            <li><a href="/zh/tools/deployment-errors.html">常见部署错误及修复方式</a></li>
                            <li><a href="/zh/tools/deployment-advisor.html">模型部署选型助手</a></li>
                        </ul>
                    </li>
                    <li class="has-dropdown" data-dropdown>
                        <a href="/zh/posts/index.html">文章</a>
                        <ul class="dropdown-menu">
                            <li><a href="/zh/posts/index.html?cat=教程">教程</a></li>
                            <li><a href="/zh/posts/index.html?cat=踩坑">踩坑</a></li>
                            <li><a href="/zh/posts/index.html?cat=对比">对比</a></li>
                        </ul>
                    </li>
```

Note: Some pages may have `class="active"` on these links. Preserve it if present.

- [ ] **Step 2: Verify no missed files**

```bash
grep -r '<li><a href="/zh/tools/index.html">工具箱</a></li>' --include='*.html' zh/
```
Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add zh/
git commit -m "feat: add dropdown nav to all Chinese pages"
```

---

### Task 6: Mobile Menu Integration

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Add mobile dropdown toggle**

The existing mobile menu code closes the menu on outside click. We need to also handle dropdown toggling on mobile. In the existing mobile menu block, update the click handler to also handle dropdown toggling:

Find the existing mobile menu code (around lines 7-17):

```js
if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    menuToggle.setAttribute('aria-expanded', navMenu.classList.contains('active'));
  });
  document.addEventListener('click', (e) => {
    if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
      navMenu.classList.remove('active');
    }
  });
}
```

Replace with:

```js
if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    menuToggle.setAttribute('aria-expanded', navMenu.classList.contains('active'));
  });
  document.addEventListener('click', (e) => {
    if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
      navMenu.classList.remove('active');
      navMenu.querySelectorAll('.has-dropdown.open').forEach(el => el.classList.remove('open'));
    }
  });

  // Mobile: tap dropdown parent to toggle
  navMenu.querySelectorAll('.has-dropdown > a').forEach(link => {
    link.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        const parent = link.parentElement;
        const isOpen = parent.classList.contains('open');
        // Close siblings
        navMenu.querySelectorAll('.has-dropdown.open').forEach(el => {
          if (el !== parent) el.classList.remove('open');
        });
        parent.classList.toggle('open', !isOpen);
        e.preventDefault();
      }
    });
  });
}
```

- [ ] **Step 2: Test mobile behavior**

Open the site in a browser, resize to < 768px width (or use mobile device mode):
- Tap hamburger menu → slide-out menu opens
- Tap "Toolkit" → dropdown expands showing 5 tools
- Tap "Toolkit" again → dropdown collapses
- Tap "Posts" → dropdown expands showing 3 categories
- Tap outside menu → menu closes, all dropdowns collapse

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: mobile dropdown toggle in slide-out menu"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Desktop hover test**

Open `index.html` in browser at desktop width (> 768px):
- Hover "Toolkit" → dropdown with 5 tools appears
- Hover "Posts" → dropdown with 3 categories appears
- Move cursor from parent to dropdown panel → stays open
- Move cursor away → closes after ~200ms
- Press Escape → closes immediately
- Click a tool link → navigates to correct tool page
- Click a category link → navigates to posts page with filter active

- [ ] **Step 2: URL filter test**

Navigate to `/posts/index.html?cat=Tutorial`
Expected: "Tutorial" filter button is active, only Tutorial posts are shown.

Navigate to `/posts/index.html?cat=Troubleshooting`
Expected: "Troubleshooting" filter button is active.

- [ ] **Step 3: Check for console errors**

Open DevTools console on any page.
Expected: No JavaScript errors.

- [ ] **Step 4: Final commit (if any fixes needed)**

If any fixes were needed during verification, commit them:

```bash
git add -A
git commit -m "fix: dropdown verification fixes"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Implementing Task |
|---|---|
| Toolkit dropdown with 5 tools | Task 3, 4 (HTML); Task 1 (CSS) |
| Posts dropdown with 3 categories | Task 3, 4 (HTML); Task 1 (CSS) |
| CSS hover transitions | Task 1 |
| JS delay (200ms) on mouseleave | Task 2 |
| Escape key closes dropdowns | Task 2 |
| URL filter supports English categories | Task 2 |
| Mobile: dropdowns in slide-out menu | Task 1 (CSS); Task 6 (JS) |
| All English pages updated | Task 3, 4 |
| All Chinese pages updated | Task 5 |

### Placeholder Scan

- No "TBD", "TODO", "implement later" found
- All code blocks contain complete, copy-pasteable code
- All file paths are exact
- All commands include expected output

### Type Consistency

- `data-dropdown` attribute used consistently across all HTML files
- `.has-dropdown` and `.dropdown-menu` class names consistent in CSS and JS
- `applyFilter()` function signature unchanged; only the valid category list expanded
