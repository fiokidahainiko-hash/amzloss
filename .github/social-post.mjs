/* AmzLoss social sharing — posts the latest daily blog entry to any
   configured platform (Telegram, X/Twitter, Pinterest, Instagram).
   Runs as the final step of the daily blog workflow.

   Platforms that are not fully configured (env secrets present) are skipped.
   Exit code 0 unless a hard failure occurs so the workflow stays green.
*/
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execSync, spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BLOG_JS = path.join(ROOT, "js", "blog.js");
const BLOG_IMG_DIR = path.join(ROOT, "blogs", "img");
const BASE = "https://amzloss.com";
const RESULTS = [];

/* ---------- post discovery ---------- */

function readLatestPost() {
  const src = fs.readFileSync(BLOG_JS, "utf8");
  const m = src.match(/var POSTS = \[([\s\S]*?)\n  \];/);
  if (!m) throw new Error("POSTS array not found in js/blog.js");
  const body = m[1];
  const posts = [];
  const re = /\{\s*cat:\s*"([^"]*)",\s*[^}]*?title:\s*"([^"]*)",\s*[^}]*?url:\s*"([^"]*)",\s*[^}]*?desc:\s*"([^"]*)"\s*\}/g;
  let hit;
  while ((hit = re.exec(body))) {
    posts.push({ cat: hit[1], title: hit[2], url: hit[3], desc: hit[4] });
  }
  const daily = posts.find((p) => p.url.includes("amzloss-daily-"));
  const post = daily || posts[0];
  if (!post) throw new Error("No blog posts found");
  return { ...post, full: BASE + "/" + post.url.replace(/^\/+/, "") };
}

/* ---------- helpers ---------- */

function pct(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "\u2026";
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function jsonFetch(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}

/* ---------- image generation (pure Node, no deps) ---------- */

function buildSvg(title) {
  const lines = [];
  const words = title.split(/\s+/);
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 34) { lines.push(cur.trim()); cur = w; }
    else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  const ty = 300 - ((lines.length - 1) * 55);
  const spans = lines.map((l, i) =>
    `<text x="600" y="${ty + i * 55}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="bold" fill="#ffffff">${escapeXml(l)}</text>`
  ).join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0b1220"/>
  <rect y="0" width="1200" height="10" fill="#f5a623"/>
  <text x="600" y="120" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" letter-spacing="6" fill="#f5a623">AMZLOSS</text>
  ${spans}
  <text x="600" y="560" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#8a94a6">amzloss.com — free Amazon affiliate tools</text>
</svg>`;
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function generateImage(title, slug) {
  if (!fs.existsSync(BLOG_IMG_DIR)) fs.mkdirSync(BLOG_IMG_DIR, { recursive: true });
  const file = path.join(BLOG_IMG_DIR, slug + ".jpg");
  const svgFile = path.join(BLOG_IMG_DIR, slug + ".svg");
  const svg = buildSvg(title);
  fs.writeFileSync(svgFile, svg, "utf8");
  // Convert SVG -> JPEG via npx sharp (installed on demand by the workflow).
  const npx = spawnSync("npx", ["-y", "sharp-cli", "-i", svgFile, "-o", file, "resize", "1200", "630"], {
    encoding: null, shell: false, timeout: 120000
  });
  try { fs.unlinkSync(svgFile); } catch { /* ignore */ }
  if (npx.status !== 0) throw new Error("sharp failed: " + (npx.stderr ? npx.stderr.toString().slice(0, 500) : "unknown"));
  return { file, rel: "blogs/img/" + slug + ".jpg", url: `${BASE}/blogs/img/${slug}.jpg` };
}

/* ---------- platform senders (all skip gracefully) ---------- */

async function sendTelegram(post) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { name: "Telegram", status: "skipped (no TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID)" };
  const text = `📌 New on AmzLoss: ${post.title}\n\n${post.desc}\n\n${post.full}`;
  const r = await jsonFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: false })
  });
  return { name: "Telegram", status: r.ok ? "posted" : `failed (${r.status} ${JSON.stringify(r.data).slice(0, 200)})` };
}

async function sendTwitter(post) {
  const need = ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"];
  if (need.some((k) => !process.env[k])) return { name: "X", status: "skipped (no X_* secrets)" };
  const url = "https://api.twitter.com/2/tweets";
  const text = truncate(`📌 New: ${post.title}\n\n${post.full}`, 279);
  const oauth = {
    oauth_consumer_key: process.env.X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.X_ACCESS_TOKEN,
    oauth_version: "1.0"
  };
  const params = { ...oauth, status: text };
  const paramString = Object.keys(params).sort().map((k) => pct(k) + "=" + pct(params[k])).join("&");
  const base = `POST&${pct(url)}&${pct(paramString)}`;
  const key = pct(process.env.X_API_SECRET) + "&" + pct(process.env.X_ACCESS_TOKEN_SECRET);
  const sig = crypto.createHmac("sha1", key).update(base).digest("base64");
  const header = "OAuth " + Object.keys(oauth).map((k) => `${k}="${pct(oauth[k])}"`).join(", ") + `, oauth_signature="${pct(sig)}"`;
  const r = await jsonFetch(url, {
    method: "POST",
    headers: { Authorization: header, "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  return { name: "X", status: r.ok ? "posted" : `failed (${r.status} ${JSON.stringify(r.data).slice(0, 200)})` };
}

async function sendMastodon(post) {
  const need = ["MASTODON_TOKEN", "MASTODON_INSTANCE"];
  if (need.some((k) => !process.env[k])) return { name: "Mastodon", status: "skipped (no MASTODON_* secrets)" };
  const inst = process.env.MASTODON_INSTANCE;
  const text = truncate(`📌 New on AmzLoss: ${post.title}\n\n${post.desc}\n\n${post.full}`, 500);
  const r = await jsonFetch(`https://${inst}/api/v1/statuses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MASTODON_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: text })
  });
  return { name: "Mastodon", status: r.ok ? "posted" : `failed (${r.status} ${JSON.stringify(r.data).slice(0, 200)})` };
}

async function sendTumblr(post, img) {
  const need = ["TUMBLR_CONSUMER_KEY", "TUMBLR_CONSUMER_SECRET", "TUMBLR_TOKEN", "TUMBLR_TOKEN_SECRET", "TUMBLR_BLOG_IDENTIFIER"];
  if (need.some((k) => !process.env[k])) return { name: "Tumblr", status: "skipped (no TUMBLR_* secrets)" };
  const blog = process.env.TUMBLR_BLOG_IDENTIFIER;
  const url = `https://api.tumblr.com/v2/blog/${blog}/post`;
  const text = truncate(`${post.title}\n\n${post.desc}\n\nRead more: ${post.full}`, 4000);
  const params = { type: "text", title: truncate(post.title, 300), body: text };
  if (img) params.type = "photo", params.source = img.url, params.caption = `${post.title} — ${post.desc}\n\nRead more: ${post.full}`;
  const oauth = {
    oauth_consumer_key: process.env.TUMBLR_CONSUMER_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.TUMBLR_TOKEN,
    oauth_version: "1.0"
  };
  const allParams = { ...oauth, ...params };
  const paramString = Object.keys(allParams).sort().map((k) => pct(k) + "=" + pct(allParams[k])).join("&");
  const base = `POST&${pct(url)}&${pct(paramString)}`;
  const key = pct(process.env.TUMBLR_CONSUMER_SECRET) + "&" + pct(process.env.TUMBLR_TOKEN_SECRET);
  const sig = crypto.createHmac("sha1", key).update(base).digest("base64");
  const header = "OAuth " + Object.keys(oauth).map((k) => `${k}="${pct(oauth[k])}"`).join(", ") + `, oauth_signature="${pct(sig)}"`;
  const form = new URLSearchParams();
  for (const k of Object.keys(params)) form.append(k, params[k]);
  const r = await jsonFetch(url, {
    method: "POST",
    headers: { Authorization: header, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });
  return { name: "Tumblr", status: r.ok ? "posted" : `failed (${r.status} ${JSON.stringify(r.data).slice(0, 200)})` };
}

async function sendPinterest(post, img) {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  const board = process.env.PINTEREST_BOARD_ID;
  if (!token) return { name: "Pinterest", status: "skipped (no PINTEREST_ACCESS_TOKEN)" };
  if (!board) return { name: "Pinterest", status: "skipped (no PINTEREST_BOARD_ID)" };
  const data = fs.readFileSync(img.file).toString("base64");
  const r = await jsonFetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      board_id: board,
      title: truncate(post.title, 100),
      description: truncate(`${post.desc} ${post.full}`, 500),
      link: post.full,
      media_source: { source_type: "image_base64", content_type: "image/jpeg", data }
    })
  });
  return { name: "Pinterest", status: r.ok ? "posted" : `failed (${r.status} ${JSON.stringify(r.data).slice(0, 200)})` };
}

async function sendInstagram(post, img) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igId = process.env.INSTAGRAM_USER_ID;
  if (!token || !igId) return { name: "Instagram", status: "skipped (no INSTAGRAM_ACCESS_TOKEN/INSTAGRAM_USER_ID)" };
  // Wait for the committed image to be live on the Pages deploy before referencing it.
  let live = false;
  for (let i = 0; i < 18; i++) {
    try {
      const r = await fetch(img.url, { method: "HEAD" });
      if (r.status === 200) { live = true; break; }
    } catch { /* retry */ }
    await sleep(10000);
  }
  if (!live) return { name: "Instagram", status: "skipped (image not live yet after 3 min)" };
  const caption = truncate(`${post.title}\n\n${post.full}`, 2200);
  const c = await jsonFetch(`https://graph.instagram.com/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: img.url, caption, access_token: token })
  });
  if (!c.ok) return { name: "Instagram", status: `failed create (${c.status} ${JSON.stringify(c.data).slice(0, 200)})` };
  const p = await jsonFetch(`https://graph.instagram.com/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: c.data.id, access_token: token })
  });
  return { name: "Instagram", status: p.ok ? "posted" : `failed publish (${p.status} ${JSON.stringify(p.data).slice(0, 200)})` };
}

async function sendFacebook(post, img) {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!token || !pageId) return { name: "Facebook", status: "skipped (no FACEBOOK_ACCESS_TOKEN/FACEBOOK_PAGE_ID)" };
  let live = false;
  for (let i = 0; i < 18; i++) {
    try {
      const r = await fetch(img.url, { method: "HEAD" });
      if (r.status === 200) { live = true; break; }
    } catch { /* retry */ }
    await sleep(10000);
  }
  if (!live) return { name: "Facebook", status: "skipped (image not live yet after 3 min)" };
  const body = new FormData();
  body.append("url", img.url);
  body.append("message", truncate(`${post.title}\n\n${post.full}`, 2200));
  body.append("access_token", token);
  const r = await jsonFetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
    method: "POST", body
  });
  return { name: "Facebook", status: r.ok ? "posted" : `failed (${r.status} ${JSON.stringify(r.data).slice(0, 200)})` };
}

/* ---------- commit generated image so it is hosted ---------- */

function commitImage(file, rel, post) {
  try {
    execSync(`git config user.name "amzloss-bot"`, { cwd: ROOT, stdio: "ignore" });
    execSync(`git config user.email "admin@amzloss.com"`, { cwd: ROOT, stdio: "ignore" });
    execSync(`git add "${rel}"`, { cwd: ROOT, stdio: "ignore" });
    const msg = `Social image for ${post.url.split("/").pop()}`;
    execSync(`git commit -m "${msg.replace(/"/g, "'")}"`, { cwd: ROOT, stdio: "ignore" });
    execSync(`git push`, { cwd: ROOT, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/* ---------- main ---------- */

async function main() {
  const post = readLatestPost();
  RESULTS.push(`POST_URL=${post.full}`);
  const slug = post.url.replace(/\.html$/, "").split("/").pop();

  const needImage = process.env.PINTEREST_ACCESS_TOKEN || (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_USER_ID) || (process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID);
  let img = null;
  if (needImage) {
    try {
      img = await generateImage(post.title, slug);
      RESULTS.push("IMAGE=" + img.url);
      // Commit + push first so Instagram's hosted image URL is live before we reference it.
      const committed = commitImage(img.file, img.rel, post);
      RESULTS.push("IMAGE_COMMITTED=" + (committed ? "yes" : "no"));
      if (!committed) img = null;
    } catch (e) {
      RESULTS.push("IMAGE_ERROR=" + e.message);
      img = null;
    }
  }

  const tasks = [sendTelegram(post), sendTwitter(post), sendMastodon(post), sendTumblr(post, img)];
  if (img) tasks.push(sendPinterest(post, img), sendInstagram(post, img), sendFacebook(post, img));

  const results = await Promise.all(tasks);
  for (const r of results) RESULTS.push(`SOCIAL_${r.name.toUpperCase()}=${r.status}`);

  for (const line of RESULTS) console.log(line);
  console.log("SOCIAL_DONE=1");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});