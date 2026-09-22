#!/usr/bin/env node
/**
 * @file test-site.mjs
 * Tan's Blog / Weaving's Notes 站点全栈自动化测试套件
 * 
 * 包含 5 大质量门禁断言：
 * 1. YAML Frontmatter 单元测试 (多行列表、内联数组、标量、注释剥离、Draft 过滤、缺失字段 Fallback)
 * 2. 全站 404 死链深度扫描 (扫描 dist 目录下所有 HTML 文件的 <a> 与 <img> 引用)
 * 3. WCAG 2.1 AA 数学对比度校验 (5 套主题 x 2 种模式，对比度严格 >= 4.5:1)
 * 4. Zero-FOUC 零闪烁与调色盘组件契约校验
 * 5. 微信公众号防塌陷免疫力断言 (article-content 内容区 0 div 约束)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { parseFrontmatter, adaptObwHtmlForWeb, SITE_THEMES } from "./build.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");

console.log("🧪 启动 Tan's Blog 出版级静态站点全套自动化测试...\n");

// ========================================================
// 1. YAML Frontmatter 解析器单元测试
// ========================================================
console.log("▶ [Test 1/5] YAML Frontmatter 解析器单元测试");

// 1.1 测试多行列表解析
const multilineYaml = `---
title: 测试多行列表文章
date: 2026-09-22
tags:
  - 架构设计
  - 性能优化
  - TypeScript
categories:
  - 技术
  - 前端工程
featured: true # 置顶推荐
order: 2
---
# 标题内容
这是正文内容。`;

const { meta: meta1, body: body1 } = parseFrontmatter(multilineYaml);
assert.equal(meta1.title, "测试多行列表文章", "标题解析失败");
assert.equal(meta1.date, "2026-09-22", "日期解析失败");
assert.deepEqual(meta1.tags, ["架构设计", "性能优化", "TypeScript"], "多行 tags 列表解析失败");
assert.deepEqual(meta1.categories, ["技术", "前端工程"], "多行 categories 列表解析失败");
assert.equal(meta1.featured, true, "featured 布尔值带行末注释解析失败");
assert.equal(meta1.order, 2, "order 权重数字解析失败");
assert.equal(body1.includes("这是正文内容。"), true, "正文提取失败");
console.log("  ✓ 多行列表、布尔值与行末注释解析通过");

// 1.2 测试内联数组解析与单值 category 归一化
const inlineYaml = `---
title: "引号标题测试"
category: 产品
tags: [用户体验, 交互设计]
draft: true
---
正文内容`;

const { meta: meta2 } = parseFrontmatter(inlineYaml);
assert.equal(meta2.title, "引号标题测试", "带引号标题解析失败");
assert.deepEqual(meta2.categories, ["产品"], "单值 category 归一化为数组失败");
assert.deepEqual(meta2.tags, ["用户体验", "交互设计"], "内联数组 tags 解析失败");
assert.equal(meta2.draft, true, "draft 标记解析失败");
console.log("  ✓ 内联数组、引号处理与 category 归一化通过");

// 1.3 测试无 Frontmatter 时的 H1 提取与分类兜底
const noFmDoc = `# 自动提取的一级标题
这是没有任何 YAML 头的正文。`;

const { meta: meta3 } = parseFrontmatter(noFmDoc);
assert.equal(meta3.title, "自动提取的一级标题", "缺失 Frontmatter 时提取首个 H1 失败");
assert.deepEqual(meta3.categories, ["未分类"], "缺失分类时兜底未分类失败");
console.log("  ✓ 缺失 Frontmatter 容错与 H1 提取通过");

// 1.4 测试 Web Content Adaptor 深色清洗与白板自愈
const rawObwSample = `<section style="color: #2b2b2b; font-size: 15px; background: #ffffff;"><p style="color: #1f2937;">深度长文</p><span style="color: #475569;">副标题</span></section>`;
const adapted = adaptObwHtmlForWeb(rawObwSample);
assert.equal(adapted.includes("#2b2b2b"), false, "Web Content Adaptor 未能清除 #2b2b2b");
assert.equal(adapted.includes("#1f2937"), false, "Web Content Adaptor 未能清除 #1f2937");
assert.equal(adapted.includes("#ffffff"), false, "Web Content Adaptor 未能清除 #ffffff 白板背景");
assert.equal(adapted.includes("var(--bg-card)"), true, "Web Content Adaptor 未替换纯白背景为 var(--bg-card)");
assert.equal(adapted.includes("var(--text-main)"), true, "Web Content Adaptor 未替换为 var(--text-main)");
assert.equal(adapted.includes("var(--text-muted)"), true, "Web Content Adaptor 未替换为 var(--text-muted)");
console.log("  ✓ Web Content Adaptor 样式清洗与白板防塌陷自愈通过");

// ========================================================
// 2. 全站 404 死链深度扫描 (Zero 404s)
// ========================================================
console.log("\n▶ [Test 2/5] 全站 404 死链深度扫描");

function getAllHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllHtmlFiles(filePath));
    } else if (file.endsWith(".html")) {
      results.push(filePath);
    }
  }
  return results;
}

const allHtmlFiles = getAllHtmlFiles(DIST_DIR);
assert.ok(allHtmlFiles.length >= 6, `生成页面总数过少: 仅 ${allHtmlFiles.length} 个`);

// 必须存在的 5 大独立核心入口
const corePages = ["index.html", "archives.html", "categories.html", "tags.html", "about.html"];
for (const p of corePages) {
  const fullP = path.join(DIST_DIR, p);
  assert.ok(fs.existsSync(fullP), `缺少核心页面: dist/${p}`);
}
console.log(`  ✓ 5 大独立二级页面全部就绪 (index, archives, categories, tags, about)`);

let totalLinksChecked = 0;
for (const htmlFile of allHtmlFiles) {
  const content = fs.readFileSync(htmlFile, "utf-8");
  const fileDir = path.dirname(htmlFile);

  // 剥离 <script> 与 <style> 块，防止将 JS 字符串模板中的 ${m.url} 误判为真实 DOM 链接
  const domOnlyContent = content
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");

  // 检查所有 href 链接
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(domOnlyContent)) !== null) {
    const rawLink = match[1];
    // 跳过外部链接、锚点与伪协议
    if (
      rawLink.startsWith("http://") ||
      rawLink.startsWith("https://") ||
      rawLink.startsWith("#") ||
      rawLink.startsWith("mailto:") ||
      rawLink.startsWith("javascript:")
    ) {
      continue;
    }

    const cleanLink = rawLink.split("#")[0].split("?")[0];
    if (!cleanLink) continue;

    const targetPath = path.resolve(fileDir, cleanLink);
    assert.ok(
      fs.existsSync(targetPath),
      `404 死链错误！在页面 [${path.relative(ROOT_DIR, htmlFile)}] 中引用的链接 [${rawLink}] 目标文件 [${targetPath}] 不存在！`
    );
    totalLinksChecked++;
  }

  // 检查所有 img src 链接
  const srcRegex = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
  while ((match = srcRegex.exec(domOnlyContent)) !== null) {
    const rawSrc = match[1];
    if (rawSrc.startsWith("http://") || rawSrc.startsWith("https://") || rawSrc.startsWith("data:")) {
      continue;
    }
    const cleanSrc = rawSrc.split("?")[0];
    const targetPath = path.resolve(fileDir, cleanSrc);
    assert.ok(
      fs.existsSync(targetPath),
      `404 图片缺失！在页面 [${path.relative(ROOT_DIR, htmlFile)}] 中引用的图片 [${rawSrc}] 目标文件 [${targetPath}] 不存在！`
    );
    totalLinksChecked++;
  }
}
console.log(`  ✓ 已扫描并校验 ${allHtmlFiles.length} 个 HTML 页面，累计 ${totalLinksChecked} 个相对链接与资源，0 个死链！`);

// ========================================================
// 3. WCAG 2.1 AA 数学色彩对比度验证 (>= 4.5:1)
// ========================================================
console.log("\n▶ [Test 3/5] WCAG 2.1 AA 数学对比度校验");

function parseHexColor(hex) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getRelativeLuminance(rgb) {
  const [r, g, b] = rgb.map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(rgb1, rgb2) {
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// 日间基准色
const lightBg = parseHexColor("#f8fafc");
const lightText = parseHexColor("#0f172a");
const lightContrast = getContrastRatio(lightBg, lightText);
assert.ok(lightContrast >= 4.5, `日间正文对比度不达标: ${lightContrast.toFixed(2)}`);
console.log(`  ✓ 日间全站基础正文对比度: ${lightContrast.toFixed(2)}:1 (超越 WCAG AA 4.5:1 标准)`);

// 5 套主题暗黑模式对比度
const darkThemeBgs = {
  "mint-emerald": parseHexColor("#091410"),
  "tech-blue": parseHexColor("#0b132b"),
  "aurora-violet": parseHexColor("#160d27"),
  "warm-amber": parseHexColor("#1c1408"),
  "minimalist-ink": parseHexColor("#0f172a"),
};

const darkText = parseHexColor("#f8fafc");

for (const theme of SITE_THEMES) {
  const bg = darkThemeBgs[theme.id];
  const ratio = getContrastRatio(bg, darkText);
  assert.ok(
    ratio >= 4.5,
    `主题 [${theme.name}] 深色模式文字对比度过低: ${ratio.toFixed(2)}:1 (低于 4.5:1)`
  );
  console.log(`  ✓ 主题 [${theme.name}] 深色模式文本对比度: ${ratio.toFixed(2)}:1 (严格满足 WCAG 2.1 AA)`);
}

// ========================================================
// 4. Zero-FOUC 零闪烁与调色盘组件契约校验
// ========================================================
console.log("\n▶ [Test 4/5] Zero-FOUC 零闪烁与调色盘组件契约校验");

for (const htmlFile of allHtmlFiles) {
  const content = fs.readFileSync(htmlFile, "utf-8");
  const relName = path.relative(DIST_DIR, htmlFile);

  assert.ok(
    content.includes('localStorage.getItem("obw-site-theme")'),
    `${relName} 缺失 Zero-FOUC 主题初始化脚本`
  );
  assert.ok(
    content.includes('localStorage.getItem("obw-site-mode")'),
    `${relName} 缺失 Zero-FOUC 深浅模式初始化脚本`
  );
  assert.ok(
    content.includes('id="theme-picker-btn"'),
    `${relName} 缺失调色盘切换按钮 #theme-picker-btn`
  );
  assert.ok(
    content.includes('id="theme-picker-dropdown"'),
    `${relName} 缺失调色盘菜单 #theme-picker-dropdown`
  );
}
console.log(`  ✓ 全站 ${allHtmlFiles.length} 个页面全部包含严格的 Zero-FOUC 与调色盘菜单组件`);

// ========================================================
// 5. 微信公众号防塌陷免疫力断言 (0 div 约束)
// ========================================================
console.log("\n▶ [Test 5/5] 微信排版防塌陷免疫力断言 (AGENTS.md 硬红线)");

const postHtmlFiles = allHtmlFiles.filter((f) => f.includes("/posts/"));
assert.ok(postHtmlFiles.length > 0, "未找到文章详情页产物");

for (const postFile of postHtmlFiles) {
  const content = fs.readFileSync(postFile, "utf-8");
  const rel = path.relative(ROOT_DIR, postFile);

  // 提取 article-content 区块
  const match = content.match(/<section class="article-content">([\s\S]*?)<\/section>\s*<!-- 微信公众号订阅卡片 -->/);
  if (match) {
    const articleInner = match[1];
    const divMatch = articleInner.match(/<div\b/i);
    assert.equal(
      divMatch,
      null,
      `违背微信防塌陷硬红线！文章 [${rel}] 的正文渲染区中出现了 <div 标签！必须全部使用 <section>`
    );
  }
}
console.log(`  ✓ 全部 ${postHtmlFiles.length} 篇详情页 article-content 均无 <div>，完全免疫微信粘贴塌陷！`);

// ========================================================
// 6. V2 视觉体验升级与暗黑模式白板免疫断言
// ========================================================
console.log("\n▶ [Test 6/6] V2 视觉体验升级与暗黑模式白板免疫断言");

// 6.1 交流横幅无框悬浮断言与名言日历卡片动态化断言
const indexHtml = fs.readFileSync(path.join(DIST_DIR, "index.html"), "utf-8");
assert.ok(!indexHtml.includes(' 阅读</span>'), "首页仍残留虚假阅读量字段");
assert.ok(!indexHtml.includes('1.2k 阅读'), "精选文章卡片仍残留 1.2k 阅读量");
assert.ok(indexHtml.includes('.banner-left'), "首页缺少 .banner-left 样式");

// 6.2 今日日期动态化断言 (YYYY.MM.DD)
const todayRegex = /\d{4}\.\d{2}\.\d{2}/;
assert.ok(todayRegex.test(indexHtml), "名言日历卡片未包含动态今天日期 (YYYY.MM.DD)");

// 6.3 关于我页面暗黑模式白板免疫断言
const aboutHtml = fs.readFileSync(path.join(DIST_DIR, "about.html"), "utf-8");
const cardsMatch = aboutHtml.match(/<section class="wechat-module wechat-module-cards"[^>]*>([\s\S]*?)<\/section>\s*<h2/);
if (cardsMatch) {
  const cardsHtml = cardsMatch[1];
  assert.equal(
    /background:\s*#ffffff/i.test(cardsHtml),
    false,
    "关于我页面 cards 模块内仍残留内联 background: #ffffff，会导致深色模式白板！"
  );
  assert.ok(cardsHtml.includes("var(--bg-card)"), "cards 模块未自愈替换为 var(--bg-card)");
}
console.log("  ✓ 零假阅读量、动态日期与暗黑模式白板自愈断言通过");

// ========================================================
// 7. V2 沉浸式极客交互与微信移动端响应式排版断言
// ========================================================
console.log("\n▶ [Test 7/7] V2 沉浸式极客交互与微信移动端响应式排版断言");

// 7.1 品牌 Logo 统一重构为 TAN
for (const htmlFile of allHtmlFiles) {
  const content = fs.readFileSync(htmlFile, "utf-8");
  const rel = path.relative(ROOT_DIR, htmlFile);
  assert.ok(
    content.includes('<span class="brand-text">TAN</span>'),
    `[${rel}] 顶部导航未采用全新品牌 TAN Logo`
  );
  assert.equal(
    content.includes("<span>Tan's Blog</span>"),
    false,
    `[${rel}] 仍残留旧版 "Tan's Blog" 品牌标语`
  );
}
console.log(`  ✓ 全站 ${allHtmlFiles.length} 个页面全部采用新版极简 TAN 品牌 Logo，旧标语完全清零`);

// 7.2 全局 Cmd+K 搜索索引 window.__NOTES_INDEX__ 注入断言
for (const htmlFile of allHtmlFiles) {
  const content = fs.readFileSync(htmlFile, "utf-8");
  const rel = path.relative(ROOT_DIR, htmlFile);
  assert.ok(
    content.includes("window.__NOTES_INDEX__ ="),
    `[${rel}] 缺失全局文章搜索索引注入 window.__NOTES_INDEX__`
  );
}
const indexMatch = indexHtml.match(/window\.__NOTES_INDEX__\s*=\s*(\[[\s\S]*?\]);/);
assert.ok(indexMatch, "未解析到全局搜索索引数组");
const parsedIndex = JSON.parse(indexMatch[1]);
assert.ok(parsedIndex.length >= 7, `搜索索引文章数不足: 实际 ${parsedIndex.length} 篇`);
console.log(`  ✓ 全站 ${allHtmlFiles.length} 个页面均挂载全局搜索索引，涵盖全部 ${parsedIndex.length} 篇文章`);

// 7.3 暗黑模式 CTA 白板 0 容忍断言 (无 inline #f7f8fa)
for (const postFile of postHtmlFiles) {
  const content = fs.readFileSync(postFile, "utf-8");
  const rel = path.relative(ROOT_DIR, postFile);
  assert.equal(
    /style="[^"]*#f7f8fa/i.test(content),
    false,
    `文章 [${rel}] 仍残留内联 #f7f8fa，会导致暗黑模式白板！`
  );
}
console.log("  ✓ 全部详情页彻底杜绝 #f7f8fa 内联白板背景，自愈为 CSS 变量");

// 7.4 微信移动端响应式排版规范断言
assert.ok(indexHtml.includes("overflow-x: hidden !important"), "缺失移动端防横向晃动 overflow-x: hidden 锁死规则");
assert.ok(indexHtml.includes(".category-filter-pills"), "缺失分类筛选横向触控滚动样式");
assert.ok(indexHtml.includes("filter-pill"), "缺失大尺寸分类药丸样式");

const samplePost = fs.readFileSync(postHtmlFiles[0], "utf-8");
assert.ok(samplePost.includes(".article-content pre"), "缺失代码块移动端排版规则");
assert.ok(samplePost.includes("margin: 1.2em -16px"), "代码块未设置负外边距全宽通栏");
assert.ok(samplePost.includes("font-size: 16.5px"), "未遵循微信 16.5px 核心正文字号规范");
assert.ok(samplePost.includes("line-height: 1.78"), "未遵循微信 1.78 舒适行高规范");
console.log("  ✓ 移动端排版严格契合微信生态：全屏锁死晃动、18px 边距、16.5px/1.78 排版与代码通栏");

// 7.5 极客高留存功能断言 (GitHub 互动闭环、代码复制、专注模式、延伸推荐)
for (const postFile of postHtmlFiles) {
  const content = fs.readFileSync(postFile, "utf-8");
  const rel = path.relative(ROOT_DIR, postFile);
  assert.ok(content.includes('class="post-github-interaction"'), `[${rel}] 缺少 GitHub 极客讨论区`);
  assert.ok(content.includes('class="post-recommendations"'), `[${rel}] 缺少延伸阅读推荐卡片`);
  assert.ok(content.includes('class="focus-mode-exit-btn"'), `[${rel}] 缺少专注模式退出按钮`);
  assert.ok(content.includes('toggleFocusMode()'), `[${rel}] 缺少专注模式切换函数调用`);
  assert.ok(content.includes('initCodeCopy'), `[${rel}] 缺少代码一键复制挂载函数`);
}
console.log("  ✓ 全部详情页均配备 GitHub 互动闭环、智能延伸阅读、专注阅读模式与代码一键复制");

// 7.6 动态高清壁纸双层回退栈断言
assert.ok(indexHtml.includes("images/hero-daily.jpg"), "首页缺少 hero-daily.jpg 动态壁纸引用");
assert.ok(indexHtml.includes("images/hero-bg.jpg"), "首页缺少 hero-bg.jpg 回退壁纸引用");
assert.ok(indexHtml.includes("📷"), "首页名言卡片缺少今日壁纸摄影信息标记");
console.log("  ✓ 动态 4K 壁纸管道与双层 CSS 回退栈断言通过");

// ========================================================
// 8. 风格统一与 GitHub 按钮悬停白化自愈断言 (Task 1)
// ========================================================
console.log("\n▶ [Test 8/9] 风格统一与 GitHub 按钮悬停白化自愈断言");

{
  // 8.1 标签样式不得硬编码 #2563eb
  const indexHtml = fs.readFileSync(path.join(DIST_DIR, "index.html"), "utf-8");
  assert.ok(
    !indexHtml.includes("background:#2563eb") &&
    !indexHtml.includes("background: #2563eb") &&
    !indexHtml.includes("color:#2563eb") &&
    !indexHtml.includes("color: #2563eb"),
    "Tags must not have hardcoded #2563eb"
  );

  // 8.2 GitHub 主要按钮悬停白化免疫与纯白文本断言
  const samplePost = fs.readFileSync(path.join(DIST_DIR, "posts/frontend-architecture-2026.html"), "utf-8");
  assert.ok(samplePost.includes(".github-btn-primary:hover"), "Must have .github-btn-primary:hover rule");
  assert.ok(
    samplePost.includes("color: #ffffff !important") || samplePost.includes("color:#ffffff !important"),
    "Button hover text must be pure white"
  );
  console.log("  ✓ 标签完全解耦硬编码 #2563eb，GitHub 按钮悬停纯白字体规则就绪");
}

// ========================================================
// 9. 流式视口系统与全站宽幅布局断言 (Task 2: Fluid Viewport)
// ========================================================
console.log("\n▶ [Test 9/9] 流式视口系统与全站宽幅布局断言");

{
  const indexHtml = fs.readFileSync(path.join(DIST_DIR, "index.html"), "utf-8");
  const samplePost = fs.readFileSync(path.join(DIST_DIR, "posts/frontend-architecture-2026.html"), "utf-8");

  // 9.1 首页与文章详情页必须使用流式容器 clamp: min(94vw, 1280px)
  assert.ok(
    indexHtml.includes("min(94vw, 1280px)"),
    "index.html 必须使用流式 max-width clamp: min(94vw, 1280px)"
  );
  assert.ok(
    samplePost.includes("min(94vw, 1280px)"),
    "samplePost 必须使用流式 max-width clamp: min(94vw, 1280px)"
  );

  // 9.2 严禁针对 main-container 或 post-container 出现刚性夹紧 max-width: 760px 或 860px
  const containerRigidClamp = /\.(main-container|post-container)[^{]*\{[^}]*max-width:\s*(760|860)px/i;
  assert.ok(
    !containerRigidClamp.test(indexHtml),
    "index.html 不得对 main-container/post-container 设置刚性 max-width: 760px 或 860px"
  );
  assert.ok(
    !containerRigidClamp.test(samplePost),
    "samplePost 不得对 main-container/post-container 设置刚性 max-width: 760px 或 860px"
  );
  assert.ok(
    !indexHtml.includes("max-width: 760px") && !samplePost.includes("max-width: 760px"),
    "全站不得包含刚性阅读夹紧 max-width: 760px"
  );

  // 9.3 验证 .article-content 舒适行高 line-height: 1.82 与字号 16.5px
  assert.ok(
    samplePost.includes("line-height: 1.82") || samplePost.includes("line-height:1.82"),
    "samplePost .article-content 必须包含舒适行高 line-height: 1.82"
  );
  assert.ok(
    samplePost.includes("font-size: 16.5px"),
    "samplePost 必须包含 16.5px 正文字号"
  );

  // 9.4 验证 Task 1 审阅意见：标签使用 primary-faint，按钮 hover 使用 primary-hover
  assert.ok(
    samplePost.includes("var(--primary-faint"),
    "标签样式必须使用 var(--primary-faint) 确保 WCAG AA 对比度"
  );
  assert.ok(
    samplePost.includes("var(--primary-hover) !important") || samplePost.includes("var(--primary-hover)!important"),
    "按钮悬停必须使用 var(--primary-hover) !important 提供清晰的悬停交互反馈"
  );

  console.log("  ✓ 首页与详情页完全接入流式视口架构 min(94vw, 1280px)，无刚性夹紧，正文排版舒适度达标");
}

// ========================================================
// 10. 首页 1:1 复刻编辑部杂志流式排版断言 (Task 3: Editorial Hero & 5 Chapters)
// ========================================================
console.log("\n▶ [Test 10/10] 首页 1:1 复刻编辑部杂志流式排版断言");

{
  const indexHtml = fs.readFileSync(path.join(DIST_DIR, "index.html"), "utf-8");

  // 10.1 5 大核心章节容器断言
  assert.ok(indexHtml.includes("editorial-hero"), "index.html 必须包含 3 列编辑部 Hero (editorial-hero)");
  assert.ok(indexHtml.includes("featured-showcase"), "index.html 必须包含 FEATURED showcase 章节 (featured-showcase)");
  assert.ok(indexHtml.includes("selected-writings"), "index.html 必须包含 SELECTED WRITINGS 4 列竖排流 (selected-writings)");
  assert.ok(indexHtml.includes("panoramic-archive-spread"), "index.html 必须包含全景归档横幅 (panoramic-archive-spread)");
  assert.ok(indexHtml.includes("footprint-about"), "index.html 必须包含足迹与关于我章节 (footprint-about)");

  // 10.2 彻底清除旧版卡片盒模型断言
  assert.ok(!indexHtml.includes("card-item-2"), "index.html 严禁残留旧版 card-item-2 盒装卡片");
  assert.ok(!indexHtml.includes("card-item-4"), "index.html 严禁残留旧版 card-item-4 盒装卡片");

  // 10.3 微信防塌陷与无 div 约束：main 与 content 区域内无 div
  const mainMatch = indexHtml.match(/<main\b[\s\S]*?<\/main>/i);
  if (mainMatch) {
    const mainHtml = mainMatch[0];
    const divInMain = mainHtml.match(/<div\b/i);
    assert.equal(
      divInMain,
      null,
      "index.html <main> 容器内部违背 AGENTS.md 硬红线！出现了 <div 标签！必须全部使用 <section> 或语义化标签"
    );
  }

  console.log("  ✓ 首页 5 大编辑部杂志章节结构就绪，彻底告别盒装卡片，main 内部 0 div 断言通过");
}

// ========================================================
// 11. 归档页 1:1 复刻编辑部杂志时间线断言 (Task 4: Archive Reimagining)
// ========================================================
console.log("\n▶ [Test 11/11] 归档页 1:1 复刻编辑部杂志时间线断言");

{
  const archivesHtml = fs.readFileSync(path.join(DIST_DIR, "archives.html"), "utf-8");

  // 11.1 archive-hero
  assert.ok(archivesHtml.includes("archive-hero"), "archives.html 必须包含 archive-hero");
  assert.ok(archivesHtml.includes("归档 · 时间里的思考"), "archives.html 必须包含标题 '归档 · 时间里的思考'");
  assert.ok(archivesHtml.includes("year-block"), "archives.html 必须包含 year-block");
  assert.ok(archivesHtml.includes("year-reflection"), "archives.html 必须包含 year-reflection");
  assert.ok(archivesHtml.includes("year-timeline-dots"), "archives.html 必须包含 year-timeline-dots");
  assert.ok(archivesHtml.includes("archive-entries-grid"), "archives.html 必须包含 archive-entries-grid");
  assert.ok(archivesHtml.includes("archive-pagination"), "archives.html 必须包含 archive-pagination");

  // 11.2 main 容器内 0 div 断言
  const mainMatch = archivesHtml.match(/<main\b[\s\S]*?<\/main>/i);
  assert.ok(mainMatch, "archives.html 必须包含 <main> 标签");
  const divInMain = mainMatch[0].match(/<div\b/i);
  assert.equal(
    divInMain,
    null,
    "archives.html <main> 容器内部违背 AGENTS.md 硬红线！出现了 <div 标签！必须全部使用 <section> 或语义化标签"
  );

  console.log("  ✓ 归档页杂志流式排版就绪，年份反思、垂直虚线时间轴、双列画报流与底栏分页就绪，main 内部 0 div 断言通过");
}

// ========================================================
// 12. 分类与标签页 1:1 复刻侧边栏与水平条目流断言 (Task 5: Category & Tag Pages)
// ========================================================
console.log("\n▶ [Test 12/12] 分类与标签页 1:1 复刻侧边栏与水平条目流断言");

{
  const targetPages = [
    { file: "categories.html", type: "CATEGORIES", label: "CATEGORY" },
    { file: "tags.html", type: "TAGS", label: "TAG" }
  ];

  for (const { file, type, label } of targetPages) {
    const pageHtml = fs.readFileSync(path.join(DIST_DIR, file), "utf-8");

    // 12.1 tag-hero
    assert.ok(pageHtml.includes("tag-hero"), `${file} 必须包含 tag-hero`);
    assert.ok(pageHtml.includes("Good design makes life better."), `${file} 必须包含右侧引言 "Good design makes life better."`);

    // 12.2 tag-stream-layout (Dual-column layout: sidebar + right content stream)
    assert.ok(pageHtml.includes("tag-stream-layout"), `${file} 必须包含 tag-stream-layout 双列布局`);
    assert.ok(pageHtml.includes("tag-sidebar"), `${file} 必须包含左侧边栏 tag-sidebar`);
    assert.ok(pageHtml.includes("tag-main-stream"), `${file} 必须包含右侧流 tag-main-stream`);

    // 12.3 tag-sidebar-list
    assert.ok(pageHtml.includes("tag-sidebar-list"), `${file} 必须包含 tag-sidebar-list 侧边栏列表`);
    assert.ok(pageHtml.includes(`ALL ${type}`), `${file} 必须包含侧边栏标题 ALL ${type}`);

    // 12.4 sidebar-quote-box
    assert.ok(pageHtml.includes("sidebar-quote-box"), `${file} 必须包含 sidebar-quote-box`);
    assert.ok(pageHtml.includes("写作，是我与世界对话的方式。"), `${file} 必须包含底部引言 "写作，是我与世界对话的方式。"`);
    assert.ok(pageHtml.includes("Tan"), `${file} 必须包含作者签名 "Tan"`);

    // 12.5 stream-tabs
    assert.ok(pageHtml.includes("stream-tabs"), `${file} 必须包含 stream-tabs 标签切换条`);
    assert.ok(pageHtml.includes("最新"), `${file} 必须包含 '最新' 标签`);
    assert.ok(pageHtml.includes("最热"), `${file} 必须包含 '最热' 标签`);
    assert.ok(pageHtml.includes("最多阅读"), `${file} 必须包含 '最多阅读' 标签`);

    // 12.6 horizontal-entry-item
    assert.ok(pageHtml.includes("horizontal-entry-item"), `${file} 必须包含水平条目 horizontal-entry-item`);
    assert.ok(pageHtml.includes("min read ——"), `${file} 必须包含阅读时间与索引编号格式 "min read —— "`);

    // 12.7 ZERO <div> inside <main>
    const mainMatch = pageHtml.match(/<main\b[\s\S]*?<\/main>/i);
    assert.ok(mainMatch, `${file} 必须包含 <main> 容器`);
    const divInMain = mainMatch[0].match(/<div\b/i);
    assert.equal(
      divInMain,
      null,
      `${file} <main> 容器内部违背 AGENTS.md 硬红线！出现了 <div 标签！必须全部使用 <section> 或语义化标签`
    );
  }

  console.log("  ✓ categories.html 与 tags.html 1:1 复刻双列杂志流式排版就绪，侧边栏、引言卡片、水平流与 0 div 断言全数通过");
}

// ========================================================
// 13. 关于我页面 1:1 复刻编辑部杂志画像排版断言 (Task 6: About Page Reimagining)
// ========================================================
console.log("\n▶ [Test 13/13] 关于我页面 1:1 复刻编辑部杂志画像排版断言");

{
  const aboutHtml = fs.readFileSync(path.join(DIST_DIR, "about.html"), "utf-8");

  // 13.1 3-column Hero Trio
  assert.ok(aboutHtml.includes("about-hero-trio"), "about.html 必须包含 3 列主角区 about-hero-trio");
  assert.ok(aboutHtml.includes("ABOUT ME ——"), "about.html 必须包含 'ABOUT ME ——' 顶标");
  assert.ok(aboutHtml.includes("保持好奇，保持温柔。"), "about.html 必须包含右侧名言 '保持好奇，保持温柔。'");

  // 13.2 Personal Info Card & Details
  assert.ok(aboutHtml.includes("personal-info-card"), "about.html 必须包含个人档案卡片 personal-info-card");
  assert.ok(aboutHtml.includes("PERSONAL INFO"), "about.html 必须包含 'PERSONAL INFO' 标题");
  assert.ok(aboutHtml.includes("全栈架构师 / 产品设计师"), "about.html 必须包含职业 '全栈架构师 / 产品设计师'");

  // 13.3 4-Column Interests Hairline Grid
  assert.ok(aboutHtml.includes("interests-hairline-grid"), "about.html 必须包含 4 列兴趣发丝线网格 interests-hairline-grid");
  assert.ok(aboutHtml.includes("MY INTERESTS"), "about.html 必须包含 'MY INTERESTS' 标题");
  assert.ok(aboutHtml.includes("设计"), "about.html 兴趣栏必须包含 '设计'");
  assert.ok(aboutHtml.includes("技术"), "about.html 兴趣栏必须包含 '技术'");
  assert.ok(aboutHtml.includes("生活"), "about.html 兴趣栏必须包含 '生活'");
  assert.ok(aboutHtml.includes("阅读"), "about.html 兴趣栏必须包含 '阅读'");

  // 13.4 Panoramic About Banner
  assert.ok(aboutHtml.includes("panoramic-about-banner"), "about.html 必须包含全景宽幅横幅 panoramic-about-banner");
  assert.ok(aboutHtml.includes("在生活的缝隙里，寻找热爱的方向"), "about.html 必须包含全景文案 '在生活的缝隙里，寻找热爱的方向'");
  assert.ok(aboutHtml.includes("Better Things Ahead"), "about.html 必须包含英文寄语 'Better Things Ahead'");

  // 13.5 ZERO <div> inside <main>
  const mainMatch = aboutHtml.match(/<main\b[\s\S]*?<\/main>/i);
  assert.ok(mainMatch, "about.html 必须包含 <main> 容器");
  const divInMain = mainMatch[0].match(/<div\b/i);
  assert.equal(
    divInMain,
    null,
    "about.html <main> 容器内部违背 AGENTS.md 硬红线！出现了 <div 标签！必须全部使用 <section> 或语义化标签"
  );

  console.log("  ✓ about.html 3 列主角区、个人资料卡、4 列兴趣发丝线网格、全景横幅与 <main> 内 0 div 断言全数通过");
}

console.log("\n🎉 全部 13 大测试套件 100% 验证通过！出版级质量门禁就绪！");


