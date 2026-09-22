# 个人网站「薄荷翡翠」视觉系统与全局多风格切换架构设计方案 (Design Specification)

- **作者**：Tan / Weaving & AI 架构协作
- **日期**：2026-09-22
- **状态**：已评审通过 (Approved)
- **目标仓库**：`weavingtan/notes` (`https://github.com/weavingtan/notes`)
- **上线地址**：`https://weavingtan.github.io/notes/`

---

## 1. 背景与设计目标 (Background & Objectives)

### 1.1 背景
个人站点当前已打通与 Obsidian 微信发布插件（`obsidian-wechat-publisher`）的双向协作链路。为了让博客具有出版级的美学品质与沉浸式阅读体验，用户明确指定参考 **「薄荷翡翠（Mint Emerald）」** 官方主题作为站点的核心主视觉，同时要求支持类似 Web Playground 的 **「一键全局多风格即时切换」** 体验。

### 1.2 核心目标
1. **1:1 像素级复刻薄荷翡翠精髓**：
   - 提取并落地标志性三段式翡翠装饰线（`── ─ ─`）；
   - 全面推行精致圆角胶囊药丸徽章（Pill Badges）；
   - 构建浅薄荷微渐变、毛玻璃悬浮与微微浮雕感的呼吸感卡片（Layered Cards）；
   - 配备极致护眼的「深林墨翠（Deep Emerald Night）」夜间模式。
2. **全局多风格无感即时切换**：
   - 在导航栏右上角提供优雅的调色盘切换器（Dropdown Palette）；
   - 精选 5 款核心风格（🌿 薄荷翡翠、🌌 科技深蓝、🔮 极光鸢尾、🍂 暖阳琥珀、✒️ 极简水墨）；
   - 切换无需刷新页面，平滑 CSS 渐变过渡；
   - 状态自动持久化到 `localStorage`，并在 HTML `<head>` 顶部注入 Zero-FOUC 脚本，消除首屏闪白。
3. **极速零依赖构建链路**：
   - 全部样式与逻辑收敛在 `notes/scripts/build.mjs` 中，无需第三方重量级前端框架，保持单次构建 < 500ms；
   - 与 `bin/obw.cjs` 排版引擎深度协同，正文模块与外壳主题统一驱动。

---

## 2. 视觉参考与设计语言提炼 (Visual Aesthetics Extraction)

参考用户提供的实测渲染截图，薄荷翡翠视觉系统的核心几何与色彩特征如下：

| 设计元素 | 视觉特征 | 技术实现规范 |
| :--- | :--- | :--- |
| **主基调色** | 清新透亮、护眼薄荷渐变 | 浅色：`#10B981` (Primary) / `linear-gradient(180deg, #E6F7F2 0%, #FFFFFF 100%)`<br>深色：`#091410` (Background) / `#34D399` (Primary Light) |
| **标题装饰线** | 标志性三段式横线（长线 + 双胶囊点） | `.theme-accent-dash`：`32px` 渐变长线 + 2 个 `8px` 胶囊点，带有 `round` 端点与 `4px` 间距 |
| **胶囊药丸** | 全圆角微透徽章，用于分类/标签/作者 | `border-radius: 9999px; padding: 4px 12px; font-size: 12px; border: 1px solid var(--pill-border); background: var(--pill-bg); color: var(--pill-text);` |
| **卡片质感** | 16px ~ 24px 大圆角，双层微发光边框 | `border-radius: 20px; border: 1px solid var(--card-border); box-shadow: var(--card-shadow); backdrop-filter: blur(12px);` |
| **排版字号** | 高对比无衬线字体，开阔行距 | 正文 `16px`，行高 `1.75`，字距微调；标题加粗高对比度 `#0F172A` / `#F8FAFC` |

---

## 3. 全局主题系统架构 (Theming Architecture & Tokens)

### 3.1 双维主题控制矩阵
整站由两个独立的 HTML 属性组合驱动：
- `data-theme`：控制色彩风格（`mint-emerald` | `tech-blue` | `aurora-violet` | `warm-amber` | `minimalist-ink`）
- `data-mode`：控制明暗模式（`light` | `dark`）

### 3.2 5 款精选主题 Design Tokens 定义

```css
/* ============================================================
 * 🌿 1. 薄荷翡翠 (Mint Emerald) - 默认首选
 * ============================================================ */
[data-theme="mint-emerald"] {
  --primary: #10B981;
  --primary-hover: #059669;
  --primary-light: #34D399;
  --primary-faint: rgba(16, 185, 129, 0.08);
  --accent-gradient: linear-gradient(135deg, #10B981 0%, #059669 100%);
  --hero-bg: linear-gradient(180deg, #E6F7F2 0%, #F3FBF8 40%, #FFFFFF 100%);
  --card-bg: #FFFFFF;
  --card-border: rgba(16, 185, 129, 0.18);
  --card-shadow: 0 4px 24px -2px rgba(16, 185, 129, 0.08);
  --pill-bg: #E6F7F2;
  --pill-border: rgba(16, 185, 129, 0.28);
  --pill-text: #065F46;
  --text-main: #0F172A;
  --text-muted: #64748B;
  --nav-bg: rgba(255, 255, 255, 0.85);
}
[data-theme="mint-emerald"][data-mode="dark"] {
  --primary: #34D399;
  --primary-hover: #6EE7B7;
  --primary-light: #A7F3D0;
  --primary-faint: rgba(52, 211, 153, 0.12);
  --accent-gradient: linear-gradient(135deg, #34D399 0%, #059669 100%);
  --hero-bg: linear-gradient(180deg, #091410 0%, #0E1D18 50%, #0B1310 100%);
  --card-bg: rgba(14, 29, 24, 0.85);
  --card-border: rgba(52, 211, 153, 0.22);
  --card-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  --pill-bg: rgba(52, 211, 153, 0.12);
  --pill-border: rgba(52, 211, 153, 0.3);
  --pill-text: #A7F3D0;
  --text-main: #F1F5F9;
  --text-muted: #94A3B8;
  --nav-bg: rgba(9, 20, 16, 0.85);
}

/* ============================================================
 * 🌌 2. 科技深蓝 (Tech Blue)
 * ============================================================ */
[data-theme="tech-blue"] {
  --primary: #2563EB;
  --primary-hover: #1D4ED8;
  --primary-light: #60A5FA;
  --primary-faint: rgba(37, 99, 235, 0.08);
  --accent-gradient: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%);
  --hero-bg: linear-gradient(180deg, #EFF6FF 0%, #F8FAFC 50%, #FFFFFF 100%);
  --card-bg: #FFFFFF;
  --card-border: rgba(37, 99, 235, 0.16);
  --card-shadow: 0 4px 24px -2px rgba(37, 99, 235, 0.08);
  --pill-bg: #DBEAFE;
  --pill-border: rgba(37, 99, 235, 0.25);
  --pill-text: #1E40AF;
  --text-main: #0F172A;
  --text-muted: #64748B;
  --nav-bg: rgba(255, 255, 255, 0.85);
}
[data-theme="tech-blue"][data-mode="dark"] {
  --primary: #60A5FA;
  --primary-hover: #93C5FD;
  --primary-light: #BFDBFE;
  --primary-faint: rgba(96, 165, 250, 0.12);
  --accent-gradient: linear-gradient(135deg, #60A5FA 0%, #2563EB 100%);
  --hero-bg: linear-gradient(180deg, #0B132B 0%, #101B3B 50%, #0A0F1D 100%);
  --card-bg: rgba(16, 27, 59, 0.85);
  --card-border: rgba(96, 165, 250, 0.22);
  --card-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  --pill-bg: rgba(96, 165, 250, 0.14);
  --pill-border: rgba(96, 165, 250, 0.3);
  --pill-text: #BFDBFE;
  --text-main: #F1F5F9;
  --text-muted: #94A3B8;
  --nav-bg: rgba(11, 19, 43, 0.85);
}

/* ============================================================
 * 🔮 3. 极光鸢尾 (Aurora Violet)
 * ============================================================ */
[data-theme="aurora-violet"] {
  --primary: #8B5CF6;
  --primary-hover: #7C3AED;
  --primary-light: #A78BFA;
  --primary-faint: rgba(139, 92, 246, 0.08);
  --accent-gradient: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
  --hero-bg: linear-gradient(180deg, #F5F3FF 0%, #FDF4FF 50%, #FFFFFF 100%);
  --card-bg: #FFFFFF;
  --card-border: rgba(139, 92, 246, 0.16);
  --card-shadow: 0 4px 24px -2px rgba(139, 92, 246, 0.08);
  --pill-bg: #EDE9FE;
  --pill-border: rgba(139, 92, 246, 0.25);
  --pill-text: #5B21B6;
  --text-main: #0F172A;
  --text-muted: #64748B;
  --nav-bg: rgba(255, 255, 255, 0.85);
}
[data-theme="aurora-violet"][data-mode="dark"] {
  --primary: #A78BFA;
  --primary-hover: #C4B5FD;
  --primary-light: #DDD6FE;
  --primary-faint: rgba(167, 139, 250, 0.12);
  --accent-gradient: linear-gradient(135deg, #A78BFA 0%, #F472B6 100%);
  --hero-bg: linear-gradient(180deg, #160D27 0%, #22153D 50%, #0F091A 100%);
  --card-bg: rgba(34, 21, 61, 0.85);
  --card-border: rgba(167, 139, 250, 0.22);
  --card-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  --pill-bg: rgba(167, 139, 250, 0.14);
  --pill-border: rgba(167, 139, 250, 0.3);
  --pill-text: #DDD6FE;
  --text-main: #F1F5F9;
  --text-muted: #94A3B8;
  --nav-bg: rgba(22, 13, 39, 0.85);
}

/* ============================================================
 * 🍂 4. 暖阳琥珀 (Warm Amber)
 * ============================================================ */
[data-theme="warm-amber"] {
  --primary: #D97706;
  --primary-hover: #B45309;
  --primary-light: #FBBF24;
  --primary-faint: rgba(217, 119, 6, 0.08);
  --accent-gradient: linear-gradient(135deg, #D97706 0%, #EA580C 100%);
  --hero-bg: linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 30%, #FFFFFF 100%);
  --card-bg: #FFFFFF;
  --card-border: rgba(217, 119, 6, 0.18);
  --card-shadow: 0 4px 24px -2px rgba(217, 119, 6, 0.08);
  --pill-bg: #FEF3C7;
  --pill-border: rgba(217, 119, 6, 0.28);
  --pill-text: #92400E;
  --text-main: #1C1917;
  --text-muted: #78716C;
  --nav-bg: rgba(255, 255, 255, 0.85);
}
[data-theme="warm-amber"][data-mode="dark"] {
  --primary: #FBBF24;
  --primary-hover: #FCD34D;
  --primary-light: #FDE68A;
  --primary-faint: rgba(251, 191, 36, 0.12);
  --accent-gradient: linear-gradient(135deg, #FBBF24 0%, #FB923C 100%);
  --hero-bg: linear-gradient(180deg, #1C1408 0%, #2A1E0D 50%, #140E06 100%);
  --card-bg: rgba(42, 30, 13, 0.85);
  --card-border: rgba(251, 191, 36, 0.22);
  --card-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  --pill-bg: rgba(251, 191, 36, 0.14);
  --pill-border: rgba(251, 191, 36, 0.3);
  --pill-text: #FDE68A;
  --text-main: #FAF8F5;
  --text-muted: #A8A29E;
  --nav-bg: rgba(28, 20, 8, 0.85);
}

/* ============================================================
 * ✒️ 5. 极简水墨 (Minimalist Ink)
 * ============================================================ */
[data-theme="minimalist-ink"] {
  --primary: #334155;
  --primary-hover: #1E293B;
  --primary-light: #64748B;
  --primary-faint: rgba(51, 65, 85, 0.08);
  --accent-gradient: linear-gradient(135deg, #334155 0%, #0F172A 100%);
  --hero-bg: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 50%, #FFFFFF 100%);
  --card-bg: #FFFFFF;
  --card-border: rgba(51, 65, 85, 0.15);
  --card-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.06);
  --pill-bg: #F1F5F9;
  --pill-border: rgba(51, 65, 85, 0.2);
  --pill-text: #1E293B;
  --text-main: #0F172A;
  --text-muted: #64748B;
  --nav-bg: rgba(255, 255, 255, 0.85);
}
[data-theme="minimalist-ink"][data-mode="dark"] {
  --primary: #94A3B8;
  --primary-hover: #CBD5E1;
  --primary-light: #E2E8F0;
  --primary-faint: rgba(148, 163, 184, 0.12);
  --accent-gradient: linear-gradient(135deg, #94A3B8 0%, #CBD5E1 100%);
  --hero-bg: linear-gradient(180deg, #0F172A 0%, #1E293B 50%, #0B1120 100%);
  --card-bg: rgba(30, 41, 59, 0.85);
  --card-border: rgba(148, 163, 184, 0.2);
  --card-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  --pill-bg: rgba(148, 163, 184, 0.14);
  --pill-border: rgba(148, 163, 184, 0.28);
  --pill-text: #E2E8F0;
  --text-main: #F8FAFC;
  --text-muted: #94A3B8;
  --nav-bg: rgba(15, 23, 42, 0.85);
}
```

### 3.3 Zero-FOUC 防闪烁注入脚本
在 `<head>` 首部内联执行，确保无论刷新或跳转，页面首次绘制时即命中正确的主题与深浅模式：
```html
<script>
  (function() {
    try {
      var savedTheme = localStorage.getItem("obw-site-theme") || "mint-emerald";
      document.documentElement.setAttribute("data-theme", savedTheme);
      var savedMode = localStorage.getItem("obw-site-mode") || 
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.setAttribute("data-mode", savedMode);
    } catch (e) {}
  })();
</script>
```

---

## 4. 导航栏风格切换盘交互设计 (Switcher UI & Interactions)

### 4.1 导航栏布局
```text
┌────────────────────────────────────────────────────────────────────────┐
│ 🏔️ Tan's Notes        [搜索]  [🎨 风格 ▼]  [☀️/🌙]  [GitHub]          │
└────────────────────────────────────────────────────────────────────────┘
```
- **调色盘按钮 (`#theme-picker-btn`)**：
  - 包含调色盘矢量图标 + 当前主题名称 + 当前主题色彩微光点（如薄荷绿小点）；
  - 点击呼出下拉面板（毛玻璃浮层，带有 `12px` 圆角和微阴影）。

### 4.2 下拉面板结构
```text
┌──────────────────────────────────────────────┐
│  选择全站风格 (Site Themes)                  │
├──────────────────────────────────────────────┤
│  ● 🌿 薄荷翡翠 (默认首选 · 清新呼吸感)    ✓  │
│  ● 🌌 科技深蓝 (现代极客 · 沉稳海蓝)         │
│  ● 🔮 极光鸢尾 (先锋灵动 · 梦幻沙龙)         │
│  ● 🍂 暖阳琥珀 (日光书房 · 温润琥珀)         │
│  ● ✒️ 极简水墨 (东方留白 · 纯粹专注)         │
└──────────────────────────────────────────────┘
```

### 4.3 切换事件处理
- 用户点击任意选项后：
  1. `document.documentElement.setAttribute("data-theme", themeId);`
  2. `localStorage.setItem("obw-site-theme", themeId);`
  3. 更新调色盘按钮上的微光圆点色值与激活对勾位置；
  4. 触发轻微平滑过渡动画（0.25s），无痛全局换肤。

---

## 5. 核心页面组件重构规范 (Component Reconstruction)

### 5.1 标志性三段式翡翠装饰线 (`.theme-accent-dash`)
```html
<div class="theme-accent-dash" aria-hidden="true">
  <span class="dash-long"></span>
  <span class="dash-dot"></span>
  <span class="dash-dot"></span>
</div>
```
```css
.theme-accent-dash {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  margin-bottom: 14px;
}
.theme-accent-dash .dash-long {
  width: 32px;
  height: 4px;
  border-radius: 9999px;
  background: var(--accent-gradient);
}
.theme-accent-dash .dash-dot {
  width: 7px;
  height: 4px;
  border-radius: 9999px;
  background: var(--primary-light);
  opacity: 0.8;
}
```

### 5.2 首页 Hero 首屏
- **顶置胶囊标签**：`🌿 个人数字花园 · 思考与沉淀`
- **标题**：加粗高对比大标题 + 下方紧随 `.theme-accent-dash`
- **今日灵感浮动日历卡片**：
  - 日期（`2026.09.22`）+ 天气图标 + 翡翠绿双引号；
  - 毛玻璃卡片底色（`backdrop-filter: blur(16px)`）；
- **个人标签云**：全胶囊形态（`wavingtan`、`全栈工程`、`产品思考`、`生活随笔`）。

### 5.3 精选文章与网格列表
- **精选大卡片**：双栏杂志布局，左侧封面大圆角（`border-radius: 16px`），右侧摘要包含分类胶囊标签、翡翠色阅读箭头。
- **最新文章分类过滤器**：药丸按钮组（全部、技术、生活、随笔），激活项填充 `var(--accent-gradient)`。
- **文章卡片网格**：4 列响应式，Hover 时不仅阴影加深，且带有 1px 细边框高亮（`border-color: var(--primary)`）。

### 5.4 文章详情页（Post Detail）
- **文章标题区**：完全对齐用户上传的截图：
  - 面包屑药丸徽章（`博客文章 · 深度思考`）+ 年份胶囊徽章；
  - 大标题 + 三段式装饰线；
  - 属性胶囊行（作者、阅读时间、字数、标签）；
  - 宽幅圆角封面图卡片。
- **正文排版协同**：
  - 引用块（Blockquote）：`background: var(--primary-faint); border-left: 4px solid var(--primary);`
  - 代码块：深色玻璃背景 + 翡翠绿复制成功状态图标；
  - 目录（TOC）：当前章节高亮呈现胶囊条与绿色指示标；
  - 顶部随动阅读进度条（`height: 3px; background: var(--accent-gradient);`）。

---

## 6. 构建链路与部署验证 (Build, Testing & Deployment)

### 6.1 构建流程更新
在 `notes/scripts/build.mjs` 中：
1. 默认主题常量更新为 `mint-emerald`；
2. 注入 5 套完整 CSS Tokens 与 `.theme-accent-dash` 样式类；
3. 导航栏模板注入调色盘下拉选择器组件；
4. 首页与详情页模板注入三段式装饰线与胶囊标签样式；
5. 生成所有静态 HTML 至 `notes/dist/`。

### 6.2 质量保证与测试检查项 (Verification Checklist)
- [ ] **全套构建成功**：`node scripts/build.mjs` 正常执行，0 警告 0 报错；
- [ ] **Zero-FOUC 验证**：在深色模式或自定义风格下硬刷新页面，无白色跳闪；
- [ ] **5 套主题切换闭环**：
  - 薄荷翡翠（默认）正确呈现绿白微光；
  - 科技深蓝、极光鸢尾、暖阳琥珀、极简水墨切换即时响应；
  - 页面跳转或刷新后保留所选主题；
- [ ] **深林墨翠夜景验证**：切换到月亮模式后，呈现墨绿底色与暗翡翠玻璃质感，字体清晰可读；
- [ ] **响应式验证**：移动端（375px）与宽屏桌面（1440px）布局自适应，无横向溢出；
- [ ] **CI/CD 触发**：推送后 GitHub Actions 构建在 25s 内上线。

---

## 7. 结论与下一步计划 (Next Steps)
本规范经过深度推演与用户逐节确认，已具备完整可执行性。下一步将启动 implementation plan（实施计划）编写，并按计划推进 `scripts/build.mjs` 的落地与上线测试。
