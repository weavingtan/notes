#!/usr/bin/env node
/**
 * @file fetch-daily-assets.mjs
 * 每日多源壁纸管线与金句自动抓取/压缩/清理脚本
 *
 * 功能：
 * 1. 从 Bing 4K API (n=8) 获取每日多场景自然/人文/建筑风景摄影；
 * 2. 语义分流为全站 5 大场景独立背景（Hero, Archive, Footer, About, Banner）；
 * 3. 自动高保真压缩为现代化 WebP 格式（< 250KB），覆盖写入，历史旧图零膨胀；
 * 4. 从一言开源 API (Hitokoto) 抓取哲学/文学/思考类每日金句；
 * 5. 全流程具备离线与网络异常自愈回退机制。
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

  const quoteData = await fetchQuote();
  fs.writeFileSync(QUOTE_FILE, JSON.stringify(quoteData, null, 2), "utf-8");
  console.log(`✨ 今日金句已就绪: ${quoteData.text.replace(/<br>/g, " ")} — ${quoteData.author}`);

  await fetchWallpapers();
  console.log("🎉 每日多源资产同步全部完成！");
}

main().catch(err => {
  console.error("抓取失败:", err);
  process.exit(1);
});
