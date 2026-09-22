# 个人网站「薄荷翡翠」与全局多风格切换实施计划 (Implementation Plan)

- **设计规范文件**：[`docs/superpowers/specs/2026-09-22-personal-site-mint-emerald-theme-design.md`](../specs/2026-09-22-personal-site-mint-emerald-theme-design.md)
- **目标文件**：`scripts/build.mjs`
- **执行原则**：每一步具备明确的验收标准（Acceptance Criteria），分阶段推进，构建完备的测试用例并完成线上部署。

---

## 阶段一：Design Tokens 与全局 CSS 样式表升级

### 任务 1.1：配置与 Tokens 矩阵就绪
- [ ] 在 `SITE_CONFIG` 中将默认 `theme` 更新为 `"mint-emerald"`；
- [ ] 在 `scripts/build.mjs` 的 CSS 生成函数中注入 5 套完整的 Design Tokens 变量矩阵：
  - `[data-theme="mint-emerald"]`（日间薄荷微风）与 `[data-theme="mint-emerald"][data-mode="dark"]`（深林墨翠）；
  - `[data-theme="tech-blue"]`（科技深蓝）；
  - `[data-theme="aurora-violet"]`（极光鸢尾）；
  - `[data-theme="warm-amber"]`（暖阳琥珀）；
  - `[data-theme="minimalist-ink"]`（极简水墨）；
- [ ] 验收标准：执行 `node scripts/build.mjs`，构建产物 `dist/index.html` 内完整包含 5 套 `[data-theme]` CSS 规则。

### 任务 1.2：薄荷翡翠核心视觉类落地
- [ ] 实现三段式翡翠装饰线样式类 `.theme-accent-dash`（长线 `32px` + 双胶囊点 `7px`，圆角胶囊端点）；
- [ ] 实现圆角胶囊药丸通用类 `.theme-pill`（`border-radius: 9999px; background: var(--pill-bg); color: var(--pill-text); border: 1px solid var(--pill-border);`）；
- [ ] 升级卡片微质感样式（`border-radius: 20px`，`box-shadow: var(--card-shadow)`，Hover 状态平滑上浮 `translateY(-4px)` 与边框微光）；
- [ ] 验收标准：检查 CSS 语法合法，无样式冲突，基础组件类就绪。

---

## 阶段二：Zero-FOUC 防闪烁与导航栏风格切换盘 UI

### 任务 2.1：Zero-FOUC 首屏脚本注入
- [ ] 在 HTML `<head>` 顶端注入自执行防闪烁脚本：
  ```html
  <script>
    (function() {
      try {
        var theme = localStorage.getItem("obw-site-theme") || "mint-emerald";
        document.documentElement.setAttribute("data-theme", theme);
        var mode = localStorage.getItem("obw-site-mode") ||
          (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        document.documentElement.setAttribute("data-mode", mode);
      } catch (e) {}
    })();
  </script>
  ```
- [ ] 验收标准：无 JavaScript 报错，在浏览器首帧渲染时即可应用属性。

### 任务 2.2：调色盘图标与下拉菜单组件
- [ ] 在 `ICONS` 字典中补充精致矢量调色盘图标 `palette`；
- [ ] 在导航栏右侧（日光/月光切换按钮旁）新增风格切换按钮 `#theme-picker-btn`（带有当前主题色彩小圆点）；
- [ ] 实现毛玻璃悬浮下拉面板 `#theme-picker-dropdown`，列出 5 款代表作风格：
  - 🌿 薄荷翡翠 (Mint Emerald)
  - 🌌 科技深蓝 (Tech Blue)
  - 🔮 极光鸢尾 (Aurora Violet)
  - 🍂 暖阳琥珀 (Warm Amber)
  - ✒️ 极简水墨 (Minimalist Ink)
- [ ] 编写即时切换与持久化脚本：
  - 点击菜单项设置 `document.documentElement.setAttribute("data-theme", key)`；
  - 写入 `localStorage.setItem("obw-site-theme", key)`；
  - 实时更新激活对勾（Checkmark）与指示小圆点；
  - 点击外部区域自动关闭下拉框；
- [ ] 验收标准：点击任一风格瞬间全局变色，刷新页面后仍然保持所选风格。

---

## 阶段三：首页与文章详情页组件精修 (1:1 复刻截图精髓)

### 任务 3.1：首页 Hero 与模块全面改版
- [ ] 首页 Hero 标题下方插入 `.theme-accent-dash` 三段式装饰线；
- [ ] 首屏增加欢迎胶囊徽章（`🌿 个人数字花园 · 思考与沉淀`）；
- [ ] 优化今日日历/语录浮动卡片为高质感毛玻璃微浮雕卡片；
- [ ] 最新文章分类选择器升级为圆角胶囊药丸，激活态使用 `var(--accent-gradient)`；
- [ ] 验收标准：首页展现出与参考图高度一致的轻盈薄荷微风与翡翠科技感。

### 任务 3.2：文章详情页（Post Detail）沉浸式重排
- [ ] 详情页顶部标题区重构：
  - 顶部面包屑胶囊标签 + 年份状态胶囊（如 `2026 · Pro`）；
  - 文章大标题 + 下方紧随 `.theme-accent-dash` 三段式翡翠装饰线；
  - 作者（`wavingtan`）与分类标签胶囊行；
  - 宽幅大圆角封面图容器（`border-radius: 16px`）；
- [ ] 正文排版微调：
  - 引用块（Blockquote）与提示块（Callout）注入薄荷底色与翡翠边框；
  - 目录（TOC）激活态增加胶囊高亮标记；
  - 顶部随动翡翠绿阅读进度条；
- [ ] 验收标准：打开任一文章页（如 `welcome.html`），排版版式与用户截图 1:1 呼应。

---

## 阶段四：测试自动化、代码审查与线上交付

### 任务 4.1：本地构建与自动化测试套件
- [ ] 编写轻量级验证脚本 `scripts/test-theme-build.mjs`：
  - 校验 `dist/index.html` 和各文章 HTML 是否生成完毕；
  - 断言 HTML 包含 5 套主题选择器、防闪烁脚本、调色盘切换器与 `.theme-accent-dash`；
  - 验证全量链接与配图相对路径正确；
- [ ] 执行全套自动化验证；
- [ ] 验收标准：自动化校验 100% 通过。

### 任务 4.2：提交推送与 GitHub Actions 验证
- [ ] 将更新的代码、构建脚本与测试文件提交至 `weavingtan/notes` 仓库；
- [ ] 推送至 `main` 分支触发 GitHub Actions；
- [ ] 监控 CI/CD 工作流，确保 25 秒内构建成功并部署到 GitHub Pages；
- [ ] 访问 `https://weavingtan.github.io/notes/` 进行现场验收。
