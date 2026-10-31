/* AmzLoss — Publish 10 SEO Blog Posts + Multi-Platform Social Syndication
   Orchestrates: blog pipeline → site publish → sitemap/RSS → social cards → all platforms
   Run: node scripts/publish-10-posts.mjs [--skip-social] [--dry-run] [--topics=topic1,topic2] */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BLOGS_DIR = path.join(ROOT, "blogs");
const BLOG_JS = path.join(ROOT, "js", "blog.js");
const SITEMAP = path.join(ROOT, "sitemap.xml");
const RSS_SCRIPT = path.join(ROOT, "scripts", "generate-rss.mjs");
const BLOG_IMG_DIR = path.join(ROOT, "blogs", "img");

/* 10 SEO-identified topics from real site analysis (0 genuine gaps found;
   posts expand underserved sub-topics + GROW-tier clusters). */
const TEN_TOPICS = [
  { keyword: "amazon affiliate commission rates by category 2026", category: "Commission Rates", intent: "informational" },
  { keyword: "amazon associates vs shareasale vs cj affiliate comparison", category: "Affiliate Networks", intent: "commercial" },
  { keyword: "how to calculate amazon affiliate ROI in 2026", category: "Earnings & Payout", intent: "how-to" },
  { keyword: "amazon associates FTC disclosure requirements checklist", category: "Compliance", intent: "informational" },
  { keyword: "amazon affiliate break-even calculator guide", category: "Calculator & Break-even", intent: "transactional" },
  { keyword: "free backlink directories for amazon affiliates 2026", category: "Backlink Building", intent: "informational" },
  { keyword: "amazon associates commission rate cuts impact analysis 2026", category: "Commission Cuts", intent: "informational" },
  { keyword: "amazon associates earnings report CSV columns explained", category: "Earnings Report", intent: "how-to" },
  { keyword: "amazon affiliate tax reporting guide 2026", category: "Earnings & Payout", intent: "informational" },
  { keyword: "amazon associates program review for beginners 2026", category: "Amazon", intent: "informational" }
];

function log(msg) { console.log(`[10POSTS] ${msg}`); }
function warn(msg) { console.warn(`[10POSTS] WARN: ${msg}`); }

function truncate(text, max) {
  if (!text || text.length <= max) return text || "";
  return text.slice(0, max - 1).trimEnd() + "\u2026";
}

function buildSvgCard(title, category = "AMZLOSS") {
  const escape = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const words = String(title).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 38) { lines.push(cur.trim()); cur = w; }
    else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  if (lines.length > 4) lines.length = 4;
  const ty = 300 - ((lines.length - 1) * 58);
  const titleSpans = lines.map((l, i) =>
    `<text x="600" y="${ty + i * 58}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="46" font-weight="bold" fill="#ffffff">${escape(l)}</text>`
  ).join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0b1220"/>
  <rect y="0" width="1200" height="10" fill="#f5a623"/>
  <rect y="620" width="1200" height="10" fill="#f5a623"/>
  <text x="60" y="610" font-family="Arial,Helvetica,sans-serif" font-size="20" fill="#f5a623" font-weight="bold">AMZLOSS</text>
  <text x="1140" y="610" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="18" fill="#888888">${escape(category)}</text>
  ${titleSpans}
  <text x="600" y="540" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" fill="#f5a623">2026 Strategy Guide</text>
</svg>`;
}

function addToSitemap(slug) {
  const nowStr = new Date().toISOString().split("T")[0];
  const urlTag = `  <url>\n    <loc>https://amzloss.com/blogs/${slug}.html</loc>\n    <lastmod>${nowStr}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  try {
    if (fs.existsSync(SITEMAP)) {
      const content = fs.readFileSync(SITEMAP, "utf-8");
      if (!content.includes(`blogs/${slug}.html`)) {
        fs.writeFileSync(SITEMAP, content.replace("</urlset>", `${urlTag}</urlset>`), "utf-8");
      }
    }
  } catch (e) { warn(`sitemap: ${e.message}`); }
}

function addToBlogJs(slug, title, desc, category) {
  try {
    if (!fs.existsSync(BLOG_JS)) return;
    const content = fs.readFileSync(BLOG_JS, "utf-8");
    if (content.includes(`"${slug}"`)) return;
    const nowStr = new Date().toISOString().split("T")[0];
    const safe = s => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
    const entry = `  { cat: "${category}", slug: "${slug}", title: "${safe(title)}", date: "${nowStr}", url: "/blogs/${slug}.html", desc: "${safe(desc)}" },\n`;
    fs.writeFileSync(BLOG_JS, content.replace(/(const POSTS = \[)\n/, `$1\n${entry}`), "utf-8");
  } catch (e) { warn(`blog.js: ${e.message}`); }
}

function regenerateRSS() {
  try {
    if (fs.existsSync(RSS_SCRIPT)) {
      execSync(`node "${RSS_SCRIPT}"`, { stdio: "pipe", cwd: ROOT });
    }
  } catch (e) { warn(`RSS: ${e.message}`); }
}

function generateSocialCard(slug, title, category) {
  fs.mkdirSync(BLOG_IMG_DIR, { recursive: true });
  const svg = buildSvgCard(title, category);
  const svgPath = path.join(BLOG_IMG_DIR, `${slug}-og.svg`);
  const jpgPath = path.join(BLOG_IMG_DIR, `${slug}-og.jpg`);
  fs.writeFileSync(svgPath, svg, "utf-8");
  log(`Social card: ${slug}-og.svg written`);
  return { svgPath, jpgPath };
}

export { TEN_TOPICS, log, warn, truncate, buildSvgCard,
         addToSitemap, addToBlogJs, regenerateRSS, generateSocialCard };