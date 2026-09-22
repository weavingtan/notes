# Notes Site V2 Enhancements Implementation Plan

> **Based on Spec**: [`docs/superpowers/specs/2026-09-22-notes-site-v2-enhancements-design.md`](file:///Users/weaving/www/notes/docs/superpowers/specs/2026-09-22-notes-site-v2-enhancements-design.md)
> **Goal**: Implement WeChat editorial 2-col large cards, eliminate dark-mode card whiteout, 100vw borderless bottom banner, GitHub Actions daily quote/wallpaper automation, all-subpage atmospheric gradients, mobile responsive fixes, and Obsidian metadata auto-enrichment.

---

### Task 1: Web Content Adaptor & Dark Mode Card Whiteout Fix
**Files**: `scripts/build.mjs`
- [ ] In `adaptObwHtmlForWeb(html)`:
  - Add regex replacement to rewrite inline `background:\s*(?:#ffffff|#fff|linear-gradient\([^)]*#ffffff[^)]*\))` on card modules (`wechat-module-cards`, `wechat-module-summary`, etc.) to use CSS variables `var(--bg-card)`.
- [ ] In `SITE_STYLES`:
  - Add strict dark mode card background rules:
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
- [ ] Verify `dist/about.html` and `dist/posts/*.html` in dark mode: ensure card text is high contrast against card background.

---

### Task 2: WeChat Editorial 2-Col Large Magazine Cards & Tag Refinement
**Files**: `scripts/build.mjs`
- [ ] Redesign `.latest-grid-4` to `.latest-grid-2`:
  - `grid-template-columns: repeat(2, 1fr); gap: 28px; margin-bottom: 60px;`
  - On mobile: `grid-template-columns: 1fr; gap: 20px;`
- [ ] Expand cover box:
  - `height: 220px; position: relative; overflow: hidden;`
- [ ] Refine `.tag-badge-pill`:
  - Replace ugly boxy borders with soft, pill-shaped tags:
    `border-radius: 9999px; padding: 4px 12px; font-size: 0.78rem; font-weight: 600; background: var(--primary-faint); color: var(--primary); border: 1px solid var(--pill-border);`
- [ ] Completely remove fake views count (`${views}` / `${ICONS.eye}`) from both card footer and article header.
- [ ] Card footer displays authentic date (`${ICONS.calendar} ${date}`) and reading time (`${ICONS.clock} 约 X 分钟`).
- [ ] Upgrade card title font size to `1.22rem` bold with smooth hover transition.

---

### Task 3: Fullscreen 100vw Bottom Banner & Borderless Floating Typography
**Files**: `scripts/build.mjs`
- [ ] Move `<section class="bottom-comm-banner">` outside `<main class="main-content-wrapper">` in `buildIndexPageHtml`.
- [ ] Redesign `.bottom-comm-banner`:
  - `width: 100vw; margin-left: calc(50% - 50vw); border-radius: 0; min-height: 320px; padding: 64px 40px;`
- [ ] Completely remove the rectangular box from `.banner-left`:
  - `background: transparent; border: none; box-shadow: none; padding: 0; max-width: 500px;`
  - Add text shadow: `text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);`
- [ ] Style `.social-circle-btn` with frosted glass:
  - `background: rgba(255, 255, 255, 0.16); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.32);`
- [ ] Right side of banner preserves the artwork's native calligraphy without overlay text.

---

### Task 4: Dynamic Date & GitHub Actions Daily Quote / Wallpaper Automation
**Files**: `scripts/build.mjs`, `scripts/fetch-daily-assets.mjs`, `.github/workflows/daily-sync.yml`, `data/daily-quote.json`
- [ ] Create `data/daily-quote.json` with initial curated quote and author.
- [ ] Update `scripts/build.mjs`:
  - Read `data/daily-quote.json` if present.
  - Dynamically format today's date in `SITE_CONFIG.quote.date` at build time.
  - In `CLIENT_SCRIPTS`, add runtime date updater so accessing the page always shows today's date.
- [ ] Create `scripts/fetch-daily-assets.mjs`:
  - Fetches quote from Hitokoto API (`https://v1.hitokoto.cn/?c=d&c=i&c=k&encode=json`).
  - Writes to `data/daily-quote.json`.
  - Fallback to curated inspirational quotes on error.
- [ ] Create `.github/workflows/daily-sync.yml`:
  - Runs cron `0 0 * * *` (08:00 Beijing time) + `workflow_dispatch`.
  - Steps: Checkout -> Setup Node -> Run `node scripts/fetch-daily-assets.mjs` -> Run `npm test` -> Deploy Pages.

---

### Task 5: All-Subpage Theme Atmospheric Gradient & Wallpaper Fallback Stack
**Files**: `scripts/build.mjs`
- [ ] Define `--theme-hero-gradient` in all 5 theme tokens in `SITE_STYLES`:
  - `mint-emerald`: Emerald crystal gradient
  - `tech-blue`: Cyber navy gradient
  - `aurora-violet`: Cosmic violet gradient
  - `warm-amber`: Warm amber gradient
  - `minimalist-ink`: Ink charcoal gradient
- [ ] Update `.subpage-hero-banner` across archives, categories, tags, and about pages:
  - Combine theme gradient with subtle atmospheric overlay and smooth bottom fade.
- [ ] Ensure background fallback stack: `background-color: var(--bg-page); background-image: var(--theme-hero-gradient), url(...)`.

---

### Task 6: Mobile (375px~430px) Responsive Refinements
**Files**: `scripts/build.mjs`
- [ ] In `SITE_STYLES` `@media (max-width: 768px)` and `@media (max-width: 480px)`:
  - Header: nav menu supports smooth horizontal scroll (`overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch;`) so buttons don't wrap awkwardly.
  - Category filter pills: `overflow-x: auto; white-space: nowrap; padding-bottom: 6px;`.
  - Latest cards: single-column full-width layout with touch-friendly spacing.
  - Bottom banner: centered floating layout with clean padding on 375px screens.

---

### Task 7: Obsidian Sync Pipeline Enhancement
**Files**: `/Users/weaving/www/obw/src/core/publisher/github-publisher.ts`
- [ ] Inspect and enhance `github-publisher.ts`:
  - Extract Obsidian tags from `app.metadataCache.getFileCache(activeFile)` if Frontmatter lacks `tags` or `categories`.
  - Ensure uploaded Markdown has standard YAML Frontmatter (`title`, `date`, `tags`, `categories`, `author`).

---

### Task 8: Test Suite Updates & End-to-End Verification
**Files**: `scripts/test-site.mjs`
- [ ] Update `scripts/test-site.mjs`:
  - Add assertion for 2-column magazine grid (`.latest-grid-2`).
  - Add assertion ensuring no fake view counts in output.
  - Add assertion for 100vw bottom banner.
  - Add assertion for card dark-mode contrast without whiteout.
- [ ] Run `npm test` and achieve 100% pass.
- [ ] Commit & push to `weavingtan/notes`.
- [ ] Verify GitHub Actions deploy run succeeds.
- [ ] Verify live URLs via HTTP request.
