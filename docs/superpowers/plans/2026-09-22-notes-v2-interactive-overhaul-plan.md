# Tan's Digital Garden (TAN) - V2 沉浸式视觉与极客交互系统实施计划

> **基于设计规范**：[`docs/superpowers/specs/2026-09-22-notes-v2-interactive-overhaul-design.md`](file:///Users/weaving/www/notes/docs/superpowers/specs/2026-09-22-notes-v2-interactive-overhaul-design.md)

---

## 任务拆解与执行顺序

### Task 1: 扩展每日高清自然壁纸抓取流水线
- **目标文件**：`scripts/fetch-daily-assets.mjs`
- **步骤**：
  1. 调用 Bing 官方 4K UHD 每日壁纸 API：`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN`；
  2. 获取当天高清壁纸 URL 与故事描述，将图片下载至本地 `images/hero-daily.jpg`；
  3. 将壁纸元数据保存至 `data/daily-wallpaper.json`（包含标题、拍摄地与版权信息）；
  4. 遇到网络波动时平滑回退至现有本地壁纸，绝不阻断构建。
- **验证方式**：执行 `node scripts/fetch-daily-assets.mjs`，检查 `images/hero-daily.jpg` 是否成功下载且有效。

### Task 2: 彻底绝杀暗黑模式白板（全面收录 `:::cta` 近纯白背景）
- **目标文件**：`scripts/build.mjs`
- **步骤**：
  1. 在 `adaptObwHtmlForWeb` 正则中追加 `#f7f8fa`、`#f5f5f7`、`#fafafa` 等全部近纯白色值，转换为 `var(--bg-card)` 或 `var(--bg-subtle)`；
  2. 在 `SITE_STYLES` 中强化深色覆盖规则：
     ```css
     [data-mode="dark"] .wechat-module-cta,
     [data-mode="dark"] .wechat-module-cta span,
     [data-mode="dark"] .article-content [style*="background:#f7f8fa"],
     [data-mode="dark"] .article-content [style*="background: #f7f8fa"] {
       background-color: var(--bg-card) !important;
       background: var(--bg-card) !important;
       color: var(--text-main) !important;
       border-color: var(--border-color) !important;
     }
     ```
- **验证方式**：重新构建，针对 `dist/posts/frontend-architecture-2026.html` 验证 `:::cta` 的 `01 关注公众号` 与 `02 参与讨论` 不再包含任何 `#f7f8fa` 白板背景。

### Task 3: 品牌 Logo 全面重构为「TAN」
- **目标文件**：`scripts/build.mjs`
- **步骤**：
  1. 将全站各处 "Tan's Blog" 统一升级为 `TAN`；
  2. 在 `buildNavHtml` 与所有页面的 Header Brand 中输出：
     `<span class="site-brand-icon">${ICONS.mountain}</span><span class="brand-text">TAN</span><span class="brand-badge">// NOTES</span>`；
  3. 增加 CSS 样式：`.brand-text`（字间距 `0.08em`，字重 `850`），小屏下隐藏 `.brand-badge` 保持单行整洁。
- **验证方式**：检查所有页面 Header 是否呈现极简高级感 TAN。

### Task 4: 移动端彻底微信化响应式排版
- **目标文件**：`scripts/build.mjs`
- **步骤**：
  1. 在 `SITE_STYLES` 的 `@media (max-width: 768px)` 中重构文章正文与视口：
     - `html, body { overflow-x: hidden; width: 100%; }`
     - 文章主体边距设为 `18px`，正文字号 `16.5px`，行高 `1.78`，段落边距 `1.4em 0`；
     - 代码块 `<pre>` 设置负外边距撑满屏幕 `margin: 1.2em -18px`，独立内部横向滚动；
  2. 移动端顶部导航紧凑排列：隐藏非必要文字，保留 `返回 / TAN / 搜索 / 主题` 四个操作，单行绝不折叠；
  3. 分类 Tab 增大尺寸至高 `38px`、内边距 `18px`，增加微投影与触控平滑滑动。
- **验证方式**：针对移动端窄屏视口断言布局无水平溢出。

### Task 5: 全站全局 Cmd+K 搜索 & 分类标签联动修复
- **目标文件**：`scripts/build.mjs`
- **步骤**：
  1. 在 HTML 构建时生成全局轻量搜索索引 `window.__NOTES_INDEX__`（涵盖所有文章的标题、描述、标签、分类、URL）；
  2. 重构 `onSearchModalInput`，全面基于 `window.__NOTES_INDEX__` 进行模糊匹配，支持跨页面在首页、归档、分类、标签与文章详情页全量秒级检索；
  3. 增加键盘 `ArrowUp`、`ArrowDown` 快速高亮选择和 `Enter` 直达支持；
  4. 修复分类筛选选择器兼容 `.card-item-2` 与 `.card-item-4`，点击标签胶囊同步过滤对应分类。
- **验证方式**：在文章详情页与首页分别触发 Cmd+K，验证即刻唤起全量结果。

### Task 6: 极客高留存功能（GitHub Issues 闭环、代码一键复制、专注模式、智能推荐）
- **目标文件**：`scripts/build.mjs`
- **步骤**：
  1. **GitHub Issues 互动闭环**：在文章底部挂载 GitHub 讨论操作条：`[在 GitHub 讨论本篇]`、`[提出勘误]`、`[给本站 Star]`，以及 Giscus/GitHub Issues 互动挂载容器；
  2. **代码块一键复制**：客户端脚本自动遍历 `<pre><code>`，挂载极简复制按钮，点击呈现“已复制”对勾动画；
  3. **专注阅读模式（Focus Mode）**：增加一键开启纯净阅读模式的切换按钮；
  4. **相关文章智能推荐**：根据文章分类与标签相关度，在文章底部智能推荐 2 篇延伸阅读卡片。
- **验证方式**：在详情页检查各组件渲染与交互。

### Task 7: 自动化测试门禁升级与发布验证
- **目标文件**：`scripts/test-site.mjs`
- **步骤**：
  1. 编写 7 大针对性断言（TAN Logo、白板 0 容忍、全站搜索索引、移动端排版样式、动态壁纸回退栈、0 死链、微信排版 0 div）；
  2. 本地执行 `npm test` 验证 100% 通过；
  3. 提交 Git 并推送到远程，观察 GitHub Actions 自动化构建上线；
  4. 对线上生产环境执行 curl 验证全量 200。
