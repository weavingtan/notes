# 个人站点全站 Markdown 动态化、多源每日壁纸管线与 Zen 沉浸式阅读系统设计规范

- **文档版本**: 1.0.0
- **创建日期**: 2026-09-23
- **项目仓库**: `weavingtan/notes` & `weavingtan/obw`
- **状态**: 已评审待实施 (Approved)

---

## 1. 项目背景与目标

当前 `weavingtan/notes` 个人数字花园在排版与多主题视觉上已建立起高品质出版级基座，但在数据灵活性、背景自动化与深度阅读体验上存在以下诉求：
1. **首页底栏「与我交流」恢复与解耦**：在 Chapter 5 个人印记后恢复全屏独立的「与我交流」深色夜景横幅，且必须与 Chapter 4 ARCHIVE 区域彻底拉开呼吸感留白与视觉解耦；
2. **全站多背景图每日自动换新**：全站各大页面与横幅（首页 Hero、ARCHIVE、底栏交流、关于我横幅、子页面顶栏）需分别绑定不同的每日高清壁纸，每日自动更新，且严格执行压缩与旧图清理机制（Git 零膨胀）；
3. **全站数据与文案全部 Markdown 动态化**：全站作者档案、社交链接、各大页面的核心标语与年份反思全部支持通过 `posts/about.md`（或 `posts/site.md`）的 Frontmatter 动态配置，且对现有 `obw` 插件零侵入，未配置时自愈使用高品质默认值；
4. **出版级 Zen 沉浸式阅读模式**：文章详情页配备无干扰阅读模式、顶部平滑阅读进度胶囊、右下角悬浮 Zen 控制坞（字号 A-/A+ 无极调节、版宽切换、阅读计时器、ESC 退出）；
5. **每日名言与灵动微交互**：GitHub Actions 定时拉取开源一言金句并注入全站，配备「今日壁纸故事与金句拍立得」翻转微交互；
6. **全端出版级响应式布局**：桌面端、平板端与移动端（特别是微信 WebView 375px~430px）严格自适应，横向零溢出、零晃动，100% 遵从 AGENTS.md 规范（0 `<div>`）。

---

## 2. 总体架构设计

```
[ Obsidian (obw 同步) ]
       │  (推送 Markdown 文章至 notes/posts/)
       ▼
[ notes 仓库 / posts/about.md (或 posts/site.md) ]
       │
       ├─► [ scripts/build.mjs ] ──► 动态解析 Frontmatter
       │                                 │
       │                                 ├─► 全局导航 NAV_ITEMS
       │                                 ├─► 个人档案 personal_info
       │                                 ├─► 社交矩阵 social_links
       │                                 ├─► 页面灵魂文案 pages.*
       │                                 └─► 年度反思 reflections.*
       ▼
[ GitHub Actions: daily-sync.yml (每天定时 08:00) ]
       │
       ├─► [ scripts/fetch-daily-assets.mjs ]
       │         │
       │         ├─► Bing 4K API (n=8) ──► Sharp WebP 压缩 (Quality 82, <200KB)
       │         │     │
       │         │     ├─► images/daily/hero.webp     (首页主角图)
       │         │     ├─► images/daily/archive.webp  (ARCHIVE 全景)
       │         │     ├─► images/daily/footer.webp   (底栏交流横幅)
       │         │     ├─► images/daily/about.webp    (关于我全景)
       │         │     └─► images/daily/banner.webp   (子页面装饰)
       │         │
       │         └─► Hitokoto API ──► data/daily-quote.json
       │
       └─► [ npm test ] ──► 16+ 大自动化质量门禁 ──► 自动部署 GitHub Pages
```

---

## 3. 详细设计规范

### 3.1 多源每日壁纸管线与自动压缩清理 (Wallpaper Pipeline)

1. **接口请求与场景语义分流**：
   - 请求端点：`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN`
   - 分流映射：
     - `images[0]` ──► `images/daily/hero.webp`（今日自然/建筑光影，首页 Hero）
     - `images[1]` ──► `images/daily/archive.webp`（深色暮色山野，ARCHIVE 纵览）
     - `images[2]` ──► `images/daily/footer.webp`（温暖人文，底部与我交流横幅）
     - `images[3]` ──► `images/daily/about.webp`（开阔公路与地平线，关于我全景）
     - `images[4]` ──► `images/daily/banner.webp`（极简大气，文章与归档顶栏）
2. **Sharp 高保真 WebP 压缩**：
   - 依赖：引入 `sharp` 库；
   - 尺寸规格：最大宽度 2560px，按需等比缩放；
   - 格式参数：WebP 格式，`quality: 82`，`effort: 6`；
   - 单张体积：严格控制在 150KB ~ 240KB，全站 5 张图总体积 < 1MB；
3. **零膨胀清理与自愈机制**：
   - 采用覆盖写入模式，绝不按日期无限追加图片文件；
   - 脚本执行时自动清理历史临时 `.jpg` 与未引用废弃图；
   - 存储元数据至 `data/daily-wallpapers.json`（摄影标题、版权与故事）；
   - 网络异常时平滑回退至预置的 5 张高质量 WebP 兜底图，确保构建永不失败。

---

### 3.2 全站 Markdown 深度动态化引擎

1. **Frontmatter 完整数据模型**：
   在 `posts/about.md` 顶部提供开箱即用的完整配置：
   ```yaml
   ---
   title: 站点配置与关于我 (Site Settings)

   # === 1. 顶部全局导航 ===
   nav:
     - { label: "首页", href: "index.html", key: "home" }
     - { label: "文章", href: "articles.html", key: "articles" }
     - { label: "归档", href: "archives.html", key: "archives" }
     - { label: "分类", href: "categories.html", key: "categories" }
     - { label: "关于", href: "about.html", key: "about" }

   # === 2. 个人档案开放键值对（支持自由追加任意字段） ===
   personal_info:
     坐标: "北京 · 朝阳"
     职业: "全栈架构师 / 产品设计师"
     状态: "🌱 正在深度打磨数字花园与出版排版"
     邮箱: "tan@example.com"
     GitHub: "https://github.com/weavingtan"
     微信: "weaving_tan"
     喜欢: "架构演进、开源、阅读、摄影、咖啡"

   # === 3. 社交矩阵开放列表 ===
   social_links:
     - { platform: "mail", title: "发送邮件", href: "mailto:tan@example.com" }
     - { platform: "rss", title: "RSS 订阅", href: "feed.xml" }
     - { platform: "github", title: "GitHub 主页", href: "https://github.com/weavingtan" }
     - { platform: "about", title: "关于我", href: "about.html" }

   # === 4. 各大页面文案与标语 ===
   pages:
     home:
       hero_headline: "记录设计、技术，以及那些值得思考的事。"
       hero_subheadline: "I write about design, technology and everything in between."
       hero_cta: "READ MORE →"
       archive_quote: "时间会筛选出真正重要的东西。"
     articles:
       title: "文章专题"
       subtitle: "探索体系化思考与技术实现的交汇点。按主题聚类的长文脉络，记录架构设计、工程实践与生活感悟。"
       sidebar_quote: "写作，是我与世界对话的方式。"
       sidebar_signature: "Tan"
     archives:
       title: "归档 · 时间里的思考"
       subtitle: "时间会筛选出真正重要的东西。在这里，按时间脉络归档记录所有关于架构思考、工程设计与生活哲学的文字足迹。"
       reflections:
         "2026": "这一年，我更关注生活的质感与思考的深度。重构感知，在代码与文字间探寻数字世界的温度与秩序。"
         "2025": "在代码与现实的交织中寻找秩序，沉淀关于架构、设计与自我成长的答案。"
         "2024": "探索未知与可能，跨越不同技术栈的边界，以文字作为思考的锚点与心智的索引。"
     about:
       hero_title: "你好，我是 Tan。<br>一个喜欢思考、记录和创造的人。"
       hero_subtitle: "在这里，我分享一些关于设计、技术、生活的所见所想。"
       banner_title: "在生活的缝隙里，寻找热爱的方向。"
       banner_subtitle: "写下思考 · 记录成长 · 分享生活"
       banner_cursive: "Better Things Ahead"
     comm_banner:
       title: "与我交流"
       desc: "如果你对文章有任何想法，或者有技术、产品、生活方面的问题，欢迎在评论区留言，或通过其他方式联系我。"
   ---
   ```
2. **解析与自愈合并机制**：
   - 构建器读取 YAML，并使用深度递归合并与 `DEFAULT_SITE_DATA` 进行融合；
   - 缺省任何键自动由预置默认值填充，格式容错率 100%；
   - `personal_info` 支持无界遍历，自动生成栅格排版。

---

### 3.3 首页底栏「与我交流」独立横幅与多背景图映射

1. **结构定位与呼吸感间距**：
   - 位于首页 Chapter 5 (`.footprint-about`) 之后；
   - 上外边距显式声明 `margin-top: clamp(64px, 8vw, 96px)`，彻底消除粘连感；
   - 宽度 `100vw` 全宽展开，内部 `1280px` 居中版心；
2. **多背景图 CSS 变量池**：
   ```css
   :root {
     --bg-hero-daily: url('images/daily/hero.webp'), url('images/hero-architecture.jpg');
     --bg-archive-daily: url('images/daily/archive.webp'), url('images/hero-bg.jpg');
     --bg-footer-daily: url('images/daily/footer.webp'), url('images/bottom-banner.jpg');
     --bg-about-daily: url('images/daily/about.webp'), url('images/hero-workspace.jpg');
     --bg-banner-daily: url('images/daily/banner.webp'), url('images/hero-daily.jpg');
   }
   ```
3. **拍立得双面翻转微交互 (Paper Flip)**：
   - 底栏右侧呈现 3D 翻转卡片：正面呈现今日一言金句，鼠标悬停/点击平滑翻转，背面展示今日壁纸拍摄地故事与版权归属。

---

### 3.4 Zen 出版级沉浸式阅读系统

1. **交互进入与退出**：
   - 触发入口：文章标题旁「专注阅读」图标，或键盘敲击快捷键 `z`；
   - 退出机制：控制坞退出按钮、点击遮罩或按下键盘 `ESC`；
   - 退出后记忆读者的字号与版心偏好至 `localStorage`；
2. **顶部平滑进度胶囊**：
   - 屏幕顶部常驻 2px 细微进度条，颜色动态响应当前主题色；
   - 右上角胶囊实时计算阅读进度与预估剩余时间；
3. **悬浮 Zen 控制坞 (Floating Zen Dock)**：
   - 停靠位置：桌面端右下角悬浮（带半透明毛玻璃特效与微发光阴影）；移动端自动靠底吸附；
   - 控制项：
     - `A- / A+`：无极字号缩放（15px / 16.5px / 18px / 20px）；
     - `版心切换`：窄版聚焦（680px）与宽版舒适（840px）；
     - `阅读计时器`：`⏱️ 已沉浸阅读 mm:ss`；
     - `一键退出`：返回常规出版页面；
4. **文末打卡仪式感**：
   - 滚动到底部 100% 时弹出轻量恭喜提示与用时结算，支持一键复制名句。

---

### 3.5 全端响应式布局矩阵规范 (Responsive Design Matrix)

| 视口尺寸 | 首页排版调整 | 文章页排版调整 | 沉浸式阅读调整 | 与我交流底栏调整 |
|---|---|---|---|---|
| **桌面端 (> 1024px)** | 3 列 Hero、4 列精选流、全屏横幅 | 左侧专题边栏 + 右侧主文章流 | 右下角浮动 Zen Dock，680/840px 版宽 | 左右两栏对齐（左文案+社交，右拍立得） |
| **平板端 (768px ~ 1024px)** | 4 列精选流折叠为 2×2 网格 | 边栏与主流按比例缩紧，字号流式伸缩 | 悬浮 Dock 适当缩小留白 | 左右结构紧凑排列，间距适当微调 |
| **移动端 (< 768px, 微信环境)** | Hero 垂直堆叠，精选流单列展示 | 侧边栏转为顶部水平滚动药丸 | Zen 控制坞自动贴底转为底部抽屉条 | 纵向流排列（标题 → 导语 → 居中圆形按钮） |

**排版与性能硬约束**：
- 全站 `<main>` 内 **严禁使用 `<div>`**，一律使用 `<section style="box-sizing: border-box; ...">`；
- 所有可交互元素最小触控区域必须 `>= 44×44px`；
- 移动端页面横向溢出严格锁死，禁止任何晃动。

---

## 4. 实施阶段计划

- **阶段 1**：创建壁纸自动化拉取与 WebP 压缩脚本 (`scripts/fetch-daily-assets.mjs`)，集成 `sharp`，配置 GitHub Actions 定时任务；
- **阶段 2**：在 `scripts/build.mjs` 中实现开放式 Frontmatter 解析引擎与深层合并兜底器，并初始化 `posts/about.md` 模板；
- **阶段 3**：首页恢复独立全宽「与我交流」底栏，接入多背景图系统与拍立得翻转微交互；
- **阶段 4**：实现 Zen 沉浸式阅读模式（浮动控制坞、字号/版心切换、顶部进度胶囊、计时器）；
- **阶段 5**：全端响应式断点适配与 `test-site.mjs` 全套断言补全，确保 100% 绿色交付。

---

## 5. 质量保证与测试门禁

新增并扩充自动化回归测试套件：
1. **壁纸与多背景图校验**：校验全站 5 组 daily webp 变量全部定义且存在回退栈；
2. **Markdown 动态配置校验**：验证从 `about.md` 提取自定义文案并覆盖全站；
3. **微信防塌陷断言**：验证首页恢复的底栏内部 0 `<div>`；
4. **Zen 阅读模式完整性**：验证沉浸式进度条、控制坞、快捷键脚本全部语法合法；
5. **全端响应式无横向溢出断言**。
