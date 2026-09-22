#!/usr/bin/env node
/**
 * @file fetch-daily-assets.mjs
 * 每日名句与高清壁纸定时抓取脚本
 * 支持：
 * 1. 从一言开源 API (Hitokoto) 抓取哲学/文学/思考类名言名句
 * 2. 网络异常或弱网时自动平滑回退至精选经典格言库
 * 3. 写入 data/daily-quote.json 供构建脚本使用
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const QUOTE_FILE = path.join(DATA_DIR, "daily-quote.json");

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

async function fetchQuote() {
  console.log("🌐 正在从开源 API 获取每日金句...");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    // 请求一言 API：过滤文学 (d)、哲学 (k)、诗词 (i) 类别
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
          // 在标点处适当折行提升排版美感
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

  // 本地根据日期哈希稳定选取一条
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
}

main().catch(err => {
  console.error("抓取失败:", err);
  process.exit(1);
});
