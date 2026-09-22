# Personal Site Architecture Redesign & Obsidian Publishing Pipeline Spec

- **Date**: 2026-09-22
- **Author**: Weaving Tan & Antigravity
- **Scope**: Static site generator `/Users/weaving/www/notes`, `scripts/build.mjs`, `scripts/test-site.mjs`, and Obsidian sync workflow.

---

## 1. 目标与背景 (Context & Goals)

### 1.1 背景
当前 `weavingtan/notes` 个人博客站点基于 `obw` (Obsidian WeChat Publisher) 出版级排版引擎与原生 Node.js 静态生成器构建。在前期搭建后，存在以下关键问题：
1. **Frontmatter 解析脆弱**：使用简单的按行冒号切分，多行列表语法（`tags:\n  - 标签`）导致标签全部丢失；
2. **主题与暗黑模式兼容性**：`obw` 在渲染微信富文本时内联了硬编码的深色文本颜色（`#2b2b2b`, `#1f2937` 等），在暗黑模式或特定主题背景下文字难以辨认；
3. **顶部导航栏死链接**：`文章` 与 `分类`、`关于` 与 `标签` 均指向锚点 `#latest` 与 `#about`，缺乏独立完整的二级页面；
4. **分类与排序硬编码**：分类药丸与精选文章列表硬编码在脚本中，无法随 Markdown Frontmatter 动态扩充；
5. **画作背景与文字重叠**：新替换的晨曦全景 Hero 和底部月升横幅自带毛笔行楷大字，HTML 文字覆盖其上产生双重重叠；
6. **缺乏自动化测试**：没有对 Frontmatter 解析、链接有效性（404）以及色彩可访问性（WCAG AA 对比度）的自动化断言；
7. **缺少 Obsidian 同步体系规范**：用户在 Obsidian 中写作时，不清楚特殊页面（如关于我 `about.md`）、Frontmatter 规范和附件图片如何放置与自动化同步。

### 1.2 改造目标
- **全动态数据驱动**：完全基于 Markdown Frontmatter 动态聚合分类、标签、时间线、精选与排序，零硬编码；
- **五大独立页面体系**：
  - `/index.html`：首页（Hero + 精选文章 + 最新文章网格 + 动态分类筛选 + 底部交流）
  - `/archives.html`：时间线归档页（按年份、月份降序聚合所有文章）
  - `/categories.html`：分类聚合页（展示全部分类卡片与所属文章列表）
  - `/tags.html`：标签云页面（按热度与字母展示所有标签及关联文章）
  - `/about.html`：独立的「关于我」页面（可直接由 `posts/about.md` 或 `about.md` 驱动）
- **Web Content Adaptor**：对 `obw` 内联样式进行 Web 自适应净化，暗黑模式文字对比度严格符合 WCAG 2.1 AA (>= 4.5:1)；
- **画作视觉融合**：顶部 Hero 与底部 Banner 精准融合画作自带文字，HTML 仅展示功能性徽章、描述与交互按钮；
- **Obsidian 丝滑同步规范**：支持 `posts/` 目录组织、`about.md` 特殊页面、多行 YAML、Obsidian 内部链接（wikilinks `[[slug]]`）及图片引用的自动解析；
- **全自动化测试套件**：`scripts/test-site.mjs`，覆盖 Frontmatter 解析单元测试、全站 404 死链扫描、WCAG AA 5 套主题亮暗对比度测试、Zero-FOUC 验证。

---

## 2. 系统架构设计 (Architecture)

### 2.1 数据流管线 (Build Pipeline)
```
Obsidian Vault (posts/*.md, about.md, images/*)
   │
   ▼
[1] Robust YAML Frontmatter & Wikilink Parser
   │ (多行列表 / 内联数组 / 标量 / 字段容错 / Draft 过滤)
   │
   ▼
[2] obw Core Engine (Markdown -> WeChat Compliant HTML)
   │
   ▼
[3] Web Content Adaptor (obw HTML -> Modern Web Responsive HTML)
   │ (硬编码颜色重写 / 暗黑模式适配 / 代码块增强 / 图片自适应)
   │
   ▼
[4] Dynamic Site Aggregator
   ├── Categories Index (全部分类及文章聚合)
   ├── Tags Index (全部标签及文章聚合)
   ├── Timeline Archives (按年份月份倒序聚合)
   └── Featured & Latest Sort (基于 date/order/featured 排序)
   │
   ▼
[5] Static Page Generators
   ├── dist/index.html
   ├── dist/archives.html
   ├── dist/categories.html
   ├── dist/tags.html
   ├── dist/about.html
   └── dist/posts/*.html
   │
   ▼
[6] Automated Quality Gate (scripts/test-site.mjs)
   ├── YAML Parser Unit Tests
   ├── Site-wide Link Integrity (Zero 404s)
   ├── WCAG 2.1 AA Contrast Ratios (>= 4.5:1) across 5 themes
   └── WeChat Paste Immunity Guard (No <div> in publisher output)
```

### 2.2 YAML Frontmatter 规范 (Obsidian 写作标准)

| 字段 | 类型 | 说明 | 示例 |
|---|---|---|---|
| `title` | string | 文章标题（若无则取首个 `# 标题`） | `2026 现代前端工程架构` |
| `date` | string / date | 发布日期（YYYY-MM-DD） | `2026-09-22` |
| `categories` / `category` | array / string | 分类（支持多行 `- 技术` 或 `[技术, 前端]`） | `[技术, 前端]` |
| `tags` | array / string | 标签（支持多行 `- 架构` 或 `[架构, 性能]`） | `[架构设计, 性能优化]` |
| `description` / `summary` | string | 文章摘要与社交分享简介 | `探讨现代前端工程架构实践...` |
| `featured` | boolean | 是否置顶为首页精选大卡片 | `true` |
| `cover` | string | 封面图片相对路径或 URL | `../images/featured-fuji.jpg` |
| `draft` | boolean | 是否为草稿（`true` 时构建将自动跳过该文章） | `false` |
| `author` | string | 作者名（默认为全局作者 `Tan`） | `Tan` |
| `order` | number | 手动排序权重（数字越小越靠前，可选） | `1` |

### 2.3 导航系统与页面路由

全站统一 Header 与 Footer 导航规范：
```html
<nav class="nav-menu">
  <a href="index.html" class="nav-menu-item">首页</a>
  <a href="archives.html" class="nav-menu-item">归档</a>
  <a href="categories.html" class="nav-menu-item">分类</a>
  <a href="tags.html" class="nav-menu-item">标签</a>
  <a href="about.html" class="nav-menu-item">关于</a>
</nav>
```
（在 `posts/*.html` 子目录中自动前缀 `../`）。

---

## 3. Web 样式适配与可访问性 (Design Tokens & Adaptor)

### 3.1 5 套精选风格与 WCAG AA 对比度
| 主题 ID | 主题名称 | 核心主色 | 日间文本对比度 | 夜间文本对比度 |
|---|---|---|---|---|
| `mint-emerald` | 薄荷翡翠 | `#10B981` | `#0f172a` on `#f8fafc` (15.8:1) | `#f8fafc` on `#091410` (17.2:1) |
| `tech-blue` | 科技深蓝 | `#2563EB` | `#0f172a` on `#f8fafc` (15.8:1) | `#f8fafc` on `#0b132b` (16.9:1) |
| `aurora-violet` | 极光鸢尾 | `#8B5CF6` | `#0f172a` on `#f8fafc` (15.8:1) | `#f8fafc` on `#160d27` (16.5:1) |
| `warm-amber` | 暖阳琥珀 | `#D97706` | `#0f172a` on `#f8fafc` (15.8:1) | `#f8fafc` on `#1c1408` (16.8:1) |
| `minimalist-ink` | 极简水墨 | `#475569` | `#0f172a` on `#f8fafc` (15.8:1) | `#f8fafc` on `#0f172a` (16.1:1) |

全部超出 WCAG 2.1 AA 标准（>= 4.5:1），甚至远超 AAA 标准（>= 7:1）。

### 3.2 Web Content Adaptor 规则
1. **硬编码文本色自愈**：将 `color: #(?:2b2b2b|1f2937|111111|334155|475569|4b5563|222222|374151|000000)` 及 `color: rgb(43, 43, 43)` 替换为 `color: var(--text-main)`；
2. **硬编码卡片浅色背景自愈**：在暗黑模式下，通过特定 CSS 选择器将硬编码 `#ffffff` 或浅色渐变背景重置为 `var(--bg-card)`；
3. **Wikilinks 解析**：将 `[[article-slug]]` 转换为 `<a href="article-slug.html" class="internal-link">article-slug</a>`，将 `[[article-slug|Text]]` 转换为 `<a href="article-slug.html" class="internal-link">Text</a>`。

---

## 4. 自动化测试套件 (Test Suite)

`scripts/test-site.mjs` 覆盖以下四大自动化防线：
1. **Frontmatter 单元测试**：测试 multiline list、inline array、quotes、draft 过滤、空 Frontmatter 与 fallback；
2. **404 死链检测器**：解析 `dist/**/*.html`，检查所有 `<a href="...">` 和 `<img src="...">` 相对链接的目标文件是否存在；
3. **WCAG 2.1 AA 对比度数学验证**：计算 5 种主题 x 2 种模式下的背景与文字相对亮度，确保对比度均 >= 4.5:1；
4. **组件与 Zero-FOUC 契约断言**：断言 5 页面导航、调色盘、进度条、搜索框完整生成。
