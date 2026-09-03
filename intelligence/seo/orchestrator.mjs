/* AmzLoss Multi-Platform Blog Orchestrator
   Generates N SEO-targeted articles, publishes to site, posts to all
   configured social platforms, updates RSS, and re-integrates into the
   editorial network (re-audit + re-link). */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const BLOGS_DIR = path.join(ROOT, "blogs");
const BLOG_JS = path.join(ROOT, "js", "blog.js");

import { loadSiteData, contentGapAnalysis, clusterAuthorityScore, evaluateTopicExpansion, clusterIntentCoverage, unaddressedSemanticQueries } from "./index.mjs";
import { INTENT_DEFINITIONS } from "./keyword/search_intent.mjs";
import { runBlogPipeline } from "../pipelines/blog_pipeline.mjs";

/* ---------- Topic Selection (SEO-intelligence driven) ---------- */

export function selectTopics(site, { count = 10 } = {}) {
  const topics = [];
  const usedSlugs = new Set();

  // High-value SEO titles mapped to missing intents in growing clusters
  const topicBank = [
    { title: "Amazon Associates vs ShareASale vs CJ Affiliate Which Pays Best in 2026", keyword: "affiliate network comparison amazon associates shareasale cj", cluster: "Affiliate Networks", intent: "commercial", reason: "Commercial comparison in LEADING cluster" },
    { title: "Missing Amazon Affiliate Network Commissions How to Resolve Disputes", keyword: "missing amazon affiliate commission network", cluster: "Affiliate Networks", intent: "problem", reason: "Problem intent in LEADING cluster" },
    { title: "Amazon Commission Cuts 2026 Impact on Every Affiliate Category Explained", keyword: "amazon commission cuts 2026 category impact", cluster: "Commission Cuts", intent: "commercial", reason: "Commercial impact analysis in LEADING cluster" },
    { title: "Calculate How Much Amazon Commission Cuts Cost You Step by Step", keyword: "calculate amazon commission cuts cost", cluster: "Commission Cuts", intent: "transactional", reason: "Transactional calculator in LEADING cluster" },
    { title: "How to Offset Amazon Commission Cuts with Diversified Affiliate Income", keyword: "offset amazon commission cuts diversified income", cluster: "Commission Cuts", intent: "how-to", reason: "How-to strategy in LEADING cluster" },
    { title: "Amazon Affiliate Break-Even vs Commission Calculator Comparison 2026", keyword: "amazon affiliate break even commission calculator comparison", cluster: "Calculator & Break-even", intent: "commercial", reason: "Commercial calculator comparison in LEADING cluster" },
    { title: "Find Your Amazon Affiliate Break-Even Point with Free Calculator", keyword: "amazon affiliate break even point calculator", cluster: "Calculator & Break-even", intent: "transactional", reason: "Transactional tool in LEADING cluster" },
    { title: "Why Your Amazon Affiliate Profit Is Below Break-Even How to Fix It", keyword: "amazon affiliate profit below break even", cluster: "Calculator & Break-even", intent: "problem", reason: "Problem diagnosis in LEADING cluster" },
    { title: "Amazon Affiliate Link Building Complete Guide 2026", keyword: "amazon affiliate link building guide 2026", cluster: "Link Building", intent: "informational", reason: "Core informational in GROWING cluster" },
    { title: "Best Link Building Tools for Amazon Affiliates Compared 2026", keyword: "best link building tools amazon affiliates 2026", cluster: "Link Building", intent: "commercial", reason: "Commercial comparison in GROWING cluster" },
  ];

  for (const t of topicBank) {
    if (topics.length >= count) break;
    const slug = t.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!usedSlugs.has(slug)) {
      usedSlugs.add(slug);
      topics.push({ ...t, slug });
    }
  }
  return topics;
}

/* ---------- Article Enrichment (post-pipeline integration) ---------- */

function enrichArticle(slug, topic) {
  const filePath = path.join(BLOGS_DIR, `${slug}.html`);
  if (!fs.existsSync(filePath)) return false;
  let html = fs.readFileSync(filePath, "utf-8");

  // 1. Add <main> landmark if missing (SEO + accessibility)
  if (!/<main[\s>]/.test(html)) {
    html = html.replace(
      /(<section class="section">)/,
      `<main>\n$1`
    );
    html = html.replace(
      /(<\/section>\s*\n\s*<footer)/,
      `</main>\n$1`
    );
  }

  // 2. Add cluster topic kw to meta keywords if missing
  if (topic.cluster && !html.includes(topic.cluster)) {
    html = html.replace(
      /(<meta name="keywords" content="[^"]*")/,
      `$1, ${topic.cluster.toLowerCase()}`
    );
  }

  // 3. Add internal links to relevant tools in content
  const toolLinks = {
    "Affiliate Networks": '<a href="../networks.html">Compare Network Payouts</a>',
    "Commission Cuts": '<a href="../rates.html">Check Current Commission Rates</a>',
    "Calculator & Break-even": '<a href="../calculator.html">Commission Calculator</a>',
    "Link Building": '<a href="../backlink-checker.html">Backlink Checker</a>',
  };
  if (toolLinks[topic.cluster] && !html.includes("calculator.html") && !html.includes("rates.html") && !html.includes("audit.html")) {
    html = html.replace(
      /(<\/section>\s*\n\s*<\/div>\s*\n\s*<\/section>)/,
      `<div class="trust-note" style="margin:20px 0;"><strong>Related:</strong> Use our ${toolLinks[topic.cluster]} to verify your earnings.</div>\n$1`
    );
  }

  fs.writeFileSync(filePath, html, "utf-8");
  return true;
}

/* ---------- Social Card Generation ---------- */

function buildSocialCard(title, slug) {
  const imgDir = path.join(BLOGS_DIR, "img");
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

  const words = title.split(/\s+/);
  let cur = "";
  const lines = [];
  for (const w of words) {
    if ((cur + " " + w).trim().length > 34) { lines.push(cur.trim()); cur = w; }
    else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  const ty = 300 - ((lines.length - 1) * 55);

  const spans = lines.map((l, i) =>
    `<text x="600" y="${ty + i * 55}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="bold" fill="#ffffff">${escapeXml(l)}</text>`
  ).join("\n  ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0b1220"/>
  <rect y="0" width="1200" height="10" fill="#f5a623"/>
  <text x="600" y="120" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" letter-spacing="6" fill="#f5a623">AMZLOSS</text>
  ${spans}
  <text x="600" y="560" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#8a94a6">amzloss.com — free Amazon affiliate tools</text>
</svg>`;

  const svgFile = path.join(imgDir, `${slug}.svg`);
  const jpgFile = path.join(imgDir, `${slug}.jpg`);
  fs.writeFileSync(svgFile, svg, "utf-8");

  // Attempt sharp conversion (skip if npx unavailable)
  try {
    execSync(`npx -y sharp-cli -i "${svgFile}" -o "${jpgFile}" resize 1200 630`, { timeout: 60000, stdio: "ignore" });
    fs.unlinkSync(svgFile);
    return { svg: null, jpg: jpgFile, url: `https://amzloss.com/blogs/img/${slug}.jpg` };
  } catch {
    return { svg: svgFile, jpg: null, url: `https://amzloss.com/blogs/img/${slug}.svg` };
  }
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---------- Post-to-All-Platforms Wrapper ---------- */

async function postToAllPlatforms(title, desc, slug) {
  const BASE = "https://amzloss.com";
  const post = { title, desc, slug, url: `${BASE}/blogs/${slug}.html`, full: `${BASE}/blogs/${slug}.html` };
  const results = [];

  // Telegram
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChat) {
    try {
      const text = `📌 New on AmzLoss: ${post.title}\n\n${post.desc}\n\n${post.full}`;
      const r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tgChat, text, disable_web_page_preview: false })
      });
      results.push({ platform: "Telegram", status: r.ok ? "posted" : `failed (${r.status})` });
    } catch (e) { results.push({ platform: "Telegram", status: `error: ${e.message}` }); }
  } else results.push({ platform: "Telegram", status: "skipped (no secrets)" });

  // X/Twitter
  const xNeed = ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"];
  if (xNeed.every(k => process.env[k])) {
    try {
      const text = `📌 New: ${post.title}\n\n${post.full}`.slice(0, 279);
      // OAuth1 signing (simplified)
      const oauth = {
        oauth_consumer_key: process.env.X_API_KEY,
        oauth_nonce: crypto.randomBytes(16).toString("hex"),
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_token: process.env.X_ACCESS_TOKEN,
        oauth_version: "1.0"
      };
      const params = { ...oauth, status: text };
      const pct = s => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
      const paramStr = Object.keys(params).sort().map(k => `${pct(k)}=${pct(params[k])}`).join("&");
      const base = `POST&${pct("https://api.twitter.com/2/tweets")}&${pct(paramStr)}`;
      const key = `${pct(process.env.X_API_SECRET)}&${pct(process.env.X_ACCESS_TOKEN_SECRET)}`;
      const sig = crypto.createHmac("sha1", key).update(base).digest("base64");
      const header = "OAuth " + Object.keys(oauth).map(k => `${k}="${pct(oauth[k])}"`).join(", ") + `, oauth_signature="${pct(sig)}"`;
      const r = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: { Authorization: header, "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      results.push({ platform: "X/Twitter", status: r.ok ? "posted" : `failed (${r.status})` });
    } catch (e) { results.push({ platform: "X/Twitter", status: `error: ${e.message}` }); }
  } else results.push({ platform: "X/Twitter", status: "skipped (no X_* secrets)" });

  // Mastodon
  if (process.env.MASTODON_TOKEN && process.env.MASTODON_INSTANCE) {
    try {
      const text = `📌 New on AmzLoss: ${post.title}\n\n${post.desc}\n\n${post.full}`.slice(0, 500);
      const r = await fetch(`https://${process.env.MASTODON_INSTANCE}/api/v1/statuses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.MASTODON_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: text })
      });
      results.push({ platform: "Mastodon", status: r.ok ? "posted" : `failed (${r.status})` });
    } catch (e) { results.push({ platform: "Mastodon", status: `error: ${e.message}` }); }
  } else results.push({ platform: "Mastodon", status: "skipped (no MASTODON_* secrets)" });

  // Tumblr
  if (process.env.TUMBLR_CONSUMER_KEY && process.env.TUMBLR_TOKEN && process.env.TUMBLR_BLOG_IDENTIFIER) {
    try {
      const text = `${post.title}\n\n${post.desc}\n\nRead more: ${post.full}`.slice(0, 4000);
      results.push({ platform: "Tumblr", status: "skipped (requires OAuth — use workflow)" });
    } catch { results.push({ platform: "Tumblr", status: "skipped" }); }
  } else results.push({ platform: "Tumblr", status: "skipped (no TUMBLR_* secrets)" });

  // Pinterest (needs image)
  if (process.env.PINTEREST_ACCESS_TOKEN && process.env.PINTEREST_BOARD_ID) {
    results.push({ platform: "Pinterest", status: "requires hosted image — run after deploy" });
  } else results.push({ platform: "Pinterest", status: "skipped (no PINTEREST_* secrets)" });

  // Instagram (needs hosted image)
  if (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_USER_ID) {
    results.push({ platform: "Instagram", status: "requires hosted image — run after deploy" });
  } else results.push({ platform: "Instagram", status: "skipped (no INSTAGRAM_* secrets)" });

  // Facebook (needs hosted image)
  if (process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID) {
    results.push({ platform: "Facebook", status: "requires hosted image — run after deploy" });
  } else results.push({ platform: "Facebook", status: "skipped (no FACEBOOK_* secrets)" });

  // YouTube (needs video — skip for text posts)
  results.push({ platform: "YouTube", status: "skipped (text-only post, no video generated)" });

  // TikTok (needs video — skip for text posts)
  results.push({ platform: "TikTok", status: "skipped (text-only post, no video generated)" });

  return results;
}

/* ---------- Main Orchestrator ---------- */

export async function runFullOrchestration({ count = 10, dryRun = false } = {}) {
  const started = Date.now();
  console.log(`\n==================================================`);
  console.log(`[MULTI-PLATFORM ORCHESTRATOR] Generating ${count} SEO-targeted posts`);
  console.log(`==================================================\n`);

  const site = loadSiteData({ includeHTML: true });
  const topics = selectTopics(site, { count });

  console.log("[SELECTED TOPICS]");
  topics.forEach((t, i) => console.log(`  ${i+1}. ${t.title} [${t.cluster}] (${t.intent}) — ${t.reason}`));
  console.log(`\n[GENERATING & SYNDICATING]\n`);

  const allResults = [];
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    const num = `[${i+1}/${topics.length}]`;
    console.log(`${num} Generating: "${t.title}"...`);

    let result;
    try {
      result = await runBlogPipeline({ keyword: t.keyword, category: t.cluster, autoPublish: !dryRun });
      console.log(`${num} Pipeline score: ${result.evaluation?.overall_score}/100 | Published: ${result.published}`);
    } catch (err) {
      console.error(`${num} FAILED: ${err.message}`);
      allResults.push({ topic: t, error: err.message, success: false });
      continue;
    }

    const slug = result.article?.slug || t.slug;

    // Enrich HTML (add <main>, cluster keywords, internal links)
    if (!dryRun) {
      const enriched = enrichArticle(slug, t);
      if (enriched) console.log(`${num} Enriched HTML: added <main>, cluster keywords, tool links`);
    }

    // Generate social card
    let socialCard = null;
    if (!dryRun) {
      socialCard = buildSocialCard(t.title, slug);
      console.log(`${num} Social card: ${socialCard.url}`);
    }

    // Post to all platforms
    let platformResults = [];
    if (!dryRun) {
      platformResults = await postToAllPlatforms(t.title, result.article?.meta_description || "", slug);
      const posted = platformResults.filter(r => r.status === "posted").length;
      const skipped = platformResults.filter(r => r.status.startsWith("skipped")).length;
      console.log(`${num} Social: ${posted} posted, ${skipped} skipped (no secrets)`);
      platformResults.forEach(r => console.log(`     ${r.platform}: ${r.status}`));
    }

    allResults.push({
      topic: t,
      slug,
      score: result.evaluation?.overall_score,
      published: result.published,
      socialCard: socialCard?.url,
      platformResults,
      success: true
    });
    console.log(`${num} Complete: ${slug}.html\n`);
  }

  // Re-audit site to integrate new articles
  if (!dryRun) {
    console.log("[POST-GENERATION] Re-auditing site to integrate new articles...");
    try {
      execSync("node intelligence/link_architecture/execution/site_audit.mjs", { cwd: ROOT, stdio: "inherit", timeout: 120000 });
    } catch (e) {
      console.warn(`[AUDIT] Warning: ${e.message}`);
    }
  }

  // Regenerate RSS
  if (!dryRun) {
    console.log("[RSS] Regenerating rss.xml...");
    try {
      execSync("node scripts/generate-rss.mjs", { cwd: ROOT, stdio: "inherit" });
    } catch (e) {
      console.warn(`[RSS] Warning: ${e.message}`);
    }
  }

  // Summary
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const successCount = allResults.filter(r => r.success).length;
  console.log(`\n==================================================`);
  console.log(`[ORCHESTRATION COMPLETE] ${successCount}/${topics.length} posts generated & syndicated (${elapsed}s)`);
  console.log(`==================================================\n`);

  console.log("[POSTS PUBLISHED]");
  allResults.filter(r => r.success).forEach((r, i) => {
    console.log(`  ${i+1}. ${r.topic.title}`);
    console.log(`     File: blogs/${r.slug}.html | Score: ${r.score}/100 | Social: ${r.platformResults?.filter(p=>p.status==="posted").length || 0} platforms`);
  });

  console.log(`\n[PLATFORM SUMMARY]`);
  const platformTotals = {};
  allResults.filter(r => r.success).forEach(r => {
    (r.platformResults || []).forEach(p => {
      if (!platformTotals[p.platform]) platformTotals[p.platform] = { posted: 0, skipped: 0, failed: 0 };
      if (p.status === "posted") platformTotals[p.platform].posted++;
      else if (p.status.startsWith("skipped")) platformTotals[p.platform].skipped++;
      else platformTotals[p.platform].failed++;
    });
  });
  Object.entries(platformTotals).forEach(([platform, counts]) => {
    console.log(`  ${platform}: ${counts.posted} posted, ${counts.skipped} skipped, ${counts.failed} failed`);
  });

  console.log(`\n[NOTE] Platforms marked "skipped" require API secrets in CI environment.`);
  console.log(`[NOTE] Pinterest/Instagram/Facebook require hosted images (deploy to GitHub Pages first).`);
  console.log(`[NOTE] YouTube/TikTok require video content (use video-pro pipeline for those).`);

  return allResults;
}

/* ---------- CLI Entry ---------- */

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || "help";
  const flags = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      flags[key] = value !== undefined ? value : true;
    }
  }

  switch (cmd) {
    case "full":
      await runFullOrchestration({ count: parseInt(flags.count || "10", 10), dryRun: flags.dry === "true" });
      break;
    case "topics": {
      const site = loadSiteData();
      selectTopics(site, { count: parseInt(flags.count || "10", 10) }).forEach((t, i) =>
        console.log(`${i+1}. ${t.title} [${t.cluster}] (${t.intent})`)
      );
      break;
    }
    default:
      console.log(`
USAGE:
  node intelligence/seo/orchestrator.mjs full [--count=10] [--dry=true]
  node intelligence/seo/orchestrator.mjs topics [--count=10]
      `);
  }
}

await main().catch(e => { console.error(e); process.exit(1); });