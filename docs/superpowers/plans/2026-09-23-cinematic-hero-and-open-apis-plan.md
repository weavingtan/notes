# 电影感沉浸巨幕、人文排版与全栈开放 API 体系实施计划

> **参考设计规格书**: [`docs/superpowers/specs/2026-09-23-cinematic-hero-and-open-apis-design.md`](file:///Users/weaving/www/notes/docs/superpowers/specs/2026-09-23-cinematic-hero-and-open-apis-design.md)  
> **核心目标**:
> 1. 修复 GitHub Actions 部署报错 (`ERR_MODULE_NOT_FOUND yaml`) 并建立代码级零依赖防御；
> 2. 搭建 Jamstack 零运行时开销的开放 API 数据管线（气象/时辰、GitHub 真实脉搏、历史上的今天、黑胶心境、每日金句）；
> 3. 升级人文出版宋体 (Noto Serif SC) 与现代杂志衬线 (Newsreader)，消除分类与标签页顶部死白；
> 4. 实现首页、归档、分类、关于四大主页面 100vw 全宽电影感沉浸巨幕 (Cinematic Full-Bleed Hero)；
> 5. 落地 3D 拟物黑胶唱片组件与 Raycast 级 Command Palette (Cmd+K) 原生指令中心；
> 6. 扩充自动化测试套件至 18 个并达成 100% 验收与 GitHub Pages 部署闭环。

---

### Task 1: GitHub Actions CI 修复与零依赖解析防御加固
**涉及文件**: `.github/workflows/deploy.yml`, `scripts/build.mjs`, `package.json`
- [ ] 修复 `.github/workflows/deploy.yml`：在 `Setup Node.js` 之后立即添加 `npm ci` 安装依赖步骤。
- [ ] 改造 `scripts/build.mjs`：
  - 移除顶层静态 `import YAML from "yaml";` 强依赖；
  - 复用现有的纯原生零依赖 Frontmatter 行解析引擎，即使裸机未安装 `node_modules` 也 100% 成功构建；
- [ ] 运行 `node scripts/build.mjs` 验证裸机兼容性与零报错。

---

### Task 2: 开放 API 数据管线扩展与静态资产生成器
**涉及文件**: `scripts/fetch-daily-assets.mjs`, `data/*.json`
- [ ] 升级 `scripts/fetch-daily-assets.mjs`：
  - 接入 **Open-Meteo API** 获取真实气象与气温，并结合当前时间生成中国传统二十四节气与十二时辰 -> 输出 `data/weather.json`；
  - 接入 **GitHub Public Events API** 获取用户最新公开提交（仓库、commit message、时间）-> 输出 `data/github-pulse.json`；
  - 接入 **Wikimedia On-This-Day API** 获取历史上的今天精选事件 -> 输出 `data/on-this-day.json`；
  - 配置策展 **黑胶唱片听觉心境数据** -> 输出 `data/vinyl.json`；
  - 保持 Hitokoto 每日一言与 Bing 每日壁纸管线；
  - 为所有外部接口包裹 4000ms 超时截断与本地静态兜底，离线构建 100% 免疫。
- [ ] 运行 `node scripts/fetch-daily-assets.mjs` 初始化并生成数据。

---

### Task 3: 字体排版美学与死白消除 (Noto Serif SC + Newsreader + 策展印记)
**涉及文件**: `scripts/build.mjs`, `scripts/test-site.mjs`
- [ ] 在 `BASE_CSS` 中引入 Google Fonts: `Noto Serif SC` (400, 500, 700) 与 `Newsreader` (400, 400i)；
- [ ] 声明全局字体变量：`--font-serif-cn`, `--font-serif-en`, `--font-mono`；
- [ ] 重构引用金句样式，将“保持好奇，保持温柔。”替换为出版级宋体 + 经典中文引号「」；
- [ ] 彻底重构分类与标签页顶部右侧排版：
  - 消除原有单一英文上方的大块死白；
  - 重构成「每日策展印记」：顶部时辰气象胶囊 + 中部双语名言金句 + 底部虚线刻度与经纬度坐标。

---

### Task 4: 四大主页面 100vw 电影感全宽沉浸巨幕 (Cinematic Full-Bleed Hero)
**涉及文件**: `scripts/build.mjs`, `scripts/test-site.mjs`
- [ ] 在 `BASE_CSS` 中定义 `.cinematic-hero-bleed` 样式（`width: 100vw; margin-left: calc(50% - 50vw);` 配合全局 `overflow-x: hidden`）；
- [ ] 首页重构：将 `.editorial-hero` 升级为 100vw 电影巨幕横幅，融入真实暗调摄影、GitHub 脉搏动态点与时辰气象；
- [ ] 归档页重构：将 `.archive-hero` 升级为 100vw 电影巨幕横幅，融入 Wikimedia 历史上的今天诗意印记；
- [ ] 分类与标签页重构：顶栏升级为 100vw 全宽沉浸横幅；
- [ ] 关于页重构：顶栏升级为 100vw 全景工作台横幅；
- [ ] 微信排版硬约束复核：所有容器 100% `<section style="box-sizing: border-box;">`，严禁 `<div>`。

---

### Task 5: 3D 拟物黑胶唱片组件与真实 GitHub 脉搏落地
**涉及文件**: `scripts/build.mjs`, `scripts/test-site.mjs`
- [ ] 在 `BASE_CSS` 中实现纯 CSS 3D 拟物黑胶卡片样式（封套 Jacket + 悬浮向右滑出 32px 并 33 RPM 旋转的黑胶盘 Vinyl LP）；
- [ ] 在关于页中集成黑胶心境卡片；
- [ ] 在分类页侧边栏下方注入黑胶唱片；
- [ ] 在首页状态指示器与关于页注入真实的 GitHub 活跃提交信息与 Sparkline 脉搏。

---

### Task 6: Raycast 级 Command Palette (Cmd+K) 原生指令中心
**涉及文件**: `scripts/build.mjs`, `scripts/test-site.mjs`
- [ ] 在桌面端顶栏导航注入 `⌘K 搜索与指令...` 触发胶囊；
- [ ] 在页面末尾注入 Command Palette 模态 DOM 结构（全 `<section>` 结构，毛玻璃滤镜背景）；
- [ ] 编写原生零依赖客户端交互脚本：
  - 快捷键监听：`Cmd+K` / `Ctrl+K` 唤起，`Esc` 退出；
  - 键盘导航：`↑` `↓` 移动高亮项，`Enter` 执行跳转或操作；
  - 文章模糊搜索：即时过滤匹配 `dist/search-index.json`；
  - 快捷指令执行：切换暗色/浅色、切换 5 套主题色、切换 Zen 沉浸阅读、复制链接、复制 RSS。

---

### Task 7: 自动化测试套件扩充 (18 套件) 与全端部署验证
**涉及文件**: `scripts/test-site.mjs`
- [ ] 编写测试套件 14: 100vw 全宽 Hero 视觉架构断言；
- [ ] 编写测试套件 15: 人文出版字体与死白消除断言；
- [ ] 编写测试套件 16: 开放 API 资产与数据注入断言；
- [ ] 编写测试套件 17: Command Palette 架构与交互断言；
- [ ] 编写测试套件 18: 离线构建与零依赖容错断言；
- [ ] 运行 `npm test` 确保 18 个测试套件 100% 通过；
- [ ] 提交代码并推送到 `origin main`，触发 GitHub Actions 验证云端 CI 成功构建与 Pages 部署。
