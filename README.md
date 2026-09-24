# Weaving's Notes - 个人数字花园与出版级文章站

基于 [Obsidian WeChat Publisher (obw)](https://github.com/weavingtan/obw) 驱动的个人 Notes 静态站点。
所有文章通过 GitHub Actions 自动构建部署至 GitHub Pages，与微信公众号排版保持 100% 视觉对齐，同时专为宽屏阅读打造了高颜值响应式体验与独立页面体系。

---

## 🌟 核心特色

- **出版级美学排版**：100% 承接公众号 37 个全能高级视觉指令（指标、卡片、对比、图表、引用、金句、步骤流等）；
- **五套高定全站风格**：薄荷翡翠 (默认)、科技深蓝、极光鸢尾、暖阳琥珀、极简水墨，支持 Zero-FOUC 零闪烁秒切；
- **优雅暗黑模式**：WCAG 2.1 AA 数学对比度认证 (文本对比度高达 17:1)，彻底根治公众号内联深色文字在夜间看不清的兼容性问题；
- **五大独立核心页面体系**：
  - `首页` (`/index.html`)：编辑部杂志流式排版 (Hero 三列主角区 + FEATURED 精选大图 + SELECTED 垂直流 + ARCHIVE 全景纵览 + ABOUT ME 个人印记)
  - `文章` (`/articles.html`)：双栏流式排版（左侧分类专题导航与灵感卡片 + 右侧最新/最热/精选条目流）
  - `归档` (`/archives.html`)：按年份反思与月份垂直虚线时间轴索引
  - `分类` (`/categories.html`)：基于 Frontmatter 动态聚合的全站分类探索
  - `关于` (`/about.html`)：编辑部画像版式作者档案与信条页面（支持直接由 Obsidian `posts/about.md` 驱动，正文由 obw 引擎渲染后注入编辑部版式）
- **动态数据驱动**：分类药丸、文章排序、精选推荐全部 100% 由 Markdown Frontmatter 动态计算，零硬编码；
- **Obsidian 深度互通**：支持 Obsidian 内部双向链接（`[[slug|标题]]`）、多行 YAML 语法、Callouts 标注块与特殊页面一键生成；
- **微信生态闭环**：文末自动附带公众号一键关注与引流卡片，建立个人长青知识资产与私域沉淀；
- **RSS 2.0 订阅**：构建时自动生成 `dist/feed.xml`（绝对 URL + XML 转义，取 frontmatter 原文，不会双重转义），并在全站每页 `<head>` 输出 `rel="alternate"` 自动发现链接；
- **严苛质量门禁**：内置 `npm test` 自动化测试套件（16 大门禁涵盖 YAML 单元测试、全站 404 死链扫描、WCAG AA 色彩对比度断言、微信防塌陷 0 div 检查）。

---

## 📂 页面体系与目录规范

```text
weavingtan/notes/
├── posts/                      # 核心文章归档目录
│   ├── welcome.md              # 普通博客文章
│   ├── frontend-arch.md
│   └── about.md                # [可选] 独立的「关于我」页面源文件！
├── images/                     # 文章插入的本地图片资源目录
│   ├── hero-bg.jpg             # 首页晨曦 Hero 全景壁纸 (1774 x 887)
│   ├── bottom-banner.jpg       # 底部月升夜景互动横幅 (2103 x 748)
│   ├── featured-fuji.jpg       # 精选文章封面
│   └── wechat-qr.png           # 公众号二维码
├── docs/
│   ├── OBSIDIAN_SYNC_GUIDE.md  # 详细的 Obsidian 写作与同步实战指南
│   └── superpowers/specs/      # 站点全系统架构设计规范
├── scripts/
│   ├── build.mjs               # 核心构建流水线 (含 Web Content Adaptor)
│   └── test-site.mjs           # 全套自动化测试套件 (404 扫描 / 对比度 / 免疫力)
└── package.json
```

---

## ✍️ Obsidian 写作属性与同步全景规范

详细实战指南见：[`docs/OBSIDIAN_SYNC_GUIDE.md`](docs/OBSIDIAN_SYNC_GUIDE.md)。

系统（**Obsidian 插件 `obw`** + **静态站构建引擎 `notes`**）能够智能识别以下 **4 大类** 笔记属性与正文语法：

### 1. 核心文章元数据（微信草稿 + 个人网站 双端通用）

无论在发布到微信公众号草稿箱，还是发布到个人网站时，以下属性均被原生识别并消费：

| 属性名 (Key) | 别名 / 容错 | 类型 | 作用与呈现效果 |
| :--- | :--- | :--- | :--- |
| **`title`** | 首个 `# 一级标题` / 笔记文件名 | 字符串 | **文章标题**。同步至微信草稿箱标题；个人网站文章 H1、页面 `<title>`、SEO Meta 标签。 |
| **`date`** | 文件创建时间 | 日期 (`YYYY-MM-DD`) | **发布日期**。决定全站时间线排序、归档页年份归类与时间轴月份气泡展示。 |
| **`author`** | 插件默认作者 / 站点配置作者 | 字符串 | **文章作者**。同步至微信公众号作者署名；网站详情页徽章 `作者: Tan`。 |
| **`description`** | `digest`, `summary` | 字符串 | **文章摘要/引言**。同步至微信草稿摘要栏；网站详情页引言卡片、列表页预览、全局搜索索引。 |
| **`cover`** | `banner`, 正文首图 | 相对路径 / URL | **封面大图**。微信草稿封面素材；网站文章详情页宽幅头图、首页与归档页画报缩略图。 |
| **`categories`** | `category` | 列表 `[A, B]` 或 单值 | **分类归类**。在网站「分类」与「文章」页流式归档；若未填写，自动回退到首个 tag 或「未分类」。 |
| **`tags`** | `tag`, Obsidian `#标签` | 列表 `[A, B]` 或 单值 | **文章标签**。个人网站标签过滤器、详情页底部标签胶囊、全局搜索关键词。 |

### 2. 个人网站专属控制属性（站点展示与排序）

| 属性名 (Key) | 可选值 | 说明 |
| :--- | :--- | :--- |
| **`featured`** | `true` / `false` | **首页置顶推荐**。设为 `true` 的文章会自动作为首页第二章的 `FEATURED ——` 巨幕精选画报展示。 |
| **`draft`** | `true` / `false` | **草稿免发布过滤**。设为 `true` 时，网站构建引擎会**自动跳过该文件**，不编译生成公开网页。 |
| **`order`** | 整数 (如 `1`, `2`) | **置顶权重排序**。数字越小越靠前，排序优先级高于常规按发布日期倒序。 |

### 3. 全站动态化灵魂配置（在 `posts/about.md` 或 `posts/site.md` 中专属识别）

- **`nav`**：全局顶栏与底栏动态导航菜单（`label`, `href`, `key`）
- **`personal_info`**：关于页档案卡片开放键值对（支持自由追加任意字段，如 `坐标`, `职业`, `状态`, `邮箱`, `GitHub`, `微信`, `喜欢` 等）
- **`social_links`**：全站底栏社交图标矩阵（`platform`, `title`, `href`）
- **`pages`**：各大页面文案与标语定制（`pages.home`, `pages.articles`, `pages.archives`, `pages.about`, `pages.comm_banner`）

### 4. 正文特定 Obsidian 语法支持

- **Obsidian 双链配图**：`![[image.png]]` 或 `![[photo.jpg|400]]`，发布至个人网站时自动提取二进制图片并转换为相对路径，发布至微信时自动转存至微信 CDN；
- **标准 Markdown 图片**：`![alt](images/pic.png)` 或 在线图片；
- **Callout 标注框**：`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]` 等；
- **31 个微信出版级排版模块**：如 `:::cards[...]`, `:::hero[...]`, `:::quote[...]`, `:::specs[...]` 等。

---

## ⚡ 如何在 Obsidian 中一秒快速插入此模板？

已在您的 Obsidian 库中配置了专属模板文件：
- **Templater 专属（推荐）**：`Templates/文章发布属性模板.md`（支持 `⌥E` 秒插并动态计算标题与日期）
- **Obsidian 原生模板**：`Templates/文章发布属性模板(原生Templates).md`

### 方式一：Templater 插件（快捷键 `⌥E`，最快最智能）
1. 在笔记编辑区按下快捷键 **`⌥E`**（Mac Option + E）；
2. 选择 **`文章发布属性模板`**；
3. 模板中的 `<% tp.file.title %>` 会**自动替换为当前笔记文件名**，`<% tp.date.now('YYYY-MM-DD') %>` 会**自动替换为当天日期**（如 `2026-09-24`）！

> ⚠️ **避坑提示**：如果您习惯使用 `⌥E` (Templater)，必须使用 `<% tp... %>` 语法。如果写成 `{{title}}`，Templater 不会解析，会直接作为字面量插入。

### 方式二：Obsidian 原生模板（`⌘P` → 插入模板）
1. 在空白笔记中按下 **`⌘P`**（Windows 为 `Ctrl+P`）呼出命令面板；
2. 输入 **`插入模板`**（或 `Insert template`）并回车；
3. 选择 **`文章发布属性模板(原生Templates)`**；
4. 其中的 `{{title}}` 和 `{{date}}` 将由 Obsidian 原生模板引擎替换。

### 方式三：Obsidian 官方属性面板 (Properties)
在笔记最开头直接输入三个横杠 `---` 并回车，Obsidian 会自动呈现可视化的属性卡片。

> ⚠️ **布尔值防坑**：在 YAML Frontmatter 中，`featured: false` 和 `draft: false` 行末**严禁直接加行末注释 `#...`**（如 `featured: false # 注释`），否则 Obsidian 的属性图形面板会误将整串字符识别为非空字符串，导致复选框自动被勾选为 `true`！

---

### 📋 Templater 推荐模板源码 (`Templates/文章发布属性模板.md`)

```yaml
---
title: "<% tp.file.title %>"
date: "<% tp.date.now('YYYY-MM-DD') %>"
author: "Tan / Weaving"
description: "用简短的一两句话概括文章核心思想，这会出现在微信摘要和网站引言卡片中。"
cover: "images/featured-fuji.jpg"
categories:
  - 随笔
tags:
  - 思考
  - 创作
featured: false
draft: false
order: 1
---
```

---

## 🛠️ 本地预览与回归测试

```bash
# 1. 安装依赖
npm install

# 2. 执行全量构建与自动化回归测试 (16 大测试套件全部通过方可提交)
npm test

# 3. 本地启动服务预览
npm run serve
# 浏览器访问 http://localhost:3000 查看全部页面
```

---

## 🚢 自动化持续交付 (CI/CD)

项目在 `.github/workflows/deploy.yml` 中配置了 GitHub Actions 持续交付流水线：
每次将修改推送到 `main` 分支后，GitHub Actions 会自动运行 `npm test` 进行全套单元测试、死链扫描与构建，并自动部署到 GitHub Pages。
