/* AmzLoss — daily tool-explainer social posts.
   Posts ONE engaging tool explanation per run (3 scheduled runs/day =
   3 posts/day), rotating through the tool bank. New tools (Backlink
   Directory, URL Submitter) are queued first. Each post uses hashtags
   and tries a real screenshot of the tool page (Playwright), falling
   back to a generated SVG card if the browser isn't available.
   Run standalone: node .github/tool-posts.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { BASE, ROOT, IMG_DIR, truncate, sendTelegram, sendX, sendMastodon, sendTumblr, sendPinterest, sendInstagram, sendFacebook, sendFacebookIFTTT, generateImage } from "./lib-social.mjs";

const STATE_FILE = path.join(ROOT, ".github", "tool-state.json");
const RESULTS = [];

/* ---------- tool bank (NEW tools first, then the rest) ---------- */

const TOOLS = [
  {
    id: "directory", name: "Backlink Directory", emoji: "🔗", page: "directory.html",
    hook: "Every affiliate site needs backlinks. Most can't get a single one for free.",
    explain: "AmzLoss gives you a free, human-reviewed backlink — and you don't even need a website. List your YouTube, TikTok or Instagram profile, add a quick verification link, and you're in. No payment, no sign-up, ever.",
    proof: "Backlinks are how small sites beat big ones. One relevant link beats a hundred spam ones.",
    cta: "Claim your free backlink",
    tags: ["Backlinks", "LinkBuilding", "SEO", "AmazonAffiliate", "AmzLoss", "Blogging", "WebmasterTools", "FreeTools"]
  },
  {
    id: "submit", name: "URL Submitter", emoji: "🚀", page: "submit.html",
    hook: "You published. Nobody saw it. Google still hasn't indexed it.",
    explain: "AmzLoss fires your URL to Bing, Yandex, Seznam, Naver and Baidu in ONE click via IndexNow, pings the classics, then walks you through 31+ more platforms. Every single submission is also a free backlink pointing back at you.",
    proof: "Indexing is a race. One ping gets you crawled in hours — waiting gets you nothing in weeks.",
    cta: "Submit your URL free",
    tags: ["URLSubmitter", "IndexNow", "SEO", "GetIndexed", "Bing", "AmazonAffiliate", "AmzLoss", "WebmasterTools"]
  },
  {
    id: "links", name: "Link Tools", emoji: "🔗", page: "link-tools.html",
    hook: "A broken link is a silent commission thief. Most affiliates never catch it.",
    explain: "AmzLoss Link Tools builds clean Amazon links with your tag in one click, verifies your links still work, and counts any domain's backlinks. Your affiliate income quietly depends on links that actually resolve.",
    proof: "One dead link = every future click on it is lost money. Check once, earn forever.",
    cta: "Build & check your links",
    tags: ["AffiliateMarketing", "LinkBuilder", "AmazonAffiliate", "Backlinks", "SEO", "AmzLoss"]
  },
  {
    id: "audit", name: "Earnings Audit", emoji: "🔍", page: "audit.html",
    hook: "Amazon may be underpaying you right now and you'd never know.",
    explain: "Upload your Amazon earnings CSV into the AmzLoss audit and we compare every single order against the rate that applied that day — not today's rate. Underpayments become a ready-to-send claim export. Your file never leaves your browser.",
    proof: "Affiliates have found hundreds in missing commission with one upload. Your numbers might be wrong too.",
    cta: "Audit your report free",
    tags: ["AmazonAssociates", "EarningsAudit", "AmazonAffiliate", "Underpaid", "AmzLoss", "AffiliateMarketing"]
  },
  {
    id: "calculator", name: "Commission Calculator", emoji: "🧮", page: "calculator.html",
    hook: "Know exactly what a sale earns BEFORE you write the post.",
    explain: "The AmzLoss Commission Calculator shows your payout at the current 2026 rate versus the pre-cut rate, by market and category. One number tells you if a product is worth your time or a waste of it.",
    proof: "After the 2026 cuts, guessing your rate is how affiliates underprice their work.",
    cta: "Calculate a commission",
    tags: ["AmazonAssociates", "CommissionCalculator", "AmazonAffiliate", "AffiliateMarketing", "AmzLoss"]
  },
  {
    id: "rates", name: "Current Rate Table", emoji: "📊", page: "rates.html",
    hook: "Amazon cut affiliate rates up to 50% — and never published a change log.",
    explain: "AmzLoss keeps the 2026 rates for every category and market in one table: current vs pre-cut, side by side. Stop trusting stale screenshots and check what you should actually be paid today.",
    proof: "Rates change silently. The table that catches it is the one that pays you back.",
    cta: "Check today's rates",
    tags: ["AmazonAssociates", "CommissionRates", "AmazonAffiliate", "AffiliateMarketing", "AmzLoss"]
  },
  {
    id: "breakeven", name: "Break-Even Calculator", emoji: "⚖️", page: "breakeven.html",
    hook: "That 'great deal' you're about to promote? It might be losing you money.",
    explain: "Promote a discounted product at your real commission rate and the AmzLoss Break-Even Calculator shows the per-sale hit — and how many extra sales you'd need to break even. Sometimes the answer is to skip the deal entirely.",
    proof: "A price drop can quietly cut your commission. Do the math before you publish, not after.",
    cta: "Check the math",
    tags: ["AmazonAffiliate", "BreakEven", "CommissionCalc", "AffiliateMarketing", "AmzLoss", "Pricing"]
  },
  {
    id: "networks", name: "Network Calculator", emoji: "🌐", page: "networks.html",
    hook: "Amazon isn't your only income source. Betting on one network is a trap.",
    explain: "The AmzLoss Network Calculator compares commissions across ShareASale, CJ, Impact, Awin, Rakuten and more for your niche — so you can see who actually pays best before you sign up.",
    proof: "Diversify your affiliate income and one rate cut can never halve your earnings again.",
    cta: "Compare networks",
    tags: ["AffiliateMarketing", "ShareASale", "CJAffiliate", "Awin", "AmazonAffiliate", "AmzLoss"]
  }
];

/* ---------- state (rotation through the tool bank) ---------- */

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch { return {}; }
}

function nextTool(state) {
  const idx = Number(state.nextIndex) || 0;
  return { tool: TOOLS[idx % TOOLS.length], nextIndex: idx + 1 };
}

/* ---------- post text ---------- */

function buildPost(tool, compact) {
  if (compact) {
    const lines = [
      `${tool.emoji} ${tool.hook}`,
      "",
      truncate(tool.explain, 85),
      "",
      `${BASE}/${tool.page} — 100% free`,
      "",
      tool.tags.slice(0, 4).map((t) => "#" + t).join(" ")
    ];
    return lines.join("\n");
  }
  const lines = [
    `${tool.emoji} ${tool.hook}`,
    "",
    tool.explain,
    "",
    `💡 ${tool.proof}`,
    "",
    `👉 ${tool.cta}: ${BASE}/${tool.page}`,
    "",
    `Every tool on AmzLoss is 100% free, runs in your browser and needs no sign-up. Try this one now → ${BASE}`,
    "",
    tool.tags.map((t) => "#" + t).join(" ")
  ];
  return lines.join("\n");
}

/* ---------- screenshot (Playwright, best-effort) ---------- */

async function takeScreenshot(tool) {
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });
  const file = path.join(IMG_DIR, "tool-" + tool.id + ".png");
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(BASE + "/" + tool.page, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(2500);
    // Scroll past the shared header/hero so each tool's unique content shows.
    const header = page.locator("header");
    const main = page.locator("main, .container, .tool-card, .card, section").first();
    let target = main;
    try {
      if (await header.count() && await header.first().isVisible()) target = header.first();
    } catch { /* ignore */ }
    await target.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(800);
    await page.screenshot({ path: file, type: "png" });
    await browser.close();
    return { file, rel: "blogs/img/tool-" + tool.id + ".png", url: `${BASE}/blogs/img/tool-${tool.id}.png` };
  } catch {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch { /* ignore */ }
    return null;
  }
}

/* ---------- commit generated image + state so they are hosted ---------- */

function commitAll(imgRel, state, videoRel) {
  try {
    execSync(`git config user.name "amzloss-bot"`, { cwd: ROOT, stdio: "ignore" });
    execSync(`git config user.email "admin@amzloss.com"`, { cwd: ROOT, stdio: "ignore" });
    let cmd = "git add .github/tool-state.json";
    if (imgRel) cmd += " " + imgRel;
    if (videoRel) cmd += " " + videoRel;
    execSync(cmd, { cwd: ROOT, stdio: "ignore" });
    execSync(`git commit -m "Tool post #${state.nextIndex - 1} image + rotation"`, { cwd: ROOT, stdio: "ignore" });
    execSync(`git push`, { cwd: ROOT, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/* ---------- main ---------- */

async function main() {
  const state = readState();
  const { tool, nextIndex } = nextTool(state);
  const text = buildPost(tool);
  const textX = buildPost(tool, true);
  RESULTS.push(`TOOL=${tool.id}`);
  RESULTS.push(`TOOL_NAME=${tool.name}`);
  RESULTS.push(`POST_URL=${BASE}/${tool.page}`);
  RESULTS.push(`INDEX=${nextIndex}`);

  if (process.env.DRY_RUN === "1") {
    console.log("---- POST PREVIEW (full) ----");
    console.log(text);
    console.log("---- POST PREVIEW (X, " + textX.length + " chars) ----");
    console.log(textX);
    console.log("-----------------------");
    for (const line of RESULTS) console.log(line);
    console.log("DRY_RUN=1 (no state change, no posts sent)");
    return;
  }

  /* Image: real screenshot preferred, SVG card fallback. */
  let img = null;
  let shot = await takeScreenshot(tool);
  if (!shot) {
    try {
      const g = await generateImage("tool-" + tool.id, tool.emoji + " " + tool.name, tool.explain);
      img = { file: g.file, rel: g.rel, url: g.url };
      RESULTS.push("IMAGE_MODE=svg-card");
    } catch (e) {
      RESULTS.push("IMAGE_ERROR=" + (e.message || e));
    }
  } else {
    img = shot;
    RESULTS.push("IMAGE_MODE=screenshot");
  }

  /* Sandbox-safe TikTok asset: short MP4 slideshow from the tool image
     (unaudited apps may only direct-post VIDEO, not PHOTO). */
  let vid = null;
  if (img) {
    try {
      const vfile = img.file.replace(/\.(png|jpg|jpeg|webp)$/i, ".mp4");
      execSync(`ffmpeg -y -loop 1 -i "${img.file}" -t 4 -r 2 -pix_fmt yuv420p -vf scale=1080:-2 -movflags +faststart "${vfile}"`, { timeout: 120000 });
      const rel2 = path.relative(ROOT, vfile).split(path.sep).join("/");
      vid = { file: vfile, rel: rel2, url: BASE + "/" + rel2 };
      RESULTS.push("VIDEO_MODE=slideshow-mp4");
    } catch (e) {
      RESULTS.push("VIDEO_ERROR=" + (e.message || e));
    }
  }

  state.nextIndex = nextIndex;
  fs.writeFileSync(STATE_FILE, JSON.stringify({ nextIndex }, null, 2) + "\n", "utf8");

  /* Export context for downstream steps (e.g. TikTok poster). */
  if (process.env.GITHUB_ENV) {
    const envHint = [
      "TIKTOK_TITLE=" + truncate(tool.hook || tool.name, 80),
      "TIKTOK_DESC=" + truncate(tool.explain, 120),
      "TIKTOK_LINK=" + BASE + "/" + tool.page,
      "TIKTOK_IMAGE_URL=" + (img ? img.url : BASE + "/blogs/img/tool-" + tool.id + ".png"),
      "TIKTOK_VIDEO_URL=" + (vid ? vid.url : ""),
    ].join("\n");
    fs.appendFileSync(process.env.GITHUB_ENV, envHint + "\n", "utf8");
  }

  const committed = commitAll(img ? img.rel : null, state, vid ? vid.rel : null);
  RESULTS.push("IMAGE_COMMITTED=" + (committed ? "yes" : "no"));

  const tasks = [
    sendTelegram({ text, imgFile: img ? img.file : null }),
    sendX({ text: textX }),
    sendMastodon({ text, imgFile: img && (img.rel.endsWith(".png") || img.rel.endsWith(".jpg")) ? img.file : null }),
    sendTumblr({ text, imgFile: img ? img.file : null })
  ];
  if (img) {
    tasks.push(sendPinterest({ text, imgFile: img.file }), sendInstagram({ text, imgUrl: img.url }));
    tasks.push(process.env.IFTTT_KEY && process.env.IFTTT_EVENT
      ? sendFacebookIFTTT({ text, imgUrl: img.url })
      : sendFacebook({ text, imgUrl: img.url }));
  }

  const results = await Promise.all(tasks);
  const statuses = {};
  for (const r of results) {
    statuses[r.name] = r.status;
    RESULTS.push(`SOCIAL_${r.name.toUpperCase()}=${r.status}`);
  }

  const reportText = `📡 Tool post report — ${tool.name}\n\n` + results.map((r) => `• ${r.name}: ${r.status}`).join("\n");
  RESULTS.push("REPORT_TEXT=" + reportText.replace(/\n/g, " | "));
  fs.writeFileSync(path.join(ROOT, "report.txt"), reportText, "utf8");
  RESULTS.push("REPORT_WRITTEN=report.txt (filed as GitHub issue → emailed to owner via notifications)");
  if (process.env.REPORT_TELEGRAM_CHAT_ID) {
    const priv = await sendTelegram({ text: reportText, chatId: process.env.REPORT_TELEGRAM_CHAT_ID });
    RESULTS.push(`REPORT_TELEGRAM_PRIVATE=${priv.status}`);
  }

  for (const line of RESULTS) console.log(line);
  console.log("SOCIAL_DONE=1");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});