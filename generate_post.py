#!/usr/bin/env python3
"""
每日文章生成脚本 — AI 部署手记

生成策略：先尝试本地 GPU (qwen3.6)，失败则 fallback 到阿里百炼 (qwen-plus)。

用法:
    python3 generate_post.py                    # 自动选题（跳过已生成的）
    python3 generate_post.py "自定义文章主题"   # 指定主题
    python3 generate_post.py --batch-all        # 批量生成所有未生成的文章
    python3 generate_post.py --dry-run          # 预览，不写入文件

环境变量:
    DASHSCOPE_API_KEY  百炼 fallback key（本地失败时使用）

Cron 示例（每天早上 8 点自动生成一篇）:
    0 8 * * * cd /path/to/adsense-project && python3 generate_post.py
"""

from openai import OpenAI
import argparse
import json
import os
import random
import re
import sys
import time
from datetime import datetime
from pathlib import Path

SITE_ROOT  = Path(__file__).parent
POSTS_DIR  = SITE_ROOT / "posts"
SITE_NAME  = "AI 部署手记"
SITE_DESC  = "本地大模型部署实战经验分享，涵盖 vLLM、GPUStack、Qwen 等工具的真实踩坑记录"
AUTHOR_BIO = "本地 AI 基础设施工程师，长期在自建 GPU 服务器上折腾大模型部署，喜欢记录踩坑经历。"

# ── 20 篇文章主题（title, category, slug）────────────────────────────────────
TOPICS = [
    # 📘 基础教程类（10 篇）
    ("本地部署 Qwen3.6 全流程指南（从 0 到可用）",               "教程", "deploy-qwen36-full-guide"),
    ("使用 vLLM 部署大模型：详细步骤 + 参数说明",                "教程", "vllm-deploy-llm-step-by-step"),
    ("GPUStack 入门教程：如何管理多个模型实例",                   "教程", "gpustack-getting-started"),
    ("如何在本地搭建一个类似 ChatGPT 的聊天系统（完整实战）",     "教程", "local-chatgpt-system-guide"),
    ("LobeChat 使用教程：接入本地模型的正确方式",                 "教程", "lobechat-connect-local-model"),
    ("使用 Docker 部署 AI 服务：新手也能看懂",                   "教程", "docker-deploy-ai-service"),
    ("本地模型如何开放 API 给外网（内网穿透实战）",               "教程", "local-model-expose-api-guide"),
    ("如何使用 Cloudflare Tunnel 暴露本地 AI 服务",              "教程", "cloudflare-tunnel-local-ai"),
    ("本地大模型上下文长度（max-model-len）怎么设置最合理？",     "教程", "max-model-len-best-practice"),
    ("如何关闭 Qwen 模型的思考模式（提升响应速度）",             "教程", "qwen-disable-thinking-mode"),
    # ⚠️ 踩坑 / 问题解决类（6 篇）
    ("vLLM 启动失败常见原因 + 解决方案（完整排查指南）",         "踩坑", "vllm-startup-failure-fix"),
    ("GPU 显存不足怎么办？本地大模型优化实战",                   "踩坑", "gpu-oom-optimization"),
    ("为什么你的本地模型又慢又卡？性能瓶颈分析",                 "踩坑", "local-model-slow-performance-fix"),
    ("Docker 拉取镜像失败的 5 个常见原因（附解决方法）",         "踩坑", "docker-pull-failure-solutions"),
    ("内网穿透失败？Cloudflare Tunnel 常见问题汇总",             "踩坑", "cloudflare-tunnel-common-issues"),
    ("Qwen 模型上下文爆满（context overflow）问题解决方案",      "踩坑", "qwen-context-overflow-fix"),
    # 🔍 对比 / 深度分析类（4 篇）
    ("Qwen3.6 vs Qwen3-Coder：哪个更适合日常使用？",             "对比", "qwen36-vs-qwen3coder"),
    ("vLLM vs Ollama：性能与易用性深度对比",                     "对比", "vllm-vs-ollama-comparison"),
    ("本地模型 vs 云端模型：成本、性能、体验全面对比",            "对比", "local-vs-cloud-model"),
    ("GPUStack vs 手动部署：哪个更适合个人开发者？",             "对比", "gpustack-vs-manual-deploy"),
]

# ── 分类 CSS 类名 ────────────────────────────────────────────────────────────
CATEGORY_CSS_CLASS = {
    "教程": "cat-tut",
    "踩坑": "cat-bug",
    "对比": "cat-cmp",
}

# ── 图片池（全部已验证可用的 Unsplash ID，AI/编程/服务器主题）────────────────
IMAGES = [
    "1504639725590-34d0984388bd",   # 代码屏幕
    "1461749280684-dccba630e2f6",   # 笔记本代码
    "1542831371-29b0f74f9713",      # 终端/代码
    "1498050108023-c5249f4df085",   # MacBook 代码
    "1547658719-da2b51169166",      # 深色代码
    "1555066931-4365d14bab8c",      # 代码编辑器
    "1677442136019-21780ecad995",   # AI 概念
    "1516321318423-f06f85e504b3",   # AI/大脑
    "1485827404703-89b55fcc595e",   # 机器人/AI
    "1620712943543-bcc4688e7485",   # AI 芯片
    "1614064641938-3bbee52942c7",   # 网络/服务器
    "1563013544-824ae1b704d3",      # 数据中心
    "1510511459019-5dda7724fd87",   # 服务器机房
    "1550751827-4bd374c3f58b",      # 网络安全/终端
    "1451187580459-43490279c0fa",   # 云/服务器
    "1504384308090-c894fdcc538d",   # 服务器
    "1496181133206-80ce9b88a853",   # 数据
    "1556075798-4825dfaaf498",      # 代码/开源
    "1607798748738-b15c40d33d57",   # 代码
    "1633356122544-f134324a6cee",   # 前端代码
]

AUTHORS = ["jackyrwj", "R.W.J"]   # 个人博客，用真实感的名字


# ── 核心函数 ──────────────────────────────────────────────────────────────────

def get_pending_topics() -> list:
    """返回所有还未生成 HTML 文件的主题."""
    existing_slugs = {p.stem for p in POSTS_DIR.glob("*.html") if p.stem != "index"}
    return [t for t in TOPICS if t[2] not in existing_slugs]


def _build_prompt(title: str, category: str, slug: str) -> tuple[str, str]:
    """构建 prompt 和作者."""
    author = AUTHORS[0]   # 个人博客，固定作者
    today_cn = datetime.now().strftime("%Y年%m月%d日")

    # 根据分类调整额外写作要求
    type_hint = {
        "教程": "这是一篇操作教程。核心内容要包含完整的、可执行的命令和配置，读者照着做就能成功。",
        "踩坑": "这是一篇问题排查文章。要给出具体的报错信息（可以是你亲历的或常见的），然后一步步解释原因和解决方法。",
        "对比": "这是一篇对比分析文章。要有具体的测试数据或使用场景对比，最后给出明确的选择建议，不能模糊。",
    }.get(category, "")

    prompt = f"""你是一位有真实经验的本地 AI 部署工程师，正在写自己的个人技术博客《AI 部署手记》。
你长期在自建 GPU 服务器上运行 Qwen、vLLM、GPUStack 等工具，所有内容来自亲身实践。

请写一篇文章：
【标题】{title}
【分类】{category}
【日期】{today_cn}
【作者】{author}

━━ 额外要求 ━━
{type_hint}

━━ 写作风格 ━━
• 第一人称（"我遇到了..."、"我的做法是..."、"个人建议..."）
• 技术细节要真实，不要笼统描述
• 有自己的判断，不是百科全书式的介绍
• 像在和同行朋友聊天，语气放松但专业

━━ 文章结构（严格按此五段写）━━
<h2>背景</h2>
我为什么写这篇——我遇到了什么问题，或者有什么需求

<h2>（核心内容标题，根据主题自取）</h2>
具体步骤/解决方案/对比分析。这是主体，要最详细。
教程类：给出完整命令；踩坑类：给出报错信息和修复步骤；对比类：给出数据或使用感受对比。

<h2>实测记录</h2>
我实际跑起来后的效果——输出结果、性能数字、遇到的情况（具体描述，不能空洞）

<h2>踩坑备忘</h2>
做这件事容易踩的坑（教程类也要有这段，写你做的时候遇到的小问题）

<h2>我的结论</h2>
我的判断：什么场景用什么，推荐谁用，不推荐谁用

━━ 格式要求 ━━
• 命令/配置/报错 用 <pre><code>...</code></pre> 包裹
• 内联命令用 <code>...</code>
• 总字数 2000-2800 字
• 不能只有标题没有内容

请严格按如下 JSON 格式返回，不要输出 JSON 以外的任何内容：
{{
  "title": "{title}",
  "slug": "{slug}",
  "description": "80-120字的文章摘要，突出核心价值",
  "reading_time": "X分钟阅读",
  "author": "{author}",
  "body_html": "<h2>背景</h2><p>...</p>..."
}}

JSON 必须合法，双引号等特殊字符需转义。body_html 中的换行用 \\n 或直接写 HTML 标签。"""

    return prompt, author


def _parse_response(text: str) -> dict:
    """解析 API 响应，兼容 <think> 标签和 markdown 代码块."""
    # 去掉 think 思考过程
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    # 去掉 markdown 代码块标记
    text = re.sub(r'```(?:json)?\s*', '', text)
    text = text.strip()

    json_match = re.search(r'\{[\s\S]*\}', text)
    if not json_match:
        raise ValueError(f"无法提取 JSON，响应前 500 字:\n{text[:500]}")

    data = json.loads(json_match.group())

    for key in ["title", "slug", "description", "reading_time", "author", "body_html"]:
        if key not in data:
            raise ValueError(f"JSON 缺少字段: {key}")

    return data


def generate_article(title: str, category: str, slug: str, bailian_key: str) -> dict:
    """先尝试本地 GPU，失败 fallback 到百炼."""
    prompt, author = _build_prompt(title, category, slug)

    # 1. 本地 GPU
    print(f"  [本地GPU] 生成: {title[:45]}...")
    try:
        client = OpenAI(
            api_key="gpustack_1dbef00558bbfbdd_29cd20e1842e3f7b797bf5ed3e777ea7",
            base_url="http://172.31.171.244:8081/v1",
        )
        resp = client.chat.completions.create(
            model="qwen3.6",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=6000,
            temperature=1,
            top_p=1,
        )
        data = _parse_response(resp.choices[0].message.content.strip())
        print("  ✓ 本地 GPU 成功")
        return data
    except Exception as e:
        print(f"  ✗ 本地 GPU 失败: {e}")

    # 2. Fallback 百炼
    if not bailian_key:
        raise RuntimeError("本地 GPU 失败且未配置 DASHSCOPE_API_KEY，无法继续")
    print("  [百炼] fallback qwen-plus...")
    client = OpenAI(
        api_key=bailian_key,
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
    )
    resp = client.chat.completions.create(
        model="qwen-plus",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=6000,
    )
    data = _parse_response(resp.choices[0].message.content.strip())
    print("  ✓ 百炼成功")
    return data


# ── HTML 构建 ─────────────────────────────────────────────────────────────────

def build_post_html(article: dict, category: str, image_id: str) -> str:
    date_iso     = datetime.now().strftime("%Y-%m-%d")
    date_cn      = datetime.now().strftime("%Y年%m月%d日")
    cat_class    = CATEGORY_CSS_CLASS.get(category, "cat-tut")
    author_char  = article["author"][0]
    title_esc    = article["title"].replace('"', '&quot;')
    desc_esc     = article["description"].replace('"', '&quot;')

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{desc_esc}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="{title_esc} — {SITE_NAME}">
    <meta property="og:description" content="{desc_esc}">
    <meta name="twitter:card" content="summary_large_image">
    <title>{article["title"]} — {SITE_NAME}</title>
    <link rel="stylesheet" href="../css/style.css">
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "{title_esc}",
      "description": "{desc_esc}",
      "datePublished": "{date_iso}",
      "author": {{"@type": "Person", "name": "{article["author"]}"}},
      "publisher": {{"@type": "Organization", "name": "{SITE_NAME}"}},
      "articleSection": "{category}",
      "inLanguage": "zh-CN"
    }}
    </script>
</head>
<body>
    <div class="reading-progress" id="readingProgress"></div>

    <header class="site-header">
        <div class="container">
            <div class="logo"><a href="../index.html">{SITE_NAME}</a></div>
            <nav class="main-nav" aria-label="主导航">
                <button class="mobile-menu-toggle" aria-label="切换菜单" aria-expanded="false">
                    <span></span><span></span><span></span>
                </button>
                <ul class="nav-menu">
                    <li><a href="../index.html">首页</a></li>
                    <li><a href="index.html">文章</a></li>
                    <li><a href="../about.html">关于</a></li>
                    <li><a href="../contact.html">联系</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main>
        <article>
            <header class="post-header">
                <div class="container">
                    <span class="post-category {cat_class}">{category}</span>
                    <h1>{article["title"]}</h1>
                    <div class="post-meta">
                        <time datetime="{date_iso}">{date_cn}</time>
                        <span>·</span>
                        <span class="read-time">{article["reading_time"]}</span>
                        <span>·</span>
                        <span class="author">{article["author"]}</span>
                    </div>
                </div>
            </header>

            <div class="post-hero-image">
                <div class="container">
                    <img src="https://images.unsplash.com/photo-{image_id}?w=1200&h=600&fit=crop"
                         alt="{title_esc}" loading="lazy">
                </div>
            </div>

            <div class="post-body">
                <div class="container">
                    {article["body_html"]}
                </div>
            </div>
        </article>
    </main>

    <footer class="site-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-about">
                    <div class="footer-logo">{SITE_NAME}</div>
                    <p>{SITE_DESC}</p>
                    <span class="footer-tagline">实战记录 · 避坑指南 · 每日更新</span>
                </div>
                <div class="footer-links">
                    <h4>快速链接</h4>
                    <ul>
                        <li><a href="../index.html">首页</a></li>
                        <li><a href="index.html">文章归档</a></li>
                        <li><a href="../about.html">关于</a></li>
                        <li><a href="../contact.html">联系</a></li>
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
                <p>&copy; 2026 {SITE_NAME}. 保留所有权利。</p>
                <p>本地 AI 实战记录</p>
            </div>
        </div>
    </footer>

    <div class="cookie-consent" id="cookieConsent">
        <div class="container">
            <p>本站使用 Cookie 分析访问数据。继续浏览即表示你同意我们的
               <a href="../cookie-policy.html">Cookie 政策</a> 和
               <a href="../privacy-policy.html">隐私政策</a>。</p>
            <button class="btn btn-primary" id="acceptCookies">我知道了</button>
        </div>
    </div>

    <script src="../js/main.js"></script>
</body>
</html>"""


def build_post_item_html(article: dict, category: str, filename: str, image_id: str) -> str:
    date_iso = datetime.now().strftime("%Y-%m-%d")
    date_cn  = datetime.now().strftime("%Y年%m月%d日")
    desc     = article["description"][:85].rstrip("。，,") + "..."
    return f"""                    <article class="post-item reveal">
                        <div class="post-thumbnail">
                            <a href="{filename}">
                                <img src="https://images.unsplash.com/photo-{image_id}?w=300&h=200&fit=crop"
                                     alt="{article['title']}" loading="lazy">
                            </a>
                        </div>
                        <div class="post-info">
                            <span class="post-category">{category}</span>
                            <h3><a href="{filename}">{article['title']}</a></h3>
                            <p>{desc}</p>
                            <div class="post-meta">
                                <time datetime="{date_iso}">{date_cn}</time>
                                <span class="dot">·</span>
                                <span class="read-time">{article['reading_time']}</span>
                            </div>
                        </div>
                    </article>"""


def prepend_to_posts_index(item_html: str):
    path    = POSTS_DIR / "index.html"
    content = path.read_text(encoding="utf-8")
    marker  = '<div class="post-list">'
    idx     = content.find(marker)
    if idx == -1:
        print("  ⚠ posts/index.html 未找到 .post-list")
        return
    insert = idx + len(marker) + 1
    path.write_text(content[:insert] + "\n" + item_html + "\n" + content[insert:], encoding="utf-8")
    print("  ↻ 已更新 posts/index.html")


def update_homepage_latest(article: dict, category: str, filename: str, image_id: str):
    path     = SITE_ROOT / "index.html"
    content  = path.read_text(encoding="utf-8")
    date_iso = datetime.now().strftime("%Y-%m-%d")
    date_cn  = datetime.now().strftime("%Y年%m月%d日")
    desc     = article["description"][:85].rstrip("。，,") + "..."

    new_item = f"""                    <article class="post-item reveal">
                        <div class="post-thumbnail">
                            <a href="posts/{filename}">
                                <img src="https://images.unsplash.com/photo-{image_id}?w=300&h=200&fit=crop"
                                     alt="{article['title']}" loading="lazy">
                            </a>
                        </div>
                        <div class="post-info">
                            <span class="post-category">{category}</span>
                            <h3><a href="posts/{filename}">{article['title']}</a></h3>
                            <p>{desc}</p>
                            <div class="post-meta">
                                <time datetime="{date_iso}">{date_cn}</time>
                                <span class="dot">·</span>
                                <span class="read-time">{article['reading_time']}</span>
                            </div>
                        </div>
                    </article>"""

    section_start = content.find('<section class="latest-posts">')
    if section_start == -1:
        print("  ⚠ index.html 未找到 latest-posts")
        return

    marker    = '<div class="post-list">'
    list_pos  = content.find(marker, section_start)
    if list_pos == -1:
        return

    insert_at  = list_pos + len(marker) + 1
    new_content = content[:insert_at] + "\n" + new_item + "\n" + content[insert_at:]

    # 保持首页最新 4 篇
    tag = '<article class="post-item reveal">'
    positions, pos = [], list_pos
    for _ in range(6):
        pos = new_content.find(tag, pos)
        if pos == -1:
            break
        positions.append(pos)
        pos += len(tag)

    if len(positions) >= 5:
        start5  = positions[4]
        end5_raw = new_content.find("</article>", start5)
        if end5_raw != -1:
            end5 = end5_raw + len("</article>")
            while end5 < len(new_content) and new_content[end5] in "\n\r ":
                end5 += 1
            new_content = new_content[:start5] + new_content[end5:]

    path.write_text(new_content, encoding="utf-8")
    print("  ↻ 已更新 index.html")


# ── 单篇生成流程 ──────────────────────────────────────────────────────────────

def run_one(title: str, category: str, slug: str, bailian_key: str, dry_run: bool = False):
    filename = f"{slug}.html"
    post_path = POSTS_DIR / filename

    if post_path.exists():
        print(f"  ⏭  已存在，跳过: {filename}")
        return False

    article  = generate_article(title, category, slug, bailian_key)
    image_id = random.choice(IMAGES)

    if dry_run:
        print(f"\n[dry-run] {article['title']}")
        print(f"摘要: {article['description'][:80]}")
        print(f"正文预览: {re.sub(r'<[^>]+>', '', article['body_html'])[:300]}")
        return True

    post_path.write_text(build_post_html(article, category, image_id), encoding="utf-8")
    print(f"  ✎  已写入: posts/{filename}")

    item_html = build_post_item_html(article, category, filename, image_id)
    prepend_to_posts_index(item_html)
    update_homepage_latest(article, category, filename, image_id)
    return True


# ── 主程序 ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="AI 部署手记 — 文章生成器")
    parser.add_argument("topic",       nargs="?",        help="自定义文章主题")
    parser.add_argument("--batch-all", action="store_true", help="批量生成所有未完成文章")
    parser.add_argument("--dry-run",   action="store_true", help="预览，不写入文件")
    args = parser.parse_args()

    bailian_key = os.environ.get("DASHSCOPE_API_KEY", "")

    print(f"\n{'='*55}")
    print(f"  {SITE_NAME} — 文章生成器")
    print(f"{'='*55}")

    if args.batch_all:
        pending = get_pending_topics()
        total   = len(TOPICS)
        done    = total - len(pending)
        print(f"  总计 {total} 篇，已生成 {done} 篇，待生成 {len(pending)} 篇\n")

        for i, (title, category, slug) in enumerate(pending, 1):
            print(f"\n[{i}/{len(pending)}] {title}")
            try:
                run_one(title, category, slug, bailian_key, dry_run=args.dry_run)
            except Exception as e:
                print(f"  ✗ 失败: {e}")
            if i < len(pending):
                time.sleep(2)   # 避免请求过于密集

        print(f"\n{'='*55}")
        print(f"  批量生成完成！")
        print(f"{'='*55}\n")
        return

    # 单篇模式
    if args.topic:
        # 在预定义列表里匹配
        matched = next((t for t in TOPICS if args.topic in t[0]), None)
        if matched:
            title, category, slug = matched
        else:
            title    = args.topic
            category = "教程"
            slug     = re.sub(r'[^a-z0-9-]', '', args.topic.lower().replace(' ', '-'))[:40] \
                       or f"post-{datetime.now().strftime('%Y%m%d%H%M')}"
    else:
        pending = get_pending_topics()
        if not pending:
            print("  所有主题均已生成，无待处理主题。")
            return
        title, category, slug = random.choice(pending)

    print(f"  主题: {title}")
    print(f"  分类: {category}  |  Slug: {slug}\n")

    try:
        run_one(title, category, slug, bailian_key, dry_run=args.dry_run)
        print(f"\n  完成！\n")
    except Exception as e:
        print(f"\n  ✗ 失败: {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
