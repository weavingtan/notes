# 电影感主题大图遮罩联动与关于页流式画报重构设计规范

## 1. 概述与核心诉求

本规范针对 TAN / Weaving's Notes 个人站点在多主题氛围感联动与关于我页面（About Page）布局失衡的问题进行系统性重构，彻底解决以下三大痛点：

1. **大图遮罩千篇一律的灰暗死板**：全站所有 Hero 与横幅背景大图上方硬编码了单一固定的灰深蓝半透明遮罩（`rgba(11, 19, 43, 0.8)`），导致在切换「薄荷翡翠」、「科技深蓝」、「极光鸢尾」、「暖阳琥珀」、「极简水墨」等主题时无法形成环境光晕与色调呼应。
2. **关于页兴趣卡片右侧巨大留白**：左侧个人名片卡加上 3D 拟物黑胶唱片播放器高度达约 800px，而右侧 4 个轻量卡片（设计、技术、生活、阅读）高度仅约 220px，导致右下方出现高达 500px 的严重留白断层。
3. **关于页正文上下宽度严重脱节（阶梯断层）**：顶部区域采用 `1280px` 宽幅（`min(94vw, 1280px)`），而下方正文叙事区（`posts/about.md` 如「我是谁？」）被硬编码限制在 `max-width: min(94vw, 820px)` 的狭窄居中框内，造成视觉极其割裂的「头大身子细」现象。

---

## 2. 总体设计方案与架构

```
┌────────────────────────────────────────────────────────────────────────┐
│                        全站多主题动态环境遮罩系统                          │
│        [薄荷翡翠]     [科技深蓝]     [极光鸢尾]     [暖阳琥珀]     [极简水墨]     │
│             │             │             │             │             │  │
│             └─────────────┼─────────────┼─────────────┼─────────────┘  │
│                           ▼                                            │
│            CSS 变量: --hero-overlay-gradient (电影感色调微映射)             │
│      ├── .archive-hero (归档页顶部大图)                                    │
│      ├── .about-hero-trio (关于页顶部巨幕)                                  │
│      ├── .panoramic-about-banner (关于页全景横幅)                           │
│      └── .bottom-comm-banner (全站底部交流与拍立得大图)                      │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                      关于页 (About Page) 1280px 流式画报                 │
│                                                                        │
│ ┌───────────────────────────┐ ┌──────────────────────────────────────┐ │
│ │  左侧: 个人名片与音乐 (~340px) │ │  右侧: 4 列兴趣卡片 + 技能与 Now 看板  │ │
│ │  - 艺术肖像 (avatar.jpg)    │ │  - 4 列发丝线兴趣卡片 (设计/技术/生活/阅读)│ │
│ │  - 坐标/职业/状态/邮箱/微信    │ │  - 💻 技术与工具栈微标矩阵 (Tech Matrix) │ │
│ │  - 3D 拟物黑胶播放器 (52px锁死)│ │  - 🌱 正在打磨看板 (Now Status / 呼吸绿点)│ │
│ └───────────────────────────┘ └──────────────────────────────────────┘ │
│                                                                        │
│ ═════════════════════════════ 发丝线呼吸分割带 ════════════════════════ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │            关于页正文区: 100% 等宽杂志双栏流式章节 (1280px 齐平)      │ │
│ │  ┌──────────────┐ ┌──────────────────────────────────────────────┐ │ │
│ │  │ 01 / IDENTITY│ │ 深度叙事文字、obw 微信级精美排版、Callouts、      │ │ │
│ │  │ 「我是谁？」  │ │ 高亮引言与列表                                │ │ │
│ │  ├──────────────┤ ├──────────────────────────────────────────────┤ │ │
│ │  │ 02 / CRAFT   │ │ 现代前端工程体系、全端跨平台架构与高性能服务设计...│ │ │
│ │  │ 「技术栈日常」│ │                                              │ │ │
│ │  ├──────────────┤ ├──────────────────────────────────────────────┤ │ │
│ │  │ 03 / GARDEN  │ │ 为什么搭建这个数字花园？长期主义与思考沉淀...     │ │ │
│ │  │ 「建站初心」  │ │                                              │ │ │
│ │  └──────────────┘ └──────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │              底栏全景大横幅 (A LITTLE MORE / Better Things Ahead)   │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 详细设计规范

### 3.1 电影感主题大图遮罩联动系统 (Cinematic Theme Overlays)

#### 3.1.1 色相映射矩阵
在全站 `:root` 及各个主题选择器（`[data-theme-style="..."]`）中声明动态变量 `--hero-overlay-gradient`，将主题主色（Primary）微调混合入暗夜渐变：

```css
/* 默认：薄荷翡翠 (mint-emerald: #10B981) */
:root, [data-theme-style="mint-emerald"] {
  --hero-overlay-gradient: linear-gradient(135deg, rgba(4, 36, 26, 0.82) 0%, rgba(10, 22, 35, 0.90) 100%);
}

/* 科技深蓝 (tech-blue: #2563EB) */
[data-theme-style="tech-blue"] {
  --hero-overlay-gradient: linear-gradient(135deg, rgba(10, 28, 64, 0.84) 0%, rgba(7, 14, 36, 0.92) 100%);
}

/* 极光鸢尾 (aurora-violet: #8B5CF6) */
[data-theme-style="aurora-violet"] {
  --hero-overlay-gradient: linear-gradient(135deg, rgba(32, 14, 56, 0.84) 0%, rgba(12, 16, 38, 0.90) 100%);
}

/* 暖阳琥珀 (warm-amber: #D97706) */
[data-theme-style="warm-amber"] {
  --hero-overlay-gradient: linear-gradient(135deg, rgba(46, 24, 7, 0.84) 0%, rgba(18, 12, 8, 0.92) 100%);
}

/* 极简水墨 (minimalist-ink: #475569) */
[data-theme-style="minimalist-ink"] {
  --hero-overlay-gradient: linear-gradient(135deg, rgba(18, 22, 30, 0.86) 0%, rgba(10, 13, 20, 0.92) 100%);
}
```

#### 3.1.2 应用场景改造
* `.archive-hero`: `background-image: var(--hero-overlay-gradient), var(--bg-archive-daily);`
* `.about-hero-trio`: `background-image: var(--hero-overlay-gradient), var(--bg-about-daily);`
* `.panoramic-about-banner .panoramic-about-overlay`: `background: var(--hero-overlay-gradient);`
* `.bottom-comm-banner`: `background-image: var(--hero-overlay-gradient), var(--bg-footer-daily);`

#### 3.1.3 无障碍可读性保障
所有大图遮罩保证最终光度透射率 `<= 0.20`，表面白色文字（`#ffffff` / `rgba(255, 255, 255, 0.9)`）与遮罩底色的物理对比度严格高于 **10:1**，远超 WCAG 2.1 AA 标准（4.5:1）。

---

### 3.2 关于页右侧留白空间策展（技能矩阵 & Now 状态看板）

#### 3.2.1 结构设计
在 `about.html` 的右侧列 `.about-interests-col` 内，紧随 4 列兴趣卡片（`interests-hairline-grid`）之后，注入 `.about-craft-matrix`（技术与创造力装备库）与 `.about-now-card`（正在打磨看板）：

```html
<!-- 4. 技术栈与创造力装备库 -->
<section class="about-craft-matrix" style="box-sizing: border-box;">
  <header class="craft-header" style="box-sizing: border-box;">
    <span class="craft-header-label">TECH STACK & CRAFT</span>
  </header>
  <section class="craft-grid" style="box-sizing: border-box;">
    <!-- 架构与工程 -->
    <section class="craft-cluster" style="box-sizing: border-box;">
      <span class="craft-cluster-title">架构与工程体系</span>
      <section class="craft-pills" style="box-sizing: border-box;">
        <span class="craft-pill">TypeScript</span>
        <span class="craft-pill">Vue 3 / React</span>
        <span class="craft-pill">Node.js</span>
        <span class="craft-pill">Hyperf / PHP</span>
        <span class="craft-pill">Docker / K8s</span>
      </section>
    </section>
    <!-- 设计与创作 -->
    <section class="craft-cluster" style="box-sizing: border-box;">
      <span class="craft-cluster-title">设计与生产力工具</span>
      <section class="craft-pills" style="box-sizing: border-box;">
        <span class="craft-pill">Figma</span>
        <span class="craft-pill">Neovim</span>
        <span class="craft-pill">Obsidian</span>
        <span class="craft-pill">macOS</span>
        <span class="craft-pill">Raycast</span>
      </section>
    </section>
  </section>
</section>

<!-- 5. 正在打磨与探索 (Now Status) 看板 -->
<section class="about-now-card" style="box-sizing: border-box;">
  <section class="now-header-row" style="box-sizing: border-box;">
    <span class="now-badge">
      <span class="now-live-dot"></span>
      <span>WHAT I'M DOING NOW</span>
    </span>
    <span class="now-time-tag">实时聚焦</span>
  </section>
  <p class="now-status-desc">
    持续打磨 <strong>obw</strong> 微信公众号出版级排版引擎与个人数字花园；探索深度 AI Agentic Coding 工作流与极客审美生活方式。
  </p>
</section>
```

#### 3.2.2 视觉排版样式
* `.about-craft-matrix`: 采用微质感卡片背景 `var(--bg-card)`，发丝边框 `1px solid var(--border-color)`，内部分为双列技术簇。
* `.craft-pill`: 采用 `var(--primary-faint)` 背景与 `var(--primary)` 文字，悬停微上浮。
* `.about-now-card`: 带有呼吸绿点动画（`pulseBreathing`）与精致左侧强调色边条。
* 彻底填补 500px 留白，使得左列与右列在桌面端视觉高度保持一致。

---

### 3.3 关于页正文等宽与现代杂志双栏流式重构 (Editorial Split-Column Flow)

#### 3.3.1 废除 820px 限制
将 `.about-post-body` 的 CSS 规则彻底重构：
```css
/* 废除旧的 max-width: min(94vw, 820px) */
.about-post-body {
  width: 100%;
  max-width: 100%;
  margin: 56px 0 72px 0;
  box-sizing: border-box;
}
```

#### 3.3.2 双栏流式章节版式 (Editorial Split Chapter)
通过结构化处理器或容器样式，将 `posts/about.md` 解析出的各章节重构为双栏流式展现：
* 布局：`display: flex; gap: 48px; align-items: flex-start;`
* **左侧章节导引 (Chapter Column)**：`flex: 0 0 240px;`
  * 包含章节编号微标（如 `01 / IDENTITY`、`02 / PHILOSOPHY`、`03 / PURPOSE`、`04 / CONNECT`）
  * 大号思源宋体二级标题（如「我是谁？」、「技术栈与日常」、「数字花园初心」）
  * 底部精致发丝渐变装饰线
* **右侧深度正文叙述 (Content Column)**：`flex: 1; min-width: 0;`
  * 承接 `obw` 出版引擎渲染的精装排版正文、Callout 引用块、加粗高亮；
  * 正文字号 `16.5px`，行高 `1.82`，段间距 `1.4em`；
* **响应式退化**：在 `@media (max-width: 860px)` 视口下，双栏自动折叠为单列垂直排版，左列标题置于正文上方。

---

## 4. 微信排版硬约束与免疫保证 (AGENTS.md 红线)

1. **零 `<div>` 准则**：所有新增的技术栈卡片、Now 看板、章节双栏及药丸徽标，**严禁使用任何 `<div>`**，全部使用 `<section style="box-sizing: border-box; ...">`、`<span>`、`<header>`、`<p>` 等语义标签。
2. **零 `display: grid`**：技术栈双列和双栏章节全部采用 `display: flex` + 百分比/固定宽 + `flex-shrink: 0` + `box-sizing: border-box`。
3. **图片物理锁死**：头像与黑胶唱片图片维持已验证的 `width="52" height="52"` 像素级行内属性与 `!important` 样式守卫。

---

## 5. 自动化测试与验证门禁 (`scripts/test-site.mjs`)

重构完成后，在测试套件中追加以下自动化断言：
1. **多主题动态遮罩断言**：断言生成的 CSS 样式表中存在 `--hero-overlay-gradient`，并在 5 套主题选择器中分别声明了对应的色相渐变值。
2. **关于页 100% 全宽断言**：断言 `about.html` 内 `.about-post-body` 不再包含 `max-width: min(94vw, 820px)`，宽度与主容器 1280px 平齐。
3. **技术装备矩阵与 Now 状态看板断言**：断言 `about.html` 包含 `about-craft-matrix`、`craft-pill`、`about-now-card` 与 `now-live-dot`。
4. **全站 12 页面 0 `<div>` 断言**：使用 Node.js AST / 正则扫描全站 12 个 HTML 文件，验证 `<main>` 内部 `<div>` 数量维持为 0。
5. **全套 18+ 测试套件 100% 通过**：`npm test` 零报错、零警告。
