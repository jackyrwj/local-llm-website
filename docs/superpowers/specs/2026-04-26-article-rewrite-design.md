# Article Rewrite Design — AI Deployment Notes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement.

**Goal:** Replace all existing Chinese article content with 12 high-quality English articles that feel authentically written by a hands-on engineer, not AI-generated content.

**Architecture:** Delete all current articles in `/posts/` and `/zh/posts/`. Write 12 new English articles from scratch in `/posts/` using a mixed first-person field-notes + tutorial style. Keep `/zh/` directory but remove `/zh/posts/` entirely. Update `/posts/index.html`, `/zh/posts/index.html`, sitemap, and all cross-links.

**Tech Stack:** Static HTML, existing CSS framework, no JS dependencies for articles.

---

## Scope

### In Scope
- Delete all existing `/posts/*.html` (except `index.html` which gets rewritten)
- Delete entire `/zh/posts/` directory
- Write 12 new English articles in `/posts/`
- Rewrite `/posts/index.html` article listing
- Update `/zh/posts/index.html` to redirect or show a notice
- Update `sitemap.xml`
- Update any tool pages that link to specific articles

### Out of Scope
- Rewriting `/zh/` base pages (index, about, faq, etc.)
- Rewriting `/zh/tools/`
- Creating new tools
- Any CSS/JS changes beyond article-specific minor additions

---

## Article List (12 Articles)

| # | Slug | Title | Style | Est. Words |
|---|------|-------|-------|------------|
| 1 | `deploy-qwen3-235b-failure` | How I Tried to Deploy Qwen3-235B on a Single RTX 4090 (And Why It Failed) | Field notes + lesson | 2000 |
| 2 | `vllm-vs-ollama-3months` | vLLM vs Ollama: A Hands-On Comparison After 3 Months of Daily Use | Comparison / review | 2500 |
| 3 | `vram-lie-full-context` | The VRAM Lie: Why Your 24GB GPU Cannot Run a 7B Model at Full Context | Deep dive / explainer | 2000 |
| 4 | `gpustack-zero-to-api` | GPUStack Setup Guide: From Zero to Local API in 20 Minutes | Tutorial | 1800 |
| 5 | `expose-local-llm-safely` | How to Expose Your Local LLM to the Internet Without Getting Pwned | Tutorial + field notes | 2200 |
| 6 | `cloud-to-local-cost-breakdown` | I Migrated from Cloud AI to Local LLM: A Real Cost Breakdown After 6 Months | Field notes + data | 2000 |
| 7 | `vllm-oom-debug-log` | Fixing vLLM OOM Errors: Reading the Logs Like a Detective | Field notes | 1800 |
| 8 | `docker-vllm-checklist` | Docker + vLLM: The Complete Deployment Checklist I Wish I Had on Day One | Tutorial | 2000 |
| 9 | `lobechat-local-model` | Connecting LobeChat to Your Local Model: The Missing Manual | Tutorial | 1500 |
| 10 | `quantization-tradeoffs` | Quantization Deep Dive: FP16, INT8, GPTQ, AWQ — What Actually Matters | Deep dive | 2500 |
| 11 | `cloudflare-tunnel-issues` | Cloudflare Tunnel for Local AI: Every Issue I Hit and How I Fixed It | Field notes | 1800 |
| 12 | `local-chatgpt-stack` | Building a Local ChatGPT Alternative: My Full Stack from Scratch | Tutorial + stack | 2200 |

---

## Writing Voice & Tone

**Must feel like a real person wrote it.** Key rules:

- Use first person ("I", "my", "we tried")
- Include specific failures, dead ends, and surprises
- Use casual but precise technical language
- Avoid: "In today's rapidly evolving landscape...", "It is important to note that...", overly symmetrical lists, generic enthusiasm
- Include concrete numbers (exact VRAM usage, exact dollars spent, exact model names)
- Reference specific versions ("vLLM 0.6.3", "Qwen3 235B-A22B")
- Add "tangent" asides that a real person would make
- End with an honest conclusion, not a sales pitch

**Example opening (good):**
> "I thought 24GB of VRAM would be enough. I was wrong. When I first fired up vLLM with Qwen3-72B at 32K context, the process got killed before it even finished loading. No error message, no stack trace — just `Killed`. Turns out the math I did in my head was missing one critical variable."

**Example opening (bad — AI腔):**
> "In the rapidly evolving field of large language models, efficient deployment is crucial for organizations seeking to leverage AI capabilities. This comprehensive guide explores the optimal strategies for..."

---

## Article Structure Template

Each article follows this loose structure:

```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{1-2 sentence hook}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="{Article Title}">
    <meta property="og:description" content="{hook}">
    <meta property="og:url" content="https://local-llm.org/posts/{slug}.html">
    <meta property="og:locale" content="en_US">
    <title>{Article Title} — AI Deployment Notes</title>
    <link rel="stylesheet" href="/css/style.css">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="canonical" href="https://local-llm.org/posts/{slug}.html">
    <meta name="google-adsense-account" content="ca-pub-7451090615788854">
</head>
<body>
    {standard site header}
    <main>
        <article class="post-single">
            <header class="post-header">
                <div class="container">
                    <h1>{Title}</h1>
                    <div class="post-meta">
                        <time datetime="2026-04-26">April 26, 2026</time>
                        <span class="post-category">{Category}</span>
                        <span class="post-reading-time">{X} min read</span>
                    </div>
                </div>
            </header>
            <div class="post-content container">
                {article body}
            </div>
        </article>
    </main>
    {standard site footer}
    <script src="/js/main.js"></script>
</body>
</html>
```

---

## CSS Additions (Minimal)

Append to `css/style.css`:

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
```

---

## `/posts/index.html` Rewrite

The article listing page should:
- Show all 12 articles in a grid/card layout
- Each card: title, excerpt, category, date, reading time
- Filter by category (optional, can be simple anchor links)
- No pagination needed (only 12 articles)

---

## `/zh/posts/index.html` Strategy

Since `/zh/posts/` is deleted, the Chinese posts index page should:
- Show a notice that articles are currently available in English only
- Link to `/posts/index.html`
- Keep the Chinese site navigation intact

---

## Sitemap & Cross-Link Updates

- Regenerate `sitemap.xml` with only the 12 new article URLs + existing non-article pages
- Remove all old article URLs from sitemap
- Check all tool pages for links to old articles and update/remove
- Update `/zh/posts/index.html` canonical and hreflang

---

## Decomposition Decision

This spec covers **Sub-project 1: Article Rewrite** only. Two additional sub-projects will follow:

- **Sub-project 2:** `deployment-errors.html` rename + content rework
- **Sub-project 3:** Additional tool development (as previously discussed)

---

## Spec Self-Review

1. **Placeholder scan:** No TBD, TODO, or incomplete sections.
2. **Internal consistency:** Article slugs match URLs, CSS additions are additive only, template is consistent.
3. **Scope check:** Focused on article rewrite only. Tool renames and new tools are explicitly deferred.
4. **Ambiguity check:** Writing voice rules are explicit with good/bad examples. Article count (12) is fixed.
