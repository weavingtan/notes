# Obsidian 写作与个人网站一键发布全能指南 (Obsidian Sync & Publishing Guide)

本文档为你在 Obsidian 中撰写文章、维护全站配置、实现「微信公众号 + 个人博客」一键双轨同步分发的完整操作指南。

---

## 目录
1. [快速上手：三步打通 Obsidian 与个人网站](#1-快速上手三步打通-obsidian-与个人网站)
2. [写作规范与 Frontmatter 元数据](#2-写作规范与-frontmatter-元数据)
3. [在 Obsidian 中维护全站动态配置 (about.md)](#3-在-obsidian-中维护全站动态配置-aboutmd)
4. [双轨一键发布工作流（微信草稿 + 个人博客）](#4-双轨一键发布工作流微信草稿--个人博客)
5. [图片处理与本地附件自动上传机制](#5-图片处理与本地附件自动上传机制)
6. [高级排版指令与沉浸式阅读体验](#6-高级排版指令与沉浸式阅读体验)
7. [常见问题与容错机制](#7-常见问题与容错机制)

---

## 1. 快速上手：三步打通 Obsidian 与个人网站

通过 `obw` 插件的 **GitHub REST API** 引擎，你的 Obsidian 笔记即使存放在 iCloud 中，也能实现原子化云端提交，**完全不需要在电脑上配置 Git、SSH Key 或执行命令行**，在 iPad / iPhone 移动端也能一键发布！

### 第一步：获取 GitHub Token (仅需配置一次)
1. 访问 GitHub 个人设置：[GitHub Personal Access Tokens](https://github.com/settings/tokens)；
2. 点击 **Generate new token (classic)**；
3. Note 填写 `Obsidian-Notes-Publisher`，Expiration 选择 90 天或永久；
4. 勾选权限范围 **`repo`**（包含所有子项）；
5. 点击页面底部绿色按钮生成，并复制生成的令牌（以 `ghp_` 开头）。

### 第二步：在 Obsidian 中配置插件
1. 打开 Obsidian 设置面板，在左侧找到 **Obsidian WeChat Publisher (obw)**；
2. 向下滚动至 **「个人网站 (GitHub Pages) 部署」** 区域：
   - **启用个人网站同步**：开启 `[ON]`；
   - **GitHub 个人访问令牌 (Token)**：粘贴第一步获取的 `ghp_...` 令牌；
   - **仓库名 (Repo)**：填入 `weavingtan/notes`（或你的网站仓库名）；
   - **目标分支 (Branch)**：保持默认 `main`；
   - **文章保存目录**：保持默认 `posts`；
   - **配图保存目录**：保持默认 `images`；
   - **发布草稿时默认勾选同步**：开启 `[ON]`。

### 第三步：点击发布即可自动上线
在 Obsidian 中写好文章后，点击顶部工具栏的 **「发布到微信草稿箱」** 按钮，弹窗中会默认同时勾选 `[√] 微信公众号` 与 `[√] 个人网站 (weavingtan/notes)`。点击确认，Markdown 正文与本地配图将瞬间同步推送到 GitHub，触发 Actions 在 30 秒内完成全网更新部署！

---

## 2. 写作规范与 Frontmatter 元数据

每篇放在 `posts/` 目录下的文章均支持使用标准 YAML Frontmatter 声明元数据：

```yaml
---
title: 2026 现代前端工程架构：从出版级排版到全栈沉浸式体验
date: 2026-09-22
categories:
  - 技术
  - 架构
tags:
  - TypeScript
  - 前端
  - 性能优化
author: Tan
description: 探讨如何在前端技术碎片化的今天打造兼顾微秒级首屏与全端自适应的现代化架构。
featured: true          # 设为 true 时，首页 Chapter 2 将其作为置顶精选大图展示
cover: images/daily/hero.webp  # 封面图（支持本地图片相对路径或网络 URL）
order: 1                # 排序权重（数字越小在精选列表中越靠前）
draft: false            # 设为 true 时构建引擎自动跳过（本地草稿）
---
```

### 💡 智能自愈规则：
- **分类与标签完全解耦**：`categories` 支持列表语法或单值。未填分类时，系统会自动提取第一个 `tag` 作为分类；若皆未填，自动归入 `随笔`。
- **全站动态分类药丸**：首页 Hero 右侧、归档页右侧、文章页侧栏均**全自动提取全站真实存在的分类**，增减文章自动更新分类列表，无需手动改代码！

---

## 3. 在 Obsidian 中维护全站动态配置 (about.md)

除了单篇文章，你可以在 Obsidian 中直接打开并维护 **[`posts/about.md`](file:///Users/weaving/www/notes/posts/about.md)**。其顶部的 YAML Frontmatter 充当全站的控制中心：

```yaml
---
title: 站点配置与关于我 (Site Settings)

# === 1. 顶部与页脚全局导航（自由增减、改名或调整排序） ===
nav:
  - { label: "首页", href: "index.html", key: "home" }
  - { label: "文章", href: "articles.html", key: "articles" }
  - { label: "归档", href: "archives.html", key: "archives" }
  - { label: "分类", href: "categories.html", key: "categories" }
  - { label: "关于", href: "about.html", key: "about" }

# === 2. 个人档案开放键值对（支持自由添加任意条目！） ===
# 自动生成关于我与首页作者印记，包含邮箱识别、外链高亮
personal_info:
  坐标: "北京 · 朝阳"
  职业: "全栈架构师 / 产品设计师"
  状态: "🌱 正在深度打磨数字花园与出版排版"
  邮箱: "tan@example.com"
  GitHub: "https://github.com/weavingtan"
  微信: "weaving_tan"
  喜欢: "架构演进、开源、阅读、摄影、咖啡"

# === 3. 社交矩阵开放列表（支持自定义平台、图标、文案与链接） ===
social_links:
  - { platform: "mail", title: "发送邮件", href: "mailto:tan@example.com" }
  - { platform: "rss", title: "RSS 订阅", href: "feed.xml" }
  - { platform: "github", title: "GitHub 主页", href: "https://github.com/weavingtan" }
  - { platform: "about", title: "关于我", href: "about.html" }

# === 4. 各大页面文案与标语（支持 Markdown 行内语法） ===
pages:
  home:
    hero_headline: "记录设计、技术，以及那些值得思考的事。"
    hero_subheadline: "I write about design, technology and everything in between."
    hero_cta: "READ MORE →"
    archive_quote: "时间会筛选出真正重要的东西。"
  articles:
    title: "文章 · 思考与沉淀"
    subtitle: "探索体系化思考与技术实现的交汇点。按主题聚类的长文脉络，记录架构设计、工程实践与生活感悟。"
    sidebar_quote: "写作，是我与世界对话的方式。"
    sidebar_signature: "Tan"
  archives:
    title: "归档 · 时间里的思考"
    subtitle: "时间会筛选出真正重要的东西。在这里，按时间脉络归档记录所有关于架构思考、工程设计与生活哲学的文字足迹。"
    # 动态年份反思库：支持未来任意年份自由追加！
    reflections:
      "2026": "这一年，我更关注生活的质感与思考的深度。重构感知，在代码与文字间探寻数字世界的温度与秩序。"
      "2025": "在代码与现实的交织中寻找秩序，沉淀关于架构、设计与自我成长的答案。"
      "2024": "探索未知与可能，跨越不同技术栈的边界，以文字作为思考的锚点与心智的索引。"
  about:
    hero_title: "你好，我是 Tan。<br>一个喜欢思考、记录和创造的人。"
    hero_subtitle: "在技术的演进中寻找确定性，在设计的克制中注入温度。这里是我的个人思考集散地，记录架构、产品、生活与长期主义实践。"
    banner_title: "在生活的缝隙里，寻找热爱的方向。"
    banner_subtitle: "写下思考 · 记录成长 · 分享生活"
    banner_cursive: "Better Things Ahead"
  comm_banner:
    title: "与我交流"
    desc: "如果你对文章有任何想法，或者有技术、产品、生活方面的问题，欢迎在评论区留言，或通过其他方式联系我。"
---

# 关于我正文内容
在此下方书写的任何 Markdown 正文，都会被 obw 出版级排版引擎渲染在「关于我」页面的核心画报区域！
```

> 🛡️ **零配置自愈保证**：
> 如果你在 Obsidian 中将上述部分字段删掉，构建引擎会自动回退到系统内置默认数据，**100% 杜绝白板或编译失败**。

---

## 4. 双轨一键发布工作流（微信草稿 + 个人博客）

在日常写作中，你有两种发布途径：

### 途径 A：发布微信时同时同步个人网站（主流推荐）
1. 在 Obsidian 中打开准备发布的文章；
2. 点击右侧预览面板或顶部菜单的 **「发布到微信草稿箱」**；
3. 弹出确认模态框，勾选：
   - `[√] 微信公众号 (已绑定公众号)`
   - `[√] 个人网站 (weavingtan/notes)`
4. 点击 **「确认发布」**：
   - 步骤 1/3：上传微信永久素材并转存腾讯 CDN；
   - 步骤 2/3：生成微信公众号官方草稿；
   - 步骤 3/3：提取配图并提交至 GitHub 仓库（触发 GitHub Actions 自动更新网站）。

### 途径 B：单独更新个人网站（无需打扰公众号）
如果你写了一篇技术笔记或微型随笔，只想放在个人博客而不发布公众号：
1. 按下快捷键 `Cmd + P`（Windows 为 `Ctrl + P`）唤起 Obsidian 命令面板；
2. 输入并执行：`WeChat Publisher: 部署当前文章到个人网站 (GitHub Pages)`；
3. 插件会直接通过 GitHub REST API 提交该文章与配图，右上角弹出成功提示。

---

## 5. 图片处理与本地附件自动上传机制

1. **粘贴即用**：在 Obsidian 中直接粘贴截图（Obsidian 会保存在你的 `attachments/` 目录中）；
2. **格式放行**：完美支持 Markdown 标准图片 `![](attachments/image.png)` 与 Obsidian 双链图片 `![[image.png]]`；
3. **路径自动重写**：`obw` 在推送至 GitHub 时，会自动读取本地图片二进制流，重命名后写入网站仓库的 `images/` 目录，并将 Markdown 中的引用路径转换为相对路径 `../images/xxx.png`；
4. **外链图片安全放行**：网络图片（以 `http://` 或 `https://` 开头）直接保留，不会重复上传，节省流量与仓库空间。

---

## 6. 高级排版指令与沉浸式阅读体验

### 6.1 Zen 出版级沉浸式阅读系统
部署在个人博客的所有文章，读者在阅读时可获得媲美顶级读物出版物的体验：
- **快捷键 `Z`**：敲击键盘字母 `z` 瞬间进入/退出全屏专注模式；
- **字号无极缩放**：右下角悬浮控制坞支持 `A- / A+` 在 `15px ~ 20px` 间无极切换；
- **版心模式**：一键在 `680px`（窄版聚焦）与 `840px`（宽版呼吸感）间切换；
- **实时阅读胶囊**：右上角动态展示阅读百分比与预估剩余阅读分钟数；
- **偏好记忆**：读者的字号与版心选择会自动保存在本地浏览器 `localStorage` 中。

### 6.2 37+ 微信出版级排版指令 100% 兼容
所有在微信中效果惊艳的高级指令，在个人网站中完全同款呈现：
- **摘要卡片**：`:::summary[...]`
- **引言名句**：`:::quote[...]`
- **步骤动作流**：`:::steps[...]`
- **人物卡片**：`:::people[...]`
- **数据指标**：`:::specs[...]`
- **3D 翻转拍立得**：在首页与底栏实时呈现每日金句与 Bing 4K 场景故事！

---

## 7. 常见问题与容错机制

**Q: 提交后多久能在个人网站上看到？**  
A: GitHub Actions 通常在 **25 ~ 40 秒** 内完成构建部署。可在仓库的 `Actions` 标签页查看实时构建日志。

**Q: 每日壁纸多长时间自动更新？**  
A: 仓库内配置了 GitHub Actions 定时任务，每天北京时间早晨 **08:00** 自动拉取 Bing 最新的 5 场景 4K 壁纸并进行 WebP 压缩更新。

**Q: 如果没有外网环境，能先在本地测试吗？**  
A: 可以！在本地运行：
```bash
# 执行全量构建与自动化回归测试 (17 套门禁 100% 通过)
npm test

# 启动本地热重载预览服务器
npm run serve
# 浏览器访问 http://localhost:3000
```
