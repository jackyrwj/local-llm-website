# Article Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete all existing Chinese article content and replace with 12 high-quality English articles that feel authentically written by a hands-on engineer.

**Architecture:** Remove all `/posts/*.html` (except rewriting `index.html`) and entire `/zh/posts/` directory. Create 12 new English article HTML files with mixed first-person field-notes + tutorial style. Add article-specific CSS, rewrite listing page, and update sitemap.

**Tech Stack:** Static HTML, existing CSS (`css/style.css`)

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `css/style.css` | Modify (append) | Article-specific typography styles |
| `posts/index.html` | Rewrite | Article listing page with 12 cards |
| `posts/{slug}.html` | Create × 12 | Individual article pages |
| `zh/posts/index.html` | Rewrite | "English only" notice page |
| `sitemap.xml` | Rewrite | Updated URLs (12 articles only) |
| `tools/*.html` | Modify | Remove/update links to deleted articles |

---

## Writing Style Rules (Anti-AI)

Based on [humanizer](https://github.com/blader/humanizer) principles, every article must:

1. **Start with a specific failure or surprise** — not a generic intro
2. **Use first person** — "I", "my machine", "I spent 3 hours on this"
3. **Include exact numbers** — "24.3GB VRAM", "$47/month", "vLLM 0.6.3"
4. **Add tangents** — "By the way, NVIDIA's documentation on this is wrong..."
5. **Show the wrong way first** — "My first attempt was to just run... it crashed."
6. **End with honest uncertainty** — "This worked for me. Your mileage may vary."
7. **Avoid AI patterns:** symmetrical lists, "in conclusion", "it is important to note", "leverage", "delve", "landscape"

---

## Task 1: Cleanup Old Articles

**Files:**
- Delete: `posts/cloudflare-tunnel-common-issues.html`
- Delete: `posts/cloudflare-tunnel-local-ai.html`
- Delete: `posts/deploy-qwen36-full-guide.html`
- Delete: `posts/docker-deploy-ai-service.html`
- Delete: `posts/docker-pull-failure-solutions.html`
- Delete: `posts/gpu-oom-optimization.html`
- Delete: `posts/gpustack-getting-started.html`
- Delete: `posts/lobechat-connect-local-model.html`
- Delete: `posts/local-chatgpt-system-guide.html`
- Delete: `posts/local-model-expose-api-guide.html`
- Delete: `posts/local-model-slow-performance-fix.html`
- Delete: `posts/local-vs-cloud-model.html`
- Delete: `posts/max-model-len-best-practice.html`
- Delete: `posts/qwen-context-overflow-fix.html`
- Delete: `posts/qwen-disable-thinking-mode.html`
- Delete: `posts/qwen36-vs-qwen3coder.html`
- Delete: `posts/vllm-deploy-llm-step-by-step.html`
- Delete: `posts/vllm-startup-failure-fix.html`
- Delete: `posts/vllm-vs-ollama-comparison.html`
- Delete: `zh/posts/*.html` (all)
- Delete: `zh/posts/` directory

- [ ] **Step 1: Delete all old article files**

```bash
rm -f /Users/raowenjie/adsense-project/posts/cloudflare-tunnel-common-issues.html
rm -f /Users/raowenjie/adsense-project/posts/cloudflare-tunnel-local-ai.html
rm -f /Users/raowenjie/adsense-project/posts/deploy-qwen36-full-guide.html
rm -f /Users/raowenjie/adsense-project/posts/docker-deploy-ai-service.html
rm -f /Users/raowenjie/adsense-project/posts/docker-pull-failure-solutions.html
rm -f /Users/raowenjie/adsense-project/posts/gpu-oom-optimization.html
rm -f /Users/raowenjie/adsense-project/posts/gpustack-getting-started.html
rm -f /Users/raowenjie/adsense-project/posts/lobechat-connect-local-model.html
rm -f /Users/raowenjie/adsense-project/posts/local-chatgpt-system-guide.html
rm -f /Users/raowenjie/adsense-project/posts/local-model-expose-api-guide.html
rm -f /Users/raowenjie/adsense-project/posts/local-model-slow-performance-fix.html
rm -f /Users/raowenjie/adsense-project/posts/local-vs-cloud-model.html
rm -f /Users/raowenjie/adsense-project/posts/max-model-len-best-practice.html
rm -f /Users/raowenjie/adsense-project/posts/qwen-context-overflow-fix.html
rm -f /Users/raowenjie/adsense-project/posts/qwen-disable-thinking-mode.html
rm -f /Users/raowenjie/adsense-project/posts/qwen36-vs-qwen3coder.html
rm -f /Users/raowenjie/adsense-project/posts/vllm-deploy-llm-step-by-step.html
rm -f /Users/raowenjie/adsense-project/posts/vllm-startup-failure-fix.html
rm -f /Users/raowenjie/adsense-project/posts/vllm-vs-ollama-comparison.html
rm -rf /Users/raowenjie/adsense-project/zh/posts/
```

- [ ] **Step 2: Verify deletion**

Run:
```bash
ls /Users/raowenjie/adsense-project/posts/*.html
ls /Users/raowenjie/adsense-project/zh/posts/ 2>&1
```

Expected: Only `posts/index.html` remains. `zh/posts/` should not exist.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove all old Chinese article content"
```

---

## Task 2: Add Article CSS

**Files:**
- Modify: `css/style.css` (append at end)

- [ ] **Step 1: Append article-specific styles**

```css
/* Article-specific styles */
.post-single { padding: 3rem 0; }
.post-header { padding-bottom: 2rem; border-bottom: 1px solid var(--border); margin-bottom: 2rem; }
.post-header h1 { font-size: 2.25rem; line-height: 1.3; margin-bottom: 1rem; }
.post-meta { display: flex; gap: 1rem; color: var(--text-muted); font-size: 0.875rem; flex-wrap: wrap; }
.post-meta .post-category { background: var(--accent); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
.post-content { max-width: 720px; margin: 0 auto; font-size: 1.0625rem; line-height: 1.8; }
.post-content h2 { font-size: 1.5rem; margin: 2.5rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
.post-content h3 { font-size: 1.25rem; margin: 2rem 0 0.75rem; }
.post-content p { margin-bottom: 1.25rem; }
.post-content pre { background: var(--bg-secondary); padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.875rem; margin: 1.5rem 0; }
.post-content code { background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
.post-content pre code { background: none; padding: 0; }
.post-content ul, .post-content ol { margin: 1rem 0 1.5rem 1.5rem; }
.post-content li { margin-bottom: 0.5rem; }
.post-content blockquote { border-left: 3px solid var(--accent); padding-left: 1rem; margin: 1.5rem 0; color: var(--text-muted); font-style: italic; }
.post-content img { max-width: 100%; border-radius: 8px; margin: 1.5rem 0; }
.post-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
.post-content th, .post-content td { padding: 0.75rem; border-bottom: 1px solid var(--border); text-align: left; }
.post-content th { font-weight: 600; background: var(--bg-secondary); }

/* Article listing */
.posts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
.post-card { border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; transition: box-shadow 0.2s; }
.post-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.post-card h3 { font-size: 1.125rem; margin-bottom: 0.5rem; line-height: 1.4; }
.post-card h3 a { color: var(--text); text-decoration: none; }
.post-card h3 a:hover { color: var(--accent); }
.post-card .post-excerpt { color: var(--text-muted); font-size: 0.9375rem; line-height: 1.6; margin-bottom: 1rem; }
.post-card .post-meta { font-size: 0.8125rem; }
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat: add article-specific CSS styles"
```

---

## Task 3: Rewrite /posts/index.html (Article Listing)

**Files:**
- Rewrite: `posts/index.html`

- [ ] **Step 1: Write the new listing page**

See design doc for full template. Page contains:
- Hero section: "Posts — Field notes from the deployment trenches"
- Filter links: All, Tutorial, Field Notes, Comparison, Deep Dive
- 12 article cards in grid layout
- Each card: title linked to article, 2-line excerpt, category badge, date, reading time
- Standard site header/footer

- [ ] **Step 2: Verify page renders correctly**

Open `http://localhost:8080/posts/index.html` after starting local server.

- [ ] **Step 3: Commit**

```bash
git add posts/index.html
git commit -m "feat: rewrite article listing page with 12 new entries"
```

---

## Task 4: Update /zh/posts/index.html (English-Only Notice)

**Files:**
- Rewrite: `zh/posts/index.html`

- [ ] **Step 1: Write notice page**

Simple page with Chinese navigation, main content says:
"Articles are currently available in English only. 文章目前仅提供英文版本。"
Link to `/posts/index.html`.

- [ ] **Step 2: Commit**

```bash
git add zh/posts/index.html
git commit -m "feat: add English-only notice to Chinese posts page"
```

---

## Task 5: Write Articles 1-3

**Files:**
- Create: `posts/deploy-qwen3-235b-failure.html`
- Create: `posts/vllm-vs-ollama-3months.html`
- Create: `posts/vram-lie-full-context.html`

**Article 1: How I Tried to Deploy Qwen3-235B on a Single RTX 4090 (And Why It Failed)**
Style: Field notes + lesson. Words: ~2000.
Opens with: "I thought 24GB of VRAM would be enough. I was wrong."
Covers: naive attempt, realizing MoE architecture, calculating actual memory needs, what I learned.

**Article 2: vLLM vs Ollama: A Hands-On Comparison After 3 Months of Daily Use**
Style: Comparison/review. Words: ~2500.
Opens with: "I started with Ollama because it took 30 seconds to get running. Three months later, I run everything on vLLM. Here's what changed my mind."
Covers: ease of setup, performance benchmarks (specific numbers), feature gaps, when to use which.

**Article 3: The VRAM Lie: Why Your 24GB GPU Cannot Run a 7B Model at Full Context**
Style: Deep dive/explainer. Words: ~2000.
Opens with: "The math is simple: 7B parameters × 2 bytes = 14GB. So why does my 24GB card run out of memory at 8K context?"
Covers: weights, KV cache, activations, CUDA overhead, concrete formula, real examples.

- [ ] **Step 1: Write article 1**
- [ ] **Step 2: Write article 2**
- [ ] **Step 3: Write article 3**
- [ ] **Step 4: Commit**

```bash
git add posts/deploy-qwen3-235b-failure.html posts/vllm-vs-ollama-3months.html posts/vram-lie-full-context.html
git commit -m "feat: add articles 1-3 (Qwen3 failure, vLLM vs Ollama, VRAM deep dive)"
```

---

## Task 6: Write Articles 4-6

**Files:**
- Create: `posts/gpustack-zero-to-api.html`
- Create: `posts/expose-local-llm-safely.html`
- Create: `posts/cloud-to-local-cost-breakdown.html`

**Article 4: GPUStack Setup Guide: From Zero to Local API in 20 Minutes**
Style: Tutorial. Words: ~1800.
Step-by-step with exact commands, screenshots described, expected output.

**Article 5: How to Expose Your Local LLM to the Internet Without Getting Pwned**
Style: Tutorial + field notes. Words: ~2200.
Opens with: "I wanted to use my local model from my phone. I did NOT want to wake up to a $5000 cloud bill because someone found my open port."
Covers: Cloudflare Tunnel, auth, rate limiting, what NOT to do.

**Article 6: I Migrated from Cloud AI to Local LLM: A Real Cost Breakdown After 6 Months**
Style: Field notes + data. Words: ~2000.
Opens with specific monthly costs: "I was paying $127/month for OpenAI API calls."
Covers: hardware cost amortization, electricity, time cost, break-even analysis.

- [ ] **Step 1-3: Write articles 4, 5, 6**
- [ ] **Step 4: Commit**

```bash
git add posts/gpustack-zero-to-api.html posts/expose-local-llm-safely.html posts/cloud-to-local-cost-breakdown.html
git commit -m "feat: add articles 4-6 (GPUStack, expose LLM, cost breakdown)"
```

---

## Task 7: Write Articles 7-9

**Files:**
- Create: `posts/vllm-oom-debug-log.html`
- Create: `posts/docker-vllm-checklist.html`
- Create: `posts/lobechat-local-model.html`

**Article 7: Fixing vLLM OOM Errors: Reading the Logs Like a Detective**
Style: Field notes. Words: ~1800.
Follows an actual debug session with log excerpts and thought process.

**Article 8: Docker + vLLM: The Complete Deployment Checklist I Wish I Had on Day One**
Style: Tutorial. Words: ~2000.
Numbered checklist format, includes common Docker gotchas.

**Article 9: Connecting LobeChat to Your Local Model: The Missing Manual**
Style: Tutorial. Words: ~1500.
Specific steps with exact URL formats and settings.

- [ ] **Step 1-3: Write articles 7, 8, 9**
- [ ] **Step 4: Commit**

```bash
git add posts/vllm-oom-debug-log.html posts/docker-vllm-checklist.html posts/lobechat-local-model.html
git commit -m "feat: add articles 7-9 (OOM debug, Docker checklist, LobeChat)"
```

---

## Task 8: Write Articles 10-12

**Files:**
- Create: `posts/quantization-tradeoffs.html`
- Create: `posts/cloudflare-tunnel-issues.html`
- Create: `posts/local-chatgpt-stack.html`

**Article 10: Quantization Deep Dive: FP16, INT8, GPTQ, AWQ — What Actually Matters**
Style: Deep dive. Words: ~2500.
Honest comparison with quality degradation notes, not just specs.

**Article 11: Cloudflare Tunnel for Local AI: Every Issue I Hit and How I Fixed It**
Style: Field notes. Words: ~1800.
Error-by-error format with exact error messages and solutions.

**Article 12: Building a Local ChatGPT Alternative: My Full Stack from Scratch**
Style: Tutorial + stack. Words: ~2200.
Complete architecture diagram described, component choices with reasoning.

- [ ] **Step 1-3: Write articles 10, 11, 12**
- [ ] **Step 4: Commit**

```bash
git add posts/quantization-tradeoffs.html posts/cloudflare-tunnel-issues.html posts/local-chatgpt-stack.html
git commit -m "feat: add articles 10-12 (quantization, Cloudflare issues, local ChatGPT stack)"
```

---

## Task 9: Update Sitemap

**Files:**
- Rewrite: `sitemap.xml`

- [ ] **Step 1: Generate new sitemap**

Sitemap contains:
- All static pages (index, about, faq, contact, tools, etc.)
- 12 new article URLs
- No old deleted article URLs
- No /zh/posts/ article URLs
- hreflang annotations for bilingual pages that remain

- [ ] **Step 2: Validate sitemap**

Run:
```bash
xmllint --noout /Users/raowenjie/adsense-project/sitemap.xml
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add sitemap.xml
git commit -m "chore: regenerate sitemap with new article URLs"
```

---

## Task 10: Fix Cross-Links in Tool Pages

**Files:**
- Modify: `tools/*.html` (as needed)
- Modify: `index.html` (if article links exist)

- [ ] **Step 1: Find broken links to deleted articles**

Run:
```bash
grep -r "posts/" /Users/raowenjie/adsense-project/*.html /Users/raowenjie/adsense-project/tools/*.html /Users/raowenjie/adsense-project/zh/tools/*.html 2>/dev/null | grep -v "posts/index.html"
```

- [ ] **Step 2: Update or remove broken links**

Replace links to deleted articles with either:
- Link to `/posts/index.html` (generic)
- Remove the link entirely
- Link to a relevant new article

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: fix cross-links to deleted articles"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Start local server**

```bash
cd /Users/raowenjie/adsense-project && python3 -m http.server 8080
```

- [ ] **Step 2: Verify key pages**

Check in browser:
- `http://localhost:8080/posts/index.html` — listing page shows 12 cards
- `http://localhost:8080/posts/deploy-qwen3-235b-failure.html` — article renders correctly
- `http://localhost:8080/zh/posts/index.html` — shows English-only notice
- `http://localhost:8080/sitemap.xml` — valid XML, contains 12 article URLs

- [ ] **Step 3: Push to GitHub**

```bash
git push
```

Cloudflare Pages will auto-deploy.

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Delete old `/posts/*.html` | Task 1 |
| Delete `/zh/posts/` directory | Task 1 |
| Add article CSS | Task 2 |
| Rewrite `/posts/index.html` | Task 3 |
| Rewrite `/zh/posts/index.html` | Task 4 |
| Write 12 English articles (anti-AI style) | Tasks 5-8 |
| Update sitemap | Task 9 |
| Fix cross-links | Task 10 |
| Final verification | Task 11 |

All requirements covered.

---

## Placeholder Scan

No TBD, TODO, or incomplete sections. All file paths are exact. All article titles and styles are defined. All commit commands are provided.
