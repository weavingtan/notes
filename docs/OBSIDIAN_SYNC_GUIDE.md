# Obsidian 写作与文章同步指南 (Obsidian Sync Guide)

本文档指导如何在 Obsidian 中撰写、管理文章与独立页面，并无缝同步到 `weavingtan/notes` 个人博客。

---

## 1. 目录结构与页面放置

在你的 Obsidian 知识库或本项目中，文件组织如下：

```text
weavingtan/notes/
├── posts/                      # 核心文章归档目录
│   ├── welcome.md              # 普通文章
│   ├── frontend-architecture.md
│   └── about.md                # [可选] 独立的「关于我」页面源文件！
├── images/                     # 文章插入的本地图片资源目录
│   ├── hero-bg.jpg             # 首页 Hero 大图
│   ├── bottom-banner.jpg       # 底部月升夜景大图
│   └── my-photo.png            # 你的个人头像或配图
├── package.json
└── scripts/
    ├── build.mjs               # 编译引擎（支持全动态聚合）
    └── test-site.mjs           # 自动化回归测试
```

### 1.1 独立页面（关于我 / About Me）
- 如果你在 `posts/about.md` 或根目录 `about.md` 中编写了关于我的介绍，构建脚本会自动读取该 Markdown 并调用 `obw` 出版引擎渲染为美观的 `/about.html`！
- 如果没有提供 `about.md`，构建引擎会自动使用预设的精美关于我模板（包含个人简介、技术栈标签、项目卡片与联系方式）。

---

## 2. 文章 Frontmatter 规范 (YAML)

每篇放在 `posts/` 目录下的 `.md` 文件顶部均推荐使用 YAML Frontmatter 标注文档元信息：

```yaml
---
title: 2026 现代前端工程架构：从出版级排版到全栈沉浸式体验
date: 2026-09-22
categories:
  - 技术
  - 前端
tags:
  - 架构设计
  - 性能优化
  - TypeScript
author: Weaving
description: 探讨如何在前端技术极度碎片化的今天打造兼顾微秒级首屏与全端自适应的现代化架构。
featured: true          # 可选：设为 true 时在首页展示为置顶精选大卡片
cover: images/fuji.jpg  # 可选：文章卡片封面图（支持相对路径或网络 URL）
draft: false            # 可选：设为 true 时构建时自动跳过（本地草稿状态）
order: 1                # 可选：指定排序权重（数字越小越靠前）
---
```

> 💡 **小贴士**：
> - `categories` 既支持多行列表（`- 技术`），也支持内联数组 `[技术, 前端]` 或单值 `category: 技术`。
> - 如果没有填写 `categories`，引擎会自动将第一个 `tag` 作为分类，若都没有则归为 `未分类`。
> - 首页顶部的分类药丸按钮会根据所有文章的 `categories` **自动动态生成**，无需手动修改任何代码！

---

## 3. Obsidian 特殊语法支持

1. **Obsidian 内部双链 (Wikilinks)**：
   - 语法：`[[frontend-architecture-2026]]` 或 `[[frontend-architecture-2026|阅读现代前端架构]]`
   - 效果：自动转为站内文章链接 `<a href="frontend-architecture-2026.html">`，跨文章索引顺畅无阻。
2. **Obsidian 标注块 (Callouts)**：
   - 语法：`> [!NOTE]`、`> [!TIP]`、`> [!WARNING]` 等
   - 效果：`obw` 引擎直接编译为微信/Web 响应式高颜值卡片。
3. **高级图文排版指令**：
   - `:::hero[...]`、`:::summary[...]`、`:::cards[...]`、`:::quote[...]` 等 37+ 微信出版级排版指令完整支持！

---

## 4. 一键构建与本地预览

在终端中执行：

```bash
# 1. 执行全量构建与自动化回归测试
npm test

# 2. 本地实时预览
npm run serve
# 浏览器访问 http://localhost:3000 查看效果
```

推送至 GitHub 仓库（`git push origin main`）后，GitHub Actions 会在 30 秒内自动完成编译并更新部署到 GitHub Pages。
