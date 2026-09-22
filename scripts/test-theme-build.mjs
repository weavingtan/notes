#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");

console.log("🧪 启动个人网站薄荷翡翠与多主题切换自动化测试...");

// 1. 验证构建产物基础目录与文件
assert.ok(fs.existsSync(DIST_DIR), "dist 目录不存在");
const indexPath = path.join(DIST_DIR, "index.html");
const welcomePostPath = path.join(DIST_DIR, "posts/welcome.html");

assert.ok(fs.existsSync(indexPath), "dist/index.html 不存在");
assert.ok(fs.existsSync(welcomePostPath), "dist/posts/welcome.html 不存在");

const indexHtml = fs.readFileSync(indexPath, "utf-8");
const welcomeHtml = fs.readFileSync(welcomePostPath, "utf-8");

// 2. 验证 5 套主题选择器完整存在
const expectedThemes = ["mint-emerald", "tech-blue", "aurora-violet", "warm-amber", "minimalist-ink"];
for (const theme of expectedThemes) {
  assert.ok(indexHtml.includes(`[data-theme="${theme}"]`), `index.html 缺失 [data-theme="${theme}"] 样式`);
  assert.ok(welcomeHtml.includes(`[data-theme="${theme}"]`), `welcome.html 缺失 [data-theme="${theme}"] 样式`);
  assert.ok(indexHtml.includes(`data-theme-id="${theme}"`), `index.html 调色盘菜单缺失 data-theme-id="${theme}"`);
}
console.log("✓ 5 套风格主题 CSS Tokens 与切换项全部就绪");

// 3. 验证 Zero-FOUC 脚本存在于 head 中
assert.ok(indexHtml.includes('localStorage.getItem("obw-site-theme") || "mint-emerald"'), "index.html 缺失 Zero-FOUC 脚本");
assert.ok(welcomeHtml.includes('localStorage.getItem("obw-site-theme") || "mint-emerald"'), "welcome.html 缺失 Zero-FOUC 脚本");
console.log("✓ Zero-FOUC 零闪烁防跳屏注入验证通过");

// 4. 验证调色盘切换器 UI 元素
assert.ok(indexHtml.includes('id="theme-picker-btn"'), "index.html 缺失 #theme-picker-btn");
assert.ok(indexHtml.includes('id="theme-picker-dropdown"'), "index.html 缺失 #theme-picker-dropdown");
assert.ok(welcomeHtml.includes('id="theme-picker-btn"'), "welcome.html 缺失 #theme-picker-btn");
assert.ok(welcomeHtml.includes('id="theme-picker-dropdown"'), "welcome.html 缺失 #theme-picker-dropdown");
console.log("✓ 调色盘下拉组件在首页与文章详情页全部就绪");

// 5. 验证薄荷翡翠核心视觉元素 (三段式翡翠装饰线与胶囊体系)
assert.ok(indexHtml.includes('class="theme-accent-dash"'), "index.html 缺失 .theme-accent-dash");
assert.ok(welcomeHtml.includes('class="theme-accent-dash"'), "welcome.html 缺失 .theme-accent-dash");
assert.ok(indexHtml.includes('class="home-hero-badge"'), "index.html 缺失 .home-hero-badge");
assert.ok(welcomeHtml.includes('class="theme-pill primary"'), "welcome.html 缺失 .theme-pill primary");
assert.ok(welcomeHtml.includes('class="theme-pill author"'), "welcome.html 缺失 .theme-pill author");
assert.ok(indexHtml.includes('class="filter-pill active"'), "index.html 缺失 .filter-pill active");
console.log("✓ 薄荷翡翠标志性视觉元素 (三段线/胶囊药丸/毛玻璃徽章) 验证通过");

// 6. 验证阅读进度条与样式
assert.ok(welcomeHtml.includes('id="read-progress"'), "welcome.html 缺失 #read-progress");
assert.ok(welcomeHtml.includes('var(--accent-gradient)'), "welcome.html 缺失 var(--accent-gradient)");
console.log("✓ 阅读进度条与主题渐变映射验证通过");

console.log("🎉 全部 6 项核心断言 100% 通过！");
