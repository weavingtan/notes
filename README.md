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

## ✍️ Obsidian 写作与同步规范

详细指南见：[`docs/OBSIDIAN_SYNC_GUIDE.md`](docs/OBSIDIAN_SYNC_GUIDE.md)。

每篇文章开头使用标准 YAML Frontmatter：

```yaml
---
title: 2026 现代前端工程架构：从出版级排版到全栈沉浸式体验
date: 2026-09-22
categories:
  - 技术
  - 前端工程
tags:
  - 架构设计
  - 性能优化
author: Weaving
description: 探讨现代前端工程实践与高定排版系统...
featured: true          # 设为 true 时作为首页精选大卡片
cover: images/fuji.jpg  # 封面配图相对路径
order: 1                # 可选手动排序权重 (越小越靠前)
draft: false            # 设为 true 时本地草稿，构建自动跳过
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
