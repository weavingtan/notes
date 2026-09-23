#!/usr/bin/env node
/**
 * @file build.mjs
 * Tan's Blog / Weaving's Notes 出版级排版静态站点构建引擎
 * 严格按照用户提供的设计视觉稿 1:1 像素级复现：
 * - 顶部透明/毛玻璃随动导航 + 标志性双峰山岳 Logo
 * - 晨曦云海全景 Hero + 毛笔行楷大标题 ("记录思考 也记录生活") + 悬浮日历名言卡片 (纯净无重叠文字)
 * - 精选文章 (FEATURED) 宽幅双栏杂志大卡片
 * - 最新文章 (LATEST) 4 列流体响应式卡片网格 + 全动态分类药丸联动筛选 (零硬编码)
 * - 底部月升夜景互动横幅 (方案一: 左侧毛玻璃互动卡片 + 右侧原生画作留白)
 * - 完备的日间/夜间深色模式 (Zero-FOUC 零闪烁，WCAG AA 高对比度保障)
 * - 独立二级页面体系：/index.html, /archives.html, /categories.html, /about.html
 * - 健壮的 YAML Frontmatter 解析器 (支持多行列表、内联数组、标量、Draft、排序权重)
 * - Web Content Adaptor (消除 obw 微信内联深色，暗黑模式文字水晶般通透)
 * - Obsidian 双向链接 (Wikilinks) 与特殊页面 (about.md) 自动化渲染管线
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

// 动态载入 yaml 库；若环境未安装 node_modules 则自动降级至内置零依赖轻量解析器
let YAMLParser = null;
try {
  const mod = await import("yaml");
  YAMLParser = mod.default || mod;
} catch {
  // 零依赖环境自动自愈降级
}

/**
 * 零依赖轻量级 YAML 解析器 (环境缺失 yaml 时的纯净自愈降级)
 */
function parseYamlFallback(str) {
  const result = {};
  const lines = str.split(/\r?\n/);
  let currentKey = null;
  let currentSubKey = null;
  let activeSection = null;

  for (let rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = rawLine.search(/\S/);

    if (indent === 0) {
      const colonIdx = rawLine.indexOf(":");
      if (colonIdx !== -1) {
        currentKey = rawLine.slice(0, colonIdx).trim();
        const val = rawLine.slice(colonIdx + 1).trim();
        if (val) {
          result[currentKey] = val.replace(/^['"]|['"]$/g, "");
          activeSection = null;
        } else {
          result[currentKey] = {};
          activeSection = result[currentKey];
          currentSubKey = null;
        }
      }
    } else if (indent > 0 && activeSection) {
      if (trimmed.startsWith("- ")) {
        const itemVal = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, "");
        if (currentSubKey) {
          if (!Array.isArray(activeSection[currentSubKey])) activeSection[currentSubKey] = [];
          activeSection[currentSubKey].push(itemVal);
        } else {
          if (!Array.isArray(result[currentKey])) result[currentKey] = [];
          result[currentKey].push(itemVal);
        }
      } else {
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx !== -1) {
          currentSubKey = trimmed.slice(0, colonIdx).trim();
          const val = trimmed.slice(colonIdx + 1).trim();
          if (val) {
            activeSection[currentSubKey] = val.replace(/^['"]|['"]$/g, "");
          } else {
            activeSection[currentSubKey] = [];
          }
        }
      }
    }
  }
  return result;
}

export function parseYamlSafe(str) {
  if (YAMLParser && typeof YAMLParser.parse === "function") {
    try {
      return YAMLParser.parse(str);
    } catch {
      // Fallback
    }
  }
  return parseYamlFallback(str);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT_DIR, "posts");
const IMAGES_DIR = path.join(ROOT_DIR, "images");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const DIST_POSTS_DIR = path.join(DIST_DIR, "posts");
const DIST_IMAGES_DIR = path.join(DIST_DIR, "images");
const DATA_DIR = path.join(ROOT_DIR, "data");
const QUOTE_FILE = path.join(DATA_DIR, "daily-quote.json");
const WALLPAPERS_FILE = path.join(DATA_DIR, "daily-wallpapers.json");
const WEATHER_FILE = path.join(DATA_DIR, "weather.json");
const GITHUB_PULSE_FILE = path.join(DATA_DIR, "github-pulse.json");
const ON_THIS_DAY_FILE = path.join(DATA_DIR, "on-this-day.json");
const VINYL_FILE = path.join(DATA_DIR, "vinyl.json");

/**
 * 动态获取今天日期 (YYYY.MM.DD)
 */
export function getTodayFormattedDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

/**
 * 默认全站数据基座（出版级高审美兜底）
 */
export const DEFAULT_SITE_DATA = {
  title: "TAN",
  author: "Tan",
  description: "这是我的个人博客，记录技术、产品、生活与成长。希望这些文字，能在某个时刻，给你带来一点启发。",
  siteUrl: "https://weavingtan.github.io/notes",
  theme: "mint-emerald",
  githubUrl: "https://github.com/weavingtan",
  email: "weavingtan@gmail.com",
  wechatName: "Weaving Notes",
  wechatQrUrl: "images/wechat-qr.png",
  motto: "保持好奇，保持温柔。",
  bio: "一个喜欢思考、记录和创造的人。在这里，我分享一些关于设计、技术、生活的所见所想。",
  quote: {
    date: "2026.09.22",
    weather: "24° ☀️",
    text: "“生活不在别处，<br>就在当下的每一个选择里。”",
    author: "Tan",
  },
  hero: {
    calligraphy: ["记录思考", "也记录生活"],
    cursive: "Better Me, Better Life",
    bio: "这是我的个人数字花园，记录技术、产品、生活与成长。<br>希望这些文字，能在某个时刻，给你带来一点启发。",
  },
  banner: {
    calligraphy: ["总有一些思考", "值得被认真记录"],
  },
  nav: [
    { label: "首页", href: "index.html", key: "home" },
    { label: "文章", href: "articles.html", key: "articles" },
    { label: "归档", href: "archives.html", key: "archives" },
    { label: "关于", href: "about.html", key: "about" }
  ],
  personal_info: {
    "坐标": "北京 · 朝阳",
    "职业": "全栈架构师 / 产品设计师",
    "状态": "🌱 正在深度打磨数字花园与出版排版",
    "邮箱": "tan@example.com",
    "GitHub": "https://github.com/weavingtan",
    "微信": "weaving_tan",
    "喜欢": "架构演进、开源、阅读、摄影、咖啡"
  },
  social_links: [
    { platform: "mail", title: "发送邮件", href: "mailto:tan@example.com" },
    { platform: "rss", title: "RSS 订阅", href: "feed.xml" },
    { platform: "github", title: "GitHub 主页", href: "https://github.com/weavingtan" },
    { platform: "about", title: "关于我", href: "about.html" }
  ],
  pages: {
    home: {
      hero_headline: "记录设计、技术，以及那些值得思考的事。",
      hero_subheadline: "I write about design, technology and everything in between.",
      hero_cta: "READ MORE →",
      archive_quote: "时间会筛选出真正重要的东西。"
    },
    articles: {
      title: "文章专题",
      subtitle: "探索体系化思考与技术实现的交汇点。按主题聚类的长文脉络，记录架构设计、工程实践与生活感悟。",
      sidebar_quote: "写作，是我与世界对话的方式。",
      sidebar_signature: "Tan"
    },
    archives: {
      title: "归档 · 时间里的思考",
      subtitle: "时间会筛选出真正重要的东西。在这里，按时间脉络归档记录所有关于架构思考、工程设计与生活哲学的文字足迹。",
      reflections: {
        "2026": "这一年，我更关注生活的质感与思考的深度。重构感知，在代码与文字间探寻数字世界的温度与秩序。",
        "2025": "在代码与现实的交织中寻找秩序，沉淀关于架构、设计与自我成长的答案。",
        "2024": "探索未知与可能，跨越不同技术栈的边界，以文字作为思考的锚点与心智的索引。"
      }
    },
    about: {
      hero_title: "你好，我是 Tan。<br>一个喜欢思考、记录和<br>创造的人。",
      hero_subtitle: "在这里，我分享一些关于设计、技术、生活的所见所想。",
      hero_quote: "保持好奇，保持温柔。",
      hero_date: "BEIJING · 2026",
      banner_title: "在生活的缝隙里，寻找热爱的方向。",
      banner_subtitle: "写下思考 · 记录成长 · 分享生活",
      banner_cursive: "Better Things Ahead"
    },
    comm_banner: {
      title: "与我交流",
      desc: "如果你对文章有任何想法，或者有技术、产品、生活方面的问题，欢迎在评论区留言，或通过其他方式联系我。"
    }
  }
};

/**
 * 递归深度合并对象
 */
function deepMerge(target, source) {
  if (!source || typeof source !== "object") return target;
  const result = Array.isArray(target) ? [...target] : { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target ? target[key] : undefined;
    if (srcVal && typeof srcVal === "object" && !Array.isArray(srcVal) && tgtVal && typeof tgtVal === "object" && !Array.isArray(tgtVal)) {
      result[key] = deepMerge(tgtVal, srcVal);
    } else if (srcVal !== undefined && srcVal !== null && srcVal !== "") {
      result[key] = srcVal;
    }
  }
  return result;
}

/**
 * 动态加载全站 Markdown 配置
 */
export function loadSiteConfig() {
  let loadedData = {};
  const configCandidates = [
    path.join(POSTS_DIR, "site.md"),
    path.join(POSTS_DIR, "about.md")
  ];

  for (const candidate of configCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, "utf-8");
        const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (match) {
          const parsed = parseYamlSafe(match[1]);
          if (parsed && typeof parsed === "object") {
            loadedData = parsed;
            break;
          }
        }
      } catch (err) {
        console.warn(`⚠️ 解析 ${path.basename(candidate)} 出现异常，自愈回退:`, err.message);
      }
    }
  }

  // 映射顶层字段
  const mapped = { ...loadedData };
  if (mapped.site_name) mapped.title = mapped.site_name;
  if (mapped.site_description) mapped.description = mapped.site_description;
  if (mapped.email) mapped.email = mapped.email;
  if (mapped.github) mapped.githubUrl = mapped.github;

  return deepMerge(DEFAULT_SITE_DATA, mapped);
}

// 站点元数据配置 (动态驱动 + 默认值保障)
export const SITE_CONFIG = loadSiteConfig();

/**
 * 读取每日金句（优先读取 GitHub Action 定时抓取的 data/daily-quote.json，带优雅降级）
 */
export function getDailyQuote() {
  try {
    if (fs.existsSync(QUOTE_FILE)) {
      const content = JSON.parse(fs.readFileSync(QUOTE_FILE, "utf-8"));
      if (content && content.text) {
        return {
          date: getTodayFormattedDate(),
          weather: "24° ☀️",
          text: content.text,
          author: content.author || SITE_CONFIG.author,
        };
      }
    }
  } catch (err) {
    // 优雅降级
  }
  return {
    ...SITE_CONFIG.quote,
    date: getTodayFormattedDate(),
  };
}

/**
 * 读取多源每日壁纸元数据矩阵
 */
export function getDailyWallpapers() {
  if (fs.existsSync(WALLPAPERS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(WALLPAPERS_FILE, "utf-8"));
    } catch {}
  }
  return {
    updatedAt: getTodayFormattedDate().replace(/\./g, "-"),
    scenes: {
      hero: { title: "金秋平分，地坛染黄", copyright: "地坛公园秋日美景，北京，中国 (© by Wei/Adobestock)", file: "images/daily/hero.webp" },
      archive: { title: "金色时节", copyright: "瓜兹曼山口附近的秋日山杨林，犹他州，美国", file: "images/daily/archive.webp" },
      footer: { title: "终获巴黎青睐的铁塔", copyright: "日落时分的埃菲尔铁塔，巴黎，法国", file: "images/daily/footer.webp" },
      about: { title: "穿越山口腹地", copyright: "温纳茨山口，峰区国家公园，英格兰", file: "images/daily/about.webp" },
      banner: { title: "为丰收举杯", copyright: "桑特奈葡萄酒产区葡萄园中的索林风车，伯恩丘，勃艮第，法国", file: "images/daily/banner.webp" }
    }
  };
}

/**
 * 获取指定场景的今日壁纸
 */
export function getDailyWallpaper(scene = "hero") {
  const all = getDailyWallpapers();
  if (all && all.scenes && all.scenes[scene]) {
    return all.scenes[scene];
  }
  const wallpaperPath = path.resolve(ROOT_DIR, "data/daily-wallpaper.json");
  if (fs.existsSync(wallpaperPath)) {
    try {
      return JSON.parse(fs.readFileSync(wallpaperPath, "utf-8"));
    } catch {}
  }
  return {
    title: "金色时节",
    copyright: "瓜兹曼山口附近的秋日山杨林，犹他州，美国",
    url: "images/hero-daily.jpg",
    updatedAt: "2026-09-23",
  };
}

/**
 * 读取气象与时辰数据 (带优雅兜底)
 */
export function getDailyWeather() {
  if (fs.existsSync(WEATHER_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(WEATHER_FILE, "utf-8"));
    } catch {}
  }
  return {
    city: "Beijing",
    cityCn: "北京",
    coordinates: "39°54'N, 116°23'E",
    temp: 24,
    condition: "晴朗",
    icon: "☀️",
    solarTerm: "秋分",
    chineseHour: "申时",
    summary: "北京 · 晴 24°C / 秋分 · 申时",
    updatedAt: getTodayFormattedDate().replace(/\./g, "-")
  };
}

/**
 * 读取 GitHub 真实代码脉搏数据 (带优雅兜底)
 */
export function getGithubPulse() {
  if (fs.existsSync(GITHUB_PULSE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(GITHUB_PULSE_FILE, "utf-8"));
    } catch {}
  }
  return {
    username: "weavingtan",
    repo: "obw",
    message: "feat(engine): 优化全 section 渲染管线与微信后台免疫力",
    relativeTime: "刚刚",
    sparkline: [4, 6, 8, 3, 7, 5, 9],
    statusText: "正在打磨 obw · 活跃维护中",
    updatedAt: getTodayFormattedDate().replace(/\./g, "-")
  };
}

/**
 * 读取历史上的今天 (带优雅兜底)
 */
export function getOnThisDay() {
  if (fs.existsSync(ON_THIS_DAY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(ON_THIS_DAY_FILE, "utf-8"));
    } catch {}
  }
  return {
    year: 1889,
    text: "任天堂在京都创立，最初生产花札纸牌，后演进为全球先锋。",
    category: "历史上的今天",
    display: "1889 年的今天：任天堂在京都创立，最初生产花札纸牌，后演进为全球先锋。",
    updatedAt: getTodayFormattedDate().replace(/\./g, "-")
  };
}

/**
 * 读取听觉心境黑胶唱片配置 (带优雅兜底)
 */
export function getVinylData() {
  if (fs.existsSync(VINYL_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(VINYL_FILE, "utf-8"));
    } catch {}
  }
  return {
    title: "Opus",
    artist: "坂本龙一 (Ryuichi Sakamoto)",
    releaseYear: "2023",
    label: "Milan Records",
    vibe: "静谧钢琴 · 晨曦沉思",
    currentTrack: "Aqua",
    jacket: "images/hero-architecture.jpg",
    updatedAt: getTodayFormattedDate().replace(/\./g, "-")
  };
}

// 5 款精选全站风格定义
export const SITE_THEMES = [
  { id: "mint-emerald", name: "薄荷翡翠", desc: "默认首选 · 清新微质感与护眼呼吸感", color: "#10B981" },
  { id: "tech-blue", name: "科技深蓝", desc: "现代极客 · 沉稳海蓝与电青冷光", color: "#2563EB" },
  { id: "aurora-violet", name: "极光鸢尾", desc: "先锋灵动 · 紫粉梦幻渐变与艺术沙龙", color: "#8B5CF6" },
  { id: "warm-amber", name: "暖阳琥珀", desc: "日光书房 · 温润琥珀金与复古纸韵", color: "#D97706" },
  { id: "minimalist-ink", name: "极简水墨", desc: "东方留白 · 高级冷灰与纯粹文字专注", color: "#475569" },
];

// 纯矢量 SVG 图标库
export const ICONS = {
  palette: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  mountain: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 19 6-12 5 9 3-4 4 7H3Z"/></svg>`,
  sun: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  moon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  user: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/></svg>`,
  calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  chat: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  arrowRight: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  arrowLeft: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`,
  arrowUp: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>`,
  mail: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  github: `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
  globe: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  copy: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  toc: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></svg>`,
  cross: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  tag: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><circle cx="7" cy="7" r=".5" fill="currentColor"/></svg>`,
  folder: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  bookOpen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  star: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  edit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>`,
  rss: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>`
};

// 探测可用的 obw CLI 路径
export function findObwCli() {
  const candidates = [
    path.resolve(ROOT_DIR, "../obw/bin/obw.js"),
    path.resolve(ROOT_DIR, "bin/obw.cjs"),
    path.resolve(ROOT_DIR, "bin/obw.js"),
    path.resolve(ROOT_DIR, "../../bin/obw.js"),
    path.resolve(ROOT_DIR, "node_modules/obsidian-wechat-publisher/bin/obw.js"),
    path.resolve(ROOT_DIR, "../node_modules/obsidian-wechat-publisher/bin/obw.js"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const obwCliPath = findObwCli();
if (obwCliPath) {
  console.log(`✨ 找到 obw 排版引擎: ${obwCliPath}`);
} else {
  console.warn("⚠️ 未找到本地 obw CLI，构建时将尝试系统 npx obw。");
}

export const SITE_THEME_TO_OBW = {
  "mint-emerald": "fresh-mint",
  "tech-blue": "tech-blue",
  "aurora-violet": "cyberpunk",
  "warm-amber": "autumn-leaf",
  "minimalist-ink": "nordic-minimal",
};


/**
 * 组装统一的品牌 TAN Logo HTML
 */
export function buildBrandHtml(isSubdir = false) {
  const href = isSubdir ? "../index.html" : "index.html";
  return `
    <a href="${href}" class="site-brand" title="返回首页">
      <span class="site-brand-icon">${ICONS.mountain}</span>
      <span class="brand-text">TAN</span>
      <span class="brand-badge">// NOTES</span>
    </a>
  `.trim();
}

/**
 * HTML 转义。frontmatter 是自由文本，直接拼进 HTML / 属性会破版甚至造成 XSS，
 * 因此所有「展示用」字段在进入模板前必须经过它。
 */
export function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '\"': "&quot;",
    "'": "&#39;",
  }[c]));
}

/**
 * XML 转义（RSS / Atom 专用，实体集与 HTML 转义不同）
 */
function escapeXml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  }[c]));
}

/**
 * 生成 RSS 2.0 订阅源。
 * 必须取 metaRaw（未转义原文）——meta 里的展示字段已被 HTML 转义，
 * 直接写进 XML 会变成 &amp;lt; 这类双重转义。
 */
export function buildRssFeed(posts) {
  const base = SITE_CONFIG.siteUrl.replace(/\/+$/, "");
  const feedUrl = `${base}/feed.xml`;

  const asUtcString = (d) => {
    if (!d) return null;
    const dt =
      d instanceof Date
        ? d
        : new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? `${d}T00:00:00Z` : d);
    return isNaN(dt.getTime()) ? null : dt.toUTCString();
  };

  const items = posts
    .map((p) => {
      const raw = p.metaRaw || {};
      const title = raw.title || p.meta.title;
      const desc = raw.description || "";
      const url = `${base}/posts/${p.slug}.html`;
      const pubDate = asUtcString(p.meta.date);
      const cats = (raw.categories || p.meta.categories || [])
        .map((c) => `      <category>${escapeXml(c)}</category>`)
        .join("\n");

      return [
        "    <item>",
        `      <title>${escapeXml(title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : null,
        `      <description>${escapeXml(desc)}</description>`,
        cats || null,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const lastBuildDate = asUtcString(posts[0] && posts[0].meta.date) || new Date().toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_CONFIG.title)}</title>
    <link>${escapeXml(base)}/</link>
    <description>${escapeXml(SITE_CONFIG.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

/**
 * 提取全站文章轻量搜索索引 (用于 Cmd+K 即时全局模糊检索)
 * 注意：索引里的 title/desc 必须是「未转义」的原始文本，
 * 否则客户端渲染时会被二次转义成 &amp;lt; 之类。
 */
export function buildSearchIndex(posts) {
  return posts.map((p) => ({
    title: (p.metaRaw && p.metaRaw.title) || p.meta.title,
    desc: (p.metaRaw && p.metaRaw.description) || "",
    categories: (p.metaRaw && p.metaRaw.categories) || p.meta.categories || [],
    tags: (p.metaRaw && p.metaRaw.tags) || p.meta.tags || [],
    slug: p.slug,
    date: p.meta.date || "",
  }));
}

/**
 * 根据文章分类和标签重合度智能推荐相关文章 (最多 limit 篇)
 */
export function getRelatedPosts(currentPost, allPosts, limit = 2) {
  if (!allPosts || allPosts.length === 0) return [];
  const currentCats = new Set((currentPost.meta.categories || []).map((c) => c.toLowerCase()));
  const currentTags = new Set((currentPost.meta.tags || []).map((t) => t.toLowerCase()));

  const candidates = allPosts
    .filter((p) => p.slug !== currentPost.slug)
    .map((p) => {
      let score = 0;
      (p.meta.categories || []).forEach((c) => {
        if (currentCats.has(c.toLowerCase())) score += 3;
      });
      (p.meta.tags || []).forEach((t) => {
        if (currentTags.has(t.toLowerCase())) score += 2;
      });
      return { post: p, score };
    })
    .sort((a, b) => b.score - a.score || (b.post.meta.date || "").localeCompare(a.post.meta.date || ""));

  return candidates.slice(0, limit).map((c) => c.post);
}

/**
 * 组装文章底部 GitHub 极客互动操作条
 */
export function buildPostGithubInteraction(post) {
  // 用未转义的原始标题构造 URL，避免出现 &amp;amp; 这类双重转义
  const rawTitle = (post.metaRaw && post.metaRaw.title) || post.meta.title;
  const issueDiscussUrl = `https://github.com/weavingtan/notes/issues/new?title=${encodeURIComponent('关于《' + rawTitle + '》的探讨与反馈')}&body=${encodeURIComponent('### 讨论文章\n《' + rawTitle + '》\n\n### 讨论内容或想法\n')}`;
  const issueErrataUrl = `https://github.com/weavingtan/notes/issues/new?labels=bug,errata&title=${encodeURIComponent('[勘误] 《' + rawTitle + '》')}&body=${encodeURIComponent('### 勘误文章\n《' + rawTitle + '》\n\n### 错误描述与修改建议\n')}`;
  const repoUrl = `https://github.com/weavingtan/notes`;

  return `
    <section class="post-github-interaction" style="box-sizing:border-box;">
      <section class="github-interaction-card" style="box-sizing:border-box;">
        <section class="interaction-header" style="box-sizing:border-box;">
          <span class="interaction-icon">${ICONS.github}</span>
          <section class="interaction-titles" style="box-sizing:border-box;">
            <h4 class="interaction-title">极客互动与开源探讨</h4>
            <p class="interaction-desc">本文由 Markdown 驱动并托管在 GitHub 开源仓库。欢迎参与讨论交流、提出修改勘误，或点亮 Star 支持。</p>
          </section>
        </section>
        <section class="interaction-actions" style="box-sizing:border-box;">
          <a href="${issueDiscussUrl}" target="_blank" rel="noopener" class="interaction-btn primary github-btn-primary">
            ${ICONS.chat} 参与 GitHub 讨论
          </a>
          <a href="${issueErrataUrl}" target="_blank" rel="noopener" class="interaction-btn secondary">
            ${ICONS.edit} 提交勘误
          </a>
          <a href="${repoUrl}" target="_blank" rel="noopener" class="interaction-btn star">
            ${ICONS.star} Star 本项目
          </a>
        </section>
      </section>
    </section>
  `.trim();
}

/**
 * 组装文章底部智能延伸阅读推荐卡片
 */
export function buildPostRecommendations(relatedPosts) {
  if (!relatedPosts || relatedPosts.length === 0) return "";
  return `
    <section class="post-recommendations" style="box-sizing:border-box;">
      <section class="recommendations-header" style="box-sizing:border-box;">
        <h3 class="recommendations-title">${ICONS.folder} 延伸阅读推荐</h3>
      </section>
      <section class="recommendations-grid" style="box-sizing:border-box;">
        ${relatedPosts.map((p) => `
          <a href="${p.slug}.html" class="recommend-card">
            <span class="recommend-card-badge">${(p.meta.categories && p.meta.categories[0]) || "随笔"}</span>
            <h4 class="recommend-card-title">${p.meta.title}</h4>
            <p class="recommend-card-desc">${p.meta.description || ""}</p>
            <section class="recommend-card-meta" style="box-sizing:border-box;">
              <span>${ICONS.calendar} ${p.meta.date || ""}</span>
              <span class="recommend-card-read">阅读全文 ${ICONS.arrowRight}</span>
            </section>
          </a>
        `).join("")}
      </section>
    </section>
  `.trim();
}

export function renderWithObw(markdownText, theme = SITE_CONFIG.theme) {
  const obwTheme = SITE_THEME_TO_OBW[theme] || theme || "fresh-mint";
  try {
    if (obwCliPath) {
      return execFileSync("node", [obwCliPath, "convert", "-", "--theme=" + obwTheme, "--stdout"], {
        input: markdownText,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });
    }
    return execFileSync("npx", ["obw", "convert", "-", "--theme=" + obwTheme, "--stdout"], {
      input: markdownText,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    console.warn("⚠️ 调用 obw 渲染失败，使用原生 HTML 降级:", err.message);
    return `<section class="fallback-content">${markdownText.replace(/\n\n/g, "</p><p>")}</section>`;
  }
}

/**
 * 健壮的 YAML Frontmatter 解析器
 * 支持：
 * - 多行列表 (tags:\n  - a\n  - b)
 * - 内联数组 (tags: [a, b])
 * - 标量、布尔、数字、引号与注释剥离
 * - category / categories 统一归一化
 * - 缺失标题时自动提取首个 H1
 * - 缺失分类时自动 fallback 到首个 tag 或「未分类」
 */
export function parseFrontmatter(rawContent) {
  const meta = {
    title: "",
    date: "",
    tags: [],
    categories: [],
    cover: "",
    description: "",
    author: SITE_CONFIG.author,
    featured: false,
    draft: false,
    order: undefined,
    views: "",
    comments: "",
  };

  const fmMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) {
    const lines = rawContent.split(/\r?\n/);
    let title = "未命名笔记";
    let body = rawContent;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("# ")) {
        title = line.replace(/^#\s+/, "").trim();
        lines.splice(i, 1);
        body = lines.join("\n");
        break;
      }
    }
    meta.title = title;
    meta.categories = ["未分类"];
    return { meta, body };
  }

  const yamlBlock = fmMatch[1];
  const body = fmMatch[2];

  const lines = yamlBlock.split(/\r?\n/);
  let activeListKey = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 跳过纯空行与全注释行
    if (!trimmed || trimmed.startsWith("#")) continue;

    // 检查是否为处于活跃多行列表中的子项 (- item)
    if (activeListKey && trimmed.startsWith("- ")) {
      const itemVal = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, "");
      if (itemVal) {
        meta[activeListKey].push(itemVal);
      }
      continue;
    }

    // 键值行判定 (key: val)
    const colonIdx = rawLine.indexOf(":");
    if (colonIdx === -1) {
      continue;
    }

    const key = rawLine.slice(0, colonIdx).trim();
    let val = rawLine.slice(colonIdx + 1).trim();

    // 剥离行末注释 (需确保不在引号内)
    if (!val.startsWith('"') && !val.startsWith("'") && val.includes(" #")) {
      val = val.slice(0, val.indexOf(" #")).trim();
    }

    // 去除外层引号
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    // 标签与分类归一化处理
    if (key === "tags" || key === "tag" || key === "categories" || key === "category") {
      const targetField = (key === "tags" || key === "tag") ? "tags" : "categories";

      if (val.startsWith("[") && val.endsWith("]")) {
        // 内联数组形式: [a, b, c]
        const items = val
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
        meta[targetField] = Array.from(new Set([...meta[targetField], ...items]));
        activeListKey = null;
      } else if (val) {
        // 单个内联字符串值: tags: 前端工程
        meta[targetField] = Array.from(new Set([...meta[targetField], val]));
        activeListKey = null;
      } else {
        // 多行列表即将开始: tags:\n  - 前端工程
        activeListKey = targetField;
      }
    } else if (key === "featured") {
      meta.featured = val === "true" || val === true;
      activeListKey = null;
    } else if (key === "draft") {
      meta.draft = val === "true" || val === true;
      activeListKey = null;
    } else if (key === "order") {
      const num = parseInt(val, 10);
      if (!isNaN(num)) meta.order = num;
      activeListKey = null;
    } else {
      meta[key] = val;
      activeListKey = null;
    }
  }

  // 标题兜底
  if (!meta.title) {
    const firstH1 = body.match(/^#\s+(.+)$/m);
    meta.title = firstH1 ? firstH1[1].trim() : "未命名笔记";
  }

  // 分类兜底：若未显式指定分类，自动使用首个 tag，否则归为「未分类」
  if (!meta.categories || meta.categories.length === 0) {
    if (meta.tags && meta.tags.length > 0) {
      meta.categories = [meta.tags[0]];
    } else {
      meta.categories = ["未分类"];
    }
  }

  return { meta, body };
}

/**
 * Obsidian Markdown 语法预处理器
 * 支持：
 * - 双链转换 [[article-slug|显示的文本]] -> [显示的文本](posts/article-slug.html)
 * - 简单双链 [[article-slug]] -> [article-slug](posts/article-slug.html)
 */
export function preprocessMarkdown(markdown, isSubdir = false) {
  if (!markdown) return "";
  const prefix = isSubdir ? "" : "posts/";

  let processed = markdown.replace(/\[\[([^|\]\n]+)\|([^\]\n]+)\]\]/g, (match, slug, text) => {
    return `[${text.trim()}](${prefix}${slug.trim()}.html)`;
  });

  processed = processed.replace(/\[\[([^\]\n]+)\]\]/g, (match, slug) => {
    return `[${slug.trim()}](${prefix}${slug.trim()}.html)`;
  });

  return processed;
}

/**
 * Web Content Adaptor (Web 页面内容适配器)
 * 解决问题：
 * 1. 微信排版引擎 inlined 的硬编码深色文字 (#2b2b2b, #1f2937) 在深色模式下导致看不清
 * 2. 保证全站主题无论在日间还是深色模式下，正文字体对比度均达到 WCAG 2.1 AA (>= 4.5:1)
 */
export function adaptObwHtmlForWeb(html) {
  if (!html) return "";

  let processed = html;

  // 1. 将硬编码的纯深色正文颜色替换为 CSS 动态变量 var(--text-main)
  processed = processed.replace(/color:\s*(?:#(?:2b2b2b|1f2937|111111|222222|374151|000000|0f172a)|rgb\(\s*43\s*,\s*43\s*,\s*43\s*\));?/gi, "color: var(--text-main);");

  // 2. 将次级暗灰文字替换为 var(--text-muted)
  processed = processed.replace(/color:\s*(?:#(?:475569|4b5563|64748b|334155|595959|6b7280));?/gi, "color: var(--text-muted);");

  // 3. 将硬编码的纯白/近白背景色替换为 var(--bg-card)，根治深色模式白板/反白问题
  processed = processed.replace(/(?:background|background-color):\s*(?:#(?:ffffff|fff|fafafa|f8fafc|f7f8fa|f5f5f7)|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\));?/gi, "background-color: var(--bg-card);");

  // 4. 将硬编码的浅灰/微色背景色替换为 var(--bg-subtle)
  processed = processed.replace(/(?:background|background-color):\s*(?:#(?:f1f5f9|f3f4f6|e2e8f0|f0fdf4|f5f3ff|eff6ff));?/gi, "background-color: var(--bg-subtle);");

  // 5. 将硬编码浅色边框替换为 var(--border-color)
  processed = processed.replace(/border:\s*1px\s+solid\s+(?:#(?:e2e8f0|cbd5e1|e5e7eb|f1f5f9|e0e0e0));?/gi, "border: 1px solid var(--border-color);");

  return processed;
}

/**
 * 统计汉字与单词量，估算阅读时间
 */
export function calculateReadingStats(text) {
  const clean = text.replace(/```[\s\S]*?```/g, "").replace(/<[^>]+>/g, "");
  const cjkCount = (clean.match(/[\u4e00-\u9fa5]/g) || []).length;
  const wordCount = (clean.match(/[a-zA-Z0-9_\-]+/g) || []).length;
  const total = cjkCount + wordCount;
  const readingTimeMin = Math.max(1, Math.ceil(total / 350));
  return { totalWords: total, readingTimeMin };
}

/**
 * 从 HTML 中提取目录结构（H1~H4）
 */
export function extractToc(html) {
  const headingRegex = /<h([1-4])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  const toc = [];
  let match;
  let counter = 0;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const rawInner = match[3];
    const text = rawInner.replace(/<[^>]+>/g, "").trim();
    if (!text) continue;

    counter++;
    const id = `heading-${counter}`;
    toc.push({ level, text, id, matchIndex: match.index, fullTag: match[0] });
  }

  let processedHtml = html;
  let offset = 0;
  for (const item of toc) {
    const tagMatch = item.fullTag.match(/^<h([1-4])\b([^>]*)>([\s\S]*?)<\/h\1>$/i);
    if (!tagMatch) continue;
    const level = tagMatch[1];
    const attrs = tagMatch[2];
    const inner = tagMatch[3];

    let newAttrs = attrs;
    const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    if (idMatch) {
      item.id = idMatch[1];
    } else {
      newAttrs = `${attrs} id="${item.id}"`;
    }

    const replacement = `<h${level}${newAttrs}>${inner}</h${level}>`;
    processedHtml =
      processedHtml.slice(0, item.matchIndex + offset) +
      replacement +
      processedHtml.slice(item.matchIndex + offset + item.fullTag.length);
    offset += replacement.length - item.fullTag.length;
  }

  return { toc, html: processedHtml };
}

/**
 * 完整 Markdown → 网页 HTML 渲染管线
 * （预处理 → obw 渲染 → Web 内容适配 → 抽取目录并注入标题 id）
 * 原先在文章页 / about 页 / 默认 about 页各写一遍，三处必须同步修改。
 */
export function renderMarkdownForWeb(markdown, isSubdir = false) {
  const preprocessed = preprocessMarkdown(markdown, isSubdir);
  const rawRendered = renderWithObw(preprocessed, SITE_CONFIG.theme);
  const adapted = adaptObwHtmlForWeb(rawRendered);
  return extractToc(adapted);
}

/**
 * 全站顶层 CSS 样式系统 (1:1 像素级复现用户设计稿 + 独立二级页面扩展)
 */
// 字体加载必须走 <link>（见 buildHeadLinksHtml），不能写成 CSS @import：
// 各页面壳会在 SITE_STYLES 之前注入 :root 主题变量覆盖，而 CSS 规范规定
// @import 前面一旦出现任何规则即被整条忽略 —— 曾导致全站自定义字体静默回退。
export const FONT_STYLESHEET_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400;1,6..72,600&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap';

export const SITE_STYLES = `
:root {
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-serif-cn: 'Noto Serif SC', "Source Han Serif SC", "Songti SC", "STSong", serif;
  --font-serif-en: 'Newsreader', 'Instrument Serif', Georgia, "Times New Roman", serif;
  --font-calligraphy: var(--font-serif-cn);
  --font-cursive: var(--font-serif-en);
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* 通用页面与卡片基准 (Light) */
  --bg-page: #f8fafc;
  --bg-card: #ffffff;
  --bg-subtle: #f1f5f9;
  --bg-hover: #f8fafc;

  --text-main: #0f172a;
  --text-muted: #64748b;
  --text-light: #94a3b8;

  --border-color: #e2e8f0;
  --border-subtle: #f1f5f9;

  --card-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  --card-shadow-hover: 0 16px 36px -4px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.03);

  --header-height: 78px;

  /* 默认薄荷翡翠主题变量 */
  --primary: #10b981;
  --primary-hover: #059669;
  --primary-light: #34d399;
  --primary-glow: rgba(16, 185, 129, 0.25);
  --primary-faint: rgba(16, 185, 129, 0.08);
  --accent-primary: #10b981;
  --accent-blue: #10b981;
  --accent-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
  --card-border-hover: rgba(16, 185, 129, 0.38);
  --pill-bg: #e6f7f2;
  --pill-border: rgba(16, 185, 129, 0.28);
  --pill-text: #065f46;
  --theme-hero-gradient: radial-gradient(ellipse 90% 60% at 50% -10%, rgba(16, 185, 129, 0.16) 0%, rgba(5, 150, 105, 0.04) 60%, transparent 100%);

  /* 多场景每日壁纸变量池 (支持 WebP 主路径 + 本地优质回退) */
  --bg-hero-daily: url('images/daily/hero.webp'), url('images/hero-architecture.jpg');
  --bg-archive-daily: url('images/daily/archive.webp'), url('images/hero-bg.jpg');
  --bg-footer-daily: url('images/daily/footer.webp'), url('images/bottom-banner.jpg');
  --bg-about-daily: url('images/daily/about.webp'), url('images/hero-workspace.jpg');
  --bg-banner-daily: url('images/daily/banner.webp'), url('images/hero-daily.jpg');
}

/* ========================================================
   5 套精选全站风格 Design Tokens
   ======================================================== */

/* 1. 🌿 薄荷翡翠 (Mint Emerald) - 默认首选 */
[data-theme="mint-emerald"] {
  --primary: #10b981;
  --primary-hover: #059669;
  --primary-light: #34d399;
  --primary-glow: rgba(16, 185, 129, 0.25);
  --primary-faint: rgba(16, 185, 129, 0.08);
  --accent-primary: #10b981;
  --accent-blue: #10b981;
  --accent-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
  --card-border-hover: rgba(16, 185, 129, 0.38);
  --pill-bg: #e6f7f2;
  --pill-border: rgba(16, 185, 129, 0.28);
  --pill-text: #065f46;
  --theme-hero-gradient: radial-gradient(ellipse 90% 60% at 50% -10%, rgba(16, 185, 129, 0.16) 0%, rgba(5, 150, 105, 0.04) 60%, transparent 100%);
}
[data-mode="dark"],
[data-theme="dark"],
[data-theme="mint-emerald"][data-mode="dark"],
[data-theme="mint-emerald"][data-theme="dark"] {
  --bg-page: #091410;
  --bg-card: rgba(14, 29, 24, 0.88);
  --bg-subtle: #11221b;
  --bg-hover: #182e25;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-light: #64748b;
  --border-color: rgba(52, 211, 153, 0.18);
  --border-subtle: rgba(52, 211, 153, 0.08);
  --primary: #34d399;
  --primary-hover: #6ee7b7;
  --primary-light: #a7f3d0;
  --primary-glow: rgba(52, 211, 153, 0.35);
  --primary-faint: rgba(52, 211, 153, 0.12);
  --accent-primary: #34d399;
  --accent-blue: #34d399;
  --accent-gradient: linear-gradient(135deg, #34d399 0%, #059669 100%);
  --card-border-hover: rgba(52, 211, 153, 0.45);
  --card-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.5);
  --card-shadow-hover: 0 18px 40px -4px rgba(0, 0, 0, 0.7);
  --pill-bg: rgba(52, 211, 153, 0.14);
  --pill-border: rgba(52, 211, 153, 0.32);
  --pill-text: #a7f3d0;
  --theme-hero-gradient: radial-gradient(ellipse 90% 60% at 50% -10%, rgba(52, 211, 153, 0.18) 0%, rgba(16, 185, 129, 0.05) 60%, transparent 100%);
}

/* 2. 🌌 科技深蓝 (Tech Blue) */
[data-theme="tech-blue"] {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: #60a5fa;
  --primary-glow: rgba(37, 99, 235, 0.25);
  --primary-faint: rgba(37, 99, 235, 0.08);
  --accent-primary: #2563eb;
  --accent-blue: #2563eb;
  --accent-gradient: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  --card-border-hover: rgba(37, 99, 235, 0.38);
  --pill-bg: #dbeafe;
  --pill-border: rgba(37, 99, 235, 0.25);
  --pill-text: #1e40af;
  --theme-hero-gradient: radial-gradient(ellipse 90% 60% at 50% -10%, rgba(37, 99, 235, 0.16) 0%, rgba(30, 64, 175, 0.04) 60%, transparent 100%);
}
[data-theme="tech-blue"][data-mode="dark"] {
  --bg-page: #0b132b;
  --bg-card: rgba(16, 27, 59, 0.88);
  --bg-subtle: #16244d;
  --bg-hover: #1e3168;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-light: #64748b;
  --border-color: rgba(96, 165, 250, 0.18);
  --border-subtle: rgba(96, 165, 250, 0.08);
  --primary: #60a5fa;
  --primary-hover: #93c5fd;
  --primary-light: #bfdbfe;
  --primary-glow: rgba(96, 165, 250, 0.35);
  --primary-faint: rgba(96, 165, 250, 0.12);
  --accent-primary: #60a5fa;
  --accent-blue: #60a5fa;
  --accent-gradient: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
  --card-border-hover: rgba(96, 165, 250, 0.45);
  --card-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.5);
  --card-shadow-hover: 0 18px 40px -4px rgba(0, 0, 0, 0.7);
  --pill-bg: rgba(96, 165, 250, 0.14);
  --pill-border: rgba(96, 165, 250, 0.3);
  --pill-text: #bfdbfe;
  --theme-hero-gradient: radial-gradient(ellipse 90% 60% at 50% -10%, rgba(96, 165, 250, 0.18) 0%, rgba(37, 99, 235, 0.05) 60%, transparent 100%);
}

/* 3. 🔮 极光鸢尾 (Aurora Violet) */
[data-theme="aurora-violet"] {
  --primary: #8b5cf6;
  --primary-hover: #7c3aed;
  --primary-light: #a78bfa;
  --primary-glow: rgba(139, 92, 246, 0.25);
  --primary-faint: rgba(139, 92, 246, 0.08);
  --accent-primary: #8b5cf6;
  --accent-blue: #8b5cf6;
  --accent-gradient: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
  --card-border-hover: rgba(139, 92, 246, 0.38);
  --pill-bg: #ede9fe;
  --pill-border: rgba(139, 92, 246, 0.25);
  --pill-text: #5b21b6;
  --theme-hero-gradient: radial-gradient(ellipse 90% 60% at 50% -10%, rgba(139, 92, 246, 0.18) 0%, rgba(236, 72, 153, 0.05) 60%, transparent 100%);
}
[data-theme="aurora-violet"][data-mode="dark"] {
  --bg-page: #160d27;
  --bg-card: rgba(34, 21, 61, 0.88);
  --bg-subtle: #2b1a4d;
  --bg-hover: #382264;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-light: #64748b;
  --border-color: rgba(167, 139, 250, 0.18);
  --border-subtle: rgba(167, 139, 250, 0.08);
  --primary: #a78bfa;
  --primary-hover: #c4b5fd;
  --primary-light: #ddd6fe;
  --primary-glow: rgba(167, 139, 250, 0.35);
  --primary-faint: rgba(167, 139, 250, 0.12);
  --accent-primary: #a78bfa;
  --accent-blue: #a78bfa;
  --accent-gradient: linear-gradient(135deg, #a78bfa 0%, #f472b6 100%);
  --card-border-hover: rgba(167, 139, 250, 0.45);
  --card-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.5);
  --card-shadow-hover: 0 18px 40px -4px rgba(0, 0, 0, 0.7);
  --pill-bg: rgba(167, 139, 250, 0.14);
  --pill-border: rgba(167, 139, 250, 0.3);
  --pill-text: #ddd6fe;
  --theme-hero-gradient: radial-gradient(ellipse 90% 60% at 50% -10%, rgba(167, 139, 250, 0.20) 0%, rgba(244, 114, 182, 0.06) 60%, transparent 100%);
}

/* 4. 🍂 暖阳琥珀 (Warm Amber) */
[data-theme="warm-amber"] {
  --primary: #d97706;
  --primary-hover: #b45309;
  --primary-light: #fbbf24;
  --primary-glow: rgba(217, 119, 6, 0.25);
  --primary-faint: rgba(217, 119, 6, 0.08);
  --accent-primary: #d97706;
  --accent-blue: #d97706;
  --accent-gradient: linear-gradient(135deg, #d97706 0%, #ea580c 100%);
  --card-border-hover: rgba(217, 119, 6, 0.38);
  --pill-bg: #fef3c7;
  --pill-border: rgba(217, 119, 6, 0.28);
  --pill-text: #92400e;
  --theme-hero-gradient: radial-gradient(ellipse 90% 60% at 50% -10%, rgba(217, 119, 6, 0.16) 0%, rgba(234, 88, 12, 0.04) 60%, transparent 100%);
}
[data-theme="warm-amber"][data-mode="dark"] {
  --bg-page: #1c1408;
  --bg-card: rgba(42, 30, 13, 0.88);
  --bg-subtle: #33240e;
  --bg-hover: #453114;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-light: #64748b;
  --border-color: rgba(251, 191, 36, 0.18);
  --border-subtle: rgba(251, 191, 36, 0.08);
  --primary: #fbbf24;
  --primary-hover: #fcd34d;
  --primary-light: #fde68a;
  --primary-glow: rgba(251, 191, 36, 0.35);
  --primary-faint: rgba(251, 191, 36, 0.12);
  --accent-primary: #fbbf24;
  --accent-blue: #fbbf24;
  --accent-gradient: linear-gradient(135deg, #fbbf24 0%, #fb923c 100%);
  --card-border-hover: rgba(251, 191, 36, 0.45);
  --card-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.5);
  --card-shadow-hover: 0 18px 40px -4px rgba(0, 0, 0, 0.7);
  --pill-bg: rgba(251, 191, 36, 0.14);
  --pill-border: rgba(251, 191, 36, 0.3);
  --pill-text: #fde68a;
  --theme-hero-gradient: radial-gradient(ellipse 90% 60% at 50% -10%, rgba(251, 191, 36, 0.18) 0%, rgba(245, 158, 11, 0.05) 60%, transparent 100%);
}

/* 5. ✒️ 极简水墨 (Minimalist Ink) */
[data-theme="minimalist-ink"] {
  --primary: #475569;
  --primary-hover: #334155;
  --primary-light: #64748b;
  --primary-glow: rgba(71, 85, 105, 0.25);
  --primary-faint: rgba(71, 85, 105, 0.08);
  --accent-primary: #475569;
  --accent-blue: #475569;
  --accent-gradient: linear-gradient(135deg, #475569 0%, #0f172a 100%);
  --card-border-hover: rgba(71, 85, 105, 0.38);
  --pill-bg: #f1f5f9;
  --pill-border: rgba(71, 85, 105, 0.2);
  --pill-text: #1e293b;
  --theme-hero-gradient: radial-gradient(ellipse 90% 60% at 50% -10%, rgba(71, 85, 105, 0.14) 0%, rgba(15, 23, 42, 0.03) 60%, transparent 100%);
}
[data-theme="minimalist-ink"][data-mode="dark"] {
  --bg-page: #0f172a;
  --bg-card: rgba(30, 41, 59, 0.88);
  --bg-subtle: #253347;
  --bg-hover: #33445d;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-light: #64748b;
  --border-color: rgba(148, 163, 184, 0.18);
  --border-subtle: rgba(148, 163, 184, 0.08);
  --primary: #94a3b8;
  --primary-hover: #cbd5e1;
  --primary-light: #e2e8f0;
  --primary-glow: rgba(148, 163, 184, 0.35);
  --primary-faint: rgba(148, 163, 184, 0.12);
  --accent-primary: #94a3b8;
  --accent-blue: #94a3b8;
  --accent-gradient: linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%);
  --card-border-hover: rgba(148, 163, 184, 0.45);
  --card-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.5);
  --card-shadow-hover: 0 18px 40px -4px rgba(0, 0, 0, 0.7);
  --pill-bg: rgba(148, 163, 184, 0.14);
  --pill-border: rgba(148, 163, 184, 0.28);
  --pill-text: #e2e8f0;
  --theme-hero-gradient: radial-gradient(ellipse 90% 60% at 50% -10%, rgba(148, 163, 184, 0.16) 0%, rgba(30, 41, 59, 0.05) 60%, transparent 100%);
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  scroll-padding-top: var(--header-height);
}

body {
  font-family: var(--font-sans);
  background-color: var(--bg-page);
  color: var(--text-main);
  line-height: 1.75;
  transition: background-color 0.25s ease, color 0.25s ease;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

a {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease, opacity 0.2s ease;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
}

/* 顶部阅读进度条 */
#read-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3.5px;
  background: var(--accent-gradient);
  width: 0%;
  z-index: 999;
  transition: width 0.1s linear;
}

/* ========================================================
   薄荷翡翠标志性组件：三段式翡翠装饰线与圆角胶囊体系
   ======================================================== */
.theme-accent-dash {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
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
  opacity: 0.85;
}

.theme-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.4;
  background: var(--pill-bg);
  border: 1px solid var(--pill-border);
  color: var(--pill-text);
  transition: all 0.2s ease;
  white-space: nowrap;
}

.theme-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--primary-faint);
}

.theme-pill.status {
  background: var(--bg-card);
  border-color: var(--border-color);
  color: var(--text-muted);
}

.theme-pill .pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
  display: inline-block;
}

.home-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  border-radius: 9999px;
  font-size: 0.82rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
  margin-bottom: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.home-hero-badge .pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary-light);
  box-shadow: 0 0 8px var(--primary-light);
}

/* ========================================================
   全站风格切换盘 (Theme Picker Dropdown)
   ======================================================== */
.theme-picker-wrapper {
  position: relative;
}

.theme-picker-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-active-indicator {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 8px var(--primary);
  pointer-events: none;
}

.theme-dropdown-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 270px;
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  padding: 8px;
  box-shadow: 0 16px 40px -4px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px) scale(0.96);
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s;
  color: var(--text-main);
}

.theme-dropdown-menu.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.theme-dropdown-header {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-light);
  padding: 6px 10px 6px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 6px;
}

.theme-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.15s ease;
  user-select: none;
}

.theme-dropdown-item:hover {
  background: var(--bg-subtle);
  transform: translateX(2px);
}

.theme-dropdown-item.active {
  background: var(--primary-faint);
}

.theme-dropdown-item.active .theme-name {
  color: var(--primary);
  font-weight: 700;
}

.theme-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2), inset 0 0 0 2px rgba(255,255,255,0.6);
}

.theme-info {
  flex: 1;
  min-width: 0;
}

.theme-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.25;
  margin-bottom: 2px;
}

.theme-desc {
  font-size: 0.74rem;
  color: var(--text-muted);
  line-height: 1.2;
}

/* ========================================================
   导航条系统 (支持透明与毛玻璃悬浮)
   ======================================================== */
/* ========================================================
   顶栏
   首页 (site-nav) 与二级页/文章页 (article-page-header) 共用同一套外观。
   此前两套规则各写一份，且：
   - 只有 .site-nav 有 .scrolled 阴影；
   - #main-nav 只存在于首页 → 滚动阴影在其余页面恒为 no-op；
   - .site-nav .nav-menu-item:hover 的转写特异性高于基础规则，
     导致首页导航 hover 一直是低对比的 --primary，而二级页是 --text-main。
   现合并为单一来源。
   ======================================================== */
/* 顶栏：全站（含首页）共用同一个类与同一套外观。
   历史上首页用 .site-nav、其余页用 .article-page-header，两份规则各写一份，因而出现过：
   - 只有首页那份有 .scrolled 阴影，其余页面滚动无反馈；
   - #main-nav 只存在于首页 → 滚动监听在其余页面恒为 no-op；
   - 首页那份的 .nav-menu-item:hover 特异性更高，
     导致首页导航 hover 一直是低对比的 --primary，而二级页是 --text-main。
   现合并为单一类名 .page-header，全站 header 产出逐字节一致。 */
.page-header {
  position: sticky;
  top: 0;
  height: var(--header-height);
  z-index: 80;
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
  transition: background-color 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
}

.page-header .site-brand,
.page-header .nav-menu-item,
.page-header .nav-action-btn {
  color: var(--text-main);
}

.page-header.scrolled {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

[data-mode="dark"] .page-header,
[data-theme="dark"] .page-header {
  background: rgba(15, 23, 42, 0.92);
  border-bottom-color: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

[data-mode="dark"] .page-header .site-brand,
[data-mode="dark"] .page-header .nav-menu-item,
[data-mode="dark"] .page-header .nav-action-btn {
  color: #f8fafc;
}

.nav-container {
  max-width: min(94vw, 1280px);
  height: 100%;
  margin: 0 auto;
  padding: 0 clamp(20px, 4vw, 56px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.site-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s;
}

.site-brand:hover {
  opacity: 0.9;
}

.brand-text {
  font-family: var(--font-sans);
  font-weight: 850;
  font-size: 1.34rem;
  letter-spacing: 0.06em;
  color: inherit;
}

.brand-badge {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--primary);
  letter-spacing: 0.05em;
  opacity: 0.88;
}

.site-brand-icon {
  display: flex;
  align-items: center;
  color: var(--primary);
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 移动端汉堡按钮：桌面端隐藏，窄屏由媒体查询启用 */
.nav-toggle-btn {
  display: none;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  color: inherit;
  opacity: 0.85;
  transition: background-color 0.2s ease, opacity 0.2s ease;
}

.nav-toggle-btn:hover {
  opacity: 1;
  background: var(--bg-subtle);
}

/* 导航项：圆角胶囊 hover / active（原先只有一根下划线，且可点高度只有 8px） */
.nav-menu-item {
  position: relative;
  font-size: 0.95rem;
  font-weight: 550;
  color: inherit;
  opacity: 0.9;
  padding: 10px 18px;
  border-radius: 999px;
  letter-spacing: 0.01em;
  transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;
}

.nav-menu-item:hover {
  opacity: 1;
  color: var(--text-main);
  background: var(--bg-subtle);
}

/* active 用主题色「背景」+ 常规深色文字：
   若直接拿 --primary 当文字色，对比度仅 ~2.5:1，达不到 WCAG AA 4.5:1 */
.nav-menu-item.active {
  font-weight: 700;
  opacity: 1;
  color: var(--text-main);
  background: var(--primary-faint);
}

/* 键盘可见焦点（原先全站导航没有任何 focus 样式） */
.nav-menu-item:focus-visible,
.nav-action-btn:focus-visible,
.nav-toggle-btn:focus-visible,
.nav-avatar-btn:focus-visible,
.site-brand:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.nav-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-action-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  opacity: 0.85;
  transition: background-color 0.2s ease, opacity 0.2s ease, transform 0.15s ease;
}

.nav-action-btn:hover {
  opacity: 1;
  background: var(--bg-subtle);
  transform: translateY(-1px);
}

.nav-avatar-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.92rem;
  box-shadow: 0 2px 8px var(--primary-faint);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.nav-avatar-btn:hover {
  transform: scale(1.06);
  box-shadow: 0 4px 14px var(--primary-glow);
}

/* ========================================================
   晨曦全景 Hero 区域 (1:1 像素级复现用户设计稿)
   ======================================================== */
.home-hero-wrapper {
  position: relative;
  min-height: 560px;
  background-image: var(--hero-bg);
  background-size: cover;
  background-position: center top;
  display: flex;
  align-items: center;
  padding: 110px 24px 70px;
  color: #ffffff;
}

.home-hero-wrapper::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 90px;
  background: linear-gradient(to bottom, transparent, var(--bg-page));
  pointer-events: none;
}

.hero-inner-container {
  max-width: 1140px;
  width: 100%;
  margin: 0 auto;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 40px;
}

.hero-left-content {
  max-width: 580px;
}

.hero-bio-desc {
  font-size: 1.05rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.92);
  margin-bottom: 28px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.hero-btn-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.btn-hero-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--accent-gradient);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 999px;
  box-shadow: 0 4px 14px var(--primary-faint);
  transition: all 0.2s ease;
}

.btn-hero-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--primary-faint);
  color: #ffffff;
}

.btn-hero-secondary {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 999px;
  transition: all 0.2s ease;
}

.btn-hero-secondary:hover {
  background: rgba(255, 255, 255, 0.28);
  transform: translateY(-2px);
  color: #ffffff;
}

.hero-quote-card {
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 20px;
  padding: 24px 26px;
  width: 320px;
  color: #ffffff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.22);
}

.quote-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  opacity: 0.85;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.quote-body {
  font-size: 1.02rem;
  line-height: 1.6;
  margin-bottom: 14px;
  font-weight: 450;
}

.quote-author {
  text-align: right;
  font-size: 0.88rem;
  opacity: 0.85;
  font-style: italic;
}

/* ========================================================
   页面主内容包裹器与流式视口系统 (Fluid Viewport System)
   ======================================================== */
.main-container {
  width: 100%;
  max-width: min(94vw, 1280px);
  margin: 0 auto;
  padding: 36px clamp(16px, 3.5vw, 48px);
  box-sizing: border-box;
}

.main-content-wrapper {
  width: 100%;
  max-width: min(94vw, 1280px);
  margin: 0 auto;
  padding: 36px clamp(16px, 3.5vw, 48px);
  box-sizing: border-box;
  flex: 1;
}

.section-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-title {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--text-main);
  display: flex;
  align-items: baseline;
  gap: 10px;
  letter-spacing: -0.02em;
}

.section-subtitle {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-light);
  letter-spacing: 0.08em;
}

/* ========================================================
   Editorial Magazine Layout Styles (5 Chapters)
   ======================================================== */

/* Chapter 1: 3-column Editorial Hero (100vw 全宽电影感沉浸巨幕) */
.editorial-hero {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  box-sizing: border-box;
  min-height: clamp(460px, 54vh, 600px);
  background-color: #0b132b;
  background-image: linear-gradient(rgba(11, 19, 43, 0.72), rgba(11, 19, 43, 0.88)), var(--bg-hero-daily);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 36px;
  padding: clamp(52px, 6vw, 76px) max(24px, calc((100vw - 1280px) / 2));
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 56px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
  color: #f8fafc;
}

.editorial-hero-col-left {
  flex: 0 0 35%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.editorial-date {
  font-family: var(--font-mono, monospace);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--primary-light, #34d399);
  letter-spacing: 0.08em;
  margin-bottom: 18px;
}

.editorial-headline {
  font-family: var(--font-serif-cn);
  font-size: clamp(2rem, 3.4vw, 2.85rem);
  font-weight: 750;
  line-height: 1.25;
  color: #ffffff;
  letter-spacing: -0.025em;
  margin: 0 0 18px 0;
}

.editorial-subheadline {
  font-size: 1.05rem;
  line-height: 1.68;
  color: rgba(248, 250, 252, 0.85);
  margin: 0 0 32px 0;
  font-style: italic;
  opacity: 0.95;
}

.editorial-more-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono, monospace);
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--primary-light, #34d399);
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: transform 0.2s ease, color 0.2s ease;
  align-self: flex-start;
}

.editorial-more-link:hover {
  transform: translateX(4px);
  color: #ffffff;
}

.editorial-hero-col-center {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  position: relative;
  min-height: 380px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.editorial-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.editorial-hero-col-center:hover .editorial-hero-img {
  transform: scale(1.03);
}

.editorial-hero-col-right {
  flex: 0 0 20%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-width: 0;
  padding-left: 24px;
  border-left: 1px dashed rgba(255, 255, 255, 0.22);
}

.editorial-nav-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary-light, #34d399);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 20px;
}

.editorial-nav-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editorial-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-mono, monospace);
  font-size: 0.92rem;
  font-weight: 650;
  color: rgba(248, 250, 252, 0.8);
  text-decoration: none;
  padding: 8px 0;
  border-bottom: 1px solid transparent;
  transition: all 0.2s ease;
}

.editorial-nav-item:hover {
  color: #ffffff;
  border-bottom-color: var(--primary-light, #34d399);
  padding-left: 4px;
}

/* Chapter 2: FEATURED Showcase */
.featured-showcase {
  margin-bottom: 72px;
}

.featured-showcase-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 24px;
}

.chapter-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.88rem;
  font-weight: 750;
  letter-spacing: 0.1em;
  color: var(--text-main);
  text-transform: uppercase;
}

.featured-showcase-grid {
  display: flex;
  align-items: stretch;
  gap: 36px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 36px 40px;
  box-shadow: var(--card-shadow);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.featured-showcase-grid:hover {
  border-color: var(--card-border-hover, var(--primary));
  box-shadow: var(--card-shadow-hover);
}

.featured-showcase-text {
  flex: 0 0 38%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.featured-showcase-title {
  font-size: clamp(1.4rem, 2.4vw, 1.85rem);
  font-weight: 800;
  line-height: 1.35;
  color: var(--text-main);
  margin: 0 0 16px 0;
  letter-spacing: -0.02em;
  transition: color 0.2s ease;
}

.featured-showcase-text:hover .featured-showcase-title {
  color: var(--primary);
}

.featured-showcase-desc {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--text-muted);
  margin: 0 0 24px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.featured-showcase-meta {
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-light);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.featured-showcase-image-box {
  flex: 1 1 auto;
  min-width: 0;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  min-height: 280px;
  background: var(--bg-subtle);
}

.featured-showcase-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.featured-showcase-grid:hover .featured-showcase-img {
  transform: scale(1.03);
}

/* Chapter 3: SELECTED WRITINGS */
.selected-writings {
  margin-bottom: 72px;
}

.selected-writings-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 28px;
}

.selected-writings-stream {
  display: flex;
  align-items: stretch;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.selected-stream-item {
  flex: 1 1 0;
  min-width: 0;
  padding: 28px 24px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: transparent;
  transition: background 0.2s ease, transform 0.2s ease;
  text-decoration: none;
}

.selected-stream-item:first-child {
  border-left: 1px solid var(--border-color);
}

.selected-stream-item:hover {
  background: var(--bg-subtle);
}

.selected-item-num-date {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-light);
  letter-spacing: 0.05em;
  margin-bottom: 20px;
}

.selected-item-title {
  font-size: 1.08rem;
  font-weight: 750;
  line-height: 1.45;
  color: var(--text-main);
  margin: 0 0 16px 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s ease;
}

.selected-stream-item:hover .selected-item-title {
  color: var(--primary);
}

.selected-item-meta {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Chapter 4: Panoramic Archive Spread */
.panoramic-archive-spread {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  box-sizing: border-box;
  min-height: 380px;
  background-color: #0b132b;
  background-image: linear-gradient(rgba(11, 19, 43, 0.72), rgba(11, 19, 43, 0.88)), var(--archive-bg);
  background-size: cover;
  background-position: center 20%;
  padding: 64px max(24px, calc((100vw - 1280px) / 2));
  color: #ffffff;
  margin-top: 36px;
  margin-bottom: 72px;
}

.panoramic-inner {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.panoramic-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 36px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.panoramic-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.05em;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.panoramic-sub {
  font-size: 0.92rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.75);
  font-style: italic;
}

.panoramic-view-all {
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary-light, #a7f3d0);
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.panoramic-view-all:hover {
  transform: translateX(4px);
  opacity: 0.9;
}

.panoramic-years-grid {
  display: flex;
  align-items: flex-start;
  gap: 36px;
}

.panoramic-year-col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panoramic-year-badge {
  font-family: var(--font-mono, monospace);
  font-size: 1.35rem;
  font-weight: 850;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.panoramic-post-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: color 0.2s ease;
}

.panoramic-post-row:hover {
  color: var(--primary-light, #34d399);
}

.panoramic-post-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panoramic-post-date {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.55);
  flex-shrink: 0;
}

/* Chapter 5: Footprint & About */
.footprint-about {
  margin-bottom: 64px;
}

.footprint-about-inner {
  display: flex;
  align-items: center;
  gap: 48px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 42px 48px;
  box-shadow: var(--card-shadow);
}

.footprint-avatar-box {
  flex: 0 0 120px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--primary-faint, rgba(16, 185, 129, 0.2));
  flex-shrink: 0;
  background: var(--bg-subtle);
}

.footprint-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(100%);
  display: block;
  transition: filter 0.35s ease;
}

/* editorial spec 3.1：Monochromatic portrait —— 悬停时轻微回色 */
.footprint-avatar-box:hover .footprint-avatar-img {
  filter: grayscale(20%);
}

.footprint-info {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.footprint-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.footprint-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: 0.05em;
  margin: 0;
  text-transform: uppercase;
}

.footprint-signature {
  font-family: "Caveat", "Brush Script MT", cursive, sans-serif;
  font-size: 1.6rem;
  color: var(--primary);
  opacity: 0.9;
}

.footprint-bio {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--text-muted);
  margin: 0 0 20px 0;
}

.footprint-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid var(--border-subtle, var(--border-color));
}

.footprint-more-link {
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: transform 0.2s ease;
}

.footprint-more-link:hover {
  transform: translateX(4px);
}

.footprint-social-links {
  display: flex;
  align-items: center;
  gap: 12px;
}

.footprint-social-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--bg-subtle);
  color: var(--text-muted);
  text-decoration: none;
  transition: all 0.2s ease;
}

.footprint-social-icon:hover {
  background: var(--primary);
  color: #ffffff;
  transform: translateY(-2px);
}

/* 兼容现有测试的辅助样式 */
.category-filter-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-pill {
  padding: 5px 15px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 550;
  color: var(--text-muted);
  background: var(--bg-subtle);
  transition: all 0.2s ease;
  cursor: pointer;
}

.filter-pill:hover {
  color: var(--text-main);
  background: var(--border-color);
}

.filter-pill.active {
  background: var(--primary);
  color: #ffffff;
  box-shadow: 0 2px 8px var(--primary-faint);
}

/* ========================================================
   Section 3: 底部宽幅互动横幅 (100vw 全屏月升夜景 + 无框悬浮设计)
   ======================================================== */
.bottom-comm-banner {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  box-sizing: border-box;
  min-height: 340px;
  border-radius: 0;
  overflow: hidden;
  background-color: #0b132b;
  background-image: linear-gradient(rgba(11, 19, 43, 0.72), rgba(11, 19, 43, 0.88)), var(--bg-footer-daily);
  background-size: cover;
  background-position: center 20%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 64px max(24px, calc((100vw - 1280px) / 2));
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
  margin-top: clamp(64px, 8vw, 96px);
  margin-bottom: 0;
  gap: 36px;
}

/* 拍立得 3D 双面翻转卡片 */
.banner-photocard-wrap {
  perspective: 1000px;
  width: 320px;
  min-height: 190px;
  flex-shrink: 0;
}

.photocard-card {
  width: 100%;
  height: 100%;
  min-height: 190px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
}

.photocard-card:hover,
.photocard-card.flipped {
  transform: rotateY(180deg);
}

.photocard-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  color: #ffffff;
}

.photocard-back {
  transform: rotateY(180deg);
  background: rgba(16, 24, 40, 0.88);
  border-color: rgba(255, 255, 255, 0.28);
}

.photocard-badge {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--primary);
  text-transform: uppercase;
}

.photocard-text {
  font-size: 0.92rem;
  line-height: 1.6;
  font-style: italic;
  color: rgba(255, 255, 255, 0.95);
  margin: 8px 0;
}

.photocard-author {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.75);
  text-align: right;
}

.photocard-flip-hint {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

.photocard-scene-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
  margin: 8px 0 4px;
}

.photocard-scene-desc {
  font-size: 0.82rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.75);
}

.photocard-date {
  font-size: 0.75rem;
  color: var(--primary);
  text-align: right;
}

.banner-left {
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border: none;
  box-shadow: none;
  padding: 0;
  max-width: 520px;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.65);
}

.banner-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.45rem;
  font-weight: 750;
  margin-bottom: 12px;
  color: #ffffff;
}

.banner-title svg {
  color: var(--primary-light);
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6));
}

.banner-desc {
  font-size: 0.98rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.92);
  margin-bottom: 22px;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
}

.banner-social-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.social-circle-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  transition: all 0.2s ease;
}

.social-circle-btn:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--primary-faint);
}

/* ========================================================
   页脚 Footer
   ======================================================== */
.site-footer {
  border-top: 1px solid var(--border-color);
  background: var(--bg-card);
  padding: 28px 0;
  font-size: 0.88rem;
  color: var(--text-muted);
}

.footer-inner-container {
  max-width: min(94vw, 1280px);
  margin: 0 auto;
  padding: 0 clamp(16px, 3.5vw, 48px);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}

.footer-nav-link {
  color: var(--text-muted);
  transition: color 0.2s ease;
}

.footer-nav-link:hover,
.footer-nav-link.active {
  color: var(--primary);
}

/* ========================================================
   文章详情页排版与随动目录 (TOC)
   ======================================================== */
/* 文章详情页：与其余四个页面共用同一套编辑部无边框版式。
   原先 .article-main 是个大圆角盒子卡片，而首页/归档/分类页已经「彻底告别盒装卡片」，
   因此同一站内两套视觉语言。现改为：无边框正文列 + 编辑部字号阶梯 + 等宽章节标。 */
/* 文章页：容器指标直接复用 .main-content-wrapper / .main-container，
   此处只叠加「正文列 + 目录侧栏」的双栏栅格，避免两份容器尺寸各自漂移 */
.article-wrapper {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 56px;
  align-items: start;
}

.article-main {
  min-width: 0;
}

/* 返回链接：等宽小字 + 克制灰。原先用 --primary 做 0.88rem 正文，对比度仅 ~3.7:1 */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  text-decoration: none;
  margin-bottom: 24px;
  transition: color 0.2s ease, transform 0.2s ease;
}

.back-link:hover {
  color: var(--text-main);
  transform: translateX(-3px);
}

.article-header {
  margin-bottom: 40px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border-color);
}

/* 章节标（ARTICLE ——）：与 ARCHIVE —— / FEATURED —— 同一套语言 */
.article-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 750;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.article-badge-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

/* 与其他页 Hero 标题完全同一档：clamp(1.85rem, 3.2vw, 2.6rem) / 850 / lh 1.28 */
.article-title {
  font-size: clamp(1.85rem, 3.2vw, 2.6rem);
  font-weight: 850;
  line-height: 1.28;
  letter-spacing: -0.025em;
  color: var(--text-main);
  margin: 18px 0 0;
}

.article-digest-desc {
  font-size: 0.96rem;
  line-height: 1.68;
  color: var(--text-muted);
  margin: 16px 0 0;
}

.article-tags-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
}

/* 专注阅读开关。
   原先放在顶部导航里，导致文章页比其余页面多一个 42px 按钮；
   而 .nav-container 是 justify-content: space-between，右侧变宽会把中间导航项横向推动，
   跨页跳转时顶部会肉眼可见地跳一下。移到文章元信息行后：导航几何全站一致，语义也更贴切。 */
.article-focus-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.4;
  background: var(--pill-bg);
  border: 1px solid var(--pill-border);
  color: var(--pill-text);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.article-focus-btn:hover {
  border-color: var(--primary);
  color: var(--text-main);
}

.article-focus-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* 侧栏改为无边框（与分类页 .tag-sidebar 一致），用发丝线建立层级 */
.article-toc-sidebar {
  position: sticky;
  top: 96px;
}

.toc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-main);
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.toc-list {
  list-style: none;
  max-height: 70vh;
  overflow-y: auto;
}

.toc-item {
  margin: 6px 0;
  font-size: 0.88rem;
  line-height: 1.45;
}

.toc-item.toc-level-1 { font-weight: 600; }
.toc-item.toc-level-2 { padding-left: 12px; }
.toc-item.toc-level-3 { padding-left: 24px; font-size: 0.82rem; }

.toc-item a {
  color: var(--text-muted);
  display: block;
  border-radius: 6px;
  padding: 3px 6px;
  transition: all 0.15s ease;
}

.toc-item a:hover {
  color: var(--text-main);
  background: var(--bg-subtle);
}

/* active 用主题色底 + 常规深色文字（直接用 --primary 做文字对比度不足） */
.toc-item.active a {
  color: var(--text-main);
  font-weight: 600;
  background: var(--primary-faint);
}

/* 微信公众号推广卡片 */
.wechat-promo-card {
  margin-top: 48px;
  padding: 24px 28px;
  border-radius: 16px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.wechat-promo-text h4 {
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 6px;
}

.wechat-promo-text p {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 0;
}

.wechat-qr-box img {
  width: 96px;
  height: 96px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  display: block;
}

/* 回到顶部 */
#back-to-top {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: all 0.2s ease;
  z-index: 90;
}

#back-to-top.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

#back-to-top:hover {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
}

/* 搜索模态框 */
.search-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 100px;
  z-index: 2000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.search-modal-backdrop.open {
  opacity: 1;
  visibility: visible;
}

.search-modal-box {
  width: 100%;
  max-width: 600px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: modalScale 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalScale {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.search-modal-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
}

.search-modal-input {
  flex: 1;
  border: none;
  background: none;
  font-size: 1.05rem;
  color: var(--text-main);
  outline: none;
}

.search-results-box {
  max-height: 420px;
  overflow-y: auto;
  padding: 8px 0;
}

.search-result-item {
  display: block;
  padding: 12px 20px;
  transition: background-color 0.15s ease;
  color: var(--text-main);
}

.search-result-item:hover {
  background: var(--bg-subtle);
}

.search-result-title {
  font-weight: 600;
  font-size: 0.98rem;
  margin-bottom: 4px;
}

.search-result-snippet {
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* ========================================================
   Web Content Adaptor & Dark Mode 深度对比度强化 (WCAG AA)
   ======================================================== */
.article-content {
  width: 100%;
  max-width: 100%;
  line-height: 1.82;
  font-size: 16.5px;
  color: var(--text-main);
  word-break: break-word;
}

.article-content p,
.article-content li,
.article-content td,
.article-content th,
.article-content span {
  transition: color 0.2s ease;
}

[data-mode="dark"] .article-content,
[data-mode="dark"] .article-content p,
[data-mode="dark"] .article-content li,
[data-mode="dark"] .article-content td,
[data-mode="dark"] .article-content th,
[data-mode="dark"] .article-content strong,
[data-mode="dark"] .article-content em {
  color: var(--text-main) !important;
}

[data-mode="dark"] .article-content h1,
[data-mode="dark"] .article-content h2,
[data-mode="dark"] .article-content h3,
[data-mode="dark"] .article-content h4 {
  color: var(--primary-light) !important;
}

[data-mode="dark"] .wechat-article {
  background: transparent !important;
  color: var(--text-main) !important;
}

[data-mode="dark"] section[class*="wechat-module"],
[data-mode="dark"] .wechat-module-hero,
[data-mode="dark"] .wechat-module-summary,
[data-mode="dark"] .wechat-module-cards,
[data-mode="dark"] .wechat-module-quote,
[data-mode="dark"] .wechat-module-metrics,
[data-mode="dark"] .wechat-module-notice,
[data-mode="dark"] .wechat-module-cta {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
  box-shadow: var(--card-shadow) !important;
}

[data-mode="dark"] section[class*="wechat-module"] section,
[data-mode="dark"] .article-content section[style*="background:#ffffff"],
[data-mode="dark"] .article-content section[style*="background: #ffffff"],
[data-mode="dark"] .article-content section[style*="background:#fff"],
[data-mode="dark"] .article-content section[style*="background: #fff"],
[data-mode="dark"] .article-content [style*="background:#f7f8fa"],
[data-mode="dark"] .article-content [style*="background: #f7f8fa"],
[data-mode="dark"] .article-content [style*="background:#f5f5f7"],
[data-mode="dark"] .article-content [style*="background: #f5f5f7"],
[data-mode="dark"] .article-content [style*="background:#fafafa"],
[data-mode="dark"] .article-content [style*="background: #fafafa"] {
  background-color: var(--bg-card) !important;
  background: var(--bg-card) !important;
  color: var(--text-main) !important;
  border-color: var(--border-color) !important;
}

[data-mode="dark"] .wechat-module-cta span,
[data-mode="dark"] section[class*="wechat-module"] span,
[data-mode="dark"] section[class*="wechat-module"] p,
[data-mode="dark"] section[class*="wechat-module"] h1,
[data-mode="dark"] section[class*="wechat-module"] h2,
[data-mode="dark"] section[class*="wechat-module"] h3,
[data-mode="dark"] section[class*="wechat-module"] h4 {
  color: var(--text-main) !important;
}

[data-mode="dark"] .article-content pre,
[data-mode="dark"] .article-content code {
  background: #0f172a !important;
  color: #f1f5f9 !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* ========================================================
   二级页面通用顶部 Header Banner (归档/分类/标签/关于)
   ======================================================== */
.subpage-hero-banner {
  padding: 68px 24px 40px;
  background-color: var(--bg-page);
  background-image: var(--theme-hero-gradient);
  background-size: cover;
  background-position: center top;
  border-bottom: 1px solid var(--border-subtle);
  text-align: center;
  position: relative;
}

.subpage-hero-container {
  max-width: 860px;
  margin: 0 auto;
}

.subpage-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  border-radius: 9999px;
  font-size: 0.82rem;
  font-weight: 600;
  background: var(--pill-bg);
  border: 1px solid var(--pill-border);
  color: var(--pill-text);
  margin-bottom: 14px;
}

.subpage-title {
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--text-main);
  margin-bottom: 8px;
}

.subpage-subtitle {
  font-size: 0.92rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--primary);
  margin-bottom: 12px;
}

.subpage-desc {
  font-size: 1.02rem;
  color: var(--text-muted);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.68;
}

/* ========================================================
   Editorial Magazine Archive Timeline (1:1 Reference Image 2)
   ======================================================== */

/* Chapter 1: Archive Hero (100vw 全宽电影感沉浸巨幕) */
.archive-hero {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  box-sizing: border-box;
  min-height: clamp(380px, 46vh, 500px);
  background-color: #0b132b;
  background-image: linear-gradient(rgba(11, 19, 43, 0.76), rgba(11, 19, 43, 0.90)), var(--bg-archive-daily);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 36px;
  padding: clamp(52px, 6vw, 76px) max(24px, calc((100vw - 1280px) / 2));
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 56px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
  color: #f8fafc;
}

.archive-hero-col-left {
  flex: 0 0 35%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.archive-hero-title {
  font-family: var(--font-serif-cn);
  font-size: clamp(2rem, 3.4vw, 2.85rem);
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin: 16px 0;
}

.archive-hero-desc {
  font-size: 0.98rem;
  line-height: 1.68;
  color: rgba(248, 250, 252, 0.85);
  margin: 0;
}

.archive-hero-col-center {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  position: relative;
  min-height: 320px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.archive-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.archive-hero-col-center:hover .archive-hero-img {
  transform: scale(1.03);
}

.archive-hero-col-right {
  flex: 0 0 20%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-width: 0;
  padding-left: 24px;
  border-left: 1px dashed rgba(255, 255, 255, 0.22);
}

.archive-filter-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary-light, #34d399);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 20px;
}

.archive-filter-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.archive-filter-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-mono, monospace);
  font-size: 0.88rem;
  font-weight: 650;
  color: rgba(248, 250, 252, 0.8);
  text-decoration: none;
  padding: 6px 0;
  border-bottom: 1px solid transparent;
  transition: all 0.2s ease;
}

.archive-filter-link:hover,
.archive-filter-link.active {
  color: #ffffff;
  border-bottom-color: var(--primary-light, #34d399);
  transform: translateX(3px);
}

/* Year Blocks Container */
.archive-years-container {
  display: flex;
  flex-direction: column;
}

.year-block {
  display: flex;
  align-items: stretch;
  gap: 40px;
  padding: 56px 0;
  border-bottom: 1px solid var(--border-color);
}

.year-block:first-child {
  padding-top: 16px;
}

.year-block:last-child {
  border-bottom: none;
}

/* Left Column: Year Summary */
.year-col-left {
  flex: 0 0 200px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.year-number {
  font-family: var(--font-mono, monospace);
  font-size: 2.8rem;
  font-weight: 850;
  line-height: 1;
  color: var(--text-main);
  letter-spacing: -0.03em;
  margin-bottom: 16px;
}

.year-reflection {
  font-size: 0.92rem;
  line-height: 1.65;
  color: var(--text-muted);
  margin: 0 0 20px 0;
}

.year-count-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-light);
  padding: 4px 12px;
  background: var(--bg-subtle);
  border-radius: 999px;
  border: 1px solid var(--border-color);
}

/* Middle Column: Dotted Timeline */
.year-timeline-dots {
  flex: 0 0 60px;
  display: flex;
  justify-content: center;
  position: relative;
}

.timeline-dot-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
  padding-top: 12px;
}

.timeline-dot-stem {
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  border-left: 1.5px dashed var(--border-color);
  z-index: 1;
}

.timeline-dot-node {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48px;
}

.timeline-dot-node:last-child {
  margin-bottom: 0;
}

.timeline-dot-circle {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--bg-page, #fff);
  border: 2px solid var(--primary);
  margin-bottom: 6px;
  box-shadow: 0 0 0 3px var(--bg-page);
  transition: transform 0.2s ease, background 0.2s ease;
}

.timeline-dot-node:hover .timeline-dot-circle {
  transform: scale(1.3);
  background: var(--primary);
}

.timeline-dot-month {
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-light);
  white-space: nowrap;
}

/* Right Column: 2-column flex stream of rich editorial entries */
.year-col-right {
  flex: 1 1 auto;
  min-width: 0;
}

.archive-entries-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32px 28px;
}

.archive-entry-card {
  flex: 0 0 calc(50% - 14px);
  max-width: calc(50% - 14px);
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: transparent;
  transition: transform 0.2s ease;
}

.archive-entry-thumb {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-subtle);
  margin-bottom: 14px;
}

.archive-entry-img-link {
  display: block;
  width: 100%;
  height: 100%;
  text-decoration: none;
}

.archive-entry-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.archive-entry-card:hover .archive-entry-img {
  transform: scale(1.04);
}

.archive-entry-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  color: var(--text-light);
  margin-bottom: 8px;
}

.archive-entry-date {
  color: var(--text-muted);
}

.archive-entry-sep {
  color: var(--border-color);
}

.archive-entry-category {
  color: var(--primary);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.archive-entry-title {
  font-size: 1.1rem;
  font-weight: 750;
  line-height: 1.45;
  margin: 0 0 10px 0;
}

.archive-entry-title-link {
  color: var(--text-main);
  text-decoration: none;
  transition: color 0.2s ease;
}

.archive-entry-title-link:hover {
  color: var(--primary);
}

.archive-entry-footer {
  display: flex;
  align-items: center;
  margin-top: auto;
}

.archive-entry-time {
  font-family: var(--font-mono, monospace);
  font-size: 0.76rem;
  color: var(--text-muted);
}

/* Bottom Pagination */
/* 文章计数栏（原 1–5 假分页按钮与箭头已移除，仅保留计数） */
.archive-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40px 0 24px 0;
  border-top: 1px solid var(--border-color);
  margin-top: 48px;
}

.archive-total-count {
  font-family: var(--font-mono, monospace);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-muted);
}


/* ========================================================
   分类与标签双列杂志流 (100vw 全宽电影感沉浸巨幕)
   ======================================================== */
.tag-hero {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  box-sizing: border-box;
  min-height: clamp(360px, 44vh, 480px);
  background-color: #0b132b;
  background-image: linear-gradient(rgba(11, 19, 43, 0.76), rgba(11, 19, 43, 0.90)), var(--bg-banner-daily);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 36px;
  padding: clamp(52px, 6vw, 76px) max(24px, calc((100vw - 1280px) / 2));
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 48px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
  color: #f8fafc;
}

.tag-hero-left {
  flex: 0 0 35%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.tag-hero-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 750;
  color: var(--primary-light, #34d399);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 12px;
  display: block;
}

.tag-hero-title {
  font-family: var(--font-serif-cn);
  font-size: clamp(2rem, 3.4vw, 2.85rem);
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin: 0 0 16px 0;
}

.tag-hero-desc {
  font-size: 0.98rem;
  line-height: 1.7;
  color: rgba(248, 250, 252, 0.85);
  margin: 0 0 24px 0;
}

.tag-hero-view-all {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono, monospace);
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--primary-light, #34d399);
  text-decoration: none;
  letter-spacing: 0.06em;
  transition: all 0.2s ease;
  margin-top: auto;
}

.tag-hero-view-all:hover {
  color: #ffffff;
  transform: translateX(4px);
}

.tag-hero-center {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  position: relative;
  min-height: 280px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.tag-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.tag-hero-center:hover .tag-hero-img {
  transform: scale(1.03);
}

.tag-hero-right {
  flex: 0 0 26%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-left: 28px;
  border-left: 1px dashed rgba(255, 255, 255, 0.22);
  min-width: 0;
}

/* 消除分类页顶部死白：微型策展印记系统 */
.curation-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  font-family: var(--font-mono);
  color: var(--primary-light, #34d399);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.curation-quote-body {
  margin: 16px 0;
}

.tag-hero-quote {
  font-family: var(--font-cursive);
  font-size: 1.25rem;
  font-style: italic;
  line-height: 1.45;
  color: #ffffff;
  margin: 0 0 6px 0;
}

.curation-quote-cn {
  font-family: var(--font-serif-cn);
  font-size: 0.88rem;
  color: rgba(248, 250, 252, 0.82);
  margin: 0;
  line-height: 1.6;
}

.curation-stamp {
  font-size: 11px;
  color: rgba(248, 250, 252, 0.6);
  font-family: var(--font-mono);
}

/* Dual-Column Stream Layout */
.tag-stream-layout {
  display: flex;
  align-items: flex-start;
  gap: 56px;
  margin-bottom: 72px;
}

/* Left Sidebar */
.tag-sidebar {
  flex: 0 0 280px;
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 40px;
  position: sticky;
  top: 88px;
}

.tag-sidebar-header {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 750;
  color: var(--text-light);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 20px;
  display: block;
}

.tag-sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-sidebar-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 0.95rem;
  font-weight: 550;
  color: var(--text-muted);
  text-decoration: none;
  border-left: 3px solid transparent;
  border-radius: 0 6px 6px 0;
  transition: all 0.2s ease;
}

.tag-sidebar-item:hover {
  color: var(--primary);
  background: var(--primary-faint, rgba(43, 107, 79, 0.05));
}

.tag-sidebar-item.active {
  border-left: 3px solid var(--primary);
  color: var(--primary);
  background: var(--primary-faint, rgba(43, 107, 79, 0.08));
  font-weight: 650;
}

.tag-sidebar-count {
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--bg-subtle);
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.tag-sidebar-item.active .tag-sidebar-count {
  background: var(--primary-faint, rgba(43, 107, 79, 0.15));
  color: var(--primary);
}

.sidebar-quote-box {
  padding: 22px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--card-shadow);
}

.sidebar-quote-photo {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-subtle);
}

.sidebar-quote-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease;
}

.sidebar-quote-box:hover .sidebar-quote-img {
  transform: scale(1.03);
}

/* 中文引语：不用 italic（浏览器会对中文字形做伪斜，看起来是坏的），
   改用站点自带的书法字 token --font-calligraphy（'Ma Shan Zheng'，之前定义了却从未被引用） */
.sidebar-quote-text {
  font-family: var(--font-calligraphy);
  font-size: 1.06rem;
  font-style: normal;
  line-height: 1.75;
  color: var(--text-main);
  margin: 0;
}

.sidebar-quote-signature {
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 650;
  color: var(--primary);
  text-align: right;
  display: block;
}

/* Right Column Main Stream */
.tag-main-stream {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 流头部：仅保留文章计数（原「最新 / 最热 / 最多阅读」假 Tabs 已移除） */
.stream-header-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 14px;
  margin-bottom: 8px;
}

.stream-total-count {
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.stream-entries-list {
  display: flex;
  flex-direction: column;
}

.horizontal-entry-item {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 30px 0;
  border-bottom: 1px solid var(--border-subtle, var(--border-color));
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.horizontal-entry-item:last-child {
  border-bottom: none;
}

.entry-thumb-link {
  flex: 0 0 220px;
  width: 220px;
  aspect-ratio: 16 / 10;
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-subtle);
  display: block;
}

.entry-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease;
}

.horizontal-entry-item:hover .entry-thumb-img {
  transform: scale(1.04);
}

.entry-text-block {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.entry-meta-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  color: var(--text-light);
}

.entry-meta-category {
  color: var(--primary);
  font-weight: 650;
  text-transform: uppercase;
}

.entry-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 750;
  line-height: 1.38;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.entry-title a {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease;
}

.horizontal-entry-item:hover .entry-title a,
.entry-title a:hover {
  color: var(--primary);
}

.entry-excerpt {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.65;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.entry-right-meta {
  flex: 0 0 auto;
  padding-left: 16px;
  text-align: right;
  white-space: nowrap;
}

.entry-reading-index {
  font-family: var(--font-mono, monospace);
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-light);
  letter-spacing: 0.04em;
}

.stream-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0 24px 0;
  border-top: 1px solid var(--border-color);
  margin-top: 24px;
}


/* ========================================================
   关于我独立页面 (About Me - 1:1 Reference Image 1)
   ======================================================== */
.about-main-page {
  padding-top: 8px;
}

/* 4. posts/about.md 正文区（编辑部版式下方的 Markdown 长文） */
.about-post-body {
  max-width: min(94vw, 820px);
  margin: 0 auto 72px;
}

.about-post-body > *:first-child {
  margin-top: 0;
}

.about-post-body > *:last-child {
  margin-bottom: 0;
}

/* 1. 3-Column Hero Trio (100vw 全宽电影感沉浸巨幕) */
.about-hero-trio {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  box-sizing: border-box;
  min-height: clamp(380px, 48vh, 520px);
  background-color: #0b132b;
  background-image: linear-gradient(rgba(11, 19, 43, 0.74), rgba(11, 19, 43, 0.90)), var(--bg-about-daily);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 36px;
  padding: clamp(52px, 6vw, 76px) max(24px, calc((100vw - 1280px) / 2));
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 56px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
  color: #f8fafc;
}

.about-hero-statement {
  flex: 0 0 35%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.about-hero-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 750;
  color: var(--primary-light, #34d399);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 14px;
  display: block;
}

.about-hero-title {
  font-family: var(--font-serif-cn);
  font-size: clamp(2rem, 3.4vw, 2.85rem);
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.025em;
  color: #ffffff;
  margin: 0 0 18px 0;
}

.about-hero-intro {
  font-size: 0.98rem;
  line-height: 1.8;
  color: rgba(248, 250, 252, 0.85);
  margin: 0 0 28px 0;
}

.about-hero-read-more {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--primary-light, #34d399);
  text-decoration: none;
  letter-spacing: 0.08em;
  transition: all 0.2s ease;
  margin-top: auto;
  width: fit-content;
}

.about-hero-read-more:hover {
  color: #ffffff;
  transform: translateX(4px);
}

.about-hero-center {
  flex: 1 1 auto;
  min-width: 0;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  position: relative;
  min-height: 320px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.about-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

.about-hero-center:hover .about-hero-img {
  transform: scale(1.03);
}

.about-hero-quote-col {
  flex: 0 0 24%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-left: 28px;
  border-left: 1px dashed rgba(255, 255, 255, 0.22);
  min-width: 0;
}

/* 中文格言：出版级思源宋体 */
.about-hero-quote {
  font-family: var(--font-serif-cn);
  font-size: 1.35rem;
  font-weight: 500;
  font-style: normal;
  line-height: 1.7;
  color: #ffffff;
  margin: 0;
}

.about-hero-signature-block {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 24px;
}

.about-hero-signature {
  font-family: var(--font-cursive);
  font-size: 1.5rem;
  font-style: italic;
  font-weight: 600;
  color: var(--text-main);
}

.about-hero-location {
  font-family: var(--font-mono, monospace);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* 2. Middle Split Section */
.about-mid-split {
  display: flex;
  gap: 40px;
  align-items: stretch;
  margin-bottom: 64px;
}

.about-personal-col {
  flex: 0 0 320px;
  min-width: 0;
}

.personal-info-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 28px;
  box-shadow: var(--card-shadow);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.personal-portrait-wrap {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 22px;
  background: var(--bg-subtle);
}

.personal-portrait-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(100%);
  display: block;
  transition: filter 0.35s ease;
}

.personal-portrait-wrap:hover .personal-portrait-img {
  filter: grayscale(20%);
}

.personal-header {
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-subtle, var(--border-color));
}

.personal-header-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 750;
  color: var(--primary);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.personal-details-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
  margin-bottom: 22px;
}

.personal-detail-row {
  display: flex;
  align-items: flex-start;
  font-size: 0.9rem;
  line-height: 1.55;
}

.detail-label {
  flex: 0 0 44px;
  color: var(--text-light);
  font-weight: 500;
  font-family: var(--font-sans, sans-serif);
}

.detail-value {
  flex: 1;
  color: var(--text-main);
  font-weight: 550;
  word-break: break-word;
}

.detail-email-link {
  color: var(--primary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.detail-email-link:hover {
  color: var(--primary-hover);
  text-decoration: underline;
}

.personal-card-divider {
  height: 1px;
  background: var(--border-subtle, var(--border-color));
  margin: auto 0 18px 0;
}

.personal-footer-block {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.personal-signature {
  font-family: var(--font-cursive);
  font-size: 1.3rem;
  font-style: italic;
  font-weight: 600;
  color: var(--text-main);
}

.personal-motto {
  font-family: var(--font-mono, monospace);
  font-size: 0.76rem;
  font-style: italic;
  color: var(--text-muted);
}

.about-interests-col {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.interests-header {
  margin-bottom: 18px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-subtle, var(--border-color));
}

.interests-header-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 750;
  color: var(--primary);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.interests-hairline-grid {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--bg-card);
  overflow: hidden;
  flex: 1;
}

.interest-hairline-col {
  flex: 1 1 25%;
  min-width: 0;
  padding: 34px 26px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-subtle, var(--border-color));
  transition: background 0.25s ease;
}

.interest-hairline-col:last-child {
  border-right: none;
}

.interest-hairline-col:hover {
  background: var(--bg-subtle);
}

.interest-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--primary-faint);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
  margin-bottom: 22px;
  flex-shrink: 0;
}

.interest-col-title {
  font-size: 1.12rem;
  font-weight: 750;
  color: var(--text-main);
  margin: 0 0 12px 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.interest-col-en {
  font-family: var(--font-mono, monospace);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-light);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.interest-col-desc {
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--text-muted);
  margin: 0 0 24px 0;
  flex: 1;
}

.interest-view-more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  letter-spacing: 0.06em;
  margin-top: auto;
  transition: all 0.2s ease;
}

.interest-view-more:hover {
  color: var(--primary-hover);
  transform: translateX(3px);
}

/* 3. Panoramic Landscape Banner */
.panoramic-about-banner {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 56px;
  min-height: 300px;
  background-image: url('images/hero-bg.jpg');
  background-position: center 20%;
  background-size: cover;
  background-repeat: no-repeat;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
}

.panoramic-about-overlay {
  position: relative;
  width: 100%;
  min-height: 300px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.65) 50%, rgba(15, 23, 42, 0.82) 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 56px 60px;
  gap: 40px;
}

.panoramic-about-left {
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panoramic-about-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 750;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.panoramic-about-title {
  font-size: clamp(1.6rem, 2.8vw, 2.3rem);
  font-weight: 850;
  color: #ffffff;
  line-height: 1.3;
  margin: 0;
  letter-spacing: -0.02em;
}

.panoramic-about-sub {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.78);
  margin: 0 0 12px 0;
  letter-spacing: 0.04em;
}

.panoramic-about-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono, monospace);
  font-size: 0.84rem;
  font-weight: 750;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 10px 22px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  text-decoration: none;
  letter-spacing: 0.08em;
  width: fit-content;
  transition: all 0.25s ease;
}

.panoramic-about-link:hover {
  background: #ffffff;
  color: #0f172a;
  transform: translateY(-2px);
}

.panoramic-about-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.panoramic-about-cursive {
  font-family: var(--font-cursive);
  font-size: clamp(1.8rem, 3.5vw, 3rem);
  font-style: italic;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* ========================================================
   极客互动、专注模式、代码一键复制与壁纸扩展
   ======================================================== */
.quote-wallpaper-info {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.88);
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quote-wallpaper-info span {
  font-size: 0.85rem;
}

/* 专注阅读模式 (Focus Reading Mode) */
/* ========================================================
   Zen 出版级沉浸式阅读系统 (Zen Publication Mode)
   ======================================================== */
.zen-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 0%;
  height: 2.5px;
  background: var(--primary);
  box-shadow: 0 0 10px var(--primary-glow);
  z-index: 99999;
  transition: width 0.1s ease;
  pointer-events: none;
}

.zen-progress-capsule {
  position: fixed;
  top: 18px;
  right: 22px;
  z-index: 999;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 0.78rem;
  font-family: var(--font-mono, monospace);
  color: var(--text-muted);
  box-shadow: var(--card-shadow);
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transform: translateY(-8px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}

.zen-progress-capsule.visible {
  opacity: 1;
  transform: translateY(0);
}

.zen-progress-capsule .capsule-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
  display: inline-block;
  animation: pulse-dot 2s infinite ease-in-out;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

.zen-progress-capsule .capsule-sep {
  opacity: 0.4;
}

/* 悬浮 Zen 控制坞 (Floating Zen Dock) */
.zen-floating-dock {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9998;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 6px 14px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  color: var(--text-main);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-mode="dark"] .zen-floating-dock,
[data-theme="dark"] .zen-floating-dock {
  background: rgba(15, 23, 42, 0.88);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
}

.zen-dock-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
}

.zen-dock-btn:hover {
  background: var(--bg-subtle);
  color: var(--primary);
}

.zen-dock-indicator {
  font-size: 0.78rem;
  color: var(--primary);
  font-weight: 700;
  min-width: 32px;
  text-align: center;
}

.zen-dock-divider {
  width: 1px;
  height: 14px;
  background: var(--border-color);
}

.zen-timer-wrap {
  font-size: 0.78rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.zen-toggle-btn {
  background: var(--primary-faint);
  color: var(--primary);
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}

.zen-toggle-btn:hover {
  background: var(--primary);
  color: #ffffff;
}

/* 专注 / Zen 模式状态下的页面重构 */
body.focus-reading-mode {
  --zen-current-width: 680px;
}

body.focus-reading-mode.zen-wide {
  --zen-current-width: 840px;
}

body.focus-reading-mode .page-header,
body.focus-reading-mode .article-toc-sidebar,
body.focus-reading-mode .back-link,
body.focus-reading-mode .wechat-promo-card,
body.focus-reading-mode .post-github-interaction,
body.focus-reading-mode .post-recommendations,
body.focus-reading-mode .site-footer,
body.focus-reading-mode .bottom-comm-banner,
body.focus-reading-mode .fixed-theme-picker {
  display: none !important;
}

body.focus-reading-mode .article-wrapper {
  max-width: var(--zen-current-width, 680px) !important;
  margin: 0 auto !important;
  grid-template-columns: 1fr !important;
  padding: 56px clamp(16px, 4vw, 36px) !important;
  transition: max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

body.focus-reading-mode .article-header {
  text-align: center;
  max-width: 100%;
}

body.focus-reading-mode .article-badge-row,
body.focus-reading-mode .article-tags-row {
  justify-content: center;
}

body.focus-reading-mode .zen-floating-dock {
  bottom: 32px;
  right: 50%;
  transform: translateX(50%);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.22);
}

body.focus-reading-mode .zen-toggle-btn {
  background: #ef4444;
  color: #ffffff;
}

.focus-mode-exit-btn {
  display: none;
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  box-shadow: var(--card-shadow);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.focus-mode-exit-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-2px);
}

body.focus-reading-mode .focus-mode-exit-btn {
  display: inline-flex;
}

/* 读完全文庆祝条 (Completion Celebration Toast) */
.zen-celebrate-toast {
  position: fixed;
  bottom: 96px;
  right: 50%;
  transform: translateX(50%) translateY(20px);
  background: var(--bg-card);
  border: 1px solid var(--primary);
  border-radius: 999px;
  padding: 10px 22px;
  box-shadow: 0 12px 36px var(--primary-glow);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-main);
  opacity: 0;
  pointer-events: none;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 10000;
  white-space: nowrap;
}

.zen-celebrate-toast.show {
  opacity: 1;
  transform: translateX(50%) translateY(0);
}

/* 移动端 Zen 控制坞自适应 */
@media (max-width: 768px) {
  .zen-floating-dock {
    bottom: 16px;
    right: 16px;
    left: 16px;
    justify-content: space-around;
    padding: 6px 10px;
    border-radius: 14px;
    gap: 4px;
  }
  body.focus-reading-mode .zen-floating-dock {
    transform: none;
    right: 16px;
    left: 16px;
    bottom: 16px;
  }
  .zen-timer-wrap {
    display: none;
  }
}

/* 代码块一键复制按钮与全宽排版 */
.article-content pre {
  margin: 1.8em 0;
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

@media (min-width: 1200px) {
  .post-header,
  .article-header {
    max-width: 960px;
    margin: 0 auto 36px auto;
  }
}

.code-copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  font-size: 0.76rem;
  font-family: var(--font-mono);
  color: #94a3b8;
  background: rgba(30, 41, 59, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
}

.code-copy-btn:hover {
  background: rgba(51, 65, 85, 0.9);
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.25);
}

.code-copy-btn.copied {
  background: #10b981;
  color: #ffffff;
  border-color: #10b981;
}

/* GitHub 极客互动操作区 */
.post-github-interaction {
  margin: 36px 0;
}

.github-interaction-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px 28px;
  box-shadow: var(--card-shadow);
}

.interaction-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
}

.interaction-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--bg-subtle);
  color: var(--primary);
  flex-shrink: 0;
}

.interaction-title {
  margin: 0 0 6px 0;
  font-size: 1.05rem;
  font-weight: 750;
  color: var(--text-main);
}

.interaction-desc {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.55;
}

.interaction-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.interaction-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.interaction-btn.primary,
.github-btn-primary {
  background: var(--primary);
  color: #ffffff !important;
  border: 1px solid var(--primary);
  box-shadow: 0 2px 8px var(--primary-glow);
}

.interaction-btn.primary:hover,
.github-btn-primary:hover {
  background: var(--primary-hover) !important;
  color: #ffffff !important;
  border-color: var(--primary-hover) !important;
  box-shadow: 0 4px 14px var(--primary-glow) !important;
  transform: translateY(-1px);
}

.interaction-btn.secondary {
  background: var(--bg-subtle);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

.interaction-btn.secondary:hover {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
}

.interaction-btn.star {
  background: var(--bg-subtle);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

.interaction-btn.star:hover {
  background: #fef3c7;
  color: #b45309;
  border-color: #f59e0b;
}

[data-mode="dark"] .interaction-btn.star:hover {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border-color: #f59e0b;
}

/* 延伸阅读推荐 */
.post-recommendations {
  margin: 36px 0;
  padding-top: 28px;
  border-top: 1px solid var(--border-color);
}

.recommendations-title {
  font-size: 1.1rem;
  font-weight: 750;
  color: var(--text-main);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}

.recommend-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 18px 20px;
  text-decoration: none;
  transition: all 0.25s ease;
}

.recommend-card:hover {
  transform: translateY(-3px);
  border-color: var(--primary);
  box-shadow: var(--card-shadow);
}

.recommend-card-badge {
  display: inline-block;
  align-self: flex-start;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  background: var(--bg-subtle);
  padding: 3px 8px;
  border-radius: 6px;
  margin-bottom: 10px;
}

.recommend-card-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 8px 0;
  line-height: 1.45;
}

.recommend-card-desc {
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0 0 14px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.recommend-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--text-light);
  border-top: 1px dashed var(--border-subtle);
  padding-top: 10px;
}

.recommend-card-read {
  color: var(--primary);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 全站搜索结果与高亮 */
.search-highlight {
  background: rgba(16, 185, 129, 0.25);
  color: var(--primary);
  border-radius: 2px;
  padding: 0 2px;
  font-weight: 700;
}

.search-result-item {
  display: block;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-subtle);
  text-decoration: none;
  transition: background 0.15s ease;
}

.search-result-item:hover,
.search-result-item.selected {
  background: var(--bg-subtle);
  border-left: 3px solid var(--primary);
}

.search-result-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 4px;
}

.search-result-snippet {
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.search-result-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.76rem;
  color: var(--text-light);
  margin-top: 6px;
}

.search-tag {
  color: var(--primary);
  background: var(--bg-subtle);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

/* ========================================================
   响应式断点适配 (移动端彻底微信化排版 + 锁死横向晃动)
   ======================================================== */
@media (max-width: 1024px) {
  .article-wrapper {
    grid-template-columns: 1fr;
  }
  .article-toc-sidebar {
    display: none;
  }
  .selected-writings-stream {
    flex-wrap: wrap;
  }
  .selected-stream-item {
    flex: 1 1 calc(50% - 1px);
    border-bottom: 1px solid var(--border-color);
  }
  .selected-stream-item:nth-child(2n) {
    border-right: none;
  }
  .archive-hero {
    gap: 24px;
  }
  .tag-hero {
    gap: 24px;
  }
  .tag-stream-layout {
    gap: 36px;
  }
  .tag-sidebar {
    flex: 0 0 240px;
    width: 240px;
  }
  .entry-thumb-link {
    flex: 0 0 190px;
    width: 190px;
  }
  .year-block {
    gap: 28px;
  }
  .year-col-left {
    flex: 0 0 170px;
  }

  /* 关于我页面 1024px 响应式 (纯 flex 弹性流，无 grid) */
  .about-hero-trio {
    flex-wrap: wrap;
    gap: 32px;
    padding: 36px 0 48px;
    margin-bottom: 48px;
  }
  .about-hero-statement {
    flex: 1 1 52%;
  }
  .about-hero-center {
    flex: 1 1 40%;
    min-height: 280px;
  }
  .about-hero-quote-col {
    flex: 1 1 100%;
    border-left: none;
    border-top: 1px solid var(--border-subtle, var(--border-color));
    padding-left: 0;
    padding-top: 24px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .about-hero-signature-block {
    margin-top: 0;
    padding-top: 0;
    align-items: flex-end;
  }
  .about-mid-split {
    flex-direction: column;
    gap: 40px;
    margin-bottom: 48px;
  }
  .about-personal-col {
    flex: 1 1 auto;
    width: 100%;
  }
  .interests-hairline-grid {
    flex-wrap: wrap;
  }
  .interest-hairline-col {
    flex: 1 1 50%;
  }
  .interest-hairline-col:nth-child(2) {
    border-right: none;
  }
  .interest-hairline-col:nth-child(1),
  .interest-hairline-col:nth-child(2) {
    border-bottom: 1px solid var(--border-subtle, var(--border-color));
  }
  .panoramic-about-overlay {
    padding: 44px 36px;
  }
}

@media (max-width: 768px) {
  html, body {
    overflow-x: hidden !important;
    width: 100%;
  }

  /* 移动端导航 */
  .nav-container {
    padding: 0 16px;
    justify-content: flex-start;
    gap: 12px;
  }
  .page-header {
    height: 64px;
  }
  .nav-menu {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border-color);
    box-shadow: 0 14px 30px -14px rgba(0, 0, 0, 0.28);
    padding: 6px 0;
  }
  .nav-menu.open {
    display: flex;
  }
  .nav-menu .nav-menu-item {
    padding: 14px 18px;
    font-size: 1rem;
    border-radius: 0;
    opacity: 1;
  }
  .nav-toggle-btn {
    display: inline-flex;
    margin-left: auto;
    width: 44px;
    height: 44px;
  }
  .site-brand {
    gap: 6px;
  }
  .brand-text {
    font-size: 1.18rem;
  }
  .brand-badge {
    display: none;
  }
  .nav-right-actions {
    gap: 2px;
  }
  /* 触控目标 ≥44px（原先 32px） */
  .nav-action-btn {
    width: 44px;
    height: 44px;
  }
  .nav-avatar-btn {
    display: none;
  }

  /* 分类胶囊按钮大尺寸触控优化 */
  .category-filter-pills {
    overflow-x: auto;
    white-space: nowrap;
    padding: 6px 14px 10px;
    margin: 0 -14px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    display: flex;
    gap: 10px;
  }
  .category-filter-pills::-webkit-scrollbar {
    display: none;
  }
  .filter-pill {
    flex-shrink: 0;
    height: 38px;
    padding: 8px 18px;
    font-size: 0.92rem;
    border-radius: 20px;
  }

  /* 移动端文章详情排版 (严格遵循微信图文排版规范) */
  /* 栅格单列；容器 padding 交给 .main-container 的 clamp()，与其余页面保持一致 */
  .article-wrapper {
    grid-template-columns: 1fr;
    gap: 0;
  }
  .article-header {
    margin-bottom: 24px;
    padding-bottom: 18px;
  }
  .article-title {
    font-size: 1.55rem;
    line-height: 1.4;
  }
  .article-digest-desc {
    font-size: 0.92rem;
    line-height: 1.65;
  }
  .article-content {
    font-size: 16.5px;
    line-height: 1.78;
    word-break: break-word;
  }
  .article-content p {
    margin: 1.4em 0;
  }
  .article-content pre {
    margin: 1.2em -16px;
    border-radius: 0;
    padding: 14px 16px;
    font-size: 0.85rem;
    border-left: none;
    border-right: none;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .article-toc-sidebar {
    display: none !important;
  }
  .recommendations-grid {
    grid-template-columns: 1fr;
  }
  .interaction-actions {
    flex-direction: column;
  }
  .interaction-btn {
    width: 100%;
    justify-content: center;
  }
  .wechat-promo-card {
    flex-direction: column;
    text-align: center;
    padding: 24px 16px;
  }
  .wechat-qr-box {
    margin-top: 14px;
  }

  /* 首页编辑部杂志章节流式响应式 */
  .editorial-hero {
    flex-direction: column;
    gap: 28px;
    padding: 24px 0 36px 0;
  }
  .editorial-hero-col-left,
  .editorial-hero-col-right {
    flex: 1 1 auto;
    width: 100%;
  }
  .editorial-hero-col-right {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid var(--border-color);
    padding-top: 20px;
  }
  .editorial-nav-list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
  }
  .featured-showcase-grid {
    flex-direction: column;
    padding: 24px 18px;
    gap: 20px;
  }
  .selected-writings-stream {
    flex-direction: column;
  }
  .selected-stream-item {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  .selected-stream-item:first-child {
    border-left: none;
  }
  .selected-stream-item:last-child {
    border-bottom: none;
  }
  .panoramic-years-grid {
    flex-direction: column;
    gap: 24px;
  }
  .footprint-about-inner {
    flex-direction: column;
    text-align: center;
    padding: 28px 20px;
    gap: 20px;
  }
  .footprint-header-row,
  .footprint-footer-row {
    flex-direction: column;
    gap: 12px;
  }
  /* 归档页编辑部时间线响应式 */
  .archive-hero {
    flex-direction: column;
    gap: 28px;
    padding: 24px 0 36px 0;
  }
  .archive-hero-col-left,
  .archive-hero-col-right {
    flex: 1 1 auto;
    width: 100%;
  }
  .archive-hero-col-right {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid var(--border-color);
    padding-top: 20px;
  }
  .archive-filter-list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
  }
  .year-block {
    flex-direction: column;
    gap: 24px;
    padding: 36px 0;
  }
  .year-col-left {
    width: 100%;
    flex: 1 1 auto;
  }
  .year-timeline-dots {
    display: none;
  }
  .archive-entries-grid {
    flex-direction: column;
    gap: 24px;
  }
  .archive-entry-card {
    flex: 1 1 100%;
    max-width: 100%;
  }
  .archive-pagination {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  .bottom-comm-banner {
    padding: 48px 18px;
    flex-direction: column;
    text-align: center;
    gap: 32px;
  }
  .banner-left {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .banner-social-row {
    justify-content: center;
  }
  .banner-photocard-wrap {
    width: 100%;
    max-width: 340px;
    margin: 0 auto;
  }
  .footer-inner-container {
    flex-direction: column;
    gap: 14px;
    text-align: center;
  }
  /* 分类与标签双列杂志流响应式 */
  .tag-hero {
    flex-direction: column;
    gap: 24px;
    padding: 24px 0 36px 0;
  }
  .tag-hero-left,
  .tag-hero-center,
  .tag-hero-right {
    flex: 1 1 auto;
    width: 100%;
  }
  .tag-hero-center {
    min-height: 220px;
  }
  .tag-hero-right {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid var(--border-color);
    padding-top: 16px;
  }
  .tag-stream-layout {
    flex-direction: column;
    gap: 36px;
  }
  .tag-sidebar {
    width: 100%;
    flex: 1 1 auto;
    position: static;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 32px;
  }
  .tag-sidebar-list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }
  .tag-sidebar-item {
    border-left: none;
    border-radius: 6px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    padding: 6px 12px;
  }
  .sidebar-quote-box {
    display: none;
  }
  .horizontal-entry-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 24px 0;
  }
  .entry-thumb-link {
    width: 100%;
    flex: 1 1 auto;
    aspect-ratio: 16 / 10;
  }
  .entry-right-meta {
    padding-left: 0;
    align-self: flex-start;
  }
  /* 关于我页面 768px 移动端响应式 (纯 flex 弹性流，无 grid) */
  .about-hero-trio {
    flex-direction: column;
    gap: 24px;
    padding: 24px 0 36px;
    margin-bottom: 36px;
  }
  .about-hero-statement,
  .about-hero-center,
  .about-hero-quote-col {
    flex: 1 1 auto;
    width: 100%;
  }
  .about-hero-center {
    min-height: 220px;
  }
  .about-hero-quote-col {
    border-left: none;
    border-top: 1px solid var(--border-color);
    padding-left: 0;
    padding-top: 20px;
    flex-direction: column;
    align-items: flex-start;
  }
  .about-mid-split {
    flex-direction: column;
    gap: 32px;
    margin-bottom: 40px;
  }
  .interests-hairline-grid {
    flex-direction: column;
  }
  .interest-hairline-col {
    flex: 1 1 auto;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-subtle, var(--border-color));
    padding: 28px 20px;
  }
  .interest-hairline-col:last-child {
    border-bottom: none;
  }
  .panoramic-about-banner {
    min-height: auto;
    margin-bottom: 40px;
  }
  .panoramic-about-overlay {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
    padding: 36px 20px;
    min-height: auto;
  }
  .panoramic-about-right {
    align-self: flex-start;
  }
}

@media (max-width: 480px) {
  .site-brand span:not(.site-brand-icon) {
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .nav-menu {
    gap: 10px;
  }
  .nav-menu-item {
    font-size: 0.82rem;
    padding: 6px 2px;
/* ========================================================
   精细出版级格言与引用增强
   ======================================================== */
.motto-refined {
  font-family: var(--font-serif-cn);
  font-weight: 500;
  font-size: 1.15rem;
  letter-spacing: 0.05em;
  line-height: 1.8;
  color: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* ========================================================
   3D 拟物黑胶唱片卡片 (Vinyl Card)
   ======================================================== */
.vinyl-capsule {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: var(--card-shadow);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
  overflow: hidden;
  margin-top: 18px;
}
.vinyl-capsule:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
}
.vinyl-wrapper {
  position: relative;
  width: 58px;
  height: 58px;
  flex-shrink: 0;
}
.vinyl-jacket {
  position: relative;
  z-index: 2;
  width: 54px;
  height: 54px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  background: #1e293b;
}
.vinyl-jacket img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.vinyl-disc {
  position: absolute;
  top: 2px;
  left: 2px;
  z-index: 1;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: radial-gradient(circle, #0f172a 32%, #1e293b 33%, #0f172a 58%, #1e293b 60%, #000 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.vinyl-capsule:hover .vinyl-disc {
  transform: translateX(24px) rotate(180deg);
}
.vinyl-disc-center {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  border: 3px solid #0f172a;
}
.vinyl-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.vinyl-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}
.vinyl-title {
  font-family: var(--font-serif-cn);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vinyl-artist {
  font-size: 11.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ========================================================
   Raycast 级 Command Palette (Cmd+K) 视觉体系
   ======================================================== */
.nav-cmd-k-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}
.nav-cmd-k-btn:hover {
  background: var(--bg-card);
  border-color: var(--primary);
  color: var(--text-main);
  box-shadow: 0 2px 8px var(--primary-glow);
}
.cmd-k-badge {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
}
@media (max-width: 768px) {
  .cmd-k-text, .cmd-k-badge { display: none; }
  .nav-cmd-k-btn { padding: 0 10px; }
}

.cmd-palette-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 99999;
  display: none;
  align-items: flex-start;
  justify-content: center;
  padding-top: 14vh;
}
.cmd-palette-backdrop.open {
  display: flex;
}
.cmd-palette-modal {
  width: min(90vw, 640px);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.24);
  overflow: hidden;
  animation: cmdPaletteFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes cmdPaletteFadeIn {
  from { opacity: 0; transform: scale(0.96) translateY(-8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.cmd-palette-input-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
}
.cmd-palette-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 16px;
  color: var(--text-main);
  outline: none;
  font-family: inherit;
}
.cmd-palette-esc {
  font-size: 12px;
  font-family: var(--font-mono);
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
}
.cmd-palette-results {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}
.cmd-action-section-title {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-light);
  letter-spacing: 0.08em;
  padding: 8px 12px 4px;
}
.cmd-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  color: var(--text-main);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 14px;
}
.cmd-item:hover,
.cmd-item.selected {
  background: var(--primary-faint, rgba(16, 185, 129, 0.08));
  color: var(--primary);
}
.cmd-item-icon {
  font-size: 16px;
  width: 22px;
  text-align: center;
}
.cmd-palette-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 10px 20px;
  border-top: 1px solid var(--border-subtle, var(--border-color));
  background: var(--bg-subtle);
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}
.cmd-palette-footer kbd {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 1px 4px;
  border-radius: 4px;
}
}
`;

/**
 * 客户端核心交互脚本
 */
export const CLIENT_SCRIPTS = `
// 全局多风格与深浅模式管理
function initSiteTheme() {
  var savedTheme = localStorage.getItem("obw-site-theme") || "mint-emerald";
  var savedMode = localStorage.getItem("obw-site-mode") || localStorage.getItem("tan-blog-theme") || 
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", savedTheme);
  document.documentElement.setAttribute("data-mode", savedMode);
  updateThemeIcon(savedMode);
  updateThemeActiveState(savedTheme);
}

function selectSiteTheme(themeId) {
  document.documentElement.setAttribute("data-theme", themeId);
  localStorage.setItem("obw-site-theme", themeId);
  updateThemeActiveState(themeId);
  toggleThemeDropdown(false);
  var themeNames = {
    "mint-emerald": "薄荷翡翠",
    "tech-blue": "科技深蓝",
    "aurora-violet": "极光鸢尾",
    "warm-amber": "暖阳琥珀",
    "minimalist-ink": "极简水墨"
  };
  showToast("已切换全站风格为「" + (themeNames[themeId] || themeId) + "」");
}

function updateThemeActiveState(themeId) {
  document.querySelectorAll(".theme-dropdown-item").forEach(function(el) {
    if (el.getAttribute("data-theme-id") === themeId) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });
}

function toggleThemeDropdown(force) {
  var menu = document.getElementById("theme-picker-dropdown");
  if (!menu) return;
  if (typeof force === "boolean") {
    menu.classList.toggle("open", force);
  } else {
    menu.classList.toggle("open");
  }
  var btn = document.getElementById("theme-picker-btn");
  if (btn) btn.setAttribute("aria-expanded", menu.classList.contains("open") ? "true" : "false");
}

// 点击外部关闭下拉菜单
document.addEventListener("click", function(e) {
  var wrapper = document.querySelector(".theme-picker-wrapper");
  if (wrapper && !wrapper.contains(e.target)) {
    toggleThemeDropdown(false);
  }
});

function toggleTheme() {
  var current = document.documentElement.getAttribute("data-mode") || 
    document.documentElement.getAttribute("data-theme") || "light";
  var next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-mode", next);
  localStorage.setItem("obw-site-mode", next);
  localStorage.setItem("tan-blog-theme", next);
  updateThemeIcon(next);
}

function updateThemeIcon(mode) {
  var iconSpan = document.getElementById("theme-toggle-icon");
  if (iconSpan) {
    iconSpan.innerHTML = mode === "dark" ? \`${ICONS.sun}\` : \`${ICONS.moon}\`;
  }
}

// 轻提示 Toast
function showToast(msg) {
  let toast = document.getElementById("site-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "site-toast";
    toast.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.92);color:#fff;padding:10px 20px;border-radius:999px;font-size:0.88rem;box-shadow:0 8px 24px rgba(0,0,0,0.25);z-index:9999;transition:all 0.25s ease;display:flex;align-items:center;gap:8px;";
    document.body.appendChild(toast);
  }
  toast.innerHTML = \`${ICONS.check} <span>\${msg}</span>\`;
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(10px)";
  }, 2200);
}

// 复制工具
function copyToClipboard(text, msg = "已复制") {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showToast(msg));
  } else {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(msg);
    } catch(e) {}
    document.body.removeChild(ta);
  }
}

// 移动端汉堡菜单开闭
function toggleNavMenu(open) {
  const menu = document.getElementById("site-nav-menu");
  if (!menu) return;
  const btn = document.querySelector(".nav-toggle-btn");
  const willOpen = typeof open === "boolean" ? open : !menu.classList.contains("open");
  menu.classList.toggle("open", willOpen);
  if (btn) btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

// 点击导航项或页面空白处时收起菜单
// （点汉堡按钮本身由 onclick 处理，这里跳过以免被二次反转）
document.addEventListener("click", (e) => {
  const menu = document.getElementById("site-nav-menu");
  if (!menu || !menu.classList.contains("open")) return;
  const target = e.target;
  if (target && target.closest && target.closest(".nav-toggle-btn")) return;
  toggleNavMenu(false);
});

// 视口回到桌面宽度时收起菜单
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) toggleNavMenu(false);
});

// Command Palette 全能指令中心与快速动作
let searchSelectedIndex = -1;
let searchReturnFocusEl = null;

const QUICK_ACTIONS = [
  { icon: "🌓", title: "切换日夜模式", desc: "Dark / Light Mode 切换", cmd: "toggleTheme()" },
  { icon: "🌿", title: "切换主题: 薄荷翡翠", desc: "Mint Emerald 默认首选", cmd: "selectSiteTheme('mint-emerald')" },
  { icon: "🌊", title: "切换主题: 科技深蓝", desc: "Tech Blue 现代极客", cmd: "selectSiteTheme('tech-blue')" },
  { icon: "🔮", title: "切换主题: 极光鸢尾", desc: "Aurora Violet 先锋灵动", cmd: "selectSiteTheme('aurora-violet')" },
  { icon: "☀️", title: "切换主题: 暖阳琥珀", desc: "Warm Amber 日光书房", cmd: "selectSiteTheme('warm-amber')" },
  { icon: "🖋️", title: "切换主题: 极简水墨", desc: "Minimalist Ink 东方留白", cmd: "selectSiteTheme('minimalist-ink')" },
  { icon: "🔗", title: "复制当前页面链接", desc: "复制网页永久 URL 到剪贴板", cmd: "copyCurrentUrl()" },
  { icon: "📡", title: "复制 RSS 订阅源", desc: "复制 feed.xml 订阅源到剪贴板", cmd: "copyRssFeed()" }
];

function copyCurrentUrl() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href);
    showToast("页面链接已复制到剪贴板！");
    toggleSearchModal(false);
  }
}
function copyRssFeed() {
  const dirPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1);
  const rssUrl = new URL("feed.xml", window.location.origin + dirPath).href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(rssUrl);
    showToast("RSS 订阅源已复制到剪贴板！");
    toggleSearchModal(false);
  }
}
window.copyCurrentUrl = copyCurrentUrl;
window.copyRssFeed = copyRssFeed;
window.toggleCmdPalette = toggleSearchModal;

function renderQuickActions(filterText = "") {
  const q = (filterText || "").trim().toLowerCase();
  const matched = QUICK_ACTIONS.filter(a => !q || a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));
  if (matched.length === 0) return "";
  let html = '<section class="cmd-action-section-title" style="box-sizing: border-box;">快捷指令中心</section>';
  matched.forEach((a, i) => {
    html += '<section class="cmd-item search-result-item" data-index="' + i + '" onclick="' + a.cmd + '" style="box-sizing: border-box;">' +
      '<span class="cmd-item-icon">' + a.icon + '</span>' +
      '<section style="flex:1;box-sizing: border-box;">' +
        '<section style="font-weight:600;font-size:13.5px;color:var(--text-main);box-sizing: border-box;">' + a.title + '</section>' +
        '<section style="font-size:11.5px;color:var(--text-muted);box-sizing: border-box;">' + a.desc + '</section>' +
      '</section>' +
      '<kbd style="font-size:11px;font-family:var(--font-mono);background:var(--bg-subtle);border:1px solid var(--border-color);padding:2px 6px;border-radius:4px;color:var(--text-muted);">↵ 执行</kbd>' +
    '</section>';
  });
  return html;
}

function resetSearchModal() {
  searchSelectedIndex = -1;
  const resultsBox = document.getElementById("search-results-box");
  if (resultsBox) {
    resultsBox.innerHTML = renderQuickActions();
  }
}

function toggleSearchModal(open) {
  const modal = document.getElementById("search-modal");
  if (!modal) return;
  const isOpen = modal.classList.contains("open");
  if (open) {
    if (isOpen) return;
    searchReturnFocusEl = document.activeElement;
    modal.classList.add("open");
    const input = document.getElementById("search-input");
    if (input) {
      input.value = "";
      resetSearchModal();
      setTimeout(() => input.focus(), 50);
    }
  } else {
    if (!isOpen) return;
    modal.classList.remove("open");
    if (searchReturnFocusEl && document.contains(searchReturnFocusEl) && typeof searchReturnFocusEl.focus === "function") {
      searchReturnFocusEl.focus();
    }
    searchReturnFocusEl = null;
  }
}

function onSearchModalInput(e) {
  const q = e.target.value.trim().toLowerCase();
  const resultsBox = document.getElementById("search-results-box");
  if (!resultsBox) return;

  if (!q) {
    resetSearchModal();
    return;
  }
  searchSelectedIndex = -1;

  const inPosts = window.location.pathname.includes("/posts/");
  const index = window.__NOTES_INDEX__ || [];
  const matches = [];

  for (let i = 0; i < index.length; i++) {
    const item = index[i];
    const title = (item.title || "").toLowerCase();
    const desc = (item.desc || "").toLowerCase();
    const tags = (item.tags || []).join(" ").toLowerCase();
    const cats = (item.categories || []).join(" ").toLowerCase();

    if (title.includes(q) || desc.includes(q) || tags.includes(q) || cats.includes(q)) {
      const url = inPosts ? item.slug + ".html" : "posts/" + item.slug + ".html";
      matches.push({ ...item, url });
    }
  }

  const actionsHtml = renderQuickActions(q);
  let articlesHtml = "";

  if (matches.length > 0) {
    articlesHtml = '<section class="cmd-action-section-title" style="box-sizing: border-box; margin-top: 10px;">检索文章 (' + matches.length + ' 篇)</section>' +
      matches.map((m, idx) => {
        const escaped = q.split('').map(function(c){ return '.*+?^$()|{}[]\\\\'.indexOf(c) !== -1 ? '\\\\' + c : c; }).join('');
        const reg = new RegExp('(' + escaped + ')', 'gi');
        const esc = function(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };
        const highTitle = esc(m.title).replace(reg, '<mark class="search-highlight">$1</mark>');
        const highDesc = m.desc ? esc(m.desc).replace(reg, '<mark class="search-highlight">$1</mark>') : '';
        const catBadge = (m.categories && m.categories[0]) ? '<span class="search-tag">' + esc(m.categories[0]) + '</span>' : '';
        const dateText = m.date ? '<span>' + esc(m.date) + '</span>' : '';

        return '<a href="' + esc(m.url) + '" class="search-result-item" data-index="' + (QUICK_ACTIONS.length + idx) + '">' +
          '<div class="search-result-title">' + highTitle + '</div>' +
          (highDesc ? '<div class="search-result-snippet">' + highDesc + '</div>' : '') +
          '<div class="search-result-meta">' + catBadge + dateText + '</div>' +
          '</a>';
      }).join("");
  }

  if (!actionsHtml && !articlesHtml) {
    resultsBox.innerHTML = '<section style="box-sizing: border-box; padding:28px;text-align:center;color:var(--text-light);font-size:0.9rem;">未找到相关指令或文章</section>';
  } else {
    resultsBox.innerHTML = actionsHtml + articlesHtml;
  }
}

function updateSelectedSearchItem(items) {
  items.forEach((item, i) => {
    if (i === searchSelectedIndex) {
      item.classList.add("selected");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("selected");
    }
  });
}

// 最新文章分类筛选 (支持 data-categories 与 data-tags)
function filterCategory(cat, btn) {
  document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const cards = document.querySelectorAll(".selected-stream-item, .category-post-item");
  cards.forEach(card => {
    const cats = (card.getAttribute("data-categories") || "").split(",").map(t => t.trim().toLowerCase());
    const tags = (card.getAttribute("data-tags") || "").split(",").map(t => t.trim().toLowerCase());
    const target = cat.toLowerCase();
    if (target === "all" || cats.includes(target) || tags.some(t => t.includes(target))) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
}

// ========================================================
// Zen 出版级沉浸式阅读系统 (Zen Publication Mode)
// ========================================================
let zenTimerSeconds = 0;
let zenTimerInterval = null;
let zenCelebrated = false;
const ZEN_FONT_SIZES = [15, 16.5, 18, 20];
let zenFontSizeIndex = 1; // 默认 16.5px

function initZenReadingMode() {
  const content = document.querySelector(".article-content");
  if (!content) return; // 仅在文章页执行

  // 1. 读取 localStorage 偏好设置
  try {
    const savedSize = localStorage.getItem("zen_font_size");
    if (savedSize) {
      const idx = ZEN_FONT_SIZES.indexOf(parseFloat(savedSize));
      if (idx !== -1) zenFontSizeIndex = idx;
      content.style.fontSize = ZEN_FONT_SIZES[zenFontSizeIndex] + "px";
      const curSizeEl = document.getElementById("zen-current-size");
      if (curSizeEl) curSizeEl.textContent = ZEN_FONT_SIZES[zenFontSizeIndex];
    }

    const savedWidth = localStorage.getItem("zen_width");
    if (savedWidth === "840px") {
      document.body.classList.add("zen-wide");
      const widthLabel = document.getElementById("zen-width-label");
      if (widthLabel) widthLabel.textContent = "840px";
    }
  } catch (e) {}

  // 2. 启动计时器
  if (!zenTimerInterval) {
    zenTimerInterval = setInterval(() => {
      zenTimerSeconds++;
      const mins = String(Math.floor(zenTimerSeconds / 60)).padStart(2, "0");
      const secs = String(zenTimerSeconds % 60).padStart(2, "0");
      const display = document.getElementById("zen-timer-display");
      if (display) display.textContent = mins + ":" + secs;
    }, 1000);
  }

  // 3. 键盘快捷键监听：Z 键切换，ESC 键退出
  window.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
    if (e.key === "z" || e.key === "Z") {
      e.preventDefault();
      toggleFocusMode();
    } else if (e.key === "Escape") {
      if (document.body.classList.contains("focus-reading-mode")) {
        toggleFocusMode(false);
      }
    }
  });
}

function adjustZenFontSize(delta) {
  const content = document.querySelector(".article-content");
  if (!content) return;
  zenFontSizeIndex = Math.max(0, Math.min(ZEN_FONT_SIZES.length - 1, zenFontSizeIndex + delta));
  const newSize = ZEN_FONT_SIZES[zenFontSizeIndex];
  content.style.fontSize = newSize + "px";
  const curSizeEl = document.getElementById("zen-current-size");
  if (curSizeEl) curSizeEl.textContent = newSize;
  try { localStorage.setItem("zen_font_size", newSize); } catch (e) {}
}

function toggleZenWidth() {
  const isWide = document.body.classList.toggle("zen-wide");
  const widthLabel = document.getElementById("zen-width-label");
  const widthVal = isWide ? "840px" : "680px";
  if (widthLabel) widthLabel.textContent = widthVal;
  try { localStorage.setItem("zen_width", widthVal); } catch (e) {}
}

// 专注阅读模式切换
function toggleFocusMode(force) {
  const isNowFocus = typeof force === "boolean"
    ? document.body.classList.toggle("focus-reading-mode", force)
    : document.body.classList.toggle("focus-reading-mode");

  const modeText = document.getElementById("zen-mode-text");
  if (modeText) {
    modeText.textContent = isNowFocus ? "✕ 退出" : "专注";
  }
}

function updateZenProgress(scrolled) {
  const bar = document.getElementById("zen-progress-bar");
  if (bar) bar.style.width = scrolled + "%";

  const capsule = document.getElementById("zen-progress-capsule");
  const num = document.getElementById("zen-progress-num");
  const remain = document.getElementById("zen-reading-remain");

  if (capsule) {
    if (window.scrollY > 150) {
      capsule.classList.add("visible");
    } else {
      capsule.classList.remove("visible");
    }
  }

  if (num) num.textContent = Math.round(scrolled) + "%";
  if (remain) {
    remain.textContent = scrolled >= 95 ? "即将读完" : "阅读中";
  }

  if (scrolled >= 98 && !zenCelebrated) {
    zenCelebrated = true;
    showZenCelebration();
  }
}

function showZenCelebration() {
  let toast = document.querySelector(".zen-celebrate-toast");
  if (!toast) {
    toast = document.createElement("section");
    toast.className = "zen-celebrate-toast";
    toast.style.boxSizing = "border-box";
    toast.innerHTML = "🎉 已读完全文！感谢深度阅读";
    document.body.appendChild(toast);
  }
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 4500);
}

// 代码块一键复制
function initCodeCopy() {
  document.querySelectorAll(".article-content pre").forEach(pre => {
    if (pre.querySelector(".code-copy-btn")) return;
    const btn = document.createElement("button");
    btn.className = "code-copy-btn";
    btn.type = "button";
    btn.title = "复制代码";
    btn.innerHTML = '${ICONS.copy} <span>复制</span>';
    btn.onclick = (e) => {
      e.stopPropagation();
      const code = pre.querySelector("code") || pre;
      const textToCopy = code.innerText.replace(/复制\s*$/, "").trim();
      navigator.clipboard.writeText(textToCopy).then(() => {
        btn.classList.add("copied");
        btn.innerHTML = '${ICONS.check} <span>已复制</span>';
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.innerHTML = '${ICONS.copy} <span>复制</span>';
        }, 2000);
      });
    };
    pre.appendChild(btn);
  });
}

// 导航栏滚动悬浮检测与目录高亮
window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;
  const nav = document.getElementById("main-nav");
  if (nav) {
    if (scrollY > 60) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  }

  // 阅读进度
  const winScroll = document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
  const bar = document.getElementById("read-progress");
  if (bar) bar.style.width = scrolled + "%";
  updateZenProgress(scrolled);

  // 回到顶部按钮
  const btt = document.getElementById("back-to-top");
  if (btt) {
    if (scrollY > 300) {
      btt.classList.add("show");
    } else {
      btt.classList.remove("show");
    }
  }

  // 目录 ScrollSpy
  const headings = document.querySelectorAll(".article-main h1[id], .article-main h2[id], .article-main h3[id]");
  let activeId = "";
  headings.forEach(h => {
    const rect = h.getBoundingClientRect();
    if (rect.top <= 120) activeId = h.id;
  });

  if (activeId) {
    document.querySelectorAll(".toc-item").forEach(item => {
      const link = item.querySelector("a");
      if (link && link.getAttribute("href") === "#" + activeId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 全局快捷键：Cmd+K / Ctrl+K 触发搜索，ArrowUp/ArrowDown 导航
window.addEventListener("keydown", (e) => {
  const modal = document.getElementById("search-modal");
  const isOpen = modal && modal.classList.contains("open");

  if (isOpen) {
    const items = document.querySelectorAll(".search-result-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length > 0) {
        searchSelectedIndex = (searchSelectedIndex + 1) % items.length;
        updateSelectedSearchItem(items);
      }
      return;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length > 0) {
        searchSelectedIndex = (searchSelectedIndex - 1 + items.length) % items.length;
        updateSelectedSearchItem(items);
      }
      return;
    } else if (e.key === "Enter") {
      if (searchSelectedIndex >= 0 && items[searchSelectedIndex]) {
        e.preventDefault();
        items[searchSelectedIndex].click();
        return;
      }
    }
  }

  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    toggleSearchModal(true);
    return;
  }

  // 「/」快速唤起搜索（interactive spec 3.5），正在输入时不劫持
  if (e.key === "/" && !isOpen && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const el = document.activeElement;
    const tag = (el && el.tagName) || "";
    const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(el && el.isContentEditable);
    if (!typing) {
      e.preventDefault();
      toggleSearchModal(true);
      return;
    }
  }

  if (e.key === "Escape") {
    toggleSearchModal(false);
    toggleThemeDropdown(false);
    toggleNavMenu(false);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  initSiteTheme();
  initCodeCopy();
  initZenReadingMode();
});
`;

/**
 * 全站导航项唯一来源（顶栏与页脚共用，避免两处各写一份而漂移）
 */
export const NAV_ITEMS = [
  { key: "home", label: "首页", path: "index.html" },
  { key: "articles", label: "文章", path: "articles.html" },
  { key: "archives", label: "归档", path: "archives.html" },
  { key: "about", label: "关于", path: "about.html" },
];

/**
 * 统一导航栏组件生成器
 */
export function buildNavHtml(activeKey, isSubdir = false) {
  const prefix = isSubdir ? "../" : "";
  const navList = (SITE_CONFIG.nav && Array.isArray(SITE_CONFIG.nav) && SITE_CONFIG.nav.length > 0)
    ? SITE_CONFIG.nav.map(n => ({ key: n.key || (n.href || "").replace(/\.html$/, ""), label: n.label, path: n.href || n.path }))
    : NAV_ITEMS;

  return `
    <button class="nav-toggle-btn" type="button" aria-label="展开导航菜单" aria-expanded="false" aria-controls="site-nav-menu" onclick="toggleNavMenu()">
      ${ICONS.menu}
    </button>
    <nav class="nav-menu" id="site-nav-menu">
      ${navList
        .map(
          (item) => `
        <a href="${prefix}${item.path}" class="nav-menu-item ${item.key === activeKey ? "active" : ""}">${item.label}</a>`
        )
        .join("")}
    </nav>
  `;
}

/**
 * 统一页脚导航链接生成器
 */
export function buildFooterNavHtml(activeKey, isSubdir = false) {
  const prefix = isSubdir ? "../" : "";
  const navList = (SITE_CONFIG.nav && Array.isArray(SITE_CONFIG.nav) && SITE_CONFIG.nav.length > 0)
    ? SITE_CONFIG.nav.map(n => ({ key: n.key || (n.href || "").replace(/\.html$/, ""), label: n.label, path: n.href || n.path }))
    : NAV_ITEMS;

  return `
    <div class="footer-nav-links">
      ${navList
        .map(
          (item) => `
        <a href="${prefix}${item.path}" class="footer-nav-link ${item.key === activeKey ? "active" : ""}">${item.label}</a>`
        )
        .join("")}
    </div>
  `;
}

/**
 * 统一调色盘切换组件
 */
export function buildThemePickerHtml() {
  return `
    <div class="theme-picker-wrapper">
      <button class="nav-action-btn theme-picker-trigger" id="theme-picker-btn" onclick="toggleThemeDropdown()" title="选择全站风格主题" aria-haspopup="menu" aria-expanded="false" aria-controls="theme-picker-dropdown">
        ${ICONS.palette}
        <span class="theme-active-indicator"></span>
      </button>
      <div class="theme-dropdown-menu" id="theme-picker-dropdown" role="menu">
        <div class="theme-dropdown-header">全站视觉风格 (THEMES)</div>
        ${SITE_THEMES.map(
          (t) => `
          <div class="theme-dropdown-item" data-theme-id="${t.id}" tabindex="0" role="menuitem" onclick="selectSiteTheme('${t.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectSiteTheme('${t.id}');}">
            <span class="theme-swatch" style="background: ${t.color};"></span>
            <div class="theme-info">
              <div class="theme-name">${t.name}</div>
              <div class="theme-desc">${t.desc}</div>
            </div>
          </div>`
        ).join("")}
      </div>
    </div>
  `;
}

/**
 * 统一搜索模态框与通用挂件
 */
export function buildCommonWidgetsHtml(searchIndex = []) {
  const indexJson = JSON.stringify(searchIndex).replace(/</g, "\\u003c");
  return `
    <!-- 回到顶部按钮 -->
    <button id="back-to-top" onclick="scrollToTop()" title="回到顶部">
      ${ICONS.arrowUp}
    </button>

    <!-- 全局文章搜索数据索引 -->
    <script>window.__NOTES_INDEX__ = ${indexJson};</script>

    <!-- Raycast 级 Command Palette 指令中心与搜索模态框 (纯 section 架构) -->
    <section id="search-modal" class="search-modal-backdrop cmd-palette-backdrop" onclick="toggleSearchModal(false)" style="box-sizing: border-box;">
      <section class="search-modal-box cmd-palette-modal" onclick="event.stopPropagation()" style="box-sizing: border-box;">
        <section class="search-modal-input-row cmd-palette-input-wrap" style="box-sizing: border-box;">
          ${ICONS.search}
          <input type="text" id="search-input" class="search-modal-input cmd-palette-input" placeholder="输入搜索文章、快捷指令或主题... (按 Esc 退出)" oninput="onSearchModalInput(event)" autocomplete="off">
          <kbd class="cmd-palette-esc" onclick="toggleSearchModal(false)" style="cursor: pointer;">ESC</kbd>
        </section>
        <section id="search-results-box" class="search-results-box cmd-palette-results" style="box-sizing: border-box;">
          <section class="cmd-palette-empty" style="box-sizing: border-box; padding:24px;text-align:center;color:var(--text-light);font-size:0.9rem;">输入关键词搜索全部文章，或输入「主题」、「日夜」、「复制」触发快捷指令...</section>
        </section>
        <section class="cmd-palette-footer" style="box-sizing: border-box;">
          <span><kbd>↑</kbd> <kbd>↓</kbd> 选择</span>
          <span><kbd>↵</kbd> 执行</span>
          <span><kbd>ESC</kbd> 退出</span>
        </section>
      </section>
    </section>
  `;
}

/**
 * Zero-FOUC 零闪烁 Head 脚本
 */
export function buildZeroFoucScript() {
  return `
    <script>
      (function(){
        try {
          var savedTheme = localStorage.getItem("obw-site-theme") || "mint-emerald";
          document.documentElement.setAttribute("data-theme", savedTheme);
          var savedMode = localStorage.getItem("obw-site-mode") || localStorage.getItem("tan-blog-theme") || 
            (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
          document.documentElement.setAttribute("data-mode", savedMode);
        } catch(e) {}
      })();
    </script>
  `;
}

/**
 * 页面 <head> 资源链接：字体 + RSS 自动发现。
 * RSS 用绝对 URL，这样文章页（dist/posts/ 子目录）无需区分相对路径。
 */
export function buildHeadLinksHtml() {
  const feedUrl = `${SITE_CONFIG.siteUrl.replace(/\/+$/, "")}/feed.xml`;
  return `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="${FONT_STYLESHEET_URL}">
    <link rel="alternate" type="application/rss+xml" title="${SITE_CONFIG.title} RSS" href="${feedUrl}">
  `;
}

/* ==========================================================================
   统一页面外壳
   原先 6 个 builder 各抄一份 head + header + footer 骨架，任何全站改动都要改 6 处。
   这里收敛为唯一来源，所有差异通过参数表达。
   ========================================================================== */

/**
 * 外壳第一部分：<head> + <body> 开标签。
 */
export function buildPageHeadHtml({ title, description, isSubdir = false, referrer = false }) {
  const prefix = isSubdir ? "../" : "";
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
${referrer ? `  <meta name="referrer" content="no-referrer">\n` : ""}  ${buildHeadLinksHtml()}
  ${buildZeroFoucScript()}
  <style>
:root {
  --hero-bg: url('${prefix}images/hero-daily.jpg'), url('${prefix}images/hero-bg.jpg');
  --banner-bg: url('${prefix}images/bottom-banner-clean.jpg'), url('${prefix}images/bottom-banner.jpg');
  /* 首页 ARCHIVE 纵览带的背景图：刻意不用 --banner-bg，避免与底部「与我交流」横幅重复 */
  --archive-bg: url('${prefix}images/hero-clean.jpg');
  --bg-hero-daily: url('${prefix}images/daily/hero.webp'), url('${prefix}images/hero-architecture.jpg');
  --bg-archive-daily: url('${prefix}images/daily/archive.webp'), url('${prefix}images/hero-bg.jpg');
  --bg-footer-daily: url('${prefix}images/daily/footer.webp'), url('${prefix}images/bottom-banner.jpg');
  --bg-about-daily: url('${prefix}images/daily/about.webp'), url('${prefix}images/hero-workspace.jpg');
  --bg-banner-daily: url('${prefix}images/daily/banner.webp'), url('${prefix}images/hero-daily.jpg');
}
${SITE_STYLES}
  </style>
</head>
<body>
  <div id="read-progress"></div>`;
}

/**
 * 外壳第二部分：顶部导航栏（全站唯一实现，所有页面共用，无变体差异）。
 * activeKey 传 "" 表示不高亮任何项（文章页用）。
 */
export function buildPageHeaderHtml({ activeKey = "", isSubdir = false, extraActions = "" }) {
  const prefix = isSubdir ? "../" : "";

  return `  <header class="page-header" id="main-nav">
    <div class="nav-container">
      ${buildBrandHtml(isSubdir)}
      ${buildNavHtml(activeKey, isSubdir)}
      <div class="nav-right-actions">
        <button class="nav-cmd-k-btn" onclick="toggleSearchModal(true)" title="指令中心 (Cmd+K)">
          <span class="cmd-k-icon">${ICONS.search}</span>
          <span class="cmd-k-text">搜索与指令</span>
          <kbd class="cmd-k-badge">⌘K</kbd>
        </button>
        ${buildThemePickerHtml()}
${extraActions}        <button class="nav-action-btn" onclick="toggleTheme()" title="切换日夜模式">
          <span id="theme-toggle-icon">${ICONS.moon}</span>
        </button>
        <a href="${prefix}about.html" class="nav-avatar-btn" title="关于 ${SITE_CONFIG.author}">T</a>
      </div>
    </div>
  </header>`;
}

/**
 * 外壳第三部分：</main> 之后的底栏、通用挂件、页脚与脚本。
 */
export function buildPageTailHtml({
  activeKey = "",
  isSubdir = false,
  searchIndex = [],
  extraScript = "",
  showBottomBanner = true,
}) {
  const bannerBlock = showBottomBanner ? `  ${buildBottomBannerHtml(isSubdir)}\n\n` : "";

  return `${bannerBlock}  ${buildCommonWidgetsHtml(searchIndex)}

  <footer class="site-footer">
    <div class="footer-inner-container">
      <div>© 2026 ${SITE_CONFIG.title}. All rights reserved.</div>
      ${buildFooterNavHtml(activeKey, isSubdir)}
    </div>
  </footer>

  <script>${CLIENT_SCRIPTS}</script>${extraScript}
</body>
</html>`;
}

/**
 * 分类页 / 标签页侧栏筛选脚本
 * 两页的脚本原先各抄一份 ~60 行，仅「取哪个 dataset 字段」与几个标识符不同，
 * 这里用参数表达，保证生成的文本与原内容逐字符一致。
 */
function buildStreamFilterScript({ field, fnName, constName, paramName, hashPrefix }) {
  return `
  <script>
    (function() {
      const sidebarItems = document.querySelectorAll(".tag-sidebar-item");
      const entries = document.querySelectorAll(".horizontal-entry-item");
      const heroTitle = document.querySelector(".tag-hero-title");
      const totalCount = document.querySelector(".stream-total-count");
      const viewAllBtn = document.querySelector(".tag-hero-view-all");

      function ${fnName}(${paramName}, count) {
        sidebarItems.forEach(item => {
          if (item.dataset.filter === ${paramName}) {
            item.classList.add("active");
            item.style.borderLeft = "3px solid var(--primary)";
            item.style.color = "var(--text-main)";
          } else {
            item.classList.remove("active");
            item.style.borderLeft = "";
            item.style.color = "";
          }
        });

        let visibleCount = 0;
        entries.forEach(entry => {
          const ${constName} = (entry.dataset.${field} || "").split(",");
          if (!${paramName} || ${constName}.includes(${paramName})) {
            entry.style.display = "flex";
            visibleCount++;
          } else {
            entry.style.display = "none";
          }
        });

        if (heroTitle) {
          heroTitle.textContent = ${paramName} ? (${paramName} + " · " + visibleCount + " 篇文章") : ("全部 · " + entries.length + " 篇文章");
        }
        if (totalCount) {
          totalCount.textContent = "共 " + visibleCount + " 篇文章";
        }
      }

      // 深链：读取 #<prefix>-xxx 直接进入对应筛选。
      // 原先全站没有任何 location.hash 读取，首页 / 归档页的分类链接点进来只是跳到本页、
      // 并不真的筛选，看上去"点了都一样"。
      function readHash() {
        var raw = "";
        try { raw = decodeURIComponent((location.hash || "").replace(/^#/, "")); } catch (e) { raw = ""; }
        var prefix = "${hashPrefix}-";
        var name = raw.indexOf(prefix) === 0 ? raw.slice(prefix.length) : "";
        var hit = name && Array.prototype.some.call(sidebarItems, function (el) {
          return (el.dataset.filter || "") === name;
        });
        return hit ? name : "";
      }

      function applyHash() {
        ${fnName}(readHash(), 0);
      }

      sidebarItems.forEach(item => {
        item.addEventListener("click", function(e) {
          e.preventDefault();
          var name = this.dataset.filter || "";
          var url = location.pathname + location.search + (name ? "#${hashPrefix}-" + encodeURIComponent(name) : "");
          history.replaceState(null, "", url);
          ${fnName}(name, this.dataset.count);
        });
      });

      if (viewAllBtn) {
        viewAllBtn.addEventListener("click", function(e) {
          e.preventDefault();
          history.replaceState(null, "", location.pathname + location.search);
          sidebarItems.forEach(item => {
            item.classList.remove("active");
            item.style.borderLeft = "";
            item.style.color = "";
          });
          entries.forEach(entry => entry.style.display = "flex");
          if (heroTitle) heroTitle.textContent = "全部 · " + entries.length + " 篇文章";
          if (totalCount) totalCount.textContent = "共 " + entries.length + " 篇文章";
        });
      }

      applyHash();
      window.addEventListener("hashchange", applyHash);
    })();
  </script>`;
}

/**
 * 组装单个文章页面 HTML
 */
export function buildPostPageHtml(post, renderedHtml, toc, allPosts = [], searchIndex = []) {
  const tocItemsHtml = toc
    .map(
      (t) => `
    <li class="toc-item toc-level-${t.level}">
      <a href="#${t.id}">${t.text}</a>
    </li>`
    )
    .join("\n");

  const tagsHtml = (post.meta.tags || [])
    .map((t) => `<span class="theme-pill tag">${t}</span>`)
    .join(" ");

  const categoryPill = (post.meta.categories && post.meta.categories[0])
    ? `<span class="theme-pill primary"><span class="pill-dot"></span> ${post.meta.categories[0]}</span>`
    : `<span class="theme-pill primary"><span class="pill-dot"></span> 博客文章</span>`;

  const coverUrl = post.meta.cover ? (post.meta.cover.startsWith("http") ? post.meta.cover : (post.meta.cover.startsWith("../") ? post.meta.cover : `../${post.meta.cover}`)) : "";

  const relatedPosts = getRelatedPosts(post, allPosts, 2);
  const githubInteractionHtml = buildPostGithubInteraction(post);
  const recommendationsHtml = buildPostRecommendations(relatedPosts);

  return `${buildPageHeadHtml({
    title: `${post.meta.title} - ${SITE_CONFIG.title}`,
    description: `${post.meta.description || post.meta.title}`,
    isSubdir: true,
    referrer: true,
  })}

  <!-- Zen 沉浸式阅读模式：顶部细微进度条与右上角胶囊 -->
  <section id="zen-progress-bar" class="zen-progress-bar" style="box-sizing: border-box;"></section>
  <section id="zen-progress-capsule" class="zen-progress-capsule" style="box-sizing: border-box;">
    <span class="capsule-dot"></span>
    <span id="zen-progress-num">0%</span>
    <span class="capsule-sep">·</span>
    <span id="zen-reading-remain">约 ${post.readingStats.readingTimeMin} 分钟</span>
  </section>

  <!-- 悬浮 Zen 控制坞 (Floating Zen Dock) -->
  <section id="zen-floating-dock" class="zen-floating-dock" style="box-sizing: border-box;" aria-label="Zen 阅读控制坞">
    <button type="button" class="zen-dock-btn" onclick="adjustZenFontSize(-1)" title="缩小字号 (A-)">A-</button>
    <span id="zen-current-size" class="zen-dock-indicator">16.5</span>
    <button type="button" class="zen-dock-btn" onclick="adjustZenFontSize(1)" title="放大字号 (A+)">A+</button>
    <span class="zen-dock-divider"></span>
    <button type="button" class="zen-dock-btn zen-width-toggle" onclick="toggleZenWidth()" title="切换版心宽度">
      <span id="zen-width-label">680px</span>
    </button>
    <span class="zen-dock-divider"></span>
    <span class="zen-timer-wrap">⏱️ <span id="zen-timer-display">00:00</span></span>
    <span class="zen-dock-divider"></span>
    <button type="button" class="zen-dock-btn zen-toggle-btn" onclick="toggleFocusMode()" title="切换沉浸专注 (快捷键 Z)">
      <span id="zen-mode-text">专注</span>
    </button>
  </section>

  <!-- 退出专注阅读模式悬浮按钮 -->
  <button class="focus-mode-exit-btn" onclick="toggleFocusMode(false)">
    ${ICONS.cross} 退出专注模式
  </button>

  <!-- 顶部导航 -->
${buildPageHeaderHtml({ activeKey: "", isSubdir: true })}

  <!-- 文章主体：与其余四页同一个容器与无边框编辑部版式 -->
  <main class="main-content-wrapper main-container article-wrapper">
    <article class="article-main">
      <header class="article-header">
        <a href="../index.html" class="back-link">
          ${ICONS.arrowLeft} 返回博客首页
        </a>
        <section class="article-badge-row" style="box-sizing:border-box;">
          <span class="article-label">ARTICLE ——</span>
          ${categoryPill}
        </section>
        <h1 class="article-title">${post.meta.title}</h1>
        <section class="theme-accent-dash" style="box-sizing:border-box;">
          <span class="dash-long"></span>
          <span class="dash-dot"></span>
          <span class="dash-dot"></span>
        </section>
        ${post.meta.description ? `<p class="article-digest-desc">${post.meta.description}</p>` : ""}
        ${coverUrl ? `
        <section class="article-cover-card" style="box-sizing:border-box;border-radius:16px;overflow:hidden;margin:24px 0 28px;border:1px solid var(--border-color);">
          <img src="${coverUrl}" alt="${post.meta.title}" style="width:100%;max-height:420px;object-fit:cover;display:block;" onerror="this.parentElement.style.display='none'">
        </section>` : ""}
        <section class="article-tags-row" style="box-sizing:border-box;">
          <span class="theme-pill author"><span class="pill-dot"></span> ${post.meta.author || SITE_CONFIG.author}</span>
          ${tagsHtml}
          <span class="theme-pill meta">${ICONS.calendar} ${post.meta.date || "最近更新"}</span>
          <span class="theme-pill meta">${ICONS.clock} 约 ${post.readingStats.readingTimeMin} 分钟阅读</span>
          <button type="button" class="article-focus-btn" onclick="toggleFocusMode()" title="专注阅读模式">
            ${ICONS.bookOpen} 专注阅读
          </button>
        </section>
      </header>

      <!-- 正文内容 (Web Adaptor 自愈与高对比度排版) -->
      <section class="article-content">
        ${renderedHtml}
      </section>

      <!-- 极客互动与 GitHub 讨论区 -->
      ${githubInteractionHtml}

      <!-- 智能延伸阅读推荐 -->
      ${recommendationsHtml}

      <!-- 微信公众号订阅卡片 -->
      <section class="wechat-promo-card" style="box-sizing:border-box;">
        <section class="wechat-promo-text" style="box-sizing:border-box;">
          <h4>关注作者公众号「${SITE_CONFIG.wechatName}」</h4>
          <p>本文由 Obsidian WeChat Publisher (obw) 出版级排版引擎生成并同步发布。深度技术实战与原创思考第一时间直达。</p>
        </section>
        <section class="wechat-qr-box" style="box-sizing:border-box;">
          <img src="../${SITE_CONFIG.wechatQrUrl}" alt="公众号二维码" onerror="this.parentElement.style.display='none'">
        </section>
      </section>
    </article>

    <!-- 桌面端右侧随动目录 (TOC) -->
    ${
      toc.length > 0
        ? `<aside class="article-toc-sidebar" aria-label="文章目录">
        <section class="toc-header" style="box-sizing:border-box;">
          ${ICONS.toc} <span>本文目录</span>
        </section>
        <ul class="toc-list">
          ${tocItemsHtml}
        </ul>
      </aside>`
        : `<aside class="article-toc-sidebar">
        <section class="toc-header" style="box-sizing:border-box;">${ICONS.toc} <span>文章信息</span></section>
        <section style="box-sizing:border-box;font-size:0.88rem;color:var(--text-muted);line-height:1.6;">
          作者：${post.meta.author || SITE_CONFIG.author}<br>
          分类：${(post.meta.categories && post.meta.categories.join(", ")) || "随笔"}<br>
          字数：约 ${post.readingStats.totalWords} 字
        </section>
      </aside>`
    }
  </main>

${buildPageTailHtml({
    activeKey: "",
    isSubdir: true,
    searchIndex,
  })}`;
}

/**
 * 组装底部 100vw 全屏互动横幅 HTML（无框纯净悬浮设计 + 今日壁纸故事与金句拍立得 3D 翻转卡片）
 */
export function buildBottomBannerHtml(isSubdir = false) {
  const prefix = isSubdir ? "../" : "";
  const bannerConfig = (SITE_CONFIG.pages && SITE_CONFIG.pages.comm_banner) || {
    title: "与我交流",
    desc: "如果你对文章有任何想法，或者有技术、产品、生活方面的问题，欢迎在评论区留言，或通过其他方式联系我。",
  };
  const dailyQuote = getDailyQuote();
  const footerWallpaper = getDailyWallpaper("footer") || getDailyWallpaper("hero") || {};

  const socialLinks = SITE_CONFIG.social_links || [
    { platform: "mail", title: "发送邮件", href: `mailto:${SITE_CONFIG.email}` },
    { platform: "rss", title: "RSS 订阅", href: `${prefix}feed.xml` },
    { platform: "github", title: "GitHub 个人主页", href: SITE_CONFIG.githubUrl },
    { platform: "about", title: "关于我", href: `${prefix}about.html` },
  ];

  const socialIconsHtml = socialLinks.map(s => {
    let icon = ICONS[s.platform] || ICONS.user;
    if (s.platform === "mail") icon = ICONS.mail;
    else if (s.platform === "rss") icon = ICONS.rss;
    else if (s.platform === "github") icon = ICONS.github;
    else if (s.platform === "about" || s.platform === "user") icon = ICONS.user;
    else if (s.platform === "wechat") icon = ICONS.chat;

    let href = s.href || "#";
    if (href.startsWith("about.html") && isSubdir) href = `../${href}`;
    if (href.startsWith("feed.xml") && isSubdir) href = `../${href}`;
    const target = href.startsWith("http") ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${href}"${target} class="social-circle-btn" title="${s.title}">${icon}</a>`;
  }).join("\n        ");

  const quoteText = dailyQuote.hitokoto || "保持好奇，保持温柔。";
  const quoteFrom = dailyQuote.from ? `—— ${dailyQuote.from}` : `—— ${SITE_CONFIG.author || "Tan"}`;
  const wallpaperTitle = footerWallpaper.title || "山峦晨雾";
  const wallpaperStory = footerWallpaper.story || footerWallpaper.copyright || "大自然的静谧与壮美，记录每一次心灵的触动。";

  return `
  <!-- Section: 底部宽幅互动横幅 (100vw 全屏每日壁纸 + 拍立得 3D 翻转卡片，严格 Section 语义化) -->
  <section class="bottom-comm-banner" style="box-sizing: border-box;">
    <section class="banner-left" style="box-sizing: border-box;">
      <section class="banner-title" style="box-sizing: border-box;">
        ${ICONS.chat} <span>${bannerConfig.title || "与我交流"}</span>
      </section>
      <p class="banner-desc">
        ${bannerConfig.desc}
      </p>
      <section class="banner-social-row" style="box-sizing: border-box;">
        ${socialIconsHtml}
      </section>
      <section class="banner-meta-footnote" style="box-sizing: border-box; margin-top: 18px; font-size: 0.78rem; opacity: 0.65;">
        <span>${getTodayFormattedDate()}</span> · <span>📷 今日壁纸：${wallpaperTitle}</span>
      </section>
    </section>

    <section class="banner-photocard-wrap" style="box-sizing: border-box;">
      <section class="photocard-card" style="box-sizing: border-box;" onclick="this.classList.toggle('flipped')" title="点击翻转查看今日壁纸故事">
        <section class="photocard-face photocard-front" style="box-sizing: border-box;">
          <span class="photocard-badge">DAILY QUOTE · 今日金句</span>
          <p class="photocard-text">“${quoteText}”</p>
          <span class="photocard-author">${quoteFrom}</span>
          <span class="photocard-flip-hint">点击翻转查看壁纸故事 ↺</span>
        </section>
        <section class="photocard-face photocard-back" style="box-sizing: border-box;">
          <span class="photocard-badge">BING WALLPAPER · 今日壁纸</span>
          <h4 class="photocard-scene-title">${wallpaperTitle}</h4>
          <p class="photocard-scene-desc">${wallpaperStory}</p>
          <span class="photocard-date">${getTodayFormattedDate()}</span>
        </section>
      </section>
    </section>
  </section>`;
}

/**
 * 组装首页 HTML (1:1 像素级复现用户设计稿 + 纯净 Hero 与动态分类药丸)
 */
export function buildIndexPageHtml(posts, featuredPost, latestPosts, allCategories, searchIndex = []) {
  const dailyQuote = getDailyQuote();
  const dailyWallpaper = getDailyWallpaper();
  const weather = getDailyWeather();
  const githubPulse = getGithubPulse();

  // Hero 右侧分类导航：用真实分类动态生成。
  // 原先写死 DESIGN / TECHNOLOGY / LIFE / NOTES —— 既不是本仓的真实分类
  // （实际是 技术 / 生活 / 思考 / 成长 / 产品），四个链接还全部指向同一个 categories.html。
  const heroCategoryNavHtml = (allCategories || [])
    .map(
      (c) =>
        `          <a href="categories.html#cat-${encodeURIComponent(c)}" class="editorial-nav-item"><span>${c}</span> <span>→</span></a>`
    )
    .join("\n");

  // 精选文章
  const feat = featuredPost || posts[0];
  const featCover = feat.meta.cover ? feat.meta.cover.replace(/^\.\.\//, "") : "images/featured-fuji.jpg";
  const featTag = (feat.meta.tags && feat.meta.tags[0]) ? feat.meta.tags[0] : ((feat.meta.categories && feat.meta.categories[0]) || "DESIGN");
  const featReadingMin = feat.readingStats ? feat.readingStats.readingTimeMin : 5;

  // Selected writings (4 篇文章流)
  const selectedCandidates = posts.filter(p => p.slug !== feat.slug);
  const selectedList = selectedCandidates.slice(0, 4);
  while (selectedList.length < 4 && posts.length > 0) {
    selectedList.push(posts[selectedList.length % posts.length]);
  }

  const selectedStreamHtml = selectedList.map((p, idx) => {
    const num = String(idx + 1).padStart(2, "0");
    const dateStr = p.meta.date ? p.meta.date.slice(5).replace(/-/g, ".") : "09.22";
    const cat = (p.meta.categories && p.meta.categories[0]) || (p.meta.tags && p.meta.tags[0]) || "NOTES";
    const readingMin = p.readingStats ? p.readingStats.readingTimeMin : 4;

    return `
      <a href="posts/${p.slug}.html" class="selected-stream-item" data-categories="${(p.meta.categories || []).join(",")}" data-tags="${(p.meta.tags || []).join(",")}">
        <section class="selected-item-num-date" style="box-sizing: border-box;">
          <span style="font-size: 0.95rem; font-weight: 800; color: var(--text-main);">${num}</span>
          <span>${dateStr}</span>
        </section>
        <h3 class="selected-item-title">${p.meta.title}</h3>
        <section class="selected-item-meta" style="box-sizing: border-box;">
          <span>${cat.toUpperCase()} / ${readingMin} MIN</span>
        </section>
      </a>`;
  }).join("\n");

  // Panoramic archive (年份分组文章)
  const postsByYear = {};
  for (const p of posts) {
    const y = (p.meta.date || "2026").slice(0, 4);
    if (!postsByYear[y]) postsByYear[y] = [];
    postsByYear[y].push(p);
  }
  const archiveYears = ["2026", "2025", "2024"];

  const panoramicColsHtml = archiveYears.map(year => {
    const yearPosts = postsByYear[year] || [];
    const displayPosts = yearPosts.slice(0, 3);
    const postRowsHtml = displayPosts.length > 0 
      ? displayPosts.map(p => {
          const dateSub = p.meta.date ? p.meta.date.slice(5).replace(/-/g, ".") : "01.01";
          return `
          <a href="posts/${p.slug}.html" class="panoramic-post-row">
            <span class="panoramic-post-title">${p.meta.title}</span>
            <span class="panoramic-post-date">${dateSub}</span>
          </a>`;
        }).join("\n")
      : `<span style="font-size: 0.85rem; color: rgba(255,255,255,0.45); font-style: italic;">暂无归档记录</span>`;

    return `
      <section class="panoramic-year-col" style="box-sizing: border-box;">
        <span class="panoramic-year-badge">${year}</span>
        ${postRowsHtml}
      </section>`;
  }).join("\n");

  return `${buildPageHeadHtml({
    title: `${SITE_CONFIG.title} - ${SITE_CONFIG.hero.calligraphy.join("，")}`,
    description: SITE_CONFIG.description,
  })}

${buildPageHeaderHtml({ activeKey: "home" })}

  <!-- 页面主体内容 (纯 Section 架构，微信后台 0 塌陷保证) -->
  <main class="main-content-wrapper main-container">
    <!-- Chapter 1: 3-column Editorial Hero (100vw 全宽沉浸巨幕) -->
    <section class="editorial-hero" style="box-sizing: border-box;">
      <section class="editorial-hero-col-left" style="box-sizing: border-box;">
        <section class="editorial-status-capsule github-pulse-badge" style="box-sizing: border-box; display: inline-flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 12px; font-family: var(--font-mono); color: var(--primary-light, #34d399); letter-spacing: 0.06em;">
          <span class="live-dot pulse-dot" style="width: 7px; height: 7px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary); display: inline-block;"></span>
          <span class="editorial-date" data-date="${getTodayFormattedDate()}">${getTodayFormattedDate().replace(/\./g, " / ")} · ${weather.solarTerm}</span>
          <span style="opacity: 0.4;">|</span>
          <span class="editorial-github-pulse" title="${githubPulse.message}">● ${githubPulse.statusText}</span>
        </section>
        <h1 class="editorial-headline">${(SITE_CONFIG.pages && SITE_CONFIG.pages.home && SITE_CONFIG.pages.home.hero_headline) || "记录设计、技术，以及那些值得思考的事。"}</h1>
        <p class="editorial-subheadline">${(SITE_CONFIG.pages && SITE_CONFIG.pages.home && SITE_CONFIG.pages.home.hero_subheadline) || "I write about design, technology and everything in between."}</p>
        <a href="#featured" class="editorial-more-link">${(SITE_CONFIG.pages && SITE_CONFIG.pages.home && SITE_CONFIG.pages.home.hero_cta) || "READ MORE →"}</a>
      </section>

      <section class="editorial-hero-col-center" style="box-sizing: border-box;">
        <img src="images/daily/hero.webp" alt="Editorial Hero Cover" class="editorial-hero-img" onerror="this.src='images/hero-architecture.jpg'">
      </section>

      <section class="editorial-hero-col-right" style="box-sizing: border-box;">
        <section class="editorial-weather-capsule weather-capsule" style="box-sizing: border-box; margin-bottom: 18px; font-size: 12px; color: rgba(248, 250, 252, 0.85); font-family: var(--font-mono);">
          <span style="color: var(--primary-light); font-weight: 700;">${weather.city}</span>
          <span>${weather.condition} ${weather.temp}°C</span>
          <span style="opacity: 0.4;">/</span>
          <span>${weather.chineseHour}</span>
        </section>
        <span class="editorial-nav-label">CATEGORIES</span>
        <nav class="editorial-nav-list">
${heroCategoryNavHtml}
        </nav>
      </section>
    </section>

    <!-- Chapter 2: FEATURED Showcase -->
    <section id="featured" class="featured-showcase" style="box-sizing: border-box;">
      <section class="featured-showcase-header" style="box-sizing: border-box;">
        <span class="chapter-label">FEATURED ——</span>
      </section>

      <section class="featured-showcase-grid" style="box-sizing: border-box;">
        <section class="featured-showcase-text" style="box-sizing: border-box;">
          <a href="posts/${feat.slug}.html" style="text-decoration: none;">
            <h2 class="featured-showcase-title">${feat.meta.title}</h2>
          </a>
          <p class="featured-showcase-desc">${feat.meta.description || feat.rawExcerpt || "点击探索深度阅读全文..."}</p>
          <span class="featured-showcase-meta">${featTag.toUpperCase()} / ${featReadingMin} MIN READ</span>
        </section>

        <section class="featured-showcase-image-box" style="box-sizing: border-box;">
          <a href="posts/${feat.slug}.html" style="display: block; width: 100%; height: 100%;">
            <img src="${featCover}" alt="${feat.meta.title}" class="featured-showcase-img" onerror="this.src='images/featured-fuji.jpg'">
          </a>
        </section>
      </section>
    </section>

    <!-- Chapter 3: SELECTED WRITINGS (4-column vertical stream) -->
    <section class="selected-writings" style="box-sizing: border-box;">
      <section class="selected-writings-header" style="box-sizing: border-box;">
        <span class="chapter-label">SELECTED WRITINGS ——</span>
      </section>

      <section class="selected-writings-stream" style="box-sizing: border-box;">
        ${selectedStreamHtml}
      </section>
    </section>

    <!-- Chapter 4: Panoramic Archive Spread -->
    <section class="panoramic-archive-spread" style="box-sizing: border-box;">
      <section class="panoramic-inner" style="box-sizing: border-box;">
        <section class="panoramic-header" style="box-sizing: border-box;">
          <h2 class="panoramic-title">
            <span>ARCHIVE ——</span>
            <span class="panoramic-sub">${(SITE_CONFIG.pages && SITE_CONFIG.pages.home && SITE_CONFIG.pages.home.archive_quote) || "时间会筛选出真正重要的东西。"}</span>
          </h2>
          <a href="archives.html" class="panoramic-view-all">VIEW ALL →</a>
        </section>

        <section class="panoramic-years-grid" style="box-sizing: border-box;">
          ${panoramicColsHtml}
        </section>
      </section>
    </section>

    <!-- Chapter 5: Footprint & About -->
    <section class="footprint-about" style="box-sizing: border-box;">
      <section class="footprint-about-inner" style="box-sizing: border-box;">
        <section class="footprint-avatar-box" style="box-sizing: border-box;">
          <img src="images/avatar.jpg" alt="${SITE_CONFIG.author}" class="footprint-avatar-img" onerror="this.src='images/featured-fuji.jpg'">
        </section>

        <section class="footprint-info" style="box-sizing: border-box;">
          <section class="footprint-header-row" style="box-sizing: border-box;">
            <h2 class="footprint-title">ABOUT ME ——</h2>
            <span class="footprint-signature">${SITE_CONFIG.author}</span>
          </section>
          <p class="footprint-bio">
            你好，我是 ${SITE_CONFIG.author}。一个喜欢思考、记录和创造的人。在这里，我分享一些关于设计、技术、生活的所见所想。
          </p>
          <section class="footprint-footer-row" style="box-sizing: border-box;">
            <a href="about.html" class="footprint-more-link">MORE ABOUT →</a>
            <section class="footprint-social-links" style="box-sizing: border-box;">
              <a href="mailto:${SITE_CONFIG.email}" class="footprint-social-icon" title="发送邮件">${ICONS.mail}</a>
              <a href="feed.xml" class="footprint-social-icon" title="RSS 订阅">${ICONS.rss}</a>
              <a href="${SITE_CONFIG.githubUrl}" target="_blank" rel="noopener" class="footprint-social-icon" title="GitHub 主页">${ICONS.github}</a>
              <a href="about.html" class="footprint-social-icon" title="关于我">${ICONS.user}</a>
            </section>
          </section>
          <section class="footprint-meta-footnote" style="box-sizing: border-box; margin-top: 18px; font-size: 0.78rem; opacity: 0.65;">
            <span>${getTodayFormattedDate()}</span> · <span>📷 今日壁纸：${(dailyWallpaper || {}).title || "晨曦之光"}</span>
          </section>
        </section>
      </section>
    </section>
  </main>

${buildPageTailHtml({ activeKey: "home", searchIndex, showBottomBanner: true })}`;
}

/**
 * 组装时间线归档页面 HTML (/archives.html)
 * 1:1 复刻编辑部杂志时间线 (Reference Image 2)
 */
export function buildArchivesHtml(posts, searchIndex = []) {
  const onThisDay = getOnThisDay();

  // 右侧分类导航：同样用真实分类生成。
  // 原先写死的 DESIGN / TECHNOLOGY / LIFE / NOTES 四项全部指向 categories.html。
  const archivesCategoryNavHtml = [...new Set(posts.flatMap((p) => p.meta.categories || []))]
    .filter((c) => c !== "关于")
    .map(
      (c) =>
        `          <a href="categories.html#cat-${encodeURIComponent(c)}" class="archive-filter-link"><span>${c}</span> <span>→</span></a>`
    )
    .join("\n");

  // 按年份分组
  const yearGroups = {};
  const sorted = [...posts].sort((a, b) => {
    const dateA = a.meta.date ? new Date(a.meta.date).getTime() : 0;
    const dateB = b.meta.date ? new Date(b.meta.date).getTime() : 0;
    return dateB - dateA;
  });

  for (const p of sorted) {
    const year = (p.meta.date || "2026").slice(0, 4);
    if (!yearGroups[year]) yearGroups[year] = [];
    yearGroups[year].push(p);
  }

  const DEFAULT_REFLECTIONS = {
    "2026": "这一年，我更关注生活的质感与思考的深度。重构感知，在代码与文字间探寻数字世界的温度与秩序。",
    "2025": "在代码与现实的交织中寻找秩序，沉淀关于架构、设计与自我成长的答案。",
    "2024": "探索未知与可能，跨越不同技术栈的边界，以文字作为思考的锚点与心智的索引。",
  };
  const userReflections = (SITE_CONFIG.pages && SITE_CONFIG.pages.archives && SITE_CONFIG.pages.archives.reflections) || {};
  const YEAR_REFLECTIONS = { ...DEFAULT_REFLECTIONS, ...userReflections };

  const fallbackImages = [
    "images/post-design.jpg",
    "images/post-study.jpg",
    "images/post-hyperf.jpg",
    "images/post-travel.jpg",
    "images/featured-fuji.jpg",
    "images/hero-architecture.jpg",
    "images/hero-daily.jpg",
  ];

  const sortedYears = Object.keys(yearGroups).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

  const yearsHtml = sortedYears.map((year) => {
    const yearPosts = yearGroups[year];
    const yearReflection = YEAR_REFLECTIONS[year] || "这一年，我更关注生活的质感与思考的深度。";

    // 提取该年份下所有月份并去重倒序
    const monthList = [...new Set(yearPosts.map(p => {
      const d = p.meta.date || `${year}-01-01`;
      return d.slice(5, 7) + "月";
    }))].sort().reverse();

    const monthNodesHtml = monthList.map((m) => `
          <section class="timeline-dot-node" style="box-sizing: border-box;">
            <span class="timeline-dot-circle"></span>
            <span class="timeline-dot-month">${m}</span>
          </section>`).join("\n");

    const entriesHtml = yearPosts.map((p, idx) => {
      const rawCover = p.meta.cover ? p.meta.cover.replace(/^\.\.\//, "") : "";
      const coverUrl = rawCover || fallbackImages[idx % fallbackImages.length];
      const dateStr = p.meta.date ? p.meta.date.slice(5).replace(/-/g, ".") : "01.01";
      const cat = (p.meta.categories && p.meta.categories[0]) || (p.meta.tags && p.meta.tags[0]) || "随笔";
      const readingMin = p.readingStats ? p.readingStats.readingTimeMin : 4;

      return `
            <section class="archive-entry-card" style="box-sizing: border-box;">
              <section class="archive-entry-thumb" style="box-sizing: border-box;">
                <a href="posts/${p.slug}.html" class="archive-entry-img-link" tabindex="-1" aria-hidden="true">
                  <img src="${coverUrl}" alt="${p.meta.title}" class="archive-entry-img" loading="lazy" onerror="this.src='images/hero-daily.jpg'">
                </a>
              </section>
              <section class="archive-entry-header" style="box-sizing: border-box;">
                <span class="archive-entry-date">${dateStr}</span>
                <span class="archive-entry-sep">·</span>
                <span class="archive-entry-category" style="color: var(--primary);">${cat.toUpperCase()}</span>
              </section>
              <h3 class="archive-entry-title">
                <a href="posts/${p.slug}.html" class="archive-entry-title-link">${p.meta.title}</a>
              </h3>
              <section class="archive-entry-footer" style="box-sizing: border-box;">
                <span class="archive-entry-time">${readingMin} min read</span>
              </section>
            </section>`;
    }).join("\n");

    return `
      <section class="year-block" style="box-sizing: border-box;">
        <section class="year-col-left" style="box-sizing: border-box;">
          <span class="year-number">${year}</span>
          <p class="year-reflection">${yearReflection}</p>
          <span class="year-count-badge">${yearPosts.length} 篇文章</span>
        </section>

        <section class="year-timeline-dots" style="box-sizing: border-box;">
          <section class="timeline-dot-track" style="box-sizing: border-box;">
            <span class="timeline-dot-stem"></span>
            ${monthNodesHtml}
          </section>
        </section>

        <section class="year-col-right" style="box-sizing: border-box;">
          <section class="archive-entries-grid" style="box-sizing: border-box;">
            ${entriesHtml}
          </section>
        </section>
      </section>`;
  }).join("\n");

  return `${buildPageHeadHtml({
    title: `文章归档 (Archives) - ${SITE_CONFIG.title}`,
    description: `${SITE_CONFIG.title} 历年全部文章时间线归档索引`,
  })}

${buildPageHeaderHtml({ activeKey: "archives" })}

  <!-- 页面主体内容 (纯 Section 架构，微信后台 0 塌陷保证) -->
  <main class="main-content-wrapper main-container">
    <!-- Chapter 1: Archive Hero (1:1 Reference Image 2) -->
    <section class="archive-hero" style="box-sizing: border-box;">
      <section class="archive-hero-col-left" style="box-sizing: border-box;">
        <span class="chapter-label">ARCHIVE ——</span>
        <h1 class="archive-hero-title">${(SITE_CONFIG.pages && SITE_CONFIG.pages.archives && SITE_CONFIG.pages.archives.title) || "归档 · 时间里的思考"}</h1>
        <p class="archive-hero-desc">${(SITE_CONFIG.pages && SITE_CONFIG.pages.archives && SITE_CONFIG.pages.archives.subtitle) || "时间会筛选出真正重要的东西。在这里，按时间脉络归档记录所有关于架构思考、工程设计与生活哲学的文字足迹。"}</p>
        <section class="archive-on-this-day on-this-day-banner" style="box-sizing: border-box; display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; padding: 6px 14px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); font-size: 12.5px; color: rgba(248,250,252,0.9);">
          <span style="color: var(--primary-light, #34d399); font-weight: 600;">📜 历史上的今天</span>
          <span>${onThisDay.display}</span>
        </section>
      </section>

      <section class="archive-hero-col-center" style="box-sizing: border-box;">
        <img src="images/daily/archive.webp" alt="Archive Hero Cover" class="archive-hero-img" onerror="this.src='images/hero-architecture.jpg'">
      </section>

      <section class="archive-hero-col-right" style="box-sizing: border-box;">
        <span class="archive-filter-label">CATEGORIES</span>
        <nav class="archive-filter-list">
          <a href="archives.html" class="archive-filter-link active"><span>全部</span> <span>(${posts.length})</span></a>
${archivesCategoryNavHtml}
        </nav>
      </section>
    </section>

    <!-- Year Blocks Container -->
    <section class="archive-years-container" style="box-sizing: border-box;">
      ${yearsHtml}
    </section>

    <!-- 文章计数（原 1–5 页码与箭头为纯装饰、点击无任何效果，已移除） -->
    <section class="archive-pagination" style="box-sizing: border-box;">
      <span class="archive-total-count">共 ${posts.length} 篇文章</span>
    </section>
  </main>

${buildPageTailHtml({ activeKey: "archives", searchIndex })}`;
}

/**
 * 组装分类探索页面 HTML (/categories.html) - 1:1 复刻 Reference Image 4
 */
export function buildCategoriesHtml(posts, categoriesMap, searchIndex = []) {
  const weather = getDailyWeather();
  const vinyl = getVinylData();

  if (!categoriesMap) {
    categoriesMap = {};
    for (const post of posts) {
      for (const cat of post.meta.categories || ["未分类"]) {
        if (!categoriesMap[cat]) categoriesMap[cat] = [];
        categoriesMap[cat].push(post);
      }
    }
  }

  const fallbackImages = [
    "images/post-design.jpg",
    "images/post-study.jpg",
    "images/post-hyperf.jpg",
    "images/post-travel.jpg",
    "images/featured-fuji.jpg",
    "images/hero-architecture.jpg",
    "images/hero-daily.jpg",
  ];

  const sortedCategories = Object.entries(categoriesMap)
    .filter(([c]) => c !== "关于")
    .sort((a, b) => b[1].length - a[1].length);

  const activeName = sortedCategories[0] ? sortedCategories[0][0] : "全部";
  const count = sortedCategories[0] ? sortedCategories[0][1].length : posts.length;

  const sidebarItemsHtml = sortedCategories.map(([cat, catPosts], idx) => {
    const isActive = idx === 0;
    const activeClass = isActive ? " active" : "";
    const activeStyle = isActive ? ` style="border-left: 3px solid var(--primary); color: var(--primary);"` : "";
    return `
          <a href="categories.html#cat-${encodeURIComponent(cat)}" class="tag-sidebar-item${activeClass}"${activeStyle} data-filter="${cat}" data-name="${cat}" data-count="${catPosts.length}">
            <span class="tag-sidebar-name">${cat}</span>
            <span class="tag-sidebar-count">${catPosts.length}</span>
          </a>`;
  }).join("\n");

  const entriesHtml = posts.map((post, idx) => {
    const idxStr = String(idx + 1).padStart(2, "0");
    const rawCover = post.meta.cover ? post.meta.cover.replace(/^\.\.\//, "") : "";
    const coverUrl = rawCover || fallbackImages[idx % fallbackImages.length];
    const catName = (post.meta.categories && post.meta.categories[0]) || (post.meta.tags && post.meta.tags[0]) || "未分类";
    const readingMin = post.readingStats ? post.readingStats.readingTimeMin : 4;
    const excerpt = post.meta.description || "点击探索深度阅读全文...";

    return `
          <section class="horizontal-entry-item" style="box-sizing: border-box;" data-categories="${(post.meta.categories || []).join(",")}" data-tags="${(post.meta.tags || []).join(",")}">
            <a href="posts/${post.slug}.html" class="entry-thumb-link" aria-label="${post.meta.title}">
              <img src="${coverUrl}" alt="${post.meta.title}" class="entry-thumb-img" loading="lazy" onerror="this.src='images/hero-daily.jpg'">
            </a>
            <section class="entry-text-block" style="box-sizing: border-box;">
              <header class="entry-meta-header" style="box-sizing: border-box;">
                <span class="entry-meta-date">${post.meta.date || "2026-09-22"}</span>
                <span class="entry-meta-sep">·</span>
                <span class="entry-meta-category">${catName}</span>
              </header>
              <h3 class="entry-title">
                <a href="posts/${post.slug}.html">${post.meta.title}</a>
              </h3>
              <p class="entry-excerpt">${excerpt}</p>
            </section>
            <section class="entry-right-meta" style="box-sizing: border-box;">
              <span class="entry-reading-index">${readingMin} min read —— ${idxStr}</span>
            </section>
          </section>`;
  }).join("\n");

  return `${buildPageHeadHtml({
    title: `分类探索 (Categories) - ${SITE_CONFIG.title}`,
    description: `${SITE_CONFIG.title} 全部分类聚合与主题探索`,
  })}

${buildPageHeaderHtml({ activeKey: "categories" })}

  <!-- 页面主体内容 (纯 Section 架构，微信后台 0 塌陷保证) -->
  <main class="main-content-wrapper main-container">
    <!-- Hero Header -->
    <section class="tag-hero" style="box-sizing: border-box;">
      <section class="tag-hero-left" style="box-sizing: border-box;">
        <span class="tag-hero-label">CATEGORY ——</span>
        <h1 class="tag-hero-title">${activeName} · ${count} 篇文章</h1>
        <p class="tag-hero-desc">探索体系化思考与技术实现的交汇点。按主题聚类的长文脉络，记录架构设计、工程实践与生活感悟。</p>
        <a href="categories.html" class="tag-hero-view-all">VIEW ALL →</a>
      </section>

      <section class="tag-hero-center" style="box-sizing: border-box;">
        <img src="images/hero-architecture.jpg" alt="Category Hero Atmosphere" class="tag-hero-img" onerror="this.src='images/hero-daily.jpg'">
      </section>

      <section class="tag-hero-right curated-footnote" style="box-sizing: border-box;">
        <section class="curation-meta" style="box-sizing: border-box;">
          <span class="live-dot" style="width: 7px; height: 7px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary); display: inline-block;"></span>
          <span>${weather.cityCn} · ${weather.condition} ${weather.temp}°C</span>
          <span style="opacity: 0.4;">/</span>
          <span>${weather.solarTerm} · ${weather.chineseHour}</span>
        </section>

        <section class="curation-quote-body" style="box-sizing: border-box;">
          <p class="tag-hero-quote"><em>"Good design makes life better."</em></p>
          <p class="curation-quote-cn">好的设计让生活更美好，而克制是优雅的开始。</p>
        </section>

        <section class="curation-stamp" style="box-sizing: border-box;">
          ${weather.coordinates} · 思考与记录 —— Tan
        </section>
      </section>
    </section>

    <!-- Dual-Column Body -->
    <section class="tag-stream-layout" style="box-sizing: border-box;">
      <!-- Left Column Sidebar -->
      <section class="tag-sidebar" style="box-sizing: border-box;">
        <span class="tag-sidebar-header">ALL CATEGORIES ——</span>
        <nav class="tag-sidebar-list">
          ${sidebarItemsHtml}
        </nav>

        <section class="sidebar-quote-box" style="box-sizing: border-box;">
          <section class="sidebar-quote-photo" style="box-sizing: border-box;">
            <img src="images/hero-bg.jpg" alt="Author Workspace" class="sidebar-quote-img" onerror="this.src='images/hero-daily.jpg'">
          </section>
          <blockquote class="sidebar-quote-text">
            "写作，是我与世界对话的方式。"
          </blockquote>
          <span class="sidebar-quote-signature">—— Tan</span>
        </section>

        <!-- 3D 拟物黑胶唱片组件 -->
        <section class="vinyl-capsule" style="box-sizing: border-box;">
          <section class="vinyl-wrapper" style="box-sizing: border-box;">
            <section class="vinyl-jacket" style="box-sizing: border-box;">
              <img src="${vinyl.jacket}" alt="${vinyl.title}" onerror="this.src='images/hero-architecture.jpg'">
            </section>
            <section class="vinyl-disc" style="box-sizing: border-box;">
              <span class="vinyl-disc-center"></span>
            </section>
          </section>
          <section class="vinyl-meta" style="box-sizing: border-box;">
            <span class="vinyl-label">NOW PLAYING</span>
            <span class="vinyl-title">${vinyl.title} · ${vinyl.currentTrack}</span>
            <span class="vinyl-artist">${vinyl.artist}</span>
          </section>
        </section>
      </section>

      <!-- Right Column Main Stream -->
      <section class="tag-main-stream" style="box-sizing: border-box;">
        <!-- 文章计数（原「最新 / 最热 / 最多阅读」Tabs 为纯装饰、点击不会重排序，已移除） -->
        <section class="stream-header-row" style="box-sizing: border-box;">
          <span class="stream-total-count">共 ${posts.length} 篇文章</span>
        </section>

        <!-- Horizontal Entries Stream -->
        <section class="stream-entries-list" style="box-sizing: border-box;">
          ${entriesHtml}
        </section>

        <!-- 原 1–5 页码与箭头为纯装饰、点击无效果，已移除 -->
        <section class="stream-header-row" style="box-sizing: border-box;">
          <span class="stream-total-count">共 ${posts.length} 篇文章</span>
        </section>
      </section>
    </section>
  </main>

${buildPageTailHtml({
    activeKey: "categories",
    searchIndex,
    extraScript: buildStreamFilterScript({
      field: "categories",
      fnName: "filterCategory",
      constName: "cats",
      paramName: "catName",
      hashPrefix: "cat",
    }),
  })}`;
}

/**
 * 组装文章总览页面 HTML (/articles.html) - 1:1 复刻 Reference Image 4
 */
export function buildArticlesHtml(posts, categoriesMap, searchIndex = []) {
  const weather = getDailyWeather();
  const vinyl = getVinylData();

  if (!categoriesMap) {
    categoriesMap = {};
    for (const post of posts) {
      for (const cat of post.meta.categories || ["未分类"]) {
        if (!categoriesMap[cat]) categoriesMap[cat] = [];
        categoriesMap[cat].push(post);
      }
    }
  }

  const fallbackImages = [
    "images/post-design.jpg",
    "images/post-study.jpg",
    "images/post-hyperf.jpg",
    "images/post-travel.jpg",
    "images/featured-fuji.jpg",
    "images/hero-architecture.jpg",
    "images/hero-daily.jpg",
  ];

  const sortedCategories = Object.entries(categoriesMap)
    .filter(([c]) => c !== "关于")
    .sort((a, b) => b[1].length - a[1].length);

  const sidebarItemsHtml = [
    `
          <a href="articles.html" class="tag-sidebar-item active" style="border-left: 3px solid var(--primary); color: var(--primary);" data-filter="all" data-name="全部文章" data-count="${posts.length}">
            <span class="tag-sidebar-name">全部文章</span>
            <span class="tag-sidebar-count">${posts.length}</span>
          </a>`,
    ...sortedCategories.map(([cat, catPosts]) => `
          <a href="articles.html#cat-${encodeURIComponent(cat)}" class="tag-sidebar-item" data-filter="${cat}" data-name="${cat}" data-count="${catPosts.length}">
            <span class="tag-sidebar-name">${cat}</span>
            <span class="tag-sidebar-count">${catPosts.length}</span>
          </a>`)
  ].join("\n");

  const entriesHtml = posts.map((post, idx) => {
    const idxStr = String(idx + 1).padStart(2, "0");
    const rawCover = post.meta.cover ? post.meta.cover.replace(/^\.\.\//, "") : "";
    const coverUrl = rawCover || fallbackImages[idx % fallbackImages.length];
    const catName = (post.meta.categories && post.meta.categories[0]) || (post.meta.tags && post.meta.tags[0]) || "未分类";
    const readingMin = post.readingStats ? post.readingStats.readingTimeMin : 4;
    const excerpt = post.meta.description || "点击探索深度阅读全文...";

    return `
          <section class="horizontal-entry-item" style="box-sizing: border-box;" data-categories="${(post.meta.categories || []).join(",")}" data-tags="${(post.meta.tags || []).join(",")}">
            <a href="posts/${post.slug}.html" class="entry-thumb-link" aria-label="${post.meta.title}">
              <img src="${coverUrl}" alt="${post.meta.title}" class="entry-thumb-img" loading="lazy" onerror="this.src='images/hero-daily.jpg'">
            </a>
            <section class="entry-text-block" style="box-sizing: border-box;">
              <header class="entry-meta-header" style="box-sizing: border-box;">
                <span class="entry-meta-date">${post.meta.date || "2026-09-22"}</span>
                <span class="entry-meta-sep">·</span>
                <span class="entry-meta-category">${catName}</span>
              </header>
              <h3 class="entry-title">
                <a href="posts/${post.slug}.html">${post.meta.title}</a>
              </h3>
              <p class="entry-excerpt">${excerpt}</p>
            </section>
            <section class="entry-right-meta" style="box-sizing: border-box;">
              <span class="entry-reading-index">${readingMin} min read —— ${idxStr}</span>
            </section>
          </section>`;
  }).join("\n");

  return `${buildPageHeadHtml({
    title: `文章总览 (Articles) - ${SITE_CONFIG.title}`,
    description: `${SITE_CONFIG.title} 全部文章索引与深度阅读`,
  })}

${buildPageHeaderHtml({ activeKey: "articles" })}

  <!-- 页面主体内容 (纯 Section 架构，微信后台 0 塌陷保证) -->
  <main class="main-content-wrapper main-container">
    <!-- Hero Header -->
    <section class="tag-hero" style="box-sizing: border-box;">
      <section class="tag-hero-left" style="box-sizing: border-box;">
        <span class="tag-hero-label">ARTICLES ——</span>
        <h1 class="tag-hero-title">${(SITE_CONFIG.pages && SITE_CONFIG.pages.articles && SITE_CONFIG.pages.articles.title) || "文章 · 思考与沉淀"}</h1>
        <p class="tag-hero-desc">${(SITE_CONFIG.pages && SITE_CONFIG.pages.articles && SITE_CONFIG.pages.articles.subtitle) || "探索体系化思考与技术实现的交汇点。按主题聚类的长文脉络，记录架构设计、工程实践与生活感悟。"} 共 ${posts.length} 篇文章。</p>
        <a href="articles.html" class="tag-hero-view-all">VIEW ALL →</a>
      </section>

      <section class="tag-hero-center" style="box-sizing: border-box;">
        <img src="images/daily/banner.webp" alt="Articles Hero Atmosphere" class="tag-hero-img" onerror="this.src='images/hero-architecture.jpg'">
      </section>

      <section class="tag-hero-right curated-footnote" style="box-sizing: border-box;">
        <section class="curation-meta" style="box-sizing: border-box;">
          <span class="live-dot" style="width: 7px; height: 7px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary); display: inline-block;"></span>
          <span>${weather.cityCn} · ${weather.condition} ${weather.temp}°C</span>
          <span style="opacity: 0.4;">/</span>
          <span>${weather.solarTerm} · ${weather.chineseHour}</span>
        </section>

        <section class="curation-quote-body" style="box-sizing: border-box;">
          <p class="tag-hero-quote"><em>"Good design makes life better."</em></p>
          <p class="curation-quote-cn">好的设计让生活更美好，而克制是优雅的开始。</p>
        </section>

        <section class="curation-stamp" style="box-sizing: border-box;">
          ${weather.coordinates} · 思考与记录 —— Tan
        </section>
      </section>
    </section>

    <!-- Dual-Column Body -->
    <section class="tag-stream-layout" style="box-sizing: border-box;">
      <!-- Left Column Sidebar -->
      <section class="tag-sidebar" style="box-sizing: border-box;">
        <span class="tag-sidebar-header">ALL TOPICS ——</span>
        <nav class="tag-sidebar-list">
          ${sidebarItemsHtml}
        </nav>

        <section class="sidebar-quote-box" style="box-sizing: border-box;">
          <section class="sidebar-quote-photo" style="box-sizing: border-box;">
            <img src="images/hero-bg.jpg" alt="Author Workspace" class="sidebar-quote-img" onerror="this.src='images/hero-daily.jpg'">
          </section>
          <blockquote class="sidebar-quote-text">
            "${(SITE_CONFIG.pages && SITE_CONFIG.pages.articles && SITE_CONFIG.pages.articles.sidebar_quote) || "写作，是我与世界对话的方式。"}"
          </blockquote>
          <span class="sidebar-quote-signature">—— ${(SITE_CONFIG.pages && SITE_CONFIG.pages.articles && SITE_CONFIG.pages.articles.sidebar_signature) || SITE_CONFIG.author || "Tan"}</span>
        </section>

        <!-- 3D 拟物黑胶唱片组件 -->
        <section class="vinyl-capsule" style="box-sizing: border-box;">
          <section class="vinyl-wrapper" style="box-sizing: border-box;">
            <section class="vinyl-jacket" style="box-sizing: border-box;">
              <img src="${vinyl.jacket}" alt="${vinyl.title}" onerror="this.src='images/hero-architecture.jpg'">
            </section>
            <section class="vinyl-disc" style="box-sizing: border-box;">
              <span class="vinyl-disc-center"></span>
            </section>
          </section>
          <section class="vinyl-meta" style="box-sizing: border-box;">
            <span class="vinyl-label">NOW PLAYING</span>
            <span class="vinyl-title">${vinyl.title} · ${vinyl.currentTrack}</span>
            <span class="vinyl-artist">${vinyl.artist}</span>
          </section>
        </section>
      </section>

      <!-- Right Column Main Stream -->
      <section class="tag-main-stream" style="box-sizing: border-box;">
        <!-- Tabs Header -->
        <section class="stream-tabs" style="box-sizing: border-box;">
          <nav class="stream-tabs-nav">
            <button class="stream-tab active" data-tab="latest" type="button">最新</button>
            <button class="stream-tab" data-tab="hot" type="button">最热</button>
            <button class="stream-tab" data-tab="featured" type="button">精选</button>
          </nav>
          <span class="stream-tab-count">共 ${posts.length} 篇文章</span>
        </section>

        <!-- Horizontal Stream Items -->
        <section class="horizontal-stream-list" style="box-sizing: border-box;">
          ${entriesHtml}
        </section>

        <section class="stream-header-row" style="box-sizing: border-box;">
          <span class="stream-total-count">共 ${posts.length} 篇文章</span>
        </section>
      </section>
    </section>
  </main>

${buildPageTailHtml({
    activeKey: "articles",
    searchIndex,
    extraScript: buildStreamFilterScript({
      field: "categories",
      fnName: "filterCategory",
      constName: "cats",
      paramName: "catName",
      hashPrefix: "cat",
    }),
  })}`;
}

export function buildAboutHtml(aboutPost, bodyHtml = "", searchIndex = []) {
  const aboutMeta = (aboutPost && aboutPost.meta) || {};
  const pageTitle = aboutMeta.title || "关于我 (About Me)";
  const pageDesc =
    aboutMeta.description ||
    `关于 ${SITE_CONFIG.author}，全栈开发者与独立创造者，记录技术、产品、生活与成长。`;
  // posts/about.md 的正文：由 obw 出版引擎渲染，兑现 OBSIDIAN_SYNC_GUIDE 1.1 契约
  const bodySectionHtml = bodyHtml
    ? `
    <!-- 4. posts/about.md 正文（obw 出版引擎渲染） -->
    <section class="about-post-body" style="box-sizing: border-box;">
      ${bodyHtml}
    </section>`
    : "";

  const personalInfoData = SITE_CONFIG.personal_info || {
    "坐标": "北京 · 朝阳",
    "职业": "全栈架构师 / 产品设计师",
    "邮箱": SITE_CONFIG.email,
    "喜欢": "架构演进、开源、阅读、摄影、咖啡"
  };

  const personalDetailsHtml = Object.entries(personalInfoData).map(([key, val]) => {
    let valHtml = val;
    if (String(val).includes("@") && !String(val).startsWith("http")) {
      valHtml = `<a href="mailto:${val}" class="detail-email-link">${val}</a>`;
    } else if (String(val).startsWith("http")) {
      valHtml = `<a href="${val}" target="_blank" rel="noopener" class="detail-email-link">${val}</a>`;
    }
    return `
            <section class="personal-detail-row" style="box-sizing: border-box;">
              <span class="detail-label">${key}</span>
              <span class="detail-value">${valHtml}</span>
            </section>`;
  }).join("\n");

  const aboutPages = (SITE_CONFIG.pages && SITE_CONFIG.pages.about) || {};
  const weather = getDailyWeather();
  const vinyl = getVinylData();

  return `${buildPageHeadHtml({
    title: `${pageTitle} - ${SITE_CONFIG.title}`,
    description: pageDesc,
  })}

${buildPageHeaderHtml({ activeKey: "about" })}

  <!-- 页面主体内容 (纯 Section 架构，微信后台 0 塌陷保证，无任何 div 标签) -->
  <main class="main-content-wrapper main-container about-main-page">
    <!-- 1. 3-Column Hero Trio -->
    <section class="about-hero-trio" style="box-sizing: border-box;">
      <section class="about-hero-statement" style="box-sizing: border-box;">
        <span class="about-hero-label">ABOUT ME ——</span>
        <h1 class="about-hero-title">${aboutPages.hero_title || "你好，我是 Tan。<br>一个喜欢思考、记录和<br>创造的人。"}</h1>
        <p class="about-hero-intro">
          ${aboutPages.hero_subtitle || "在技术的演进中寻找确定性，在设计的克制中注入温度。这里是我的个人思考集散地，记录架构、产品、生活与长期主义实践。"}
        </p>
        <a href="#about-profile" class="about-hero-read-more">READ MORE →</a>
      </section>

      <section class="about-hero-center" style="box-sizing: border-box;">
        <img src="images/daily/about.webp" alt="Tan's Workspace Sunlight" class="about-hero-img" onerror="this.src='images/hero-daily.jpg'">
      </section>

      <section class="about-hero-quote-col" style="box-sizing: border-box;">
        <blockquote class="about-hero-quote">
          <span class="motto-refined">「保持好奇，保持温柔。」</span>
        </blockquote>
        <section class="about-hero-signature-block" style="box-sizing: border-box;">
          <span class="about-hero-signature">${SITE_CONFIG.author || "Tan"}</span>
          <span class="about-hero-location">${weather.cityCn ? weather.cityCn.toUpperCase() : "BEIJING"} · 2026</span>
        </section>
      </section>
    </section>

    <!-- 2. Middle Split Section (Personal Info + My Interests) -->
    <section id="about-profile" class="about-mid-split" style="box-sizing: border-box;">
      <!-- Left Column: Personal Info Card -->
      <section class="about-personal-col" style="box-sizing: border-box;">
        <section class="personal-info-card" style="box-sizing: border-box;">
          <section class="personal-portrait-wrap" style="box-sizing: border-box;">
            <img src="images/avatar.jpg" alt="Tan Portrait" class="personal-portrait-img">
          </section>
          <header class="personal-header" style="box-sizing: border-box;">
            <span class="personal-header-label">PERSONAL INFO</span>
          </header>
          <section class="personal-details-list" style="box-sizing: border-box;">
            ${personalDetailsHtml}
          </section>
          <section class="personal-card-divider" style="box-sizing: border-box;"></section>
          <section class="personal-footer-block" style="box-sizing: border-box;">
            <span class="personal-signature">${SITE_CONFIG.author || "Tan"}</span>
            <span class="personal-motto">Good things take time.</span>
          </section>
        </section>

        <!-- 3D 拟物黑胶唱片组件 -->
        <section class="vinyl-capsule" style="box-sizing: border-box;">
          <section class="vinyl-wrapper" style="box-sizing: border-box;">
            <section class="vinyl-jacket" style="box-sizing: border-box;">
              <img src="${vinyl.jacket}" alt="${vinyl.title}" onerror="this.src='images/hero-architecture.jpg'">
            </section>
            <section class="vinyl-disc" style="box-sizing: border-box;">
              <span class="vinyl-disc-center"></span>
            </section>
          </section>
          <section class="vinyl-meta" style="box-sizing: border-box;">
            <span class="vinyl-label">NOW PLAYING</span>
            <span class="vinyl-title">${vinyl.title}</span>
            <span class="vinyl-artist">${vinyl.artist} · ${vinyl.mood || vinyl.vibe}</span>
          </section>
        </section>
      </section>

      <!-- Right Column: My Interests -->
      <section class="about-interests-col" style="box-sizing: border-box;">
        <header class="interests-header" style="box-sizing: border-box;">
          <span class="interests-header-label">MY INTERESTS</span>
        </header>
        <section class="interests-hairline-grid" style="box-sizing: border-box;">
          <!-- 1. 设计 DESIGN -->
          <section class="interest-hairline-col" style="box-sizing: border-box;">
            <section class="interest-icon-box" style="box-sizing: border-box;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                <path d="M2 2l7.586 7.586"/>
                <circle cx="11" cy="11" r="2"/>
              </svg>
            </section>
            <h3 class="interest-col-title">设计 <span class="interest-col-en">DESIGN</span></h3>
            <p class="interest-col-desc">喜欢简洁、克制、有温度的设计。也喜欢探索不同的视觉表达方式。</p>
            <a href="categories.html#cat-设计" class="interest-view-more">VIEW MORE →</a>
          </section>

          <!-- 2. 技术 TECHNOLOGY -->
          <section class="interest-hairline-col" style="box-sizing: border-box;">
            <section class="interest-icon-box" style="box-sizing: border-box;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
            </section>
            <h3 class="interest-col-title">技术 <span class="interest-col-en">TECHNOLOGY</span></h3>
            <p class="interest-col-desc">关注互联网、AI 和数字产品，喜欢思考技术如何改变我们新生活方式。</p>
            <a href="categories.html#cat-技术" class="interest-view-more">VIEW MORE →</a>
          </section>

          <!-- 3. 生活 LIFE -->
          <section class="interest-hairline-col" style="box-sizing: border-box;">
            <section class="interest-icon-box" style="box-sizing: border-box;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </section>
            <h3 class="interest-col-title">生活 <span class="interest-col-en">LIFE</span></h3>
            <p class="interest-col-desc">喜欢城市漫步、记录日常的美好，也喜欢在旅行中发现新的视角。</p>
            <a href="categories.html#cat-生活" class="interest-view-more">VIEW MORE →</a>
          </section>

          <!-- 4. 阅读 NOTES -->
          <section class="interest-hairline-col" style="box-sizing: border-box;">
            <section class="interest-icon-box" style="box-sizing: border-box;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </section>
            <h3 class="interest-col-title">阅读 <span class="interest-col-en">NOTES</span></h3>
            <p class="interest-col-desc">阅读是我最重要的精神食粮，在文字中寻找更多可能性。</p>
            <a href="archives.html" class="interest-view-more">VIEW MORE →</a>
          </section>
        </section>
      </section>
    </section>

    <!-- 3. Panoramic Landscape Banner -->
    <section class="panoramic-about-banner" style="box-sizing: border-box;">
      <section class="panoramic-about-overlay" style="box-sizing: border-box;">
        <section class="panoramic-about-left" style="box-sizing: border-box;">
          <span class="panoramic-about-label">A LITTLE MORE ——</span>
          <h2 class="panoramic-about-title">${aboutPages.banner_title || "在生活的缝隙里，寻找热爱的方向。"}</h2>
          <p class="panoramic-about-sub">${aboutPages.banner_subtitle || "写下思考 · 记录成长 · 分享生活"}</p>
          <a href="archives.html" class="panoramic-about-link">EXPLORE MORE →</a>
        </section>
        <section class="panoramic-about-right" style="box-sizing: border-box;">
          <span class="panoramic-about-cursive">${aboutPages.banner_cursive || "Better Things Ahead"}</span>
        </section>
      </section>
    </section>
${bodySectionHtml}
  </main>

${buildPageTailHtml({ activeKey: "about", searchIndex })}`;
}

/**
 * 站点构建主函数
 */
export async function main() {
  console.log("🚀 开始全量构建 TAN / Weaving's Notes 个人站点...");

  // 1. 初始化并清空目录
  // 真正清空：否则删掉的文章会在 dist/ 留下旧 HTML，并被 GitHub Pages 继续对外提供
  if (path.basename(DIST_DIR) !== "dist") {
    throw new Error(`拒绝清空非 dist 输出目录: ${DIST_DIR}`);
  }
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(DIST_POSTS_DIR, { recursive: true });
  fs.mkdirSync(DIST_IMAGES_DIR, { recursive: true });

  // 2. 拷贝静态图片资源 (支持 images/daily 递归同步)
  if (fs.existsSync(IMAGES_DIR)) {
    const copyDirRecursive = (src, dest) => {
      fs.mkdirSync(dest, { recursive: true });
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          copyDirRecursive(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    copyDirRecursive(IMAGES_DIR, DIST_IMAGES_DIR);
    console.log(`🖼️ 已同步图片资源至 dist/images/`);
  }

  // 3. 扫描并解析文章
  const postFiles = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const posts = [];
  let aboutPost = null;

  for (const file of postFiles) {
    const filePath = path.join(POSTS_DIR, file);
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const { meta, body } = parseFrontmatter(rawContent);

    // 过滤掉草稿文章
    if (meta.draft === true) continue;

    const slug = path.basename(file, ".md");
    const readingStats = calculateReadingStats(body);

    const rawTitle = meta.title || slug;
    const rawDescription = meta.description || "";
    const rawAuthor = meta.author || SITE_CONFIG.author;
    const rawCategories = Array.isArray(meta.categories) ? meta.categories : [];
    const rawTags = Array.isArray(meta.tags) ? meta.tags : [];

    const postItem = {
      slug,
      meta: {
        ...meta,
        // HTML 注入防护：展示字段统一转义；原始值另存 metaRaw 供 JSON / URL 消费方使用。
        title: escapeHtml(rawTitle),
        description: escapeHtml(rawDescription),
        categories: rawCategories.map(escapeHtml),
        tags: rawTags.map(escapeHtml),
        date: meta.date || "2026-09-22",
        author: escapeHtml(rawAuthor),
      },
      metaRaw: {
        title: rawTitle,
        description: rawDescription,
        categories: rawCategories,
        tags: rawTags,
        author: rawAuthor,
      },
      body,
      readingStats,
      url: `posts/${slug}.html`,
    };

    if (slug === "about") {
      aboutPost = postItem;
    } else {
      posts.push(postItem);
    }
  }

  // 4. 排序文章：优先考虑手动权重 order，其次按日期倒序
  posts.sort((a, b) => {
    if (a.meta.order !== undefined && b.meta.order !== undefined) {
      return a.meta.order - b.meta.order;
    }
    if (a.meta.order !== undefined) return -1;
    if (b.meta.order !== undefined) return 1;
    const dateA = a.meta.date ? new Date(a.meta.date).getTime() : 0;
    const dateB = b.meta.date ? new Date(b.meta.date).getTime() : 0;
    return dateB - dateA;
  });

  // 5. 动态收集全部分类
  const categoriesMap = {};

  for (const post of posts) {
    for (const cat of post.meta.categories || ["未分类"]) {
      if (!categoriesMap[cat]) categoriesMap[cat] = [];
      categoriesMap[cat].push(post);
    }
  }

  const allCategories = Object.keys(categoriesMap).filter((c) => c !== "关于");

  // 生成轻量全局搜索索引 (标题、描述、分类、标签)
  const searchIndex = buildSearchIndex(posts);

  // 6. 生成每篇文章详情页 (dist/posts/*.html)
  for (const post of posts) {
    const { toc, html: processedHtml } = renderMarkdownForWeb(post.body, true);

    const postHtml = buildPostPageHtml(post, processedHtml, toc, posts, searchIndex);
    fs.writeFileSync(path.join(DIST_POSTS_DIR, `${post.slug}.html`), postHtml, "utf-8");
    console.log(`✅ 已生成文章页面: dist/posts/${post.slug}.html`);
  }

  // 7. 分离精选文章与最新文章
  let featuredPost = posts.find((p) => p.meta.featured === true);
  if (!featuredPost) featuredPost = posts[0];

  const latestPosts = posts.filter((p) => p.slug !== featuredPost.slug);

  // 8. 生成首页 (dist/index.html)
  const indexHtml = buildIndexPageHtml(posts, featuredPost, latestPosts, allCategories, searchIndex);
  fs.writeFileSync(path.join(DIST_DIR, "index.html"), indexHtml, "utf-8");
  console.log(`✅ 已生成首页: dist/index.html`);

  // 9. 生成归档页 (dist/archives.html)
  const archivesHtml = buildArchivesHtml(posts, searchIndex);
  fs.writeFileSync(path.join(DIST_DIR, "archives.html"), archivesHtml, "utf-8");
  console.log(`✅ 已生成归档页: dist/archives.html`);

  // 10. 生成分类页 (dist/categories.html)
  const categoriesHtml = buildCategoriesHtml(posts, categoriesMap, searchIndex);
  fs.writeFileSync(path.join(DIST_DIR, "categories.html"), categoriesHtml, "utf-8");
  console.log(`✅ 已生成分类页: dist/categories.html`);

  // 11. 生成文章页 (dist/articles.html)
  const articlesHtml = buildArticlesHtml(posts, categoriesMap, searchIndex);
  fs.writeFileSync(path.join(DIST_DIR, "articles.html"), articlesHtml, "utf-8");
  console.log(`✅ 已生成文章页: dist/articles.html`);

  // 12. 生成 RSS 2.0 订阅源 (dist/feed.xml)
  fs.writeFileSync(path.join(DIST_DIR, "feed.xml"), buildRssFeed(posts), "utf-8");
  console.log(`📡 已生成 RSS 订阅源: dist/feed.xml (${posts.length} 篇文章)`);

  // 12. 生成关于我页面 (dist/about.html)
  if (aboutPost) {
    const { html: processedHtml } = renderMarkdownForWeb(aboutPost.body, false);
    const aboutHtml = buildAboutHtml(aboutPost, processedHtml, searchIndex);
    fs.writeFileSync(path.join(DIST_DIR, "about.html"), aboutHtml, "utf-8");
    console.log(`✅ 已从 posts/about.md 生成关于我页面: dist/about.html`);
  } else {
    // 默认关于我页面
    const defaultAboutBody = `
:::hero[关于 Tan · 数字花园主人]
subtitle | 全栈开发者 · 独立创造者 · 终身学习者
badge | 2026 个人画像
:::

:::summary[核心信条]
highlight | “生活不在别处，就在当下的每一个选择里。”
这里是我的个人数字花园与深度长文空间。在快节奏的技术迭代与碎片化信息中，我希望通过持续的阅读、动手与写作，沉淀真正具有长青价值的思考。
:::

## 👨‍💻 我是谁？
你好！我是 Tan（在网络上也常以 Weaving 活跃）。一名热爱创造、专注细节的前端架构与全栈开发者。
在日常工作中，我专注于现代前端工程体系、全端跨平台架构与高性能服务设计；在工作之余，我喜欢探索人机交互美学、排版艺术以及如何用技术提升日常工作与生活的幸福感。
`;
    const { html: processedHtml } = renderMarkdownForWeb(defaultAboutBody, false);
    const aboutHtml = buildAboutHtml(
      {
        meta: {
          title: "关于我",
          description: `关于 ${SITE_CONFIG.author}，全栈开发者与独立创造者，记录技术、产品、生活与成长。`,
        },
        readingStats: { totalWords: 300, readingTimeMin: 1 },
      },
      processedHtml,
      searchIndex
    );
    fs.writeFileSync(path.join(DIST_DIR, "about.html"), aboutHtml, "utf-8");
    console.log(`✅ 已生成默认关于我页面: dist/about.html`);
  }

  console.log(`🎉 站点构建全部完成！输出目录：${DIST_DIR}`);
}

// 若直接运行此脚本则执行 main
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("构建失败:", err);
    process.exit(1);
  });
}
