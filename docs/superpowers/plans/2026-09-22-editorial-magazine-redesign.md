# Editorial Magazine Redesign & Fluid Responsive Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the static personal site from generic boxed-card grids into a high-end Scandinavian editorial magazine (1:1 matching the 4 reference designs) with fluid viewport-adaptive reading widths and full theme-color harmonization.

**Architecture:** Refactor the HTML/CSS generation pipeline in `scripts/build.mjs`. Transition from rigid fixed-width containers to fluid `min(94vw, 1280px)` containers. Replace boxed-card HTML generators with 5 bespoke editorial magazine chapters (Home), year-grouped timeline streams (Archives), sidebar-driven horizontal streams (Categories/Tags), and 3-column interest spreads (About). Update test assertions in `scripts/test-site.mjs` to validate all layout contracts.

**Tech Stack:** Node.js (ESM), Vanilla CSS3 (Fluid Viewport, Flexbox, CSS Variables), Static HTML Generator (`scripts/build.mjs`), Test Suite (`scripts/test-site.mjs`).

---

### Task 1: Theme Harmonization & GitHub Hover Bug Fix

**Files:**
- Modify: `scripts/build.mjs:180-260` (BASE_CSS)
- Test: `scripts/test-site.mjs:240-270`

- [ ] **Step 1: Write the failing test for button hover and dynamic tag colors**

Add test assertions in `scripts/test-site.mjs`:
```javascript
// Test: Button hover immunity and theme tag variable binding
const indexHtml = fs.readFileSync(path.join(DIST_DIR, "index.html"), "utf-8");
assert.ok(!indexHtml.includes("background:#2563eb") && !indexHtml.includes("color:#2563eb"), "Tags must not have hardcoded #2563eb");
const samplePost = fs.readFileSync(path.join(DIST_DIR, "posts/frontend-architecture-2026.html"), "utf-8");
assert.ok(samplePost.includes(".github-btn-primary:hover"), "Must have .github-btn-primary:hover rule");
assert.ok(samplePost.includes("color: #ffffff !important") || samplePost.includes("color:#ffffff !important"), "Button hover text must be pure white");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-site.mjs`
Expected: FAIL on tag color check or hover contract.

- [ ] **Step 3: Update BASE_CSS in `scripts/build.mjs`**

Fix `.github-btn-primary:hover` and dynamic badge styles:
```css
.github-btn-primary {
  background: var(--primary);
  color: #ffffff !important;
  border: 1px solid var(--primary);
  box-shadow: 0 2px 8px var(--primary-glow);
}
.github-btn-primary:hover {
  background: var(--primary) !important;
  color: #ffffff !important;
  border-color: var(--primary) !important;
  box-shadow: 0 4px 14px var(--primary-glow) !important;
  transform: translateY(-1px);
}
.tag-badge, .meta-category, .pill-tag {
  background: var(--primary-light) !important;
  color: var(--primary) !important;
  border: 1px solid var(--border-color);
  font-weight: 500;
  transition: all 0.2s ease;
}
.tag-badge:hover, .pill-tag:hover {
  background: var(--primary) !important;
  color: #ffffff !important;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/build.mjs && node scripts/test-site.mjs`
Expected: PASS Test 1-5 and new color assertions.

- [ ] **Step 5: Commit**

```bash
git add scripts/build.mjs scripts/test-site.mjs
git commit -m "fix(theme): bind tags to theme tokens and fix github button hover whiteout"
```

---

### Task 2: Fluid Viewport System & Layout Width Scaling

**Files:**
- Modify: `scripts/build.mjs:270-340` (BASE_CSS Container & Post rules)
- Test: `scripts/test-site.mjs:270-300`

- [ ] **Step 1: Write test for fluid viewport container**

In `scripts/test-site.mjs`:
```javascript
// Test: Fluid container presence and lack of fixed rigid width
const cssContent = fs.readFileSync(path.join(DIST_DIR, "index.html"), "utf-8");
assert.ok(cssContent.includes("min(94vw, 1280px)") || cssContent.includes("min(92vw, 1280px)"), "Must use dynamic fluid max-width clamp");
assert.ok(!cssContent.includes("max-width: 760px"), "Must not clamp reading width to 760px");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-site.mjs`
Expected: FAIL on `max-width: 760px` check.

- [ ] **Step 3: Implement fluid container in `scripts/build.mjs`**

Replace rigid `.post-container` and `.main-container` widths:
```css
.main-container, .post-container {
  width: 100%;
  max-width: min(94vw, 1280px);
  margin: 0 auto;
  padding: 36px clamp(16px, 3.5vw, 48px);
  box-sizing: border-box;
}
.article-content {
  width: 100%;
  max-width: 100%;
  line-height: 1.82;
  font-size: 16.5px;
  color: var(--text-main);
  word-break: break-word;
}
/* Allow code blocks and wide figures to breathe on wide viewports */
.article-content pre {
  margin: 1.8em 0;
  width: 100%;
  box-sizing: border-box;
}
@media (min-width: 1200px) {
  .post-header {
    max-width: 960px;
    margin: 0 auto 36px auto;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/build.mjs && node scripts/test-site.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build.mjs scripts/test-site.mjs
git commit -m "feat(layout): implement fluid viewport architecture across all pages"
```

---

### Task 3: Homepage Reimagining (1:1 Reference Image 3)

**Files:**
- Modify: `scripts/build.mjs:500-650` (`buildIndexHtml` and editorial styles)
- Test: `scripts/test-site.mjs:300-340`

- [ ] **Step 1: Write test for Homepage 5-Chapter Magazine Structure**

In `scripts/test-site.mjs`:
```javascript
const homeHtml = fs.readFileSync(path.join(DIST_DIR, "index.html"), "utf-8");
assert.ok(homeHtml.includes("editorial-hero"), "Homepage must include 3-column editorial hero");
assert.ok(homeHtml.includes("featured-showcase"), "Homepage must include FEATURED showcase chapter");
assert.ok(homeHtml.includes("selected-writings"), "Homepage must include SELECTED WRITINGS 4-column stream");
assert.ok(homeHtml.includes("panoramic-archive-spread"), "Homepage must include panoramic archive spread");
assert.ok(homeHtml.includes("footprint-about"), "Homepage must include footprint about section");
assert.ok(!homeHtml.includes("card-item-2"), "Must eliminate old card-item-2 grids");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-site.mjs`
Expected: FAIL on `editorial-hero`.

- [ ] **Step 3: Implement `buildIndexHtml` and editorial magazine styles**

In `scripts/build.mjs`:
1. Generate Chapter 1: 3-Column Editorial Hero (Date, Statement, Image, Category Index).
2. Generate Chapter 2: FEATURED Showcase (Title, Excerpt, Landscape Image, 01/04 Counter).
3. Generate Chapter 3: SELECTED WRITINGS (4-Column vertical stream with hairlines, indexes `01`-`04`, dates, titles, reading times).
4. Generate Chapter 4: Panoramic Archive Spread (Full-width background, 2026/2025/2024 columns, link to archives).
5. Generate Chapter 5: Footprint & About Section (Portrait, Bio, Signature, Social Icons).

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/build.mjs && node scripts/test-site.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build.mjs scripts/test-site.mjs
git commit -m "feat(home): 1:1 replicate editorial magazine 5-chapter homepage layout"
```

---

### Task 4: Archive Page Reimagining (1:1 Reference Image 2)

**Files:**
- Modify: `scripts/build.mjs:660-780` (`buildArchivesHtml`)
- Test: `scripts/test-site.mjs:340-380`

- [ ] **Step 1: Write test for Archive Year-Reflection & 2-Column Stream**

In `scripts/test-site.mjs`:
```javascript
const archivesHtml = fs.readFileSync(path.join(DIST_DIR, "archives.html"), "utf-8");
assert.ok(archivesHtml.includes("archive-hero"), "Must include archive hero with category filter");
assert.ok(archivesHtml.includes("year-block"), "Must group by year blocks");
assert.ok(archivesHtml.includes("year-timeline-dots"), "Must include dotted timeline markers");
assert.ok(archivesHtml.includes("archive-entries-grid"), "Must include 2-column editorial entries");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-site.mjs`
Expected: FAIL on `archive-entries-grid`.

- [ ] **Step 3: Implement `buildArchivesHtml` in `scripts/build.mjs`**

Group posts by year. Build left year summary (`2026` + reflection text + count), middle dotted timeline (`09月`, `08月`), and right 2-column rich editorial entries (16:10 thumbnail, date/category badge, bold title, reading time).

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/build.mjs && node scripts/test-site.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build.mjs scripts/test-site.mjs
git commit -m "feat(archives): 1:1 replicate editorial timeline archive page"
```

---

### Task 5: Category & Tag Pages Reimagining (1:1 Reference Image 4)

**Files:**
- Modify: `scripts/build.mjs:790-910` (`buildCategoriesHtml`, `buildTagsHtml`)
- Test: `scripts/test-site.mjs:380-420`

- [ ] **Step 1: Write test for Sidebar + Horizontal Stream Layout**

In `scripts/test-site.mjs`:
```javascript
const catHtml = fs.readFileSync(path.join(DIST_DIR, "categories.html"), "utf-8");
assert.ok(catHtml.includes("tag-stream-layout"), "Must include tag stream dual-column layout");
assert.ok(catHtml.includes("tag-sidebar-list"), "Must include sidebar tag list with counters");
assert.ok(catHtml.includes("horizontal-entry-item"), "Must include horizontal cardless entry stream");
assert.ok(catHtml.includes("stream-tabs"), "Must include stream filter tabs");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-site.mjs`
Expected: FAIL on `tag-stream-layout`.

- [ ] **Step 3: Implement Sidebar + Horizontal Stream in `scripts/build.mjs`**

Build left sidebar (`ALL TAGS` / `ALL CATEGORIES` with counts and active indicator), top filter tabs (`最新`, `最热`, `最多阅读`), and right horizontal entries (Thumbnail + Date/Category + Title + Excerpt + Meta + Sequential Index `01`, `02`...). Add bottom-left quote card with signature.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/build.mjs && node scripts/test-site.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build.mjs scripts/test-site.mjs
git commit -m "feat(categories): 1:1 replicate sidebar and horizontal entry stream"
```

---

### Task 6: About Page Reimagining (1:1 Reference Image 1)

**Files:**
- Modify: `scripts/build.mjs:920-1010` (`buildAboutHtml`)
- Test: `scripts/test-site.mjs:420-460`

- [ ] **Step 1: Write test for About Page 3-Column Hero & 4-Column Interests**

In `scripts/test-site.mjs`:
```javascript
const aboutHtml = fs.readFileSync(path.join(DIST_DIR, "about.html"), "utf-8");
assert.ok(aboutHtml.includes("about-hero-trio"), "Must include 3-column about hero");
assert.ok(aboutHtml.includes("interests-hairline-grid"), "Must include 4-column interests hairline grid");
assert.ok(aboutHtml.includes("panoramic-about-banner"), "Must include panoramic landscape banner");
assert.ok(aboutHtml.includes("Better Things Ahead") || aboutHtml.includes("在生活的缝隙里"), "Must include inspirational banner text");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-site.mjs`
Expected: FAIL on `interests-hairline-grid`.

- [ ] **Step 3: Implement `buildAboutHtml` in `scripts/build.mjs`**

1. 3-column Hero: Statement + Cozy desk photo + Quote & signature.
2. Middle Section: Profile info (location, occupation, email, hobbies) + 4-column My Interests (设计 DESIGN, 技术 TECHNOLOGY, 生活 LIFE, 阅读 NOTES) with SVG line icons.
3. Panoramic Landscape Banner: "在生活的缝隙里，寻找热爱的方向" + "EXPLORE MORE →" + "Better Things Ahead".

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/build.mjs && node scripts/test-site.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/build.mjs scripts/test-site.mjs
git commit -m "feat(about): 1:1 replicate editorial about page layout"
```

---

### Task 7: Full Test Suite Validation & Mobile Responsive Verification

**Files:**
- Modify: `scripts/test-site.mjs`
- Test: All 7 test suites

- [ ] **Step 1: Run comprehensive site test suite**

Run: `npm test`
Expected: All 7 test suites pass 100% (Frontmatter, 404 dead links, WCAG AA contrast, Zero-FOUC, Wechat zero-div immunity, V2 visual & dark mode immunity, V3 editorial magazine contracts).

- [ ] **Step 2: Verify zero `<div` inside article contents**

Run: `node -e 'import("./scripts/test-site.mjs")'` and check AGENTS.md zero-div rule assertion.

- [ ] **Step 3: Commit and push**

```bash
git add scripts/test-site.mjs
git commit -m "test: verify all editorial magazine layout contracts and 100% test pass"
git push origin main
```
