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
import { BASE, ROOT, IMG_DIR, truncate, sendTelegram, sendX, sendMastodon, sendTumblr, sendPinterest, sendInstagram, generateImage } from "./lib-social.mjs";

const STATE_FILE = path.join(ROOT, ".github", "tool-state.json");
const RESULTS = [];

/* ---------- tool bank (NEW tools first, then the rest) ---------- */

const TOOLS = [
  {
    id: "directory", name: "Backlink Directory", emoji: "🔗", page: "directory.html",
    hook: "Want a free backlink from a REAL directory?",
    explain: "List your site — or even your YouTube, TikTok or Instagram profile — add a quick verification link, and get a human-reviewed backlink. No payment, no sign-up.",
    cta: "Get your free backlink",
    tags: ["Backlinks", "LinkBuilding", "SEO", "AmazonAffiliate", "AmzLoss", "Blogging", "WebmasterTools"]
  },
  {
    id: "submit", name: "URL Submitter", emoji: "🚀", page: "submit.html",
    hook: "Published something? Get it INDEXED in hours, not weeks.",
    explain: "One click pings Bing, Yandex, Seznam, Naver and Baidu via IndexNow, plus the classic Ping-O-Matic. Then blast your URL to 31+ more platforms — each one a free backlink too.",
    cta: "Submit your URL free",
    tags: ["URLSubmitter", "IndexNow", "SEO", "GetIndexed", "Bing", "AmazonAffiliate", "AmzLoss", "WebmasterTools"]
  },
  {
    id: "links", name: "Link Tools", emoji: "🔗", page: "link-tools.html",
    hook: "A broken affiliate link is silently losing you commissions.",
    explain: "Build clean Amazon links with your tag in one click, verify your links still work, and check any domain's backlinks. All free, all in your browser.",
    cta: "Build & check your links",
    tags: ["AffiliateMarketing", "LinkBuilder", "AmazonAffiliate", "Backlinks", "SEO", "AmzLoss"]
  },
  {
    id: "audit", name: "Earnings Audit", emoji: "🔍", page: "audit.html",
    hook: "Amazon may be underpaying you right now.",
    explain: "Upload your earnings CSV and we check every order against the rate that applied that day. Flagged underpayments become a ready-to-send claim export. Your file never leaves your browser.",
    cta: "Audit your report free",
    tags: ["AmazonAssociates", "EarningsAudit", "AmazonAffiliate", "Underpaid", "AmzLoss", "AffiliateMarketing"]
  },
  {
    id: "calculator", name: "Commission Calculator", emoji: "🧮", page: "calculator.html",
    hook: "Know what a sale REALLY earns before you write the post.",
    explain: "Pick your market, category and price to see your commission at the current 2026 rate vs the pre-cut rate. See exactly what each rate change costs you per month.",
    cta: "Calculate a commission",
    tags: ["AmazonAssociates", "CommissionCalculator", "AmazonAffiliate", "AffiliateMarketing", "AmzLoss"]
  },
  {
    id: "rates", name: "Current Rate Table", emoji: "📊", page: "rates.html",
    hook: "Amazon cut rates up to 50% — with no reliable change log.",
    explain: "One table shows every category and market: current rate vs pre-cut rate side by side. Always know what you SHOULD be earning today.",
    cta: "Check today's rates",
    tags: ["AmazonAssociates", "CommissionRates", "AmazonAffiliate", "AffiliateMarketing", "AmzLoss"]
  },
  {
    id: "breakeven", name: "Break-Even Calculator", emoji: "⚖️", page: "breakeven.html",
    hook: "That 'great deal' might be cutting your commission.",
    explain: "Enter the original price, the discounted price and your real rate — see the per-sale hit and how many extra sales you'd need to break even. Sometimes the answer is: skip the deal.",
    cta: "Check the math",
    tags: ["AmazonAffiliate", "BreakEven", "CommissionCalc", "AffiliateMarketing", "AmzLoss", "Pricing"]
  },
  {
    id: "networks", name: "Network Calculator", emoji: "🌐", page: "networks.html",
    hook: "Amazon isn't your only option — compare the networks.",
    explain: "See typical commissions across ShareASale, CJ, Impact, Awin, Rakuten and more for your niche. Diversify income so one rate cut never halves it again.",
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
      truncate(tool.explain, 112),
      "",
      `${BASE}/${tool.page}`,
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
    `👉 ${tool.cta}: ${BASE}/${tool.page}`,
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
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.goto(BASE + "/" + tool.page, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: file, type: "png" });
    await browser.close();
    return { file, rel: "blogs/img/tool-" + tool.id + ".png", url: `${BASE}/blogs/img/tool-${tool.id}.png` };
  } catch {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch { /* ignore */ }
    return null;
  }
}

/* ---------- commit generated image + state so they are hosted ---------- */

function commitAll(imgRel, state) {
  try {
    execSync(`git config user.name "amzloss-bot"`, { cwd: ROOT, stdio: "ignore" });
    execSync(`git config user.email "admin@amzloss.com"`, { cwd: ROOT, stdio: "ignore" });
    let cmd = "git add .github/tool-state.json";
    if (imgRel) cmd += " " + imgRel;
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

  state.nextIndex = nextIndex;
  fs.writeFileSync(STATE_FILE, JSON.stringify({ nextIndex }, null, 2) + "\n", "utf8");

  const committed = commitAll(img ? img.rel : null, state);
  RESULTS.push("IMAGE_COMMITTED=" + (committed ? "yes" : "no"));

  const tasks = [
    sendTelegram({ text, imgUrl: img ? img.url : null }),
    sendX({ text: textX }),
    sendMastodon({ text, imgFile: img && (img.rel.endsWith(".png") || img.rel.endsWith(".jpg")) ? img.file : null }),
    sendTumblr({ text, imgUrl: img ? img.url : null })
  ];
  if (img) tasks.push(sendPinterest({ text, imgFile: img.file }), sendInstagram({ text, imgUrl: img.url }));

  const results = await Promise.all(tasks);
  for (const r of results) RESULTS.push(`SOCIAL_${r.name.toUpperCase()}=${r.status}`);

  for (const line of RESULTS) console.log(line);
  console.log("SOCIAL_DONE=1");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});