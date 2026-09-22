# Notes Site V2 Enhancements & Obsidian Full-Pipeline Design Spec

- **Date**: 2026-09-22
- **Author**: Weaving Tan & Antigravity
- **Scope**: Static site generator `/Users/weaving/www/notes`, `obw` Obsidian GitHub Publisher, GitHub Actions automated cron sync, and all page visual enhancements.

---

## 1. 目标与设计理念 (Goals & Philosophy)

在 V1 架构重构的基础上，针对实际体验与视觉审美的进阶需求，本次 V2 改造达成以下核心目标：
1. **全站统一背景画作与主题渐变生态**：不仅是首页，归档（Archives）、分类（Categories）、标签（Tags）、关于（About）及文章详情页均配备统一的主题氛围渐变与高清风景/星空画作层，具备断网/弱网 0 秒优雅回退能力；
2. **微信公众号精选双栏大卡片 (2-Col Magazine Grid)**：废弃局促的 4 列小方块，全面放大卡片视野（每张宽度 540px+），16:9 比例大视野封面，彻底剔除虚假阅读量，改用精致圆角胶囊标签；
3. **100vw 全屏贯穿底部 + 纯浮字交流卡片**：将底部月升横幅移出宽度限制容器，改为屏幕全宽（100vw）大画作，彻底删除「与我交流」的生硬灰色矩形外框，文字与社交按钮纯净自然悬浮于夜空之上；
4. **全自动每日名句与高清壁纸定时更新**：通过 GitHub Actions Cron（每日早晨 8:00）定期调用开源接口（一言/必应高清壁纸）抓取金句与壁纸，全自动构建上线；
5. **深色模式「白板」彻底根除**：彻底解决微信卡片组件（`:::cards`、`:::summary` 等）硬编码浅色背景导致暗黑模式下白底白字的问题；
6. **实时公历时钟**：Hero 悬浮卡片时间彻底告别写死，接入 `new Date()` 动态时钟；
7. **手机移动端 (375px~430px) 像素级响应式适配**：导航平滑滚动、分类药丸横向弹性滑动、单列流体无溢出；
8. **Obsidian 一键同步流水线元数据闭环**：验证并强化 `obw` 插件中的 `GitHubPublisher`，自动读取 Obsidian 标签与属性，补齐标准 Frontmatter，打通创作到发布全链路。

---

## 2. 视觉与页面系统设计 (Visual & Page System)

### 2.1 全站多级背景分层体系 (Layered Theme Gradient & Wallpaper)
每个页面（首页、归档、分类、标签、关于、文章详情）均应用三层无缝视觉堆叠：
```css
/* 顶部 Hero / Subpage Header 背景分层 */
background-color: var(--bg-page);
background-image: 
  linear-gradient(to bottom, transparent 60%, var(--bg-page) 100%),
  var(--theme-hero-gradient), 
  var(--page-banner-bg);
background-size: cover;
background-position: center top;
```

#### 5 大主题的氛围渐变定义：
| 主题 ID | 主题名称 | 日间氛围渐变 (`--theme-hero-gradient`) | 深色模式氛围渐变 |
|---|---|---|---|
| `mint-emerald` | 薄荷翡翠 | `radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18) 0%, transparent 75%)` | `radial-gradient(circle at 50% 0%, rgba(16,185,129,0.3) 0%, rgba(9,20,16,0.92) 80%)` |
| `tech-blue` | 科技深蓝 | `radial-gradient(circle at 50% 0%, rgba(37,99,235,0.16) 0%, transparent 75%)` | `radial-gradient(circle at 50% 0%, rgba(37,99,235,0.28) 0%, rgba(11,19,43,0.92) 80%)` |
| `aurora-violet`| 极光鸢尾 | `radial-gradient(circle at 50% 0%, rgba(139,92,246,0.18) 0%, transparent 75%)`| `radial-gradient(circle at 50% 0%, rgba(139,92,246,0.32) 0%, rgba(22,13,39,0.92) 80%)` |
| `warm-amber` | 暖阳琥珀 | `radial-gradient(circle at 50% 0%, rgba(217,119,6,0.16) 0%, transparent 75%)` | `radial-gradient(circle at 50% 0%, rgba(217,119,6,0.28) 0%, rgba(28,20,8,0.92) 80%)` |
| `minimalist-ink`| 极简水墨 | `radial-gradient(circle at 50% 0%, rgba(71,85,105,0.14) 0%, transparent 75%)` | `radial-gradient(circle at 50% 0%, rgba(71,85,105,0.25) 0%, rgba(15,23,42,0.92) 80%)` |

无论断网还是弱网，页面永远优先呈现契合当前主题的优雅渐变，杜绝白屏与色彩割裂。

### 2.2 微信公众号精选宽幅双栏大卡片 (2-Col Grid)
- **容器布局**：桌面端 `grid-template-columns: repeat(2, 1fr)`，间距 `28px`，单卡片宽度 `~545px`；
- **16:9 封面大图**：高度提升至 `240px`，圆角 `16px 16px 0 0`，带微缩放悬浮效果；
- **轻盈分类胶囊**：
  ```css
  .tag-badge-pill {
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 0.78rem;
    font-weight: 600;
    background: var(--primary-faint);
    color: var(--primary);
    border: 1px solid var(--pill-border);
  }
  ```
- **大字号标题与导读**：标题提升至 `1.28rem`（加粗，行高 1.4），导读 `0.92rem` 展示两行；
- **纯粹元信息栏**：彻底移除阅读量，仅保留：
  - 左侧：`📅 2026-09-22`（发布日期）
  - 右侧：`⏱️ 约 5 分钟阅读`（基于真实字数计算）

### 2.3 底部横幅 100vw 全屏贯通与无框浮字排版
- **全屏贯穿**：将 `<section class="bottom-comm-banner">` 移至主容器之外，横向铺满 `100vw`，上下内边距 `60px`；
- **纯净无框浮字**：
  - 完全移除 `.banner-left` 的灰色背景色、实线边框（border）与外部投影；
  - 依赖优雅的文字暗影 `text-shadow: 0 2px 12px rgba(0,0,0,0.65)` 保证辨识度；
  - 圆形社交按钮（邮件、GitHub、关于）采用半透明磨砂毛玻璃微质感；
  - 右侧纯净展示画作原生行楷「总有一些思考 值得被认真记录」。

---

### 2.4 深色模式白板自愈机制
在 `Web Content Adaptor` 与 CSS 样式中：
1. 拦截并重写微信排版生成的卡片背景样式：
   ```css
   [data-mode="dark"] .article-content [style*="background:#ffffff"],
   [data-mode="dark"] .article-content [style*="background: #ffffff"],
   [data-mode="dark"] .article-content [style*="background:#fff"],
   [data-mode="dark"] .article-content [style*="background: #fff"],
   [data-mode="dark"] .article-content [style*="background: rgb(255, 255, 255)"],
   [data-mode="dark"] .article-content [style*="background:linear-gradient"],
   [data-mode="dark"] .article-content [style*="background: linear-gradient"] {
     background: var(--bg-card) !important;
     border-color: var(--border-color) !important;
   }
   ```
2. 确保卡片内部所有文字、标题在深色背景下全部适配亮色 Token，文本对比度 >= 17:1。

---

## 3. GitHub Actions 每日名言与高清壁纸定时任务

### 3.1 工作流定义 (`.github/workflows/daily-sync.yml`)
```yaml
name: Daily Sync Quote and Wallpapers
on:
  schedule:
    - cron: '0 0 * * *' # 每天北京时间 08:00
  workflow_dispatch:      # 支持手动一键运行

jobs:
  sync-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Fetch Daily Quote & Assets
        run: node scripts/fetch-daily-assets.mjs
      - name: Run Test and Build
        run: npm test
      - name: Deploy Pages
        uses: actions/deploy-pages@v4
```

### 3.2 运行时兜底策略
- `scripts/fetch-daily-assets.mjs` 调用 Hitokoto 开源 API，写入 `data/daily-quote.json`；
- 若网络超时或接口异常，构建引擎自动平滑回退至精选经典格言库，绝不导致构建中断；
- 前端运行时自动调用 `new Date()` 动态渲染当天日期（如 `2026.09.22`，明天自动为 `2026.09.23`）。

---

## 4. Obsidian 一键发布流程闭环 (End-to-End)

```
Obsidian 笔记撰写 (Markdown + 图片)
       │
       ▼
点击 obw 顶部「发布草稿」 -> 勾选「部署到个人网站」
       │
       ▼
obw 插件 GitHubPublisher 自动读取 metadataCache
- 提取内嵌标签 (#tag 或 frontmatter tags)
- 自动补全缺失的 Frontmatter (title, date, tags, categories)
- 上传本地配图至 images/
- 提交 Markdown 至 posts/
       │
       ▼
GitHub 仓库触发 Webhook / Actions
- 自动运行 npm test (5 大测试全绿门禁)
- 重新编译 dist/ 静态站点
- 秒级更新上线至 GitHub Pages
```

---

## 5. 质量门禁与测试扩展 (`scripts/test-site.mjs`)

扩展自动化测试断言：
1. **全景全屏底部 100vw 断言**：验证底部 Banner 处于主容器外且无生硬外框 class；
2. **双栏大卡片布局断言**：验证 `.latest-grid-4` 升级为 `.latest-grid-2` 且单卡片结构包含 16:9 封面；
3. **阅读量彻底清除断言**：断言 HTML 产物中不存在伪造阅读量（如 `856 阅读`、`1.2k 阅读`）；
4. **深色卡片白板防护断言**：断言深色模式下所有 `.wechat-module-cards` 与微信卡片均无硬编码白色背景；
5. **动态时钟初始化断言**：断言 Hero 名言卡片包含运行时动态时钟逻辑。
