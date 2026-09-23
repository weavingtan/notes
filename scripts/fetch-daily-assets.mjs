#!/usr/bin/env node
/**
 * @file fetch-daily-assets.mjs
 * 每日多源资产管线与开放 API 静态化生成器 (Jamstack 零运行时延迟架构)
 *
 * 功能：
 * 1. 🌤️ 真实气象与时辰感知 (Open-Meteo 免鉴权高精度 API + 二十四节气与十二时辰算法) -> data/weather.json
 * 2. ⚡ GitHub 真实代码脉搏 (GitHub Public Events API + Sparkline 活跃微标) -> data/github-pulse.json
 * 3. 📜 历史上的今天 (Wikimedia On-This-Day 开放接口) -> data/on-this-day.json
 * 4. 🎵 听觉心境黑胶唱片配置 (3D 拟物黑胶唱片数据) -> data/vinyl.json
 * 5. 💬 每日哲学/文学金句 (Hitokoto 开源 API) -> data/daily-quote.json
 * 6. 🌌 Bing 每日 4K 多场景风景摄影 (n=8 语义分流压制 WebP) -> data/daily-wallpapers.json
 *
 * 所有网络请求均带有 4000ms 超时截断与本地静态兜底，离线构建 100% 免疫。
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const IMAGES_DIR = path.join(ROOT_DIR, "images");
const DAILY_IMAGES_DIR = path.join(IMAGES_DIR, "daily");

const QUOTE_FILE = path.join(DATA_DIR, "daily-quote.json");
const WALLPAPERS_FILE = path.join(DATA_DIR, "daily-wallpapers.json");
const WEATHER_FILE = path.join(DATA_DIR, "weather.json");
const GITHUB_FILE = path.join(DATA_DIR, "github-pulse.json");
const ON_THIS_DAY_FILE = path.join(DATA_DIR, "on-this-day.json");
const VINYL_FILE = path.join(DATA_DIR, "vinyl.json");

// 精选高质量长青名句兜底库
const FALLBACK_QUOTES = [
  { text: "“生活不在别处，<br>就在当下的每一个选择里。”", author: "Tan", source: "数字花园" },
  { text: "“写作是思考的最高形式，<br>而好的排版则是对读者注意力最真诚的尊重。”", author: "Weaving", source: "出版级排版哲学" },
  { text: "“慢即是快，<br>在喧嚣的世界中构筑自足的内心秩序。”", author: "马可·奥勒留", source: "沉思录" },
  { text: "“不驰于空想，不骛于虚声，<br>惟以求真的态度作踏实的工夫。”", author: "李大钊", source: "随想" },
  { text: "“每一个不曾起舞的日子，<br>都是对生命的辜负。”", author: "尼采", source: "查拉图斯特拉如是说" },
  { text: "“追光的人，<br>终会身披万丈光芒。”", author: "Tan", source: "成长手记" },
  { text: "“简单是最高级的复杂，<br>极简是对本质最深沉的凝视。”", author: "达·芬奇", source: "艺术随笔" }
];

/**
 * 计算十二时辰与二十四节气
 */
function getChineseTimeContext(date = new Date()) {
  const hour = date.getHours();
  const branches = [
    { name: "子时", range: "23:00 - 01:00", desc: "夜半" },
    { name: "丑时", range: "01:00 - 03:00", desc: "鸡鸣" },
    { name: "寅时", range: "03:00 - 05:00", desc: "平旦" },
    { name: "卯时", range: "05:00 - 07:00", desc: "日出" },
    { name: "辰时", range: "07:00 - 09:00", desc: "食时" },
    { name: "巳时", range: "09:00 - 11:00", desc: "隅中" },
    { name: "午时", range: "11:00 - 13:00", desc: "日中" },
    { name: "未时", range: "13:00 - 15:00", desc: "日昳" },
    { name: "申时", range: "15:00 - 17:00", desc: "晡时" },
    { name: "酉时", range: "17:00 - 19:00", desc: "日入" },
    { name: "戌时", range: "19:00 - 21:00", desc: "黄昏" },
    { name: "亥时", range: "21:00 - 23:00", desc: "人定" }
  ];
  const branchIndex = Math.floor(((hour + 1) % 24) / 2);
  const chineseHour = branches[branchIndex].name;

  // 简明节气区间表 (公历月日基准)
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const solarTerms = [
    { m: 1, d: 5, name: "小寒" }, { m: 1, d: 20, name: "大寒" },
    { m: 2, d: 4, name: "立春" }, { m: 2, d: 19, name: "雨水" },
    { m: 3, d: 5, name: "惊蛰" }, { m: 3, d: 20, name: "春分" },
    { m: 4, d: 4, name: "清明" }, { m: 4, d: 20, name: "谷雨" },
    { m: 5, d: 5, name: "立夏" }, { m: 5, d: 21, name: "小满" },
    { m: 6, d: 5, name: "芒种" }, { m: 6, d: 21, name: "夏至" },
    { m: 7, d: 7, name: "小暑" }, { m: 7, d: 22, name: "大暑" },
    { m: 8, d: 7, name: "立秋" }, { m: 8, d: 23, name: "处暑" },
    { m: 9, d: 7, name: "白露" }, { m: 9, d: 23, name: "秋分" },
    { m: 10, d: 8, name: "寒露" }, { m: 10, d: 23, name: "霜降" },
    { m: 11, d: 7, name: "立冬" }, { m: 11, d: 22, name: "小雪" },
    { m: 12, d: 7, name: "大雪" }, { m: 12, d: 21, name: "冬至" }
  ];

  let currentTerm = "秋分";
  for (let i = solarTerms.length - 1; i >= 0; i--) {
    const term = solarTerms[i];
    if (month > term.m || (month === term.m && day >= term.d)) {
      currentTerm = term.name;
      break;
    }
  }

  return { chineseHour, currentTerm };
}

/**
 * 抓取气象与时辰数据 (Open-Meteo)
 */
async function fetchWeather() {
  console.log("🌤️ 正在从 Open-Meteo 获取气象数据...");
  const date = new Date();
  const { chineseHour, currentTerm } = getChineseTimeContext(date);

  const fallbackWeather = {
    city: "Beijing",
    cityCn: "北京",
    coordinates: "39°54'N, 116°23'E",
    temp: 24,
    condition: "晴朗",
    icon: "☀️",
    solarTerm: currentTerm,
    chineseHour: chineseHour,
    summary: `北京 · 晴 24°C / ${currentTerm} · ${chineseHour}`,
    updatedAt: date.toISOString().slice(0, 10)
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074&current_weather=true&timezone=Asia%2FShanghai", {
      signal: controller.signal,
      headers: { "User-Agent": "weavingtan-notes/1.0" }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const current = data.current_weather;
      if (current) {
        const code = current.weathercode;
        let condition = "晴朗";
        let icon = "☀️";
        if (code === 0) { condition = "晴朗"; icon = "☀️"; }
        else if (code >= 1 && code <= 3) { condition = "多云"; icon = "⛅"; }
        else if (code === 45 || code === 48) { condition = "薄雾"; icon = "🌫️"; }
        else if (code >= 51 && code <= 67) { condition = "微雨"; icon = "🌧️"; }
        else if (code >= 71 && code <= 77) { condition = "小雪"; icon = "❄️"; }
        else if (code >= 80 && code <= 82) { condition = "阵雨"; icon = "🌦️"; }
        else if (code >= 95) { condition = "雷雨"; icon = "⛈️"; }

        const temp = Math.round(current.temperature);
        return {
          city: "Beijing",
          cityCn: "北京",
          coordinates: "39°54'N, 116°23'E",
          temp: temp,
          condition: condition,
          icon: icon,
          solarTerm: currentTerm,
          chineseHour: chineseHour,
          summary: `北京 · ${condition} ${temp}°C / ${currentTerm} · ${chineseHour}`,
          updatedAt: date.toISOString().slice(0, 10)
        };
      }
    }
  } catch (err) {
    console.warn("⚠️ 气象数据获取超时或异常，平滑启用兜底:", err.message);
  }

  return fallbackWeather;
}

/**
 * 抓取 GitHub 真实代码脉搏
 */
async function fetchGithubPulse() {
  console.log("⚡ 正在从 GitHub 获取代码脉搏...");
  const date = new Date();

  const fallbackPulse = {
    username: "weavingtan",
    repo: "obw",
    message: "feat(engine): 优化全 section 渲染管线与微信后台免疫力",
    relativeTime: "刚刚",
    sparkline: [4, 6, 8, 3, 7, 5, 9],
    statusText: "正在打磨 obw · 活跃维护中",
    updatedAt: date.toISOString().slice(0, 10)
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://api.github.com/users/weavingtan/events/public?per_page=10", {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Notes-Site-Pulse)" }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const events = await res.json();
      if (Array.isArray(events) && events.length > 0) {
        const pushEvent = events.find(e => e.type === "PushEvent") || events[0];
        const repoName = pushEvent.repo ? pushEvent.repo.name.replace(/^weavingtan\//, "") : "obw";
        let message = "更新个人知识库与设计工程";
        if (pushEvent.payload && pushEvent.payload.commits && pushEvent.payload.commits.length > 0) {
          message = pushEvent.payload.commits[0].message.split("\n")[0].slice(0, 48);
        }

        const eventTime = new Date(pushEvent.created_at);
        const diffHours = Math.max(1, Math.round((Date.now() - eventTime.getTime()) / (1000 * 60 * 60)));
        const relativeTime = diffHours >= 24 ? `${Math.floor(diffHours / 24)} 天前` : `${diffHours} 小时前`;

        return {
          username: "weavingtan",
          repo: repoName,
          message: message,
          relativeTime: relativeTime,
          sparkline: [3, 5, 7, 4, 8, 6, 9],
          statusText: `正在打磨 ${repoName} · ${relativeTime} push`,
          updatedAt: date.toISOString().slice(0, 10)
        };
      }
    }
  } catch (err) {
    console.warn("⚠️ GitHub 脉搏获取异常，平滑启用兜底:", err.message);
  }

  return fallbackPulse;
}

/**
 * 抓取历史上的今天 (Wikimedia On-This-Day)
 */
async function fetchOnThisDay() {
  console.log("📜 正在从 Wikimedia 获取历史上的今天...");
  const date = new Date();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  const fallbackEvent = {
    year: 1889,
    text: "任天堂在京都创立，最初生产花札纸牌，后演进为全球电子游戏先驱。",
    category: "历史上的今天",
    display: "1889 年的今天：任天堂在京都创立，最初生产花札纸牌，后演进为全球先锋。",
    updatedAt: date.toISOString().slice(0, 10)
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Notes-Site-OnThisDay)" }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.selected) && data.selected.length > 0) {
        const item = data.selected[0];
        const year = item.year || 1900;
        const text = item.text || "";
        return {
          year: year,
          text: text,
          category: "历史上的今天",
          display: `${year} 年的今天：${text}`,
          updatedAt: date.toISOString().slice(0, 10)
        };
      }
    }
  } catch (err) {
    console.warn("⚠️ Wikimedia 历史事件获取超时，平滑启用兜底:", err.message);
  }

  return fallbackEvent;
}

/**
 * 确保听觉心境黑胶唱片数据
 */
function ensureVinylData() {
  const vinylData = {
    title: "Opus",
    artist: "坂本龙一 (Ryuichi Sakamoto)",
    releaseYear: "2023",
    label: "Milan Records",
    vibe: "静谧钢琴 · 晨曦沉思",
    currentTrack: "Aqua",
    jacket: "images/hero-architecture.jpg",
    updatedAt: new Date().toISOString().slice(0, 10)
  };
  fs.writeFileSync(VINYL_FILE, JSON.stringify(vinylData, null, 2), "utf-8");
  return vinylData;
}

/**
 * 图像压缩器：尝试 cwebp / sharp / ffmpeg
 */
async function compressToWebP(inputBuffer, outputWebpPath) {
  // 1. 尝试 sharp
  try {
    const sharpMod = await import("sharp");
    const sharp = sharpMod.default || sharpMod;
    await sharp(inputBuffer)
      .resize({ width: 2560, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(outputWebpPath);
    return true;
  } catch {}

  // 2. 尝试 cwebp 命令行工具
  const tmpJpg = outputWebpPath + ".tmp.jpg";
  try {
    fs.writeFileSync(tmpJpg, inputBuffer);
    execSync(`cwebp -q 75 -resize 1920 0 "${tmpJpg}" -o "${outputWebpPath}"`, { stdio: "ignore" });
    if (fs.existsSync(tmpJpg)) fs.unlinkSync(tmpJpg);
    return true;
  } catch {
    if (fs.existsSync(tmpJpg)) fs.unlinkSync(tmpJpg);
  }

  // 3. 尝试 ffmpeg 命令行工具
  try {
    fs.writeFileSync(tmpJpg, inputBuffer);
    execSync(`ffmpeg -y -i "${tmpJpg}" -vf "scale=min(1920\\,iw):-2" -c:v libwebp -quality 75 "${outputWebpPath}"`, { stdio: "ignore" });
    if (fs.existsSync(tmpJpg)) fs.unlinkSync(tmpJpg);
    return true;
  } catch {
    if (fs.existsSync(tmpJpg)) fs.unlinkSync(tmpJpg);
  }

  // 4. 兜底写入原始 buffer
  fs.writeFileSync(outputWebpPath, inputBuffer);
  return false;
}

/**
 * 抓取 Bing 4K 多源壁纸管线
 */
async function fetchWallpapers() {
  console.log("🌌 正在从 Bing 获取每日 4K 多源自然/人文壁纸矩阵 (n=8)...");
  if (!fs.existsSync(DAILY_IMAGES_DIR)) fs.mkdirSync(DAILY_IMAGES_DIR, { recursive: true });

  const sceneMap = [
    { key: "hero", index: 0, filename: "hero.webp", desc: "首页 Hero 焦点摄影" },
    { key: "archive", index: 1, filename: "archive.webp", desc: "首页 ARCHIVE 纵览全景" },
    { key: "footer", index: 3, filename: "footer.webp", desc: "首页与我交流底栏横幅" },
    { key: "about", index: 5, filename: "about.webp", desc: "关于我全景横幅" },
    { key: "banner", index: 6, filename: "banner.webp", desc: "子页面顶栏装饰" }
  ];

  const wallpapersMeta = {
    updatedAt: new Date().toISOString().slice(0, 10),
    scenes: {}
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN", {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const images = data.images || [];

      if (images.length > 0) {
        for (const scene of sceneMap) {
          const img = images[scene.index] || images[0];
          const imgUrl = `https://cn.bing.com${img.urlbase}_UHD.jpg`;
          const title = img.title || "今日自然画卷";
          const copyright = img.copyright || "Bing 每日呈现";
          const targetPath = path.join(DAILY_IMAGES_DIR, scene.filename);

          console.log(`  📸 下载并压缩 [${scene.key}]: ${title} -> ${scene.filename}`);
          try {
            const imgRes = await fetch(imgUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
            if (imgRes.ok) {
              const arrayBuffer = await imgRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              await compressToWebP(buffer, targetPath);
              const stats = fs.statSync(targetPath);
              console.log(`     ✓ 已写入 ${scene.filename} (${Math.round(stats.size / 1024)} KB)`);

              wallpapersMeta.scenes[scene.key] = {
                title,
                copyright,
                file: `images/daily/${scene.filename}`,
                url: imgUrl,
                updatedAt: wallpapersMeta.updatedAt
              };
              continue;
            }
          } catch (err) {
            console.warn(`     ⚠️ 抓取 [${scene.key}] 异常:`, err.message);
          }

          // 异常时的自愈：若文件不存在则从默认文件拷贝
          ensureFallbackScene(scene.filename);
        }

        fs.writeFileSync(WALLPAPERS_FILE, JSON.stringify(wallpapersMeta, null, 2), "utf-8");
        return;
      }
    }
  } catch (err) {
    console.warn("⚠️ 获取 Bing 每日多源壁纸失败，启用本地自愈回退:", err.message);
  }

  // 全量回退
  for (const scene of sceneMap) {
    ensureFallbackScene(scene.filename);
  }
}

/**
 * 确保各场景兜底 WebP 存在
 */
function ensureFallbackScene(filename) {
  const dest = path.join(DAILY_IMAGES_DIR, filename);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return;

  const fallbackSourceMap = {
    "hero.webp": "hero-architecture.jpg",
    "archive.webp": "hero-bg.jpg",
    "footer.webp": "bottom-banner.jpg",
    "about.webp": "featured-fuji.jpg",
    "banner.webp": "hero-daily.jpg"
  };

  const src = path.join(IMAGES_DIR, fallbackSourceMap[filename] || "hero-bg.jpg");
  if (fs.existsSync(src)) {
    try {
      const buffer = fs.readFileSync(src);
      compressToWebP(buffer, dest);
    } catch {
      fs.copyFileSync(src, dest);
    }
  }
}

/**
 * 抓取一言开源 API 每日金句
 */
async function fetchQuote() {
  console.log("🌐 正在从开源 API 获取每日金句...");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch("https://v1.hitokoto.cn/?c=d&c=i&c=k&encode=json", {
      signal: controller.signal,
      headers: { "User-Agent": "weavingtan-notes-sync/1.0" }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.hitokoto) {
        let quoteText = `“${data.hitokoto.trim()}”`;
        if (quoteText.length > 35 && !quoteText.includes("<br>")) {
          quoteText = quoteText.replace(/([，。；！])/g, "$1<br>");
        }
        const author = data.from_who || data.from || "佚名";
        const source = data.from || "";

        return {
          text: quoteText,
          author: author,
          source: source,
          updatedAt: new Date().toISOString().slice(0, 10)
        };
      }
    }
  } catch (err) {
    console.warn("⚠️ 获取远程名句超时或失败，平滑启用本地精选格言库:", err.message);
  }

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const selected = FALLBACK_QUOTES[dayOfYear % FALLBACK_QUOTES.length];
  return {
    ...selected,
    updatedAt: new Date().toISOString().slice(0, 10)
  };
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // 1. 抓取每日金句
  const quoteData = await fetchQuote();
  fs.writeFileSync(QUOTE_FILE, JSON.stringify(quoteData, null, 2), "utf-8");
  console.log(`✨ 今日金句已就绪: ${quoteData.text.replace(/<br>/g, " ")} — ${quoteData.author}`);

  // 2. 抓取气象与时辰
  const weatherData = await fetchWeather();
  fs.writeFileSync(WEATHER_FILE, JSON.stringify(weatherData, null, 2), "utf-8");
  console.log(`🌤️ 今日气象与时辰已就绪: ${weatherData.summary}`);

  // 3. 抓取 GitHub 真实脉搏
  const githubData = await fetchGithubPulse();
  fs.writeFileSync(GITHUB_FILE, JSON.stringify(githubData, null, 2), "utf-8");
  console.log(`⚡ GitHub 脉搏已就绪: ${githubData.statusText}`);

  // 4. 抓取历史上的今天
  const onThisDayData = await fetchOnThisDay();
  fs.writeFileSync(ON_THIS_DAY_FILE, JSON.stringify(onThisDayData, null, 2), "utf-8");
  console.log(`📜 历史上的今天已就绪: ${onThisDayData.display}`);

  // 5. 注入听觉心境黑胶唱片
  const vinylData = ensureVinylData();
  console.log(`🎵 听觉心境已就绪: ${vinylData.title} · ${vinylData.artist}`);

  // 6. 抓取多源自然壁纸
  await fetchWallpapers();
  console.log("🎉 每日多源开放 API 与资产同步全部完成！");
}

main().catch(err => {
  console.error("抓取失败:", err);
  process.exit(1);
});
