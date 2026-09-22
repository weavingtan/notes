# Design Specification: Editorial Magazine Redesign & Fluid Responsive Architecture (ERNA Style)

- **Date**: 2026-09-22
- **Author**: Antigravity & Weaving Tan
- **Status**: Approved by User
- **Target Repository**: `weavingtan/notes` (`/Users/weaving/www/notes`)

---

## 1. Executive Summary & Goals

This specification defines the complete visual and architectural overhaul of the **TAN / NOTES** static personal publication site.
The goal is to eliminate generic, outdated "boxed-card" layouts, eradicate fixed-width clamps, and 100% replicate the high-end Scandinavian editorial magazine aesthetic demonstrated in the user-provided reference designs (ERNA / NOTES series), while integrating fluid viewport responsiveness inspired by modern technical publishing layouts (such as VitePress).

### Key Objectives
1. **Dynamic Fluid Viewport Architecture**: Eliminate rigid fixed-width containers (`max-width: 760px/860px`). All page views adapt fluidly to the viewport size (`min(94vw, 1280px)`), with comfortable reading measures for prose (~75-80ch) and wide-bleed breathing room for code blocks, tables, and images.
2. **Homepage Magazine Reimagining (1:1 Replica of Reference Image 3)**: Replace boxed cards with 5 bespoke editorial magazine chapters:
   - 3-Column Editorial Hero Statement (Date, Statement, 4K warm photography, Category index).
   - FEATURED Showcase (Split layout: massive title, excerpt, meta, wide architectural visual, 01/04 indicator).
   - SELECTED WRITINGS 4-Column Hairline Stream (Minimalist vertical columns, hairline dividers, zero card borders).
   - Panoramic Archive Spread (Full-bleed lake sunset banner with translucent multi-year overview).
   - Footprint & About Section (Black/white portrait, bio statement, signature, social links).
3. **Archive Page Reimagining (1:1 Replica of Reference Image 2)**:
   - Year grouping with reflection statements (`2026`, `2025`...).
   - Dotted timeline column.
   - 2-column rich editorial entries (16:10 thumbnail, date/category header, headline, reading time).
4. **Category & Tag Pages (1:1 Replica of Reference Image 4)**:
   - Hero header with tag count, quote, and photography.
   - Left sidebar with `ALL TAGS` list and counters.
   - Right main stream with tabs (`最新`, `最热`, `精选`) and horizontal cardless entries (Thumbnail + Date/Category + Title + Excerpt + Meta + Sequential Index).
5. **About Page (1:1 Replica of Reference Image 1)**:
   - 3-column Hero statement + Cozy desktop photograph + Inspiring quote & signature.
   - Personal profile + 4-column "MY INTERESTS" hairline columns with minimalist icons.
   - Panoramic landscape banner ("在生活的缝隙里，寻找热爱的方向").
6. **Bug Fixes & Dynamic Color Harmonization**:
   - Fix `.github-btn-primary` hover background/color clash (turning invisible white).
   - Bind all tag badges, category pills, and button accents dynamically to CSS theme variables (`var(--primary)`, `var(--primary-light)`, `var(--primary-glow)`) across all 5 themes.

---

## 2. Fluid Viewport Architecture & Layout System

### 2.1 Container & Grid Model
- **Outer Shell**:
  ```css
  .main-container,
  .post-container,
  .editorial-hero,
  .editorial-section {
    width: 100%;
    max-width: min(94vw, 1280px);
    margin: 0 auto;
    padding-left: clamp(16px, 3vw, 40px);
    padding-right: clamp(16px, 3vw, 40px);
    box-sizing: border-box;
  }
  ```
- **Breakpoints**:
  - **Desktop (> 1200px)**: Multi-column magazine layouts active. Main prose column centered at optimal reading measure; code blocks, wide images, and tables expand to full container width.
  - **Tablet (768px - 1199px)**: 4-column streams collapse into 2x2 grids or flexible horizontal scrolls; margins adjust fluidly.
  - **Mobile (< 768px)**: 100% full-width single-column flow, zero horizontal overflow (`overflow-x: hidden`), 16px safe edge padding, code blocks edge-to-edge with independent touch scroll.

### 2.2 Color Tokens & Theme Binding
- No hardcoded blue (`#2563eb`).
- Badges and tags inherit:
  - `background: var(--primary-light);` (subtle 10% opacity tint)
  - `color: var(--primary);`
  - `border: 1px solid var(--border-color);`
- GitHub Discussion button hover state:
  ```css
  .github-btn-primary:hover {
    background: var(--primary) !important;
    color: #ffffff !important;
    border-color: var(--primary) !important;
    box-shadow: 0 4px 14px var(--primary-glow);
    transform: translateY(-1px);
  }
  ```

---

## 3. Page-by-Page Editorial Component Specification

### 3.1 Homepage (`index.html`)
1. **Nav Header**: Brand `TAN / NOTES`, nav items `HOME`, `ARCHIVE`, `ABOUT`, quick action bar (`[🔍 Search]`, `[🎨 Theme]`, `[🌓 Mode]`).
2. **Hero Section (3 Columns)**:
   - Col 1 (30%): Current/latest date stamp (`2026 / 09 / 22`), H1 statement, English subtitle, `READ MORE →` anchor link.
   - Col 2 (50%): High-resolution architectural / warm sunlight image with subtle corner radius (6px).
   - Col 3 (20%): Vertical uppercase category navigation list (`DESIGN`, `TECHNOLOGY`, `LIFE`, `NOTES`).
3. **FEATURED Showcase**:
   - Left (35%): `FEATURED ——`, prominent H2 title, editorial excerpt, meta line (`CATEGORY / MM MIN READ`).
   - Center (55%): Wide horizontal landscape visual.
   - Right (10%): Carousel indicator (`01 / 04`, `↑ ↓` arrows).
4. **SELECTED WRITINGS (4 Columns)**:
   - Header: `SELECTED WRITINGS ——`.
   - 4 vertical columns separated by vertical hairlines (`1px solid var(--border-color)`):
     - Index (`01`, `02`, `03`, `04`) + Date (`MM.DD`)
     - Title with hover color shift to `var(--primary)`
     - Category + Reading duration
5. **Panoramic Archive Banner**:
   - Full-width background image with dark gradient.
   - Statement: `ARCHIVE —— 时间会筛选出真正重要的东西。`
   - 3 columns: `2026`, `2025`, `2024` with recent dates & titles.
   - `VIEW ALL →` link to `archives.html`.
6. **About Me Footprint**:
   - Monochromatic portrait + Bio statement + Signature + Social icons (`[Email]`, `[RSS]`, `[GitHub]`).

### 3.2 Archive Page (`archives.html`)
1. **Hero Header**: `ARCHIVE —— 归档 · 时间里的思考` + Introductory paragraph + Decorative photo + Category filter links (`ALL`, `DESIGN`, `TECH`, `LIFE`, `NOTES`).
2. **Year Blocks**:
   - Left Column: Year number (e.g. `2026`), reflection statement, post count.
   - Middle Column: Dotted vertical timeline with month markers (`09月`, `08月`...).
   - Right Column: 2-column grid of rich editorial cards: 16:10 image, date/category header, headline, reading time.
3. **Footer Pagination**: `共 N 篇文章` + Page numbers.

### 3.3 Category / Tag Pages (`categories.html` & `tags.html`)
1. **Hero Header**: Category/Tag name with count (`Design · 12 篇文章`) + Description + Feature image + Quote.
2. **Main Layout**:
   - Left Sidebar (25%): `ALL TAGS` list with item counts; active tag highlighted with vertical accent indicator.
   - Right Column (75%):
     - Tabs: `最新` (Latest), `最热` (Trending), `最多阅读` (Most Read).
     - Horizontal editorial stream: 16:10 thumbnail + Date/Category + Title + Excerpt + Reading duration + Index (`01`, `02`...).
   - Bottom Left: Portrait + "写作，是我与世界对话的方式。" + Signature.

### 3.4 About Page (`about.html`)
1. **Hero (3 Columns)**:
   - Left: `ABOUT ME —— 你好，我是 Tan。一个喜欢思考、记录和创造的人。` + Paragraph + `READ MORE →`.
   - Center: Desktop workspace photograph.
   - Right: Quote: "保持好奇，保持温柔。" + Signature + "BEIJING · 2026".
2. **Personal Info & My Interests**:
   - Left: Black & white portrait + Personal Info list (Location, Occupation, Email, Interests).
   - Right: 4-column hairline interest blocks with clean line icons:
     - 设计 DESIGN
     - 技术 TECHNOLOGY
     - 生活 LIFE
     - 阅读 NOTES
3. **Panoramic Landscape Banner**:
   - "A LITTLE MORE —— 在生活的缝隙里，寻找热爱的方向。"
   - Full panoramic landscape with handwritten "Better Things Ahead".

### 3.5 Detail Pages (`posts/*.html`)
1. **Container Width**: Inherits the fluid dynamic viewport container (`min(94vw, 1280px)`), allowing wide-bleed reading.
2. **Typography**: Refined editorial serif/sans hierarchy with 1.78 line-height and relaxed letter-spacing.
3. **Interactive Components**:
   - GitHub Issues interaction panel (Discussion, Errata, Star) with corrected hover states.
   - Related posts recommendations.
   - Focus Reading Mode toggle.
   - One-click code copy button.

---

## 4. Technical Implementation Plan & File Touches

### 4.1 Script & Template Engine Updates (`scripts/build.mjs`)
- Refactor `buildIndexHtml()` to generate the 5-chapter magazine layout.
- Refactor `buildArchivesHtml()` to generate the year-reflection + 2-column editorial stream.
- Refactor `buildCategoriesHtml()` and `buildTagsHtml()` to generate the sidebar + horizontal stream layout.
- Refactor `buildAboutHtml()` to generate the 3-column hero + 4-column interests + panoramic banner layout.
- Update `BASE_CSS` to incorporate the fluid viewport grid, hairline separators, editorial typography, and fixed button hover styles.

### 4.2 Asset Requirements
- Curated high-aesthetic images placed in `images/`:
  - `hero-workspace.jpg` (clean desktop/workspace)
  - `hero-architecture.jpg` (architectural light & shadow)
  - `hero-landscape.jpg` (panoramic mountains/lake)
  - `portrait-tan.jpg` (monochrome author portrait)
  - Fallback to existing daily Bing 4K wallpaper where appropriate.

---

## 5. Verification & Test Criteria

1. **Test Suite Integrity**: `npm test` in `notes` must pass all 7 test suites.
2. **AGENTS.md Zero `<div>` Rule**: Post content inside `<article class="article-content">` must contain **0 `<div>` tags**, strictly using `<section style="box-sizing:border-box;">`.
3. **WCAG 2.1 AA Contrast**: All text, badges, and buttons must achieve at least 4.5:1 contrast across all 5 themes and dark mode.
4. **Fluid Viewport Assertions**: Test rendering at 375px (mobile), 768px (tablet), 1280px (desktop), and 1920px (ultrawide) without horizontal scrolling or awkward layout breakage.
5. **Hover Immunity**: GitHub Discussion button hover text remains clearly readable (white text on `var(--primary)` background).
