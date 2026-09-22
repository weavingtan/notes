# Weaving's Notes - 个人数字花园与出版级文章站

基于 [Obsidian WeChat Publisher (obw)](https://github.com/weavingtan/obw) 驱动的个人 Notes 静态站点。
所有文章通过 GitHub Actions 自动构建部署至 GitHub Pages，与微信公众号排版保持 100% 视觉对齐，同时专为宽屏阅读打造了高颜值响应式体验。

## 🌟 核心特色

- **出版级美学排版**：100% 承接公众号 37 个全能高级视觉指令（指标、卡片、对比、图表、引用、金句、步骤流等）；
- **优雅暗黑模式**：纯正深色美学，随系统偏好自动切换，支持平滑一键切换并记住偏好；
- **智能随动目录 (TOC)**：桌面端右侧配备 ScrollSpy 浮动目录，实时追踪长文阅读进度；
- **双端自适应**：手机端（375px~430px）如同微信文章般精致轻巧，桌面端与 iPad 端自动舒展为多列流体卡片；
- **微信生态闭环**：文末自动附带公众号一键关注与引流卡片，建立个人私域沉淀；
- **GitHub Actions 零配置自动化**：在 Obsidian 中点击发布草稿，自动提交 Markdown 与配图，GitHub Pages 自动编译上线。

---

## 🚀 快速初始化指南（部署到你的 GitHub）

### 步骤 1：在 GitHub 创建个人主页仓库
1. 打开 GitHub，点击 **New repository**；
2. 仓库名填写：`weavingtan.github.io`（直接绑定你的 GitHub 顶级域名）；
3. 权限选择 **Public**。

### 步骤 2：推送本模版至该仓库
在本地打开终端，进入本模版目录：
```bash
cd templates/notes-site
git init
git branch -M main
git remote add origin git@github.com:weavingtan/weavingtan.github.io.git
git add .
git commit -m "feat: initialize notes site with obw engine"
git push -u origin main
```

### 步骤 3：开启 GitHub Pages 权限
1. 打开你的 GitHub 仓库 `weavingtan.github.io`；
2. 进入 **Settings** → **Pages**；
3. 在 **Build and deployment** 下的 **Source** 下拉框中，选择 **GitHub Actions**。

等待 1 分钟左右，GitHub Actions 构建完毕后，你的个人网站即会在：
👉 `https://weavingtan.github.io` 正式上线！

---

## ✍️ 日常写作与发布规范

### 1. 写作格式示例 (`posts/my-new-post.md`)
每篇文章开头可添加标准 Frontmatter：
```markdown
---
title: 深入探讨现代前端工程架构
date: 2026-09-22
tags: [前端, 架构, 思考]
author: Weaving
description: 本文梳理模块化设计与微前端的落地实战。
---

:::hero[前端工程化新范式]
subtitle | 从打包器演进看 Web 开发未来十年的趋势
:::

正文内容...
```

### 2. 放置本地配图 (`images/`)
在 Markdown 中引用配图时，使用相对路径：
```markdown
![架构拓扑图](../images/arch.png)
```
将 `arch.png` 放入 `images/` 目录即可，构建脚本会自动将其同步到静态站点产物中。

---

## 🛠️ 本地预览调试

```bash
# 1. 安装依赖（支持通过 GitHub 仓库引用 obw）
npm install

# 2. 编译生成静态站点 (输出至 dist/)
npm run build

# 3. 本地启动服务预览
npm run serve
```
