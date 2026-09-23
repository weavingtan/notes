# 全站 Markdown 动态化、多源每日壁纸管线与 Zen 沉浸式阅读系统实施计划

> **参考设计规格书**: [`docs/superpowers/specs/2026-09-23-site-dynamic-and-immersive-reading-design.md`](file:///Users/weaving/www/notes/docs/superpowers/specs/2026-09-23-site-dynamic-and-immersive-reading-design.md)  
> **核心目标**:
> 1. 构建 Sharp WebP 多源壁纸管线，覆盖 5 大场景，按日更新且 Git 零膨胀；
> 2. 打造开放式 Markdown 全站数据驱动引擎，支持在 `posts/about.md` 中自由配置导航、档案、文案、年份感悟，缺省智能回退；
> 3. 恢复首页独立全宽「与我交流」底栏，充沛呼吸感留白，集成「今日壁纸故事与金句拍立得」翻转卡片；
> 4. 实现 Zen 出版级沉浸式阅读模式（顶部平滑进度条、悬浮 Zen 控制坞、字号 A-/A+ 缩放、版心切换、计时器、ESC 退出）；
> 5. 全端（Desktop/Tablet/Mobile 微信 WebView）深度响应式保障与自动化回归测试 100% 验收。

---

### Task 1: Sharp WebP 多源壁纸管线与零膨胀清理脚本
**涉及文件**: `package.json`, `scripts/fetch-daily-assets.mjs`, `.github/workflows/daily-sync.yml`, `images/daily/*`
- [ ] 在 `package.json` 中引入 `sharp` 依赖并执行安装。
- [ ] 升级 `scripts/fetch-daily-assets.mjs`：
  - 从 Bing 4K API (`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN`) 一次性拉取当日 8 张图元数据；
  - 精准语义分流并无损压制为现代化 WebP 格式（quality 82, 宽度 2560px，体积 < 240KB）：
    - `images/daily/hero.webp`（今日主角光影，首页 Hero）
    - `images/daily/archive.webp`（深色暮色山野，ARCHIVE 纵览）
    - `images/daily/footer.webp`（温暖人文，底部与我交流横幅）
    - `images/daily/about.webp`（开阔公路，关于我全景横幅）
    - `images/daily/banner.webp`（极简晨曦，子页面顶栏）
  - 生成 `data/daily-wallpapers.json`（各图标题、版权、摄影故事）；
  - 抓取一言开源 API（Hitokoto 文学/哲学/思考类金句）至 `data/daily-quote.json`；
  - 自动清理历史临时大图，生成默认高质量 WebP 兜底文件，保证断网自愈；
- [ ] 确保 `.github/workflows/daily-sync.yml` 每日北京时间 08:00 定时执行该脚本并自动部署。

---

### Task 2: 全站 Markdown 深度动态化引擎与 `about.md` 模板预置
**涉及文件**: `scripts/build.mjs`, `posts/about.md`
- [ ] 在 `scripts/build.mjs` 中构建开放式配置加载器 `loadSiteConfig()`：
  - 优先扫描读取 `posts/site.md` 或 `posts/about.md` 的 YAML Frontmatter；
  - 实现深层递归合并（Deep Merge），将用户配置与内置高品质默认数据 `DEFAULT_SITE_DATA` 融合；
  - 开放支持：自定义导航 `nav`、无界个人档案 `personal_info` 键值对、社交矩阵 `social_links`、各大页面灵魂标语 `pages.*`、年度反思 `reflections.*`；
  - 智能缺省自愈：用户未填写的任何键，自动使用系统默认值，100% 杜绝报错与白板；
- [ ] 将完整、带中文注释的 Frontmatter 规范预置在 `posts/about.md` 顶部，让用户在 Obsidian 中开箱即用。

---

### Task 3: 恢复首页独立底栏「与我交流」与多背景图体系
**涉及文件**: `scripts/build.mjs`
- [ ] 在 `scripts/build.mjs` 中定义多背景图 CSS 变量池：
  ```css
  :root {
    --bg-hero-daily: url('images/daily/hero.webp'), url('images/hero-architecture.jpg');
    --bg-archive-daily: url('images/daily/archive.webp'), url('images/hero-bg.jpg');
    --bg-footer-daily: url('images/daily/footer.webp'), url('images/bottom-banner.jpg');
    --bg-about-daily: url('images/daily/about.webp'), url('images/hero-workspace.jpg');
    --bg-banner-daily: url('images/daily/banner.webp'), url('images/hero-daily.jpg');
  }
  ```
- [ ] 在首页 Chapter 5 (`.footprint-about`) 之后恢复独立的 `.bottom-comm-banner`：
  - 设置 `margin-top: clamp(64px, 8vw, 96px)` 充沛呼吸感留白，彻底与 Chapter 4 ARCHIVE 解耦；
  - 绑定 `--bg-footer-daily` 独立背景图 + 柔和暗色渐变；
  - 严格遵守 `AGENTS.md`：100% 采用 `<section style="box-sizing: border-box;">`，严禁 `<div>`；
  - 右侧集成「今日壁纸故事与金句拍立得」3D 双面翻转卡片（正面金句，背面拍摄地故事）。

---

### Task 4: Zen 出版级沉浸式阅读系统
**涉及文件**: `scripts/build.mjs` (CSS, HTML, Client Scripts)
- [ ] 文章详情页顶栏注入细微阅读进度条 `#zen-progress-bar`（2px 高度，主题色跟随，平滑伸缩）；
- [ ] 屏幕右上角挂载阅读进度胶囊 `#zen-progress-capsule`（实时显示完成百分比与预估剩余分钟）；
- [ ] 右下角设计半透明毛玻璃微悬浮控制坞 `#zen-floating-dock`：
  - `A- / A+`：无极字号缩放（15px / 16.5px / 18px / 20px）；
  - `版心切换`：窄版聚焦（680px）与宽版舒适（840px）；
  - `阅读计时器`：`⏱️ 已沉浸阅读 mm:ss`；
  - `退出按钮`：点击或按下键盘 `ESC` 退出专注模式；
  - 使用 `localStorage` 记忆用户的字号与版心偏好；
- [ ] 快捷键绑定：文章详情页键盘按下 `z` 快速开关沉浸模式；
- [ ] 文末打卡仪式感：滚动至 100% 时弹出微型完成庆祝条，支持一键复制名句。

---

### Task 5: 全端响应式矩阵适配与自动化回归测试 (100% Pass)
**涉及文件**: `scripts/build.mjs`, `scripts/test-site.mjs`
- [ ] 移动端与微信 WebView 深度响应式适配：
  - 横向溢出锁死，页面左右边距 `16px ~ 18px`，无横向晃动；
  - 底栏「与我交流」在移动端自适应折叠为优雅的纵向流；
  - Zen 控制坞在手机端自动停靠至屏幕底部微型条；
  - 所有按钮触控区 `>= 44×44px`，正文行高 `>= 1.45`；
- [ ] 编写测试套件（`scripts/test-site.mjs`）：
  - 校验全站 5 组 daily webp 变量全部定义且存在双层回退栈；
  - 校验 Markdown Frontmatter 自定义文案能成功覆盖渲染全站；
  - 校验首页独立底栏恢复、0 `<div>`、无任何重叠；
  - 校验 Zen 沉浸式阅读模式各组件与内联 JS 语法 100% 合法；
  - 校验全站 404 死链深度扫描 0 死链，WCAG 对比度达标；
- [ ] 执行 `npm test` 并在 GitHub Actions CI 中通过全量回归。
