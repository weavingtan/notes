#!/usr/bin/env node
/**
 * @file build.mjs
 * Tan's Blog / Weaving's Notes 出版级排版静态站点构建引擎
 * 严格按照用户提供的设计视觉稿 1:1 像素级复现：
 * - 顶部透明/毛玻璃随动导航 + 标志性双峰山岳 Logo
 * - 晨曦云海全景 Hero + 毛笔行楷大标题 ("记录思考 也记录生活") + 悬浮日历名言卡片
 * - 精选文章 (FEATURED) 宽幅双栏杂志大卡片
 * - 最新文章 (LATEST) 4 列流体响应式卡片网格 + 分类药丸联动筛选
 * - 底部月升夜景互动横幅 ("与我交流" + "总有一些思考 值得被认真记录")
 * - 完备的日间/夜间深色模式 (Zero-FOUC 零闪烁)
 * - 顶部阅读进度条 + 桌面端/移动端双模目录 ScrollSpy + 代码一键复制
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT_DIR, "posts");
const IMAGES_DIR = path.join(ROOT_DIR, "images");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const DIST_POSTS_DIR = path.join(DIST_DIR, "posts");
const DIST_IMAGES_DIR = path.join(DIST_DIR, "images");

// 站点元数据配置 (与设计稿视觉体系完全对齐)
const SITE_CONFIG = {
  title: "Tan's Blog",
  author: "Tan",
  description: "这是我的个人博客，记录技术、产品、生活与成长。希望这些文字，能在某个时刻，给你带来一点启发。",
  siteUrl: "https://weavingtan.github.io/notes",
  theme: "mint-emerald",
  githubUrl: "https://github.com/weavingtan",
  email: "weavingtan@gmail.com",
  wechatName: "Weaving Notes",
  wechatQrUrl: "../images/wechat-qr.png",
  quote: {
    date: "2026.09.22",
    weather: "24° ☀️",
    text: "“生活不在别处，<br>就在当下的每一个选择里。”",
    author: "Tan",
  },
  hero: {
    calligraphy: ["记录思考", "也记录生活"],
    cursive: "Better Me, Better Life",
    bio: "这是我的个人数字花园，记录技术、产品、生活与成长。<br>希望这些文字，能在某个时刻，给你带来一点启发。",
  },
  banner: {
    calligraphy: ["总有一些思考", "值得被认真记录"],
  }
};

// 5 款精选全站风格定义
const SITE_THEMES = [
  { id: "mint-emerald", name: "薄荷翡翠", desc: "默认首选 · 清新微质感与护眼呼吸感", color: "#10B981" },
  { id: "tech-blue", name: "科技深蓝", desc: "现代极客 · 沉稳海蓝与电青冷光", color: "#2563EB" },
  { id: "aurora-violet", name: "极光鸢尾", desc: "先锋灵动 · 紫粉梦幻渐变与艺术沙龙", color: "#8B5CF6" },
  { id: "warm-amber", name: "暖阳琥珀", desc: "日光书房 · 温润琥珀金与复古纸韵", color: "#D97706" },
  { id: "minimalist-ink", name: "极简水墨", desc: "东方留白 · 高级冷灰与纯粹文字专注", color: "#475569" },
];

// 纯矢量 SVG 图标库
const ICONS = {
  palette: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  mountain: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 19 6-12 5 9 3-4 4 7H3Z"/></svg>`,
  sun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  moon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  user: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/></svg>`,
  calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  chat: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  arrowRight: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  arrowLeft: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`,
  arrowUp: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>`,
  mail: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  github: `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
  globe: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  copy: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  toc: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></svg>`,
  cross: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
};

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

const SITE_THEME_TO_OBW = {
  "mint-emerald": "fresh-mint",
  "tech-blue": "tech-blue",
  "aurora-violet": "cyberpunk",
  "warm-amber": "autumn-leaf",
  "minimalist-ink": "nordic-minimal",
};

function renderWithObw(markdownText, theme = SITE_CONFIG.theme) {
  const obwTheme = SITE_THEME_TO_OBW[theme] || theme || "fresh-mint";
  try {
    if (obwCliPath) {
      return execFileSync("node", [obwCliPath, "convert", "-", "--theme=" + obwTheme, "--stdout"], {
        input: markdownText,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });
    }
    return execFileSync("npx", ["obw", "convert", "-", "--theme=" + obwTheme, "--stdout"], {
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
    featured: false,
    views: "",
    comments: "",
  };

  const fmMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) {
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
    } else if (key === "featured") {
      meta.featured = val === "true" || val === true;
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

  let processedHtml = html;
  let offset = 0;
  for (const item of toc) {
    const tagMatch = item.fullTag.match(/^<h([1-4])\b([^>]*)>([\s\S]*?)<\/h\1>$/i);
    if (!tagMatch) continue;
    const level = tagMatch[1];
    const attrs = tagMatch[2];
    const inner = tagMatch[3];

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
 * 全站顶层 CSS 样式系统 (1:1 像素级复现用户设计稿)
 */
const SITE_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Newsreader:ital,opsz,wght@1,6..72,400;1,6..72,600&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-calligraphy: 'Ma Shan Zheng', "Kaiti SC", "STKaiti", "KaiTi", "楷体", serif;
  --font-cursive: 'Newsreader', Georgia, "Times New Roman", serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* 通用页面与卡片基准 (Light) */
  --bg-page: #f8fafc;
  --bg-card: #ffffff;
  --bg-subtle: #f1f5f9;
  --bg-hover: #f8fafc;

  --text-main: #0f172a;
  --text-muted: #64748b;
  --text-light: #94a3b8;

  --border-color: #e2e8f0;
  --border-subtle: #f1f5f9;

  --card-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  --card-shadow-hover: 0 16px 36px -4px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.03);

  --header-height: 64px;

  /* 默认薄荷翡翠主题变量 */
  --primary: #10b981;
  --primary-hover: #059669;
  --primary-light: #34d399;
  --primary-faint: rgba(16, 185, 129, 0.08);
  --accent-primary: #10b981;
  --accent-blue: #10b981;
  --accent-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
  --card-border-hover: rgba(16, 185, 129, 0.38);
  --pill-bg: #e6f7f2;
  --pill-border: rgba(16, 185, 129, 0.28);
  --pill-text: #065f46;
}

/* ========================================================
   5 套精选全站风格 Design Tokens
   ======================================================== */

/* 1. 🌿 薄荷翡翠 (Mint Emerald) - 默认首选 */
[data-theme="mint-emerald"] {
  --primary: #10b981;
  --primary-hover: #059669;
  --primary-light: #34d399;
  --primary-faint: rgba(16, 185, 129, 0.08);
  --accent-primary: #10b981;
  --accent-blue: #10b981;
  --accent-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
  --card-border-hover: rgba(16, 185, 129, 0.38);
  --pill-bg: #e6f7f2;
  --pill-border: rgba(16, 185, 129, 0.28);
  --pill-text: #065f46;
}
[data-mode="dark"],
[data-theme="dark"],
[data-theme="mint-emerald"][data-mode="dark"],
[data-theme="mint-emerald"][data-theme="dark"] {
  --bg-page: #091410;
  --bg-card: rgba(14, 29, 24, 0.88);
  --bg-subtle: #11221b;
  --bg-hover: #182e25;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-light: #64748b;
  --border-color: rgba(52, 211, 153, 0.18);
  --border-subtle: rgba(52, 211, 153, 0.08);
  --primary: #34d399;
  --primary-hover: #6ee7b7;
  --primary-light: #a7f3d0;
  --primary-faint: rgba(52, 211, 153, 0.12);
  --accent-primary: #34d399;
  --accent-blue: #34d399;
  --accent-gradient: linear-gradient(135deg, #34d399 0%, #059669 100%);
  --card-border-hover: rgba(52, 211, 153, 0.45);
  --card-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.5);
  --card-shadow-hover: 0 18px 40px -4px rgba(0, 0, 0, 0.7);
  --pill-bg: rgba(52, 211, 153, 0.14);
  --pill-border: rgba(52, 211, 153, 0.32);
  --pill-text: #a7f3d0;
}

/* 2. 🌌 科技深蓝 (Tech Blue) */
[data-theme="tech-blue"] {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: #60a5fa;
  --primary-faint: rgba(37, 99, 235, 0.08);
  --accent-primary: #2563eb;
  --accent-blue: #2563eb;
  --accent-gradient: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  --card-border-hover: rgba(37, 99, 235, 0.38);
  --pill-bg: #dbeafe;
  --pill-border: rgba(37, 99, 235, 0.25);
  --pill-text: #1e40af;
}
[data-theme="tech-blue"][data-mode="dark"] {
  --bg-page: #0b132b;
  --bg-card: rgba(16, 27, 59, 0.88);
  --bg-subtle: #16244d;
  --bg-hover: #1e3168;
  --border-color: rgba(96, 165, 250, 0.18);
  --border-subtle: rgba(96, 165, 250, 0.08);
  --primary: #60a5fa;
  --primary-hover: #93c5fd;
  --primary-light: #bfdbfe;
  --primary-faint: rgba(96, 165, 250, 0.12);
  --accent-primary: #60a5fa;
  --accent-blue: #60a5fa;
  --accent-gradient: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
  --card-border-hover: rgba(96, 165, 250, 0.45);
  --card-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.5);
  --card-shadow-hover: 0 18px 40px -4px rgba(0, 0, 0, 0.7);
  --pill-bg: rgba(96, 165, 250, 0.14);
  --pill-border: rgba(96, 165, 250, 0.3);
  --pill-text: #bfdbfe;
}

/* 3. 🔮 极光鸢尾 (Aurora Violet) */
[data-theme="aurora-violet"] {
  --primary: #8b5cf6;
  --primary-hover: #7c3aed;
  --primary-light: #a78bfa;
  --primary-faint: rgba(139, 92, 246, 0.08);
  --accent-primary: #8b5cf6;
  --accent-blue: #8b5cf6;
  --accent-gradient: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
  --card-border-hover: rgba(139, 92, 246, 0.38);
  --pill-bg: #ede9fe;
  --pill-border: rgba(139, 92, 246, 0.25);
  --pill-text: #5b21b6;
}
[data-theme="aurora-violet"][data-mode="dark"] {
  --bg-page: #160d27;
  --bg-card: rgba(34, 21, 61, 0.88);
  --bg-subtle: #2b1a4d;
  --bg-hover: #382264;
  --border-color: rgba(167, 139, 250, 0.18);
  --border-subtle: rgba(167, 139, 250, 0.08);
  --primary: #a78bfa;
  --primary-hover: #c4b5fd;
  --primary-light: #ddd6fe;
  --primary-faint: rgba(167, 139, 250, 0.12);
  --accent-primary: #a78bfa;
  --accent-blue: #a78bfa;
  --accent-gradient: linear-gradient(135deg, #a78bfa 0%, #f472b6 100%);
  --card-border-hover: rgba(167, 139, 250, 0.45);
  --card-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.5);
  --card-shadow-hover: 0 18px 40px -4px rgba(0, 0, 0, 0.7);
  --pill-bg: rgba(167, 139, 250, 0.14);
  --pill-border: rgba(167, 139, 250, 0.3);
  --pill-text: #ddd6fe;
}

/* 4. 🍂 暖阳琥珀 (Warm Amber) */
[data-theme="warm-amber"] {
  --primary: #d97706;
  --primary-hover: #b45309;
  --primary-light: #fbbf24;
  --primary-faint: rgba(217, 119, 6, 0.08);
  --accent-primary: #d97706;
  --accent-blue: #d97706;
  --accent-gradient: linear-gradient(135deg, #d97706 0%, #ea580c 100%);
  --card-border-hover: rgba(217, 119, 6, 0.38);
  --pill-bg: #fef3c7;
  --pill-border: rgba(217, 119, 6, 0.28);
  --pill-text: #92400e;
}
[data-theme="warm-amber"][data-mode="dark"] {
  --bg-page: #1c1408;
  --bg-card: rgba(42, 30, 13, 0.88);
  --bg-subtle: #33240e;
  --bg-hover: #453114;
  --border-color: rgba(251, 191, 36, 0.18);
  --border-subtle: rgba(251, 191, 36, 0.08);
  --primary: #fbbf24;
  --primary-hover: #fcd34d;
  --primary-light: #fde68a;
  --primary-faint: rgba(251, 191, 36, 0.12);
  --accent-primary: #fbbf24;
  --accent-blue: #fbbf24;
  --accent-gradient: linear-gradient(135deg, #fbbf24 0%, #fb923c 100%);
  --card-border-hover: rgba(251, 191, 36, 0.45);
  --card-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.5);
  --card-shadow-hover: 0 18px 40px -4px rgba(0, 0, 0, 0.7);
  --pill-bg: rgba(251, 191, 36, 0.14);
  --pill-border: rgba(251, 191, 36, 0.3);
  --pill-text: #fde68a;
}

/* 5. ✒️ 极简水墨 (Minimalist Ink) */
[data-theme="minimalist-ink"] {
  --primary: #475569;
  --primary-hover: #334155;
  --primary-light: #64748b;
  --primary-faint: rgba(71, 85, 105, 0.08);
  --accent-primary: #475569;
  --accent-blue: #475569;
  --accent-gradient: linear-gradient(135deg, #475569 0%, #0f172a 100%);
  --card-border-hover: rgba(71, 85, 105, 0.38);
  --pill-bg: #f1f5f9;
  --pill-border: rgba(71, 85, 105, 0.2);
  --pill-text: #1e293b;
}
[data-theme="minimalist-ink"][data-mode="dark"] {
  --bg-page: #0f172a;
  --bg-card: rgba(30, 41, 59, 0.88);
  --bg-subtle: #253347;
  --bg-hover: #33445d;
  --border-color: rgba(148, 163, 184, 0.18);
  --border-subtle: rgba(148, 163, 184, 0.08);
  --primary: #94a3b8;
  --primary-hover: #cbd5e1;
  --primary-light: #e2e8f0;
  --primary-faint: rgba(148, 163, 184, 0.12);
  --accent-primary: #94a3b8;
  --accent-blue: #94a3b8;
  --accent-gradient: linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%);
  --card-border-hover: rgba(148, 163, 184, 0.45);
  --card-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.5);
  --card-shadow-hover: 0 18px 40px -4px rgba(0, 0, 0, 0.7);
  --pill-bg: rgba(148, 163, 184, 0.14);
  --pill-border: rgba(148, 163, 184, 0.28);
  --pill-text: #e2e8f0;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  scroll-padding-top: 76px;
}

body {
  font-family: var(--font-sans);
  background-color: var(--bg-page);
  color: var(--text-main);
  line-height: 1.75;
  transition: background-color 0.25s ease, color 0.25s ease;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

a {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease, opacity 0.2s ease;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
}

/* 顶部阅读进度条 */
#read-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3.5px;
  background: var(--accent-gradient);
  width: 0%;
  z-index: 999;
  transition: width 0.1s linear;
}

/* ========================================================
   薄荷翡翠标志性组件：三段式翡翠装饰线与圆角胶囊体系
   ======================================================== */
.theme-accent-dash {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  margin-bottom: 14px;
}

.theme-accent-dash .dash-long {
  width: 32px;
  height: 4px;
  border-radius: 9999px;
  background: var(--accent-gradient);
}

.theme-accent-dash .dash-dot {
  width: 7px;
  height: 4px;
  border-radius: 9999px;
  background: var(--primary-light);
  opacity: 0.85;
}

.theme-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.4;
  background: var(--pill-bg);
  border: 1px solid var(--pill-border);
  color: var(--pill-text);
  transition: all 0.2s ease;
  white-space: nowrap;
}

.theme-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--primary-faint);
}

.theme-pill.status {
  background: var(--bg-card);
  border-color: var(--border-color);
  color: var(--text-muted);
}

.theme-pill .pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
  display: inline-block;
}

.home-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  border-radius: 9999px;
  font-size: 0.82rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
  margin-bottom: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.home-hero-badge .pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary-light);
  box-shadow: 0 0 8px var(--primary-light);
}

/* ========================================================
   全站风格切换盘 (Theme Picker Dropdown)
   ======================================================== */
.theme-picker-wrapper {
  position: relative;
}

.theme-picker-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-active-indicator {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 8px var(--primary);
  pointer-events: none;
}

.theme-dropdown-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 270px;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  padding: 8px;
  box-shadow: 0 16px 40px -4px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px) scale(0.96);
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s;
  color: var(--text-main);
}

.theme-dropdown-menu.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.theme-dropdown-header {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-light);
  padding: 6px 10px 6px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 6px;
}

.theme-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.15s ease;
  user-select: none;
}

.theme-dropdown-item:hover {
  background: var(--bg-subtle);
  transform: translateX(2px);
}

.theme-dropdown-item.active {
  background: var(--primary-faint);
}

.theme-dropdown-item.active .theme-name {
  color: var(--primary);
  font-weight: 700;
}

.theme-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2), inset 0 0 0 2px rgba(255,255,255,0.6);
}

.theme-info {
  flex: 1;
  min-width: 0;
}

.theme-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.25;
  margin-bottom: 2px;
}

.theme-desc {
  font-size: 0.7rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-check {
  color: var(--primary);
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
}

.theme-dropdown-item.active .theme-check {
  opacity: 1;
}

/* 文章详情页头部强化 */
.article-badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.article-tags-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.article-cover-card {
  margin: 24px 0 32px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  box-shadow: var(--card-shadow);
  max-height: 480px;
  background: var(--bg-subtle);
}

.article-cover-card img {
  width: 100%;
  height: auto;
  max-height: 480px;
  object-fit: cover;
  display: block;
}

.article-digest-desc {
  font-size: 1.02rem;
  line-height: 1.7;
  color: var(--text-muted);
  margin: 12px 0 16px;
}

.article-content blockquote {
  background: var(--primary-faint);
  border-left: 4px solid var(--primary);
  border-radius: 0 12px 12px 0;
  padding: 14px 18px;
  margin: 20px 0;
  color: var(--text-main);
}

/* 顶部透明/毛玻璃导航 */
.site-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height);
  z-index: 80;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  color: #ffffff;
}

.site-nav.scrolled {
  position: fixed;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  color: var(--text-main);
}

.site-nav.scrolled .site-brand,
.site-nav.scrolled .nav-menu-item,
.site-nav.scrolled .nav-action-btn {
  color: var(--text-main);
}

.site-nav.scrolled .nav-menu-item.active::after {
  background: var(--text-main);
}

[data-theme="dark"] .site-nav.scrolled {
  background: rgba(11, 15, 25, 0.92);
  border-bottom-color: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

[data-theme="dark"] .site-nav.scrolled .site-brand,
[data-theme="dark"] .site-nav.scrolled .nav-menu-item,
[data-theme="dark"] .site-nav.scrolled .nav-action-btn {
  color: #f8fafc;
}

[data-theme="dark"] .site-nav.scrolled .nav-menu-item.active::after {
  background: #f8fafc;
}

.nav-container {
  max-width: 1140px;
  height: 100%;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.site-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: -0.02em;
  color: #ffffff;
  transition: opacity 0.2s;
}

.site-brand:hover {
  opacity: 0.9;
}

.site-brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-center-menu {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-menu-item {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  position: relative;
  padding: 4px 0;
  transition: color 0.2s;
}

.nav-menu-item:hover, .nav-menu-item.active {
  color: #ffffff;
}

.nav-menu-item.active::after {
  content: "";
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 2px;
  background: #ffffff;
  border-radius: 999px;
}

.nav-right-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.nav-action-btn {
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  transition: all 0.2s;
}

.nav-action-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.18);
}

.nav-avatar-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

/* 晨曦全景 Hero 区域 */
.home-hero-wrapper {
  position: relative;
  width: 100%;
  min-height: 480px;
  background-image: var(--hero-bg);
  background-size: cover;
  background-position: center 25%;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  padding: 100px 0 60px;
}

.home-hero-wrapper::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.15) 50%, transparent 100%);
  pointer-events: none;
}

.hero-inner-container {
  max-width: 1140px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 32px;
}

.hero-left-content {
  max-width: 540px;
  color: #ffffff;
}

.hero-calligraphy-title {
  font-family: var(--font-calligraphy);
  font-size: clamp(2.4rem, 5vw, 3.4rem);
  font-weight: 400;
  line-height: 1.25;
  color: #ffffff;
  letter-spacing: 0.04em;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.45);
  margin-bottom: 10px;
}

.hero-cursive-sub {
  font-family: var(--font-cursive);
  font-style: italic;
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: 0.04em;
  margin-bottom: 18px;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
}

.hero-bio-desc {
  font-size: 0.95rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.88);
  margin-bottom: 28px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}

.hero-btn-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.btn-hero-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 24px;
  border-radius: 999px;
  background: #ffffff;
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-hero-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
  background: #f8fafc;
}

.btn-hero-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 550;
  backdrop-filter: blur(8px);
  transition: all 0.2s;
}

.btn-hero-secondary:hover {
  background: rgba(255, 255, 255, 0.28);
  transform: translateY(-2px);
}

/* 悬浮日历名言卡片 (右上角) */
.hero-quote-card {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 20px;
  padding: 22px 24px;
  width: 290px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.12);
  color: #1e293b;
  margin-top: 8px;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.hero-quote-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 42px rgba(0, 0, 0, 0.18);
}

[data-theme="dark"] .hero-quote-card {
  background: rgba(17, 24, 39, 0.82);
  border-color: rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.45);
}

.quote-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--text-light);
  margin-bottom: 14px;
  font-family: var(--font-mono);
}

.quote-body {
  font-size: 0.93rem;
  line-height: 1.68;
  color: var(--text-main);
  margin-bottom: 12px;
  font-weight: 500;
}

.quote-author {
  text-align: right;
  font-size: 0.84rem;
  color: var(--text-muted);
}

/* 主体内容包裹 */
.main-content-wrapper {
  max-width: 1140px;
  width: 100%;
  margin: 0 auto;
  padding: 48px 24px 80px;
  flex: 1;
}

/* 区域标题通用栏 */
.section-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.section-subtitle {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-light);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.section-more-link {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s, gap 0.2s;
}

.section-more-link:hover {
  color: var(--accent-blue);
  gap: 8px;
}

/* ========================================================
   Section 1: 精选文章 (FEATURED) 宽幅双栏大卡片
   ======================================================== */
.featured-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--card-shadow);
  display: grid;
  grid-template-columns: 1fr 1fr;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s, border-color 0.25s;
  margin-bottom: 56px;
}

.featured-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(59, 130, 246, 0.3);
}

.featured-cover-box {
  width: 100%;
  height: 100%;
  min-height: 270px;
  position: relative;
  overflow: hidden;
  background: var(--bg-subtle);
}

.featured-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.featured-card:hover .featured-cover-img {
  transform: scale(1.03);
}

.featured-content {
  padding: 36px 38px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.tag-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  width: fit-content;
  margin-bottom: 14px;
}

.tag-badge-pill.blue {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #dbeafe;
}

[data-theme="dark"] .tag-badge-pill.blue {
  background: rgba(37, 99, 235, 0.15);
  color: #60a5fa;
  border-color: rgba(37, 99, 235, 0.3);
}

.featured-title {
  font-size: 1.45rem;
  font-weight: 750;
  line-height: 1.38;
  color: var(--text-main);
  margin-bottom: 14px;
  letter-spacing: -0.015em;
  transition: color 0.2s;
}

.featured-card:hover .featured-title {
  color: var(--accent-blue);
}

.featured-desc {
  font-size: 0.94rem;
  color: var(--text-muted);
  line-height: 1.68;
  margin-bottom: 24px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-meta-row {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 0.82rem;
  color: var(--text-light);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

/* ========================================================
   Section 2: 最新文章 (LATEST) 4 列卡片流 + 分类药丸
   ======================================================== */
.category-filter-pills {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-pill {
  padding: 5px 15px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 550;
  color: var(--text-muted);
  background: var(--bg-subtle);
  transition: all 0.2s ease;
  cursor: pointer;
}

.filter-pill:hover {
  color: var(--text-main);
  background: var(--border-color);
}

.filter-pill.active {
  background: var(--accent-primary);
  color: var(--bg-page);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.latest-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 56px;
}

.card-item-4 {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--card-shadow);
  display: flex;
  flex-direction: column;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s, border-color 0.25s;
}

.card-item-4:hover {
  transform: translateY(-4px);
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(59, 130, 246, 0.3);
}

.card-item-cover-box {
  width: 100%;
  height: 135px;
  position: relative;
  overflow: hidden;
  background: var(--bg-subtle);
}

.card-item-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.card-item-4:hover .card-item-cover-img {
  transform: scale(1.05);
}

.card-item-body {
  padding: 16px 18px 18px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tag-badge-pill.teal {
  background: #e6fcf5;
  color: #0ca678;
  border: 1px solid #c3fae8;
}
[data-theme="dark"] .tag-badge-pill.teal {
  background: rgba(12, 166, 120, 0.15);
  color: #38d9a9;
  border-color: rgba(12, 166, 120, 0.3);
}

.tag-badge-pill.purple {
  background: #f3e8ff;
  color: #9333ea;
  border: 1px solid #e9d5ff;
}
[data-theme="dark"] .tag-badge-pill.purple {
  background: rgba(147, 51, 234, 0.15);
  color: #c084fc;
  border-color: rgba(147, 51, 234, 0.3);
}

.tag-badge-pill.amber {
  background: #fff7ed;
  color: #ea580c;
  border: 1px solid #ffedd5;
}
[data-theme="dark"] .tag-badge-pill.amber {
  background: rgba(234, 88, 12, 0.15);
  color: #fb923c;
  border-color: rgba(234, 88, 12, 0.3);
}

.tag-badge-pill.cyan {
  background: #e0f2fe;
  color: #0284c7;
  border: 1px solid #bae6fd;
}
[data-theme="dark"] .tag-badge-pill.cyan {
  background: rgba(2, 132, 199, 0.15);
  color: #38bdf8;
  border-color: rgba(2, 132, 199, 0.3);
}

.card-item-title {
  font-size: 1.02rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text-main);
  margin-bottom: 8px;
  transition: color 0.2s;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-item-4:hover .card-item-title {
  color: var(--accent-blue);
}

.card-item-desc {
  font-size: 0.86rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 16px;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--text-light);
  border-top: 1px solid var(--border-subtle);
  padding-top: 12px;
}

/* ========================================================
   Section 3: 底部宽幅交流互动横幅 (月升夜景 Banner)
   ======================================================== */
.bottom-comm-banner {
  width: 100%;
  min-height: 160px;
  border-radius: 20px;
  overflow: hidden;
  background-image: var(--banner-bg);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 34px 44px;
  color: #ffffff;
  position: relative;
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
  margin-bottom: 40px;
}

.bottom-comm-banner::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(9, 13, 22, 0.88) 0%, rgba(9, 13, 22, 0.45) 50%, rgba(9, 13, 22, 0.2) 100%);
  pointer-events: none;
}

.banner-left {
  position: relative;
  z-index: 10;
  max-width: 500px;
}

.banner-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.banner-desc {
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: 18px;
}

.banner-social-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.social-circle-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.social-circle-btn:hover {
  background: #ffffff;
  color: #0f172a;
  transform: translateY(-2px);
}

.banner-right {
  position: relative;
  z-index: 10;
  text-align: right;
}

.banner-calligraphy-text {
  font-family: var(--font-calligraphy);
  font-size: 1.45rem;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 0.08em;
  line-height: 1.5;
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

/* 页脚 */
.site-footer {
  border-top: 1px solid var(--border-color);
  padding: 32px 24px;
  background: var(--bg-page);
  color: var(--text-light);
  font-size: 0.86rem;
}

.footer-inner-container {
  max-width: 1140px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}

.footer-nav-link {
  color: var(--text-muted);
  transition: color 0.2s;
}

.footer-nav-link:hover {
  color: var(--text-main);
}

/* ========================================================
   全局实时搜索模态框 (Modal)
   ======================================================== */
.search-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  z-index: 200;
  display: none;
  align-items: flex-start;
  justify-content: center;
  padding: 80px 24px 24px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.search-modal-backdrop.open {
  display: flex;
  opacity: 1;
}

.search-modal-box {
  width: 100%;
  max-width: 600px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: modalSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalSlideDown {
  from { transform: translateY(-16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.search-modal-input-row {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  gap: 12px;
}

.search-modal-input {
  flex: 1;
  font-size: 1.05rem;
  border: none;
  background: none;
  outline: none;
  color: var(--text-main);
  font-family: var(--font-sans);
}

.search-results-box {
  max-height: 420px;
  overflow-y: auto;
  padding: 12px;
}

.search-result-item {
  padding: 12px 16px;
  border-radius: 12px;
  display: block;
  transition: background 0.15s;
}

.search-result-item:hover {
  background: var(--bg-subtle);
}

.search-result-title {
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 4px;
}

.search-result-snippet {
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* ========================================================
   文章详情页排版与随动目录 (TOC)
   ======================================================== */
.article-page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--header-height);
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
}

.article-page-header .site-brand,
.article-page-header .nav-menu-item {
  color: var(--text-main);
}

.article-wrapper {
  max-width: 1140px;
  margin: 36px auto 80px;
  padding: 0 24px;
  display: flex;
  gap: 40px;
  align-items: flex-start;
}

.article-main {
  flex: 1;
  max-width: 800px;
  min-width: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 44px 40px;
  box-shadow: var(--card-shadow);
}

.article-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.88rem;
  color: var(--text-muted);
  font-weight: 550;
  margin-bottom: 18px;
  transition: color 0.2s, transform 0.2s;
}

.back-link:hover {
  color: var(--accent-blue);
  transform: translateX(-3px);
}

.article-title {
  font-size: clamp(1.8rem, 3.5vw, 2.3rem);
  font-weight: 800;
  line-height: 1.32;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
  color: var(--text-main);
}

.article-meta-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 0.85rem;
  color: var(--text-light);
}

.article-toc-sidebar {
  width: 280px;
  position: sticky;
  top: 88px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  box-shadow: var(--card-shadow);
}

.toc-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-subtle);
}

.toc-list { list-style: none; }
.toc-item { margin-bottom: 6px; line-height: 1.45; }
.toc-item a {
  display: block;
  font-size: 0.85rem;
  color: var(--text-muted);
  padding: 4px 8px;
  border-left: 2px solid transparent;
  border-radius: 0 4px 4px 0;
  transition: all 0.2s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toc-item a:hover {
  color: var(--accent-blue);
  background: var(--bg-subtle);
}
.toc-item.active a {
  color: var(--accent-blue);
  border-left-color: var(--accent-blue);
  background: var(--bg-subtle);
  font-weight: 600;
}
.toc-level-3 { padding-left: 14px; font-size: 0.82rem; }

/* 微信公众号订阅引流卡片 */
.wechat-promo-card {
  margin-top: 48px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
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
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.wechat-qr-box {
  width: 96px;
  height: 96px;
  background: #fff;
  border-radius: 10px;
  padding: 4px;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wechat-qr-box img { width: 100%; height: 100%; object-fit: contain; }

/* 回到顶部按钮 */
#back-to-top {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 90;
  opacity: 0;
  visibility: hidden;
  transition: all 0.25s ease;
}

#back-to-top.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

#back-to-top:hover {
  transform: translateY(-3px);
  background: var(--accent-primary);
  color: var(--bg-page);
}

/* 提示 Toast */
#site-toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: #18181b;
  color: #ffffff;
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 0.86rem;
  font-weight: 550;
  box-shadow: 0 10px 25px rgba(0,0,0,0.25);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

#site-toast.show {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

/* ========================================================
   obw 微信排版组件在暗黑模式下的深度适配
   ======================================================== */
[data-theme="dark"] .wechat-article {
  color: #cbd5e1 !important;
}
[data-theme="dark"] .wechat-article [leaf] {
  color: inherit !important;
}
[data-theme="dark"] .wechat-article strong {
  color: #f8fafc !important;
}
[data-theme="dark"] .wechat-article h1,
[data-theme="dark"] .wechat-article h2,
[data-theme="dark"] .wechat-article h3,
[data-theme="dark"] .wechat-article h4 {
  color: #60a5fa !important;
  background: rgba(59, 130, 246, 0.12) !important;
  border-left-color: #60a5fa !important;
}
[data-theme="dark"] .wechat-module-hero {
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}
[data-theme="dark"] .hero-title {
  color: #f8fafc !important;
}
[data-theme="dark"] .hero-subtitle {
  color: #94a3b8 !important;
}
[data-theme="dark"] .wechat-module-summary {
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%) !important;
  border-color: rgba(59, 130, 246, 0.3) !important;
  border-left-color: #3b82f6 !important;
}
[data-theme="dark"] .wechat-module-summary span[leaf] {
  color: #f8fafc !important;
}
[data-theme="dark"] .wechat-module-metrics {
  background: rgba(15, 23, 42, 0.8) !important;
}
[data-theme="dark"] .metric-card {
  background: #111827 !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}
[data-theme="dark"] .metric-val {
  color: #60a5fa !important;
}
[data-theme="dark"] .metric-label {
  color: #94a3b8 !important;
}
[data-theme="dark"] .wechat-module-cards > section > section {
  background: #111827 !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}
[data-theme="dark"] .wechat-module-cards span {
  color: #e2e8f0 !important;
}
[data-theme="dark"] .wechat-module-quote {
  border-left-color: #3b82f6 !important;
}
[data-theme="dark"] .wechat-module-quote span[leaf] {
  color: #e2e8f0 !important;
}
[data-theme="dark"] .wechat-module-cta {
  background: #111827 !important;
  border-color: rgba(59, 130, 246, 0.25) !important;
}
[data-theme="dark"] .wechat-module-cta span {
  color: #e2e8f0 !important;
}

/* 响应式断点适配 */
@media (max-width: 1024px) {
  .latest-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
  .article-toc-sidebar {
    display: none;
  }
  .article-main {
    max-width: 100%;
    padding: 32px 20px;
  }
}

@media (max-width: 768px) {
  .nav-center-menu {
    display: none;
  }
  .hero-inner-container {
    flex-direction: column;
  }
  .hero-quote-card {
    width: 100%;
    max-width: 100%;
  }
  .featured-card {
    grid-template-columns: 1fr;
  }
  .featured-cover-box {
    min-height: 200px;
    height: 200px;
  }
  .featured-content {
    padding: 24px 20px;
  }
  .latest-grid-4 {
    grid-template-columns: 1fr;
  }
  .bottom-comm-banner {
    flex-direction: column;
    text-align: center;
    padding: 28px 20px;
    gap: 20px;
  }
  .banner-social-row {
    justify-content: center;
  }
  .banner-right {
    text-align: center;
  }
  .footer-inner-container {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}
`;

/**
 * 客户端核心交互脚本
 */
const CLIENT_SCRIPTS = `
// 全局多风格与深浅模式管理
function initSiteTheme() {
  var savedTheme = localStorage.getItem("obw-site-theme") || "mint-emerald";
  var savedMode = localStorage.getItem("obw-site-mode") || localStorage.getItem("tan-blog-theme") || 
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", savedTheme);
  document.documentElement.setAttribute("data-mode", savedMode);
  updateThemeIcon(savedMode);
  updateThemeActiveState(savedTheme);
}

function selectSiteTheme(themeId) {
  document.documentElement.setAttribute("data-theme", themeId);
  localStorage.setItem("obw-site-theme", themeId);
  updateThemeActiveState(themeId);
  toggleThemeDropdown(false);
  var themeNames = {
    "mint-emerald": "薄荷翡翠",
    "tech-blue": "科技深蓝",
    "aurora-violet": "极光鸢尾",
    "warm-amber": "暖阳琥珀",
    "minimalist-ink": "极简水墨"
  };
  showToast("已切换全站风格为「" + (themeNames[themeId] || themeId) + "」");
}

function updateThemeActiveState(themeId) {
  document.querySelectorAll(".theme-dropdown-item").forEach(function(el) {
    if (el.getAttribute("data-theme-id") === themeId) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });
}

function toggleThemeDropdown(force) {
  var menu = document.getElementById("theme-picker-dropdown");
  if (!menu) return;
  if (typeof force === "boolean") {
    menu.classList.toggle("open", force);
  } else {
    menu.classList.toggle("open");
  }
}

// 点击外部关闭下拉菜单
document.addEventListener("click", function(e) {
  var wrapper = document.querySelector(".theme-picker-wrapper");
  if (wrapper && !wrapper.contains(e.target)) {
    toggleThemeDropdown(false);
  }
});

function toggleTheme() {
  var current = document.documentElement.getAttribute("data-mode") || 
    document.documentElement.getAttribute("data-theme") || "light";
  var next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-mode", next);
  localStorage.setItem("obw-site-mode", next);
  localStorage.setItem("tan-blog-theme", next);
  updateThemeIcon(next);
}

function updateThemeIcon(mode) {
  var iconSpan = document.getElementById("theme-toggle-icon");
  if (iconSpan) {
    iconSpan.innerHTML = mode === "dark" ? \`${ICONS.sun}\` : \`${ICONS.moon}\`;
  }
}

// 轻提示 Toast
function showToast(msg) {
  let toast = document.getElementById("site-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "site-toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = \`${ICONS.check} <span>\${msg}</span>\`;
  toast.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// 复制工具
function copyToClipboard(text, msg = "已复制") {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showToast(msg));
  } else {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(msg);
    } catch(e) {}
    document.body.removeChild(ta);
  }
}

// 搜索模态框开闭与实时检索
function toggleSearchModal(open) {
  const modal = document.getElementById("search-modal");
  if (!modal) return;
  if (open) {
    modal.classList.add("open");
    const input = document.getElementById("search-input");
    if (input) setTimeout(() => input.focus(), 100);
  } else {
    modal.classList.remove("open");
  }
}

function onSearchModalInput(e) {
  const val = (e.target.value || "").trim().toLowerCase();
  const resultsBox = document.getElementById("search-results-box");
  if (!resultsBox) return;

  if (!val) {
    resultsBox.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-light);font-size:0.9rem;">输入关键词搜索全部文章...</div>';
    return;
  }

  const cards = document.querySelectorAll(".card-item-4, .featured-card");
  const matches = [];
  cards.forEach(card => {
    const title = (card.getAttribute("data-title") || "");
    const desc = (card.getAttribute("data-desc") || "");
    const url = card.getAttribute("data-url") || "";
    if (title.toLowerCase().includes(val) || desc.toLowerCase().includes(val)) {
      matches.push({ title, desc, url });
    }
  });

  if (matches.length === 0) {
    resultsBox.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-light);font-size:0.9rem;">未找到相关文章</div>';
  } else {
    resultsBox.innerHTML = matches.map(m => \`
      <a href="\${m.url}" class="search-result-item">
        <div class="search-result-title">\${m.title}</div>
        <div class="search-result-snippet">\${m.desc}</div>
      </a>
    \`).join("");
  }
}

// 最新文章分类筛选
function filterCategory(cat, btn) {
  document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const cards = document.querySelectorAll(".card-item-4");
  cards.forEach(card => {
    const tags = (card.getAttribute("data-tags") || "").split(",").map(t => t.trim());
    if (cat === "all" || tags.some(t => t.includes(cat))) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

// 导航栏滚动悬浮检测与目录高亮
window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;
  const nav = document.getElementById("main-nav");
  if (nav) {
    if (scrollY > 60) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  }

  // 阅读进度
  const winScroll = document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
  const bar = document.getElementById("read-progress");
  if (bar) bar.style.width = scrolled + "%";

  // 回到顶部按钮
  const btt = document.getElementById("back-to-top");
  if (btt) {
    if (scrollY > 300) {
      btt.classList.add("show");
    } else {
      btt.classList.remove("show");
    }
  }

  // 目录 ScrollSpy
  const headings = document.querySelectorAll(".article-main h1[id], .article-main h2[id], .article-main h3[id]");
  let activeId = "";
  headings.forEach(h => {
    const rect = h.getBoundingClientRect();
    if (rect.top <= 120) activeId = h.id;
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

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 全局快捷键：Cmd+K / Ctrl+K 触发搜索
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    toggleSearchModal(true);
  }
  if (e.key === "Escape") {
    toggleSearchModal(false);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  initSiteTheme();
});
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

  const tagsHtml = (post.meta.tags || [])
    .map((t) => `<span class="tag-badge-pill blue">${t}</span>`)
    .join(" ");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.meta.title} - ${SITE_CONFIG.title}</title>
  <meta name="description" content="${post.meta.description || post.meta.title}">
  <meta name="referrer" content="no-referrer">
  <!-- 零闪烁风格与暗黑模式优先注入 -->
  <script>
    (function(){
      try {
        var savedTheme = localStorage.getItem("obw-site-theme") || "mint-emerald";
        document.documentElement.setAttribute("data-theme", savedTheme);
        var savedMode = localStorage.getItem("obw-site-mode") || localStorage.getItem("tan-blog-theme") || 
          (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        document.documentElement.setAttribute("data-mode", savedMode);
      } catch(e) {}
    })();
  </script>
  <style>
:root {
  --hero-bg: url('../images/hero-clean.jpg'), url('../images/hero-bg.jpg');
  --banner-bg: url('../images/bottom-banner-clean.jpg'), url('../images/bottom-banner.jpg');
}
${SITE_STYLES}
  </style>
</head>
<body>
  <div id="read-progress"></div>

  <!-- 顶部导航 -->
  <header class="article-page-header">
    <div class="nav-container">
      <a href="../index.html" class="site-brand">
        <span class="site-brand-icon">${ICONS.mountain}</span>
        <span>${SITE_CONFIG.title}</span>
      </a>

      <nav class="nav-center-menu">
        <a href="../index.html" class="nav-menu-item">首页</a>
        <a href="../index.html#latest" class="nav-menu-item active">文章</a>
        <a href="../index.html#latest" class="nav-menu-item">分类</a>
        <a href="../index.html#about" class="nav-menu-item">关于</a>
        <a href="../index.html#about" class="nav-menu-item">标签</a>
      </nav>

      <div class="nav-right-actions">
        <button class="nav-action-btn" onclick="toggleSearchModal(true)" title="搜索文章 (Cmd+K)">
          ${ICONS.search}
        </button>
        <div class="theme-picker-wrapper">
          <button id="theme-picker-btn" class="nav-action-btn theme-picker-trigger" onclick="toggleThemeDropdown()" title="切换全站风格">
            ${ICONS.palette}
            <span class="theme-active-indicator"></span>
          </button>
          <div id="theme-picker-dropdown" class="theme-dropdown-menu">
            <div class="theme-dropdown-header">选择全站风格</div>
            ${SITE_THEMES.map(t => `
              <div class="theme-dropdown-item" onclick="selectSiteTheme('${t.id}')" data-theme-id="${t.id}">
                <span class="theme-swatch" style="background: ${t.color};"></span>
                <div class="theme-info">
                  <div class="theme-name">${t.name}</div>
                  <div class="theme-desc">${t.desc}</div>
                </div>
                <span class="theme-check">${ICONS.check}</span>
              </div>
            `).join("")}
          </div>
        </div>
        <button class="nav-action-btn" onclick="toggleTheme()" title="切换日夜模式">
          <span id="theme-toggle-icon">${ICONS.moon}</span>
        </button>
        <div class="nav-avatar-btn" title="${SITE_CONFIG.author}">T</div>
      </div>
    </div>
  </header>

  <!-- 文章双栏排版主体 -->
  <main class="article-wrapper">
    <article class="article-main">
      <header class="article-header">
        <a href="../index.html" class="back-link">
          ${ICONS.arrowLeft} 返回博客首页
        </a>
        <div class="article-badge-row">
          <span class="theme-pill primary"><span class="pill-dot"></span> 博客文章 · 深度思考</span>
          <span class="theme-pill status">2026 · Pro</span>
        </div>
        <h1 class="article-title">${post.meta.title}</h1>
        <div class="theme-accent-dash">
          <span class="dash-long"></span>
          <span class="dash-dot"></span>
          <span class="dash-dot"></span>
        </div>
        ${post.meta.description ? `<p class="article-digest-desc">${post.meta.description}</p>` : ""}
        ${post.meta.cover ? `
        <div class="article-cover-card">
          <img src="${post.meta.cover}" alt="${post.meta.title}" onerror="this.parentElement.style.display='none'">
        </div>` : ""}
        <div class="article-tags-row">
          <span class="theme-pill author"><span class="pill-dot"></span> ${post.meta.author || SITE_CONFIG.author}</span>
          ${(post.meta.tags || []).map(t => `<span class="theme-pill tag">${t}</span>`).join(" ")}
          <span class="theme-pill meta">${ICONS.calendar} ${post.meta.date || "最近更新"}</span>
          <span class="theme-pill meta">${ICONS.eye} ${post.meta.views ? (post.meta.views.includes("阅读") ? post.meta.views : post.meta.views + " 阅读") : "1.2k 阅读"}</span>
          <span class="theme-pill meta">${ICONS.chat} 约 ${post.readingStats.readingTimeMin} 分钟阅读</span>
        </div>
      </header>

      <!-- 正文内容 (保留 obw 微信出版级排版全部组件) -->
      <section class="article-content" style="line-height: 1.85;">
        ${renderedHtml}
      </section>

      <!-- 微信公众号订阅卡片 -->
      <section class="wechat-promo-card">
        <div class="wechat-promo-text">
          <h4>关注作者公众号「${SITE_CONFIG.wechatName}」</h4>
          <p>本文由 Obsidian WeChat Publisher (obw) 出版级排版引擎生成并同步发布。深度技术实战与原创思考第一时间直达。</p>
        </div>
        <div class="wechat-qr-box">
          <img src="${SITE_CONFIG.wechatQrUrl}" alt="二维码" onerror="this.parentElement.style.display='none'">
        </div>
      </section>
    </article>

    <!-- 桌面端右侧随动目录 (TOC) -->
    ${
      toc.length > 0
        ? `<aside class="article-toc-sidebar" aria-label="文章目录">
      <div class="toc-title">${ICONS.toc} <span>本文目录</span></div>
      <ul class="toc-list">
        ${tocItemsHtml}
      </ul>
    </aside>`
        : ""
    }
  </main>

  <!-- 回到顶部按钮 -->
  <button id="back-to-top" onclick="scrollToTop()" title="回到顶部">
    ${ICONS.arrowUp}
  </button>

  <!-- 搜索模态框 -->
  <div id="search-modal" class="search-modal-backdrop" onclick="toggleSearchModal(false)">
    <div class="search-modal-box" onclick="event.stopPropagation()">
      <div class="search-modal-input-row">
        ${ICONS.search}
        <input type="text" id="search-input" class="search-modal-input" placeholder="输入关键词快速搜索文章..." oninput="onSearchModalInput(event)">
        <button onclick="toggleSearchModal(false)">${ICONS.cross}</button>
      </div>
      <div id="search-results-box" class="search-results-box">
        <div style="padding:20px;text-align:center;color:var(--text-light);font-size:0.9rem;">输入关键词搜索全部文章...</div>
      </div>
    </div>
  </div>

  <footer class="site-footer">
    <div class="footer-inner-container">
      <div>© 2025 ${SITE_CONFIG.title}. All rights reserved.</div>
      <div class="footer-nav-links">
        <a href="../index.html" class="footer-nav-link">首页</a>
        <a href="../index.html#latest" class="footer-nav-link">文章</a>
        <a href="../index.html#latest" class="footer-nav-link">分类</a>
        <a href="../index.html#about" class="footer-nav-link">关于</a>
        <a href="../index.html#about" class="footer-nav-link">标签</a>
      </div>
    </div>
  </footer>

  <script>${CLIENT_SCRIPTS}</script>
</body>
</html>`;
}

/**
 * 组装首页 HTML (1:1 像素级复现用户设计稿)
 */
function buildIndexPageHtml(posts, featuredPost, latestPosts) {
  function getTagColorClass(tag) {
    if (tag.includes("技术")) return "teal";
    if (tag.includes("生活")) return "purple";
    if (tag.includes("产品")) return "amber";
    if (tag.includes("成长")) return "cyan";
    return "blue";
  }

  const latestCardsHtml = latestPosts
    .map((p) => {
      const firstTag = (p.meta.tags && p.meta.tags[0]) ? p.meta.tags[0] : "随笔";
      const colorClass = getTagColorClass(firstTag);
      const coverUrl = p.meta.cover ? p.meta.cover.replace(/^\.\.\//, "") : "images/post-hyperf.jpg";
      const rawViews = p.meta.views || "856";
      const views = rawViews.includes("阅读") ? rawViews : `${rawViews} 阅读`;

      return `
      <article class="card-item-4" data-tags="${(p.meta.tags || []).join(",")}" data-title="${p.meta.title}" data-desc="${p.meta.description}" data-url="posts/${p.slug}.html">
        <div class="card-item-cover-box">
          <img src="${coverUrl}" alt="${p.meta.title}" class="card-item-cover-img" onerror="this.style.opacity=0.3">
        </div>
        <div class="card-item-body">
          <span class="tag-badge-pill ${colorClass}">${firstTag}</span>
          <a href="posts/${p.slug}.html">
            <h3 class="card-item-title">${p.meta.title}</h3>
          </a>
          <p class="card-item-desc">${p.meta.description || p.rawExcerpt || "点击阅读全文..."}</p>
          <div class="card-item-footer">
            <span class="meta-item">${ICONS.calendar} ${p.meta.date || "2025-09-18"}</span>
            <span class="meta-item">${ICONS.eye} ${views}</span>
          </div>
        </div>
      </article>`;
    })
    .join("\n");

  // 精选文章卡片
  const feat = featuredPost || posts[0];
  const featCover = feat.meta.cover ? feat.meta.cover.replace(/^\.\.\//, "") : "images/featured-fuji.jpg";
  const featTag = (feat.meta.tags && feat.meta.tags[0]) ? feat.meta.tags[0] : "产品思考";
  const featViews = feat.meta.views ? (feat.meta.views.includes("阅读") ? feat.meta.views : feat.meta.views + " 阅读") : "1.2k 阅读";
  const featComments = feat.meta.comments ? (feat.meta.comments.includes("评论") ? feat.meta.comments : feat.meta.comments + " 评论") : "32 评论";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SITE_CONFIG.title} - ${SITE_CONFIG.hero.calligraphy.join("，")}</title>
  <meta name="description" content="${SITE_CONFIG.description}">
  <!-- 零闪烁风格与暗黑模式优先注入 -->
  <script>
    (function(){
      try {
        var savedTheme = localStorage.getItem("obw-site-theme") || "mint-emerald";
        document.documentElement.setAttribute("data-theme", savedTheme);
        var savedMode = localStorage.getItem("obw-site-mode") || localStorage.getItem("tan-blog-theme") || 
          (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        document.documentElement.setAttribute("data-mode", savedMode);
      } catch(e) {}
    })();
  </script>
  <style>
:root {
  --hero-bg: url('images/hero-clean.jpg'), url('images/hero-bg.jpg');
  --banner-bg: url('images/bottom-banner-clean.jpg'), url('images/bottom-banner.jpg');
}
${SITE_STYLES}
  </style>
</head>
<body>
  <div id="read-progress"></div>

  <!-- 顶部导航 -->
  <header id="main-nav" class="site-nav">
    <div class="nav-container">
      <a href="index.html" class="site-brand">
        <span class="site-brand-icon">${ICONS.mountain}</span>
        <span>${SITE_CONFIG.title}</span>
      </a>

      <nav class="nav-center-menu">
        <a href="index.html" class="nav-menu-item active">首页</a>
        <a href="#latest" class="nav-menu-item">文章</a>
        <a href="#latest" class="nav-menu-item">分类</a>
        <a href="#about" class="nav-menu-item">关于</a>
        <a href="#about" class="nav-menu-item">标签</a>
      </nav>

      <div class="nav-right-actions">
        <button class="nav-action-btn" onclick="toggleSearchModal(true)" title="搜索文章 (Cmd+K)">
          ${ICONS.search}
        </button>
        <div class="theme-picker-wrapper">
          <button id="theme-picker-btn" class="nav-action-btn theme-picker-trigger" onclick="toggleThemeDropdown()" title="切换全站风格">
            ${ICONS.palette}
            <span class="theme-active-indicator"></span>
          </button>
          <div id="theme-picker-dropdown" class="theme-dropdown-menu">
            <div class="theme-dropdown-header">选择全站风格</div>
            ${SITE_THEMES.map(t => `
              <div class="theme-dropdown-item" onclick="selectSiteTheme('${t.id}')" data-theme-id="${t.id}">
                <span class="theme-swatch" style="background: ${t.color};"></span>
                <div class="theme-info">
                  <div class="theme-name">${t.name}</div>
                  <div class="theme-desc">${t.desc}</div>
                </div>
                <span class="theme-check">${ICONS.check}</span>
              </div>
            `).join("")}
          </div>
        </div>
        <button class="nav-action-btn" onclick="toggleTheme()" title="切换日夜模式">
          <span id="theme-toggle-icon">${ICONS.moon}</span>
        </button>
        <div class="nav-avatar-btn" title="${SITE_CONFIG.author}">T</div>
      </div>
    </div>
  </header>

  <!-- 晨曦全景 Hero 区域 -->
  <section class="home-hero-wrapper">
    <div class="hero-inner-container">
      <div class="hero-left-content">
        <div class="home-hero-badge">
          <span class="pill-dot"></span> 个人数字花园 · 思考与沉淀
        </div>
        <h1 class="hero-calligraphy-title">
          ${SITE_CONFIG.hero.calligraphy[0]}<br>
          ${SITE_CONFIG.hero.calligraphy[1]}
        </h1>
        <div class="theme-accent-dash">
          <span class="dash-long"></span>
          <span class="dash-dot"></span>
          <span class="dash-dot"></span>
        </div>
        <div class="hero-cursive-sub">${SITE_CONFIG.hero.cursive}</div>
        <p class="hero-bio-desc">${SITE_CONFIG.hero.bio}</p>
        <div class="hero-btn-row">
          <a href="#featured" class="btn-hero-primary">
            探索文章 ${ICONS.arrowRight}
          </a>
          <a href="#about" class="btn-hero-secondary">
            关于我
          </a>
        </div>
      </div>

      <!-- 右上角悬浮名言日历卡片 -->
      <div class="hero-quote-card">
        <div class="quote-header">
          <span>${SITE_CONFIG.quote.date}</span>
          <span>${SITE_CONFIG.quote.weather}</span>
        </div>
        <div class="quote-body">
          ${SITE_CONFIG.quote.text}
        </div>
        <div class="quote-author">— ${SITE_CONFIG.quote.author}</div>
      </div>
    </div>
  </section>

  <!-- 页面主体内容 -->
  <main class="main-content-wrapper">
    <!-- Section 1: 精选文章 (FEATURED) -->
    <section id="featured">
      <div class="section-header-bar">
        <h2 class="section-title">
          精选文章 <span class="section-subtitle">FEATURED</span>
        </h2>
        <a href="#latest" class="section-more-link">
          查看全部 ${ICONS.arrowRight}
        </a>
      </div>

      <article class="featured-card" data-title="${feat.meta.title}" data-desc="${feat.meta.description}" data-url="posts/${feat.slug}.html">
        <div class="featured-cover-box">
          <img src="${featCover}" alt="${feat.meta.title}" class="featured-cover-img" onerror="this.style.opacity=0.3">
        </div>
        <div class="featured-content">
          <span class="tag-badge-pill blue">${featTag}</span>
          <a href="posts/${feat.slug}.html">
            <h3 class="featured-title">${feat.meta.title}</h3>
          </a>
          <p class="featured-desc">${feat.meta.description}</p>
          <div class="post-meta-row">
            <span class="meta-item">${ICONS.calendar} ${feat.meta.date || "2025-09-20"}</span>
            <span class="meta-item">${ICONS.eye} ${featViews}</span>
            <span class="meta-item">${ICONS.chat} ${featComments}</span>
          </div>
        </div>
      </article>
    </section>

    <!-- Section 2: 最新文章 (LATEST) -->
    <section id="latest">
      <div class="section-header-bar">
        <h2 class="section-title">
          最新文章 <span class="section-subtitle">LATEST</span>
        </h2>
        <div class="category-filter-pills">
          <button class="filter-pill active" onclick="filterCategory('all', this)">全部</button>
          <button class="filter-pill" onclick="filterCategory('技术', this)">技术</button>
          <button class="filter-pill" onclick="filterCategory('产品', this)">产品</button>
          <button class="filter-pill" onclick="filterCategory('生活', this)">生活</button>
          <button class="filter-pill" onclick="filterCategory('成长', this)">成长</button>
        </div>
      </div>

      <div class="latest-grid-4">
        ${latestCardsHtml}
      </div>
    </section>

    <!-- Section 3: 底部宽幅互动交流横幅 (月升夜景) -->
    <section id="about" class="bottom-comm-banner">
      <div class="banner-left">
        <div class="banner-title">
          ${ICONS.chat} <span>与我交流</span>
        </div>
        <p class="banner-desc">
          如果你对文章有任何想法，或者有技术、产品、生活方面的问题，欢迎在评论区留言，或通过其他方式联系我。
        </p>
        <div class="banner-social-row">
          <a href="mailto:${SITE_CONFIG.email}" class="social-circle-btn" title="发送邮件">${ICONS.mail}</a>
          <a href="${SITE_CONFIG.githubUrl}" target="_blank" rel="noopener" class="social-circle-btn" title="GitHub 个人主页">${ICONS.github}</a>
          <a href="https://github.com/weavingtan/obw" target="_blank" rel="noopener" class="social-circle-btn" title="个人博客 / 排版项目">${ICONS.globe}</a>
        </div>
      </div>

      <div class="banner-right">
        <div class="banner-calligraphy-text">
          ${SITE_CONFIG.banner.calligraphy[0]}<br>
          ${SITE_CONFIG.banner.calligraphy[1]}
        </div>
      </div>
    </section>
  </main>

  <!-- 回到顶部按钮 -->
  <button id="back-to-top" onclick="scrollToTop()" title="回到顶部">
    ${ICONS.arrowUp}
  </button>

  <!-- 全局搜索模态框 -->
  <div id="search-modal" class="search-modal-backdrop" onclick="toggleSearchModal(false)">
    <div class="search-modal-box" onclick="event.stopPropagation()">
      <div class="search-modal-input-row">
        ${ICONS.search}
        <input type="text" id="search-input" class="search-modal-input" placeholder="输入关键词快速搜索文章 (按 Esc 退出)..." oninput="onSearchModalInput(event)">
        <button onclick="toggleSearchModal(false)" style="color:var(--text-light);">${ICONS.cross}</button>
      </div>
      <div id="search-results-box" class="search-results-box">
        <div style="padding:20px;text-align:center;color:var(--text-light);font-size:0.9rem;">输入关键词搜索全部文章...</div>
      </div>
    </div>
  </div>

  <footer class="site-footer">
    <div class="footer-inner-container">
      <div>© 2025 ${SITE_CONFIG.title}. All rights reserved.</div>
      <div class="footer-nav-links">
        <a href="index.html" class="footer-nav-link">首页</a>
        <a href="#latest" class="footer-nav-link">文章</a>
        <a href="#latest" class="footer-nav-link">分类</a>
        <a href="#about" class="footer-nav-link">关于</a>
        <a href="#about" class="footer-nav-link">标签</a>
      </div>
    </div>
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

  // 1. 初始化并清空目录
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
  const posts = [];

  for (const filename of files) {
    const slug = path.basename(filename, ".md");
    const filePath = path.join(POSTS_DIR, filename);
    const rawContent = fs.readFileSync(filePath, "utf-8");

    const { meta, body } = parseFrontmatter(rawContent);
    const readingStats = calculateReadingStats(body);

    const cleanExcerpt = body
      .replace(/:::[\s\S]*?:::/g, "")
      .replace(/#+\s+.+/g, "")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .trim()
      .slice(0, 140)
      .replace(/\s+/g, " ");

    const renderedHtml = renderWithObw(body, SITE_CONFIG.theme);
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
  }

  // 生成每篇文章详情页
  for (const post of posts) {
    const postHtml = buildPostPageHtml(post, post.html, post.toc);
    fs.writeFileSync(path.join(DIST_POSTS_DIR, `${post.slug}.html`), postHtml, "utf-8");
    console.log(`✅ 已生成文章页面: dist/posts/${post.slug}.html`);
  }

  // 分离精选文章与最新文章
  let featuredPost = posts.find((p) => p.meta.featured === true || p.slug === "product-with-warmth");
  if (!featuredPost) featuredPost = posts[0];

  // 按照设计稿严格优先排列 4 篇最新文章
  const designatedOrder = [
    "hyperf-3-1-upgrade",
    "solo-travel-seaside",
    "personal-site-design",
    "learning-motivation"
  ];

  const latestPosts = posts
    .filter((p) => p.slug !== featuredPost.slug)
    .sort((a, b) => {
      const idxA = designatedOrder.indexOf(a.slug);
      const idxB = designatedOrder.indexOf(b.slug);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      const dateA = a.meta.date ? new Date(a.meta.date).getTime() : 0;
      const dateB = b.meta.date ? new Date(b.meta.date).getTime() : 0;
      return dateB - dateA;
    });

  // 生成首页 index.html
  const indexHtml = buildIndexPageHtml(posts, featuredPost, latestPosts);
  fs.writeFileSync(path.join(DIST_DIR, "index.html"), indexHtml, "utf-8");
  console.log(`✅ 已生成首页归档: dist/index.html`);

  console.log(`🎉 站点构建全部完成！输出目录：${DIST_DIR}`);
}

main().catch((err) => {
  console.error("构建失败:", err);
  process.exit(1);
});
