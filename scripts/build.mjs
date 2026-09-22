#!/usr/bin/env node
/**
 * @file build.mjs
 * obw 高颜值个人 Notes 静态站点构建引擎
 * 自动扫描 posts/*.md，解析 Frontmatter，调用 obw 核心排版引擎渲染，
 * 并组装为现代、极简、高质感（支持暗黑模式、随动目录、文章标签、微交互）的纯静态网站。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT_DIR, "posts");
const IMAGES_DIR = path.join(ROOT_DIR, "images");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const DIST_POSTS_DIR = path.join(DIST_DIR, "posts");
const DIST_IMAGES_DIR = path.join(DIST_DIR, "images");

// 站点元数据配置 (可根据个人信息修改)
const SITE_CONFIG = {
  title: "Weaving's Notes",
  author: "Weaving",
  description: "探索技术、深度思考与出版级排版实践的个人数字花园",
  siteUrl: "https://weavingtan.github.io/notes",
  wechatName: "Weaving Notes",
  wechatQrUrl: "../images/wechat-qr.png", // 公众号二维码图片地址（可放置于 images/ 下）
  theme: "tech-blue", // obw 主题: tech-blue, paper-book, elegance-black, orange-vibe 等
};

import { execFileSync } from "node:child_process";

// 探测可用的 obw CLI 路径
function findObwCli() {
  const candidates = [
    path.resolve(ROOT_DIR, "bin/obw.cjs"),
    path.resolve(ROOT_DIR, "bin/obw.js"),
    path.resolve(ROOT_DIR, "../../bin/obw.js"),
    path.resolve(ROOT_DIR, "node_modules/obsidian-wechat-publisher/bin/obw.js"),
    path.resolve(ROOT_DIR, "../node_modules/obsidian-wechat-publisher/bin/obw.js"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const obwCliPath = findObwCli();
if (obwCliPath) {
  console.log(`✨ 找到 obw 排版引擎: ${obwCliPath}`);
} else {
  console.warn("⚠️ 未找到本地 obw CLI，构建时将尝试系统 npx obw。");
}

function renderWithObw(markdownText, theme = SITE_CONFIG.theme) {
  try {
    if (obwCliPath) {
      return execFileSync("node", [obwCliPath, "convert", "-", "--theme=" + theme, "--stdout"], {
        input: markdownText,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });
    }
    // 尝试直接使用 npx obw
    return execFileSync("npx", ["obw", "convert", "-", "--theme=" + theme, "--stdout"], {
      input: markdownText,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    console.warn("⚠️ 调用 obw 渲染失败，使用原生 HTML 降级:", err.message);
    return `<section class="fallback-content">${markdownText.replace(/\n\n/g, "</p><p>")}</section>`;
  }
}

/**
 * 提取 YAML Frontmatter 和正文
 */
function parseFrontmatter(rawContent) {
  const meta = {
    title: "",
    date: "",
    tags: [],
    categories: [],
    cover: "",
    description: "",
    author: SITE_CONFIG.author,
  };

  const fmMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) {
    // 没有 frontmatter，尝试把首行 # Title 提取为标题
    const lines = rawContent.split(/\r?\n/);
    let title = "未命名笔记";
    let body = rawContent;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("# ")) {
        title = line.replace(/^#\s+/, "").trim();
        lines.splice(i, 1);
        body = lines.join("\n");
        break;
      }
    }
    meta.title = title;
    return { meta, body };
  }

  const yamlBlock = fmMatch[1];
  const body = fmMatch[2];

  yamlBlock.split(/\r?\n/).forEach((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return;
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    if (key === "tags" || key === "categories") {
      if (val.startsWith("[") && val.endsWith("]")) {
        meta[key] = val
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      } else if (val) {
        meta[key] = [val];
      }
    } else {
      meta[key] = val;
    }
  });

  if (!meta.title) {
    const firstH1 = body.match(/^#\s+(.+)$/m);
    meta.title = firstH1 ? firstH1[1].trim() : "未命名笔记";
  }

  return { meta, body };
}

/**
 * 统计汉字与单词量，估算阅读时间
 */
function calculateReadingStats(text) {
  const clean = text.replace(/```[\s\S]*?```/g, "").replace(/<[^>]+>/g, "");
  const cjkCount = (clean.match(/[\u4e00-\u9fa5]/g) || []).length;
  const wordCount = (clean.match(/[a-zA-Z0-9_\-]+/g) || []).length;
  const total = cjkCount + wordCount;
  const readingTimeMin = Math.max(1, Math.ceil(total / 350));
  return { totalWords: total, readingTimeMin };
}

/**
 * 从 HTML 中提取目录结构（H1~H4）
 */
function extractToc(html) {
  const headingRegex = /<h([1-4])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  const toc = [];
  let match;
  let counter = 0;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const rawInner = match[3];
    const text = rawInner.replace(/<[^>]+>/g, "").trim();
    if (!text) continue;

    counter++;
    const id = `heading-${counter}`;
    toc.push({ level, text, id, matchIndex: match.index, fullTag: match[0] });
  }

  // 为正文中的各级标题打上 id 锚点以供目录跳转
  let processedHtml = html;
  let offset = 0;
  for (const item of toc) {
    const tagMatch = item.fullTag.match(/^<h([1-4])\b([^>]*)>([\s\S]*?)<\/h\1>$/i);
    if (!tagMatch) continue;
    const level = tagMatch[1];
    const attrs = tagMatch[2];
    const inner = tagMatch[3];

    // 如果原标签已经有 id，提取之；否则追加 id
    let newAttrs = attrs;
    const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    if (idMatch) {
      item.id = idMatch[1];
    } else {
      newAttrs = `${attrs} id="${item.id}"`;
    }

    const replacement = `<h${level}${newAttrs}>${inner}</h${level}>`;
    processedHtml =
      processedHtml.slice(0, item.matchIndex + offset) +
      replacement +
      processedHtml.slice(item.matchIndex + offset + item.fullTag.length);
    offset += replacement.length - item.fullTag.length;
  }

  return { toc, html: processedHtml };
}

/**
 * 现代化网站通用 CSS 样式
 */
const SITE_STYLES = `
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --bg-page: #f8fafc;
  --bg-card: #ffffff;
  --bg-hover: #f1f5f9;
  --border-color: #e2e8f0;
  --border-light: #f1f5f9;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --text-light: #94a3b8;
  --accent: #2563eb;
  --accent-light: #eff6ff;
  --accent-border: #bfdbfe;
  --card-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
  --card-shadow-hover: 0 12px 30px -4px rgba(37, 99, 235, 0.08);
  --header-height: 64px;
}

[data-theme="dark"] {
  --bg-page: #090d16;
  --bg-card: #111827;
  --bg-hover: #1e293b;
  --border-color: rgba(255, 255, 255, 0.08);
  --border-light: rgba(255, 255, 255, 0.04);
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-light: #64748b;
  --accent: #3b82f6;
  --accent-light: rgba(59, 130, 246, 0.12);
  --accent-border: rgba(59, 130, 246, 0.25);
  --card-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4);
  --card-shadow-hover: 0 12px 30px -4px rgba(59, 130, 246, 0.15);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-sans);
  background-color: var(--bg-page);
  color: var(--text-main);
  line-height: 1.75;
  transition: background-color 0.25s ease, color 0.25s ease;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }

/* 顶部导航条（毛玻璃） */
.site-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--header-height);
  background: rgba(248, 250, 252, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.25s ease, border-color 0.25s ease;
}
[data-theme="dark"] .site-nav {
  background: rgba(9, 13, 22, 0.85);
}
.nav-container {
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.site-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: -0.02em;
}
.site-logo-badge {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}
.nav-link {
  font-size: 0.95rem;
  color: var(--text-muted);
  transition: color 0.2s;
  font-weight: 500;
}
.nav-link:hover { color: var(--accent); }
.theme-btn {
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  padding: 7px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}
.theme-btn:hover { border-color: var(--accent); }

/* 阅读进度指示条 */
#read-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #2563eb, #38bdf8);
  width: 0%;
  z-index: 200;
  transition: width 0.1s;
}

/* 首页 Hero 区域 */
.home-hero {
  max-width: 900px;
  margin: 48px auto 32px;
  padding: 0 24px;
  text-align: center;
}
.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  background: var(--accent-light);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 16px;
}
.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.25;
  margin-bottom: 12px;
}
.hero-desc {
  font-size: 1.15rem;
  color: var(--text-muted);
  max-width: 600px;
  margin: 0 auto 24px;
}

/* 标签筛选栏 */
.tag-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 40px;
  padding: 0 24px;
}
.tag-chip {
  padding: 6px 14px;
  border-radius: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tag-chip:hover, .tag-chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

/* 文章卡片网格 */
.post-grid {
  max-width: 1060px;
  margin: 0 auto 64px;
  padding: 0 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}
.post-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--card-shadow);
  display: flex;
  flex-direction: column;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s, border-color 0.25s;
}
.post-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--card-shadow-hover);
  border-color: var(--accent-border);
}
.card-cover {
  width: 100%;
  height: 180px;
  object-fit: cover;
  background: var(--bg-hover);
}
.card-body {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--text-light);
  margin-bottom: 10px;
}
.card-tag {
  background: var(--accent-light);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
}
.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 10px;
  color: var(--text-main);
  transition: color 0.2s;
}
.post-card:hover .card-title {
  color: var(--accent);
}
.card-desc {
  font-size: 0.92rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 20px;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--text-light);
  border-top: 1px solid var(--border-light);
  padding-top: 14px;
}
.read-more-link {
  color: var(--accent);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 文章详情页双栏架构 */
.article-wrapper {
  max-width: 1200px;
  margin: 40px auto 80px;
  padding: 0 24px;
  display: flex;
  gap: 48px;
  align-items: flex-start;
}
.article-main {
  flex: 1;
  max-width: 800px;
  min-width: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 48px 44px;
  box-shadow: var(--card-shadow);
}
.article-toc-sidebar {
  width: 280px;
  position: sticky;
  top: 96px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  box-shadow: var(--card-shadow);
}
@media (max-width: 1000px) {
  .article-toc-sidebar { display: none; }
  .article-main { max-width: 100%; padding: 32px 20px; }
}

.article-header {
  margin-bottom: 36px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 16px;
}
.article-title {
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.35;
  margin-bottom: 16px;
}
.article-meta-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  font-size: 0.88rem;
  color: var(--text-muted);
}

/* 目录 (TOC) 样式 */
.toc-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.toc-list { list-style: none; }
.toc-item { margin-bottom: 8px; line-height: 1.4; }
.toc-item a {
  display: block;
  font-size: 0.86rem;
  color: var(--text-muted);
  transition: all 0.2s;
  padding-left: 8px;
  border-left: 2px solid transparent;
}
.toc-item a:hover { color: var(--accent); }
.toc-item.active a {
  color: var(--accent);
  border-left-color: var(--accent);
  font-weight: 600;
}
.toc-level-2 { padding-left: 8px; }
.toc-level-3 { padding-left: 18px; font-size: 0.82rem; }

/* 微信公众号引导与版权卡片 */
.wechat-promo-card {
  margin-top: 48px;
  background: var(--accent-light);
  border: 1px solid var(--accent-border);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.wechat-promo-text h4 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 6px;
}
.wechat-promo-text p {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.5;
}
.wechat-qr-box {
  width: 96px;
  height: 96px;
  background: #fff;
  border-radius: 8px;
  padding: 4px;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}
.wechat-qr-box img { width: 100%; height: 100%; object-fit: contain; }

/* 页脚 */
.site-footer {
  border-top: 1px solid var(--border-color);
  padding: 40px 24px;
  text-align: center;
  font-size: 0.88rem;
  color: var(--text-light);
  background: var(--bg-card);
}
`;

/**
 * 客户端交互脚本（暗黑模式切换 + 目录随动高亮 + 阅读进度条 + 标签筛选）
 */
const CLIENT_SCRIPTS = `
// 主题管理
function initTheme() {
  const saved = localStorage.getItem("obw-site-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const active = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", active);
  updateThemeIcon(active);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("obw-site-theme", next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) {
    btn.innerHTML = theme === "dark" ? "☀️ 日间" : "🌙 夜间";
  }
}

// 阅读进度条与目录随动 (ScrollSpy)
window.addEventListener("scroll", () => {
  // 进度条
  const winScroll = document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
  const bar = document.getElementById("read-progress");
  if (bar) bar.style.width = scrolled + "%";

  // 目录 ScrollSpy
  const headings = document.querySelectorAll(".article-main h1[id], .article-main h2[id], .article-main h3[id]");
  let activeId = "";
  headings.forEach(h => {
    const rect = h.getBoundingClientRect();
    if (rect.top <= 120) {
      activeId = h.id;
    }
  });
  if (activeId) {
    document.querySelectorAll(".toc-item").forEach(item => {
      const link = item.querySelector("a");
      if (link && link.getAttribute("href") === "#" + activeId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }
});

// 标签客户端即时过滤
function filterTag(tag, el) {
  document.querySelectorAll(".tag-chip").forEach(c => c.classList.remove("active"));
  if (el) el.classList.add("active");
  const cards = document.querySelectorAll(".post-card");
  cards.forEach(card => {
    const cardTags = (card.getAttribute("data-tags") || "").split(",");
    if (tag === "all" || cardTags.includes(tag)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", initTheme);
`;

/**
 * 组装单个文章页面 HTML
 */
function buildPostPageHtml(post, renderedHtml, toc) {
  const tocItemsHtml = toc
    .map(
      (t) => `
    <li class="toc-item toc-level-${t.level}">
      <a href="#${t.id}">${t.text}</a>
    </li>`
    )
    .join("\n");

  const tagsHtml = post.meta.tags
    .map((t) => `<span class="card-tag">#${t}</span>`)
    .join(" ");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.meta.title} - ${SITE_CONFIG.title}</title>
  <meta name="description" content="${post.meta.description || post.meta.title}">
  <meta name="referrer" content="no-referrer">
  <style>${SITE_STYLES}</style>
</head>
<body>
  <div id="read-progress"></div>

  <!-- 顶部导航 -->
  <nav class="site-nav">
    <div class="nav-container">
      <a href="../index.html" class="site-logo">
        <div class="site-logo-badge">W</div>
        <span>${SITE_CONFIG.title}</span>
      </a>
      <div class="nav-links">
        <a href="../index.html" class="nav-link">文章归档</a>
        <button id="theme-toggle-btn" class="theme-btn" onclick="toggleTheme()">🌙 夜间</button>
      </div>
    </div>
  </nav>

  <!-- 文章主体双栏布局 -->
  <main class="article-wrapper">
    <article class="article-main">
      <header class="article-header">
        <a href="../index.html" class="back-link">← 返回文章归档</a>
        <h1 class="article-title">${post.meta.title}</h1>
        <div class="article-meta-bar">
          <span>📅 ${post.meta.date || "最近更新"}</span>
          <span>✍️ ${post.meta.author || SITE_CONFIG.author}</span>
          <span>☕ 约 ${post.readingStats.readingTimeMin} 分钟阅读 (${post.readingStats.totalWords} 字)</span>
          ${tagsHtml ? `<div>${tagsHtml}</div>` : ""}
        </div>
      </header>

      <!-- 文章正文（保留 obw 微信出版级排版全部 37 个组件） -->
      <section class="article-content" style="line-height: 1.8;">
        ${renderedHtml}
      </section>

      <!-- 微信公众号订阅与引流卡片 -->
      <section class="wechat-promo-card">
        <div class="wechat-promo-text">
          <h4>关注作者公众号「${SITE_CONFIG.wechatName}」</h4>
          <p>本文由 Obsidian WeChat Publisher (obw) 出版级排版引擎生成并同步发布。关注公众号，第一时间获取深度文章推送。</p>
        </div>
        <div class="wechat-qr-box">
          <img src="${SITE_CONFIG.wechatQrUrl}" alt="微信公众号二维码" onerror="this.parentElement.style.display='none'">
        </div>
      </section>
    </article>

    <!-- 桌面端右侧随动目录 (TOC) -->
    ${
      toc.length > 0
        ? `<aside class="article-toc-sidebar">
      <div class="toc-title">📑 本文目录</div>
      <ul class="toc-list">
        ${tocItemsHtml}
      </ul>
    </aside>`
        : ""
    }
  </main>

  <footer class="site-footer">
    <p>© ${new Date().getFullYear()} ${SITE_CONFIG.author} · 本站由 <a href="https://github.com/weavingtan/obw" target="_blank" style="color:var(--accent);">obw</a> 驱动生成</p>
  </footer>

  <script>${CLIENT_SCRIPTS}</script>
</body>
</html>`;
}

/**
 * 组装首页归档 HTML
 */
function buildIndexPageHtml(posts, allTags) {
  const tagChipsHtml = [
    `<button class="tag-chip active" onclick="filterTag('all', this)">全部 All (${posts.length})</button>`,
    ...allTags.map(
      (tag) =>
        `<button class="tag-chip" onclick="filterTag('${tag}', this)">#${tag}</button>`
    ),
  ].join("\n");

  const postCardsHtml = posts
    .map((p) => {
      const coverHtml = p.meta.cover
        ? `<img src="${p.meta.cover}" alt="${p.meta.title}" class="card-cover" onerror="this.style.display='none'">`
        : "";
      const tagsStr = (p.meta.tags || []).join(",");
      const firstTag = p.meta.tags && p.meta.tags[0] ? p.meta.tags[0] : "随笔";

      return `
      <article class="post-card" data-tags="${tagsStr}">
        ${coverHtml}
        <div class="card-body">
          <div class="card-meta">
            <span class="card-tag">#${firstTag}</span>
            <span>${p.meta.date || "2026-09-22"}</span>
            <span>☕ ${p.readingStats.readingTimeMin} min</span>
          </div>
          <a href="posts/${p.slug}.html">
            <h3 class="card-title">${p.meta.title}</h3>
          </a>
          <p class="card-desc">${p.meta.description || p.rawExcerpt || "点击阅读全文..."}</p>
          <div class="card-footer">
            <span>${p.readingStats.totalWords} 字</span>
            <a href="posts/${p.slug}.html" class="read-more-link">阅读全文 →</a>
          </div>
        </div>
      </article>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SITE_CONFIG.title} - ${SITE_CONFIG.description}</title>
  <meta name="description" content="${SITE_CONFIG.description}">
  <style>${SITE_STYLES}</style>
</head>
<body>
  <!-- 顶部导航 -->
  <nav class="site-nav">
    <div class="nav-container">
      <a href="index.html" class="site-logo">
        <div class="site-logo-badge">W</div>
        <span>${SITE_CONFIG.title}</span>
      </a>
      <div class="nav-links">
        <a href="index.html" class="nav-link active">文章归档</a>
        <button id="theme-toggle-btn" class="theme-btn" onclick="toggleTheme()">🌙 夜间</button>
      </div>
    </div>
  </nav>

  <!-- 首页横幅 -->
  <header class="home-hero">
    <div class="hero-tag">✨ Digital Garden & Notes</div>
    <h1 class="hero-title">${SITE_CONFIG.title}</h1>
    <p class="hero-desc">${SITE_CONFIG.description}</p>
  </header>

  <!-- 标签筛选条 -->
  <div class="tag-bar">
    ${tagChipsHtml}
  </div>

  <!-- 文章卡片网格 -->
  <main class="post-grid">
    ${postCardsHtml}
  </main>

  <footer class="site-footer">
    <p>© ${new Date().getFullYear()} ${SITE_CONFIG.author} · 本站文章已同步至微信公众号 · 由 <a href="https://github.com/weavingtan/obw" target="_blank" style="color:var(--accent);">obw</a> 驱动构建</p>
  </footer>

  <script>${CLIENT_SCRIPTS}</script>
</body>
</html>`;
}

/**
 * 主执行函数
 */
async function main() {
  console.log(`🚀 开始构建 ${SITE_CONFIG.title} 静态站点...`);

  // 1. 初始化并清空 dist 目录
  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(DIST_POSTS_DIR, { recursive: true });
  fs.mkdirSync(DIST_IMAGES_DIR, { recursive: true });

  // 2. 拷贝图片目录
  if (fs.existsSync(IMAGES_DIR)) {
    fs.cpSync(IMAGES_DIR, DIST_IMAGES_DIR, { recursive: true });
    console.log(`🖼️  已同步本地图片资源至 dist/images/`);
  }

  // 3. 扫描并解析 posts 目录
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.warn(`⚠️ posts/ 目录下暂无 Markdown 文章。创建一个示例欢迎页...`);
    const samplePost = `# 欢迎来到我的数字花园\n\n这是使用 **obw** 自动构建的个人笔记站点。\n\n:::notice\n欢迎阅读第一篇文章！\n:::\n`;
    fs.writeFileSync(path.join(POSTS_DIR, "welcome.md"), samplePost, "utf-8");
    files.push("welcome.md");
  }

  const posts = [];
  const tagSet = new Set();

  for (const filename of files) {
    const slug = path.basename(filename, ".md");
    const filePath = path.join(POSTS_DIR, filename);
    const rawContent = fs.readFileSync(filePath, "utf-8");

    const { meta, body } = parseFrontmatter(rawContent);
    const readingStats = calculateReadingStats(body);

    // 提炼一段前言作为卡片摘要
    const cleanExcerpt = body
      .replace(/:::[\s\S]*?:::/g, "")
      .replace(/#+\s+.+/g, "")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .trim()
      .slice(0, 140)
      .replace(/\s+/g, " ");

    (meta.tags || []).forEach((t) => tagSet.add(t));

    // 调用 obw 渲染器渲染 Markdown 为微信出版级 HTML
    const renderedHtml = renderWithObw(body, SITE_CONFIG.theme);

    // 提取目录与注入锚点
    const { toc, html: htmlWithAnchors } = extractToc(renderedHtml);

    const postItem = {
      slug,
      filename,
      meta,
      readingStats,
      rawExcerpt: cleanExcerpt,
      toc,
      html: htmlWithAnchors,
    };

    posts.push(postItem);

    // 生成文章详情页
    const postHtml = buildPostPageHtml(postItem, htmlWithAnchors, toc);
    fs.writeFileSync(path.join(DIST_POSTS_DIR, `${slug}.html`), postHtml, "utf-8");
    console.log(`✅ 已生成文章页面: dist/posts/${slug}.html`);
  }

  // 按日期降序排列
  posts.sort((a, b) => {
    const dateA = a.meta.date ? new Date(a.meta.date).getTime() : 0;
    const dateB = b.meta.date ? new Date(b.meta.date).getTime() : 0;
    return dateB - dateA;
  });

  // 4. 生成首页 index.html
  const indexHtml = buildIndexPageHtml(posts, Array.from(tagSet));
  fs.writeFileSync(path.join(DIST_DIR, "index.html"), indexHtml, "utf-8");
  console.log(`✅ 已生成首页归档: dist/index.html`);

  console.log(`🎉 站点构建全部完成！输出目录：${DIST_DIR}`);
}

main().catch((err) => {
  console.error("构建失败:", err);
  process.exit(1);
});
