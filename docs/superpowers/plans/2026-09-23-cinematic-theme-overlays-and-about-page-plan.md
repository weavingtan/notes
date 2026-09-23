# 电影感主题大图遮罩联动与关于页流式画报实施计划

> **参考设计规格书**: [`docs/superpowers/specs/2026-09-23-cinematic-theme-overlays-and-about-page-redesign.md`](file:///Users/weaving/www/notes/docs/superpowers/specs/2026-09-23-cinematic-theme-overlays-and-about-page-redesign.md)  
> **核心目标**:
> 1. 全站大图背景遮罩彻底告别灰色死板，通过 `--hero-overlay-gradient` 随 5 大精选主题动态联动渐变色相；
> 2. 彻底解决关于页右侧兴趣卡片下方高达 500px 的严重留白断层，注入「💻 架构与创造力装备库」与「🌱 What I'm Doing "Now" 实时看板」；
> 3. 彻底消除关于页正文「头大身子细」的 820px 阶梯断层，将宽度升级至 100%（与上方 1280px 齐平），并落地现代杂志双栏流式章节版式；
> 4. 严格恪守 AGENTS.md 微信公众号排版硬红线（全站 12 个 HTML 文件 `<main>` 内 0 `<div>`）；
> 5. 扩充自动化测试套件并达成 100% 验证通过与 GitHub Pages 部署。

---

### Task 1: 多主题动态遮罩系统实现 (Cinematic Theme Overlays)
**涉及文件**: `scripts/build.mjs`, `scripts/test-site.mjs`
- [ ] 在 `scripts/build.mjs` 的 `SITE_STYLES` 与 `buildHtmlSkeleton` 中，为全站 `:root` 及各个主题选择器（`[data-theme-style="..."]`）定义 `--hero-overlay-gradient`：
  - `mint-emerald`（薄荷翡翠）：深冷杉墨绿混夜空黑 `linear-gradient(135deg, rgba(4, 36, 26, 0.82) 0%, rgba(10, 22, 35, 0.90) 100%)`；
  - `tech-blue`（科技深蓝）：极客午夜深蓝混玄青 `linear-gradient(135deg, rgba(10, 28, 64, 0.84) 0%, rgba(7, 14, 36, 0.92) 100%)`；
  - `aurora-violet`（极光鸢尾）：梦幻深紫夜幕混幽深黑 `linear-gradient(135deg, rgba(32, 14, 56, 0.84) 0%, rgba(12, 16, 38, 0.90) 100%)`；
  - `warm-amber`（暖阳琥珀）：温润深栗与琥珀曜石 `linear-gradient(135deg, rgba(46, 24, 7, 0.84) 0%, rgba(18, 12, 8, 0.92) 100%)`；
  - `minimalist-ink`（极简水墨）：纯净高级黑曜冷灰 `linear-gradient(135deg, rgba(18, 22, 30, 0.86) 0%, rgba(10, 13, 20, 0.92) 100%)`；
- [ ] 将以下静态渐变替换为 `var(--hero-overlay-gradient)`：
  - `.archive-hero`（归档页顶部大图）
  - `.about-hero-trio`（关于页顶部巨幕）
  - `.panoramic-about-banner .panoramic-about-overlay`（关于页全景横幅）
  - `.bottom-comm-banner`（全站底部交流与拍立得横幅）
- [ ] 在 `scripts/test-site.mjs` 中添加针对 `--hero-overlay-gradient` 和 5 套主题选择器的自动化断言。

---

### Task 2: 关于页右侧留白空间策展（技能装备矩阵 & Now 状态看板）
**涉及文件**: `scripts/build.mjs`, `scripts/test-site.mjs`
- [ ] 在 `buildAboutHtml` 的右侧列 `.about-interests-col` 下方注入：
  - `.about-craft-matrix`（架构与工程技术栈 + 设计与生产力工具药丸微标组）；
  - `.about-now-card`（当前实时打磨焦点 + 呼吸绿点动画 + 状态说明）；
- [ ] 在 `SITE_STYLES` 中编写对应的卡片样式，包含 `var(--bg-card)`、`var(--border-color)`、`var(--primary)` 动态主题绑定，以及微上浮交互动画；
- [ ] 严格遵循 AGENTS.md 约束：全部使用 `<section style="box-sizing: border-box; ...">`，绝无 `<div>` 与 `grid`；
- [ ] 在 `scripts/test-site.mjs` 中添加针对 `about-craft-matrix` 与 `about-now-card` 节点的结构断言。

---

### Task 3: 关于页正文 100% 等宽与现代杂志双栏流式重构
**涉及文件**: `scripts/build.mjs`, `scripts/test-site.mjs`
- [ ] 彻底移除 `.about-post-body` 中的 `max-width: min(94vw, 820px)`，重构为 `width: 100%; max-width: 100%; margin: 56px 0 72px 0;`，与顶部 1280px 完全齐平；
- [ ] 打造现代杂志双栏章节版式（Editorial Split Chapter）：
  - 左列章节导引（`flex: 0 0 240px;`），包含章节序号（如 `01 / IDENTITY`、`02 / PHILOSOPHY`）、二级标题与发丝渐变线；
  - 右列深度叙事区（`flex: 1;`），承接出版级排版正文、Callouts 引用块与列表；
  - 响应式退化规则：在屏幕 `< 860px` 时平滑自适应为单列垂直堆叠流；
- [ ] 运行构建并校验 `dist/about.html`，确认上下宽度视觉统一、层次饱满。

---

### Task 4: 全套自动化测试套件扩展、微信 0 div 验证与全站构建部署
**涉及文件**: `scripts/test-site.mjs`, `dist/*.html`
- [ ] 运行 `node scripts/build.mjs && node scripts/test-site.mjs`；
- [ ] 自动化扫描 `dist/` 下全部 12 个 HTML 页面，验证 `<main>` 内部 **`<div>` 标签为 0**；
- [ ] 验证全站 18+ 测试套件 100% 通过；
- [ ] 提交修改并推送至 GitHub `main` 分支。
