# 电影感全宽沉浸巨幕、人文出版排版与全栈开放 API 体系设计规范

**文档编号**：SPEC-20260923-CINEMATIC-HERO-APIS  
**创建日期**：2026-09-23  
**状态**：已批准 (Approved)  
**作者**：Tan & Antigravity  
**关联代码库**：`/Users/weaving/www/notes`  

---

## 1. 概述与核心诉求

根据用户的深度体验反馈与实际运行痛点，本次设计针对站点的视觉格调、留白美学、动态数据感知、全局交互以及持续集成稳定性进行全方位升维重构：

1. **电影感全宽沉浸巨幕 (100vw Cinematic Full-Bleed Hero)**：
   * 告别目前首页、归档、分类、关于页顶栏局限于中央窄框小图的小气感；
   * 实现与底栏同等震撼的 `100vw` 跨屏全宽视野，配合暖调暗光蒙版、杂志排印与摄影镜头感，塑造电影画卷般的阅读入口。
2. **字体与留白美学升级（消除死白）**：
   * 淘汰陈旧劣质楷体与普通手写字体，全站标题与金句升级为人文出版级 **思源宋体 (Noto Serif SC)** 与 **Newsreader / Instrument Serif** 现代杂志衬线；
   * 彻底解决分类与标签页顶部右侧孤立英文 *"Good design makes life better."* 上方大块生硬死白（Dead Whitespace）的痛点，重构为微型策展印记与经纬时辰注脚。
3. **名言警句与 Bing 故事全站落地**：
   * 每日拉取的文学/哲学金句（Hitokoto）与 Bing 摄影地理故事全面注入首页状态栏、分类页策展印记、关于页信条与拍立得背面。
4. **全栈开放 API 矩阵落地（用户确认：全部加）**：
   * 🌤️ **真实气象感应与时辰动态**（Open-Meteo 免鉴权接口）：展现真实天气、温度与二十四节气时辰胶囊；
   * ⚡ **GitHub 真实代码脉搏**（GitHub Public Events API）：实时反映最新 Commit 动态与活跃绿点；
   * 📜 **历史上的今天**（Wikimedia On-This-Day API）：归档页顶部呼应“时间会筛选出真正重要的东西”；
   * 🎵 **黑胶听觉心境**：纯 CSS 拟物微缩 3D 旋转黑胶唱片卡片，展现听觉心境。
5. **Raycast 级 Command Palette (Cmd+K) 全能指令中心**：
   * 原生零依赖极速模糊搜索，集文章检索、5 套主题切换、暗色切换、Zen 纯净阅读、快捷复制链接于一体。
6. **GitHub Actions CI 稳定性根治**：
   * 修复 `ERR_MODULE_NOT_FOUND: Cannot find package 'yaml'` 报错；
   * 工作流补齐 `npm ci`，同时在 `scripts/build.mjs` 中实现内置零依赖 YAML 解析兜底，实行双重防御。

---

## 2. 架构设计原则与红线约束

### 2.1 微信排版硬红线（AGENTS.md）
* **绝对零 `<div>` 准则**：`<main>` 内所有新旧容器、电影感横幅、模态窗口、搜索结果项、黑胶卡片、气象胶囊，**一律使用 `<section style="box-sizing: border-box; ...">`**。
* **弹性流布局**：全站禁止使用 `display: grid` 进行关键容器排版，一律采用 `display: flex` + 百分比/固定宽度，彻底免疫各种富文本粘贴引擎塌陷。
* **文字行高底线**：所有文本行高必须 `>= 1.45`，严禁无单位 `line-height: 1;`，杜绝文字重叠误判。

### 2.2 Jamstack 零运行时开销数据管线
* 外部开放 API 请求**绝不在前端页面加载时直接跨域请求**（防止 CORS 限制、Rate Limit 频控与白屏等待）；
* 统一由构建/定时脚本 `scripts/fetch-daily-assets.mjs` 在 GitHub Actions 或本地环境每日执行并生成静态文件：
  * `data/weather.json`（气象与时辰）
  * `data/github-pulse.json`（GitHub 脉搏与最新动态）
  * `data/on-this-day.json`（历史上的今天）
  * `data/daily-quote.json`（哲学金句）
  * `data/daily-bing.json`（Bing 高清壁纸与地理故事）
  * `data/vinyl.json`（当前听觉心境专辑）
* **Fail-Safe 容错兜底**：每个 API 带有 4000ms 超时中断与本地持久化缓存。若网络离线或接口异常，自动沿用已有数据或人文典雅兜底数据，确保构建 100% 成功。

---

## 3. 详细模块设计与实现规范

### 3.1 电影感全宽沉浸巨幕 (100vw Full-Bleed Hero)

#### CSS 容器穿透规范
```css
.cinematic-hero-bleed {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}
```

#### 四大核心页面形态：
1. **首页 (Index)**：
   * 采用超宽电影画幅（高度 `clamp(460px, 56vh, 620px)`）；
   * 左侧大字号出版级标题 `"记录设计、技术，以及那些值得思考的事。"` 与英文标语，配以 GitHub 最新代码脉搏微标；
   * 中央融入高分辨率暖光建筑/光影画卷，右侧收拢垂直分类索引与时辰气象。
2. **归档页 (Archives)**：
   * 全宽横幅融入暗影渐变；
   * 顶部左侧展示 `"归档 · 时间里的思考"`；
   * 注入 **Wikimedia 历史上的今天** 诗意印记（如：*“1889 年的今天：任天堂在京都创立……”*）。
3. **分类与标签页 (Categories & Tags)**：
   * 全宽大图横幅承载分类名、文章统计与策展印记。
4. **关于页 (About)**：
   * 全宽巨幕呈现个人工作台与暖光氛围，将“保持好奇，保持温柔”以现代出版宋体与手写签章融于巨幕之中。

---

### 3.2 字体排版美学与死白消除 (Typography & Whitespace)

#### 字体栈定义
```css
:root {
  --font-serif-cn: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", serif;
  --font-serif-en: "Newsreader", "Instrument Serif", Georgia, "Times New Roman", serif;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
```

#### 消除分类页顶部右侧死白：
* 将原本空荡的单一英文文本框重构为 **「每日策展印记 (Curated Footnote)」**：
  * **上方**：时辰与气象胶囊（`BEIJING · 晴 22°C / 秋分 · 申时`）；
  * **中部**：双语名言金句，*“Good design makes life better.”*（Newsreader 优雅斜体）搭配精准中译出版文字；
  * **下部**：细虚线标尺（`border-left: 1px dashed var(--border-color)`）与微型经纬度坐标（`39°54'N, 116°23'E`）。

---

### 3.3 开放 API 数据流与组件

#### 1. 气象感应 (`data/weather.json`)
* 经由 `api.open-meteo.com/v1/forecast` 获取实时温度、天气现象编码 (WMO Weather Code) 与日出日落；
* 结合当前时间生成中国传统二十四节气与十二时辰（如 `子时/丑时/.../申时`），为页面赋予随自然光律动的生命感。

#### 2. GitHub 真实代码脉搏 (`data/github-pulse.json`)
* 经由 `api.github.com/users/weavingtan/events/public` 获取最近公开提交记录（仓库名、commit message、相对时间）；
* 生成呼吸绿点微标：`● 正在打磨 obw · 3 小时前 push`。

#### 3. 历史上的今天 (`data/on-this-day.json`)
* 经由 Wikimedia 开放接口每日拉取当日历史事件精选一条，在归档页与文章脚注唤起跨越时空的心智共鸣。

#### 4. 3D 拟物黑胶唱片组件 (`data/vinyl.json`)
* 包含当前专辑名称、艺术家、封面图与精选曲目；
* 纯 CSS 实现 3D 悬浮交互：鼠标划过时，唱片从封套中向右平滑滑出并以 33 RPM 速率旋转，带来沉浸黑胶视效。

---

### 3.4 Raycast 级 Command Palette (Cmd+K)

#### 交互体系
* **快捷唤醒**：`Cmd + K`（Mac）/ `Ctrl + K`（Win）/ 顶栏点击；
* **搜索范围**：即时对预构建的 `dist/search-index.json` 进行关键词模糊高亮匹配；
* **内置快速动作 (Quick Actions)**：
  1. `🌓 切换暗色 / 浅色模式`
  2. `🎨 切换主题 (竹青 / 远山黛 / 秋香 / 海沫 / 暗夜)`
  3. `📖 切换 Zen 纯净沉浸阅读模式`
  4. `🔗 复制本文永久链接 / Markdown 引用`
  5. `📡 复制 RSS 订阅源 URL`
  6. `🧭 页面快捷直达 (首页 / 归档 / 分类 / 标签 / 关于)`
* **无障与性能**：原生零依赖 JS，DOM 结构全 `<section>` 化，完全支持全键盘 `↑` `↓` `Enter` `Esc` 盲操。

---

### 3.5 GitHub Actions CI 修复规范

1. **`.github/workflows/deploy.yml` 补全**：
   * 在 `Setup Node.js` 与 `Test and Build site` 之间注入：
     ```yaml
     - name: Install dependencies
       run: npm ci
     ```
2. **`scripts/build.mjs` 零依赖加固**：
   * 将静态 `import YAML from "yaml";` 转换为动态容错导入，或直接对接现有的行级 YAML Frontmatter 原生解析引擎；
   * 确保即使在未执行 `npm install` 的裸机环境下，运行 `node scripts/build.mjs` 也能 100% 成功，实现双重防护。

---

## 4. 自动化测试与验证指标

在 `scripts/test-site.mjs` 中追加专属测试套件：
1. **Test Suite 14: 100vw 全宽 Hero 视觉架构断言**
   * 断言 `index.html`, `archives.html`, `categories.html`, `about.html` 均包含 `.cinematic-hero-bleed` 样式或全宽类；
   * 断言 `overflow-x: hidden` 存在，杜绝横向滚动溢出。
2. **Test Suite 15: 人文出版字体与死白消除断言**
   * 断言 CSS 包含 `Noto Serif SC` 与 `Newsreader` 字体定义；
   * 断言 `categories.html` 中包含重构后的策展注脚与经纬时辰印记，不再存在孤立死白布局。
3. **Test Suite 16: 开放 API 资产与数据注入断言**
   * 校验 `data/` 目录下各 JSON 数据契约结构完整；
   * 断言构建产物成功注入天气、GitHub 脉搏、黑胶卡片与金句。
4. **Test Suite 17: Command Palette 架构与交互断言**
   * 断言页面包含 `cmd-palette-backdrop` 与快捷指令模态节点；
   * 严格断言模态容器内 **ZERO `<div>`** 标签，完全遵循 AGENTS.md。
5. **Test Suite 18: 离线构建与零依赖容错断言**
   * 模拟无外部 `yaml` 库环境执行构建，验证自愈机制与 100% 通过率。

---

## 5. 实施里程碑计划

* **阶段 1：CI 修复与零依赖容错加固**（解决 GitHub Actions 阻断）
* **阶段 2：每日开放 API 数据管线实现**（`scripts/fetch-daily-assets.mjs` + 静态 JSON 数据结构）
* **阶段 3：字体排版美学与死白消除重塑**（Noto Serif SC + Newsreader + 策展印记）
* **阶段 4：四大页面 100vw 电影感沉浸巨幕重构**（Home, Archives, Categories, About）
* **阶段 5：Raycast 级 Command Palette (Cmd+K) 与黑胶组件落地**
* **阶段 6：全量自动化测试（18 个测试套件）验证与 GitHub Actions 部署闭环**
