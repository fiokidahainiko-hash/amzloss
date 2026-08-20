/* AmzLoss — shared social helpers for the daily tool-explainer posts.
   Raw text senders (they post exactly what you give them, so hashtags and
   engaging copy pass through untouched). Platforms without secrets skip. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const BASE = "https://amzloss.com";
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const IMG_DIR = path.join(ROOT, "blogs", "img");

export function pct(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

export function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "\u2026";
}

export async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function waitImageLive(imgUrl) {
  if (!imgUrl) return false;
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(imgUrl, { method: "HEAD" });
      if (r.status === 200) return true;
    } catch { /* retry */ }
    await sleep(10000);
  }
  return false;
}

export async function jsonFetch(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/* ---------- fallback image (SVG card -> JPEG), used when no screenshot ----- */

export function buildSvg(title, subtitle) {
  const lines = [];
  const words = String(title).split(/\s+/);
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 30) { lines.push(cur.trim()); cur = w; }
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
  <text x="600" y="560" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#8a94a6">${escapeXml(subtitle || "amzloss.com — free Amazon affiliate tools")}</text>
</svg>`;
}

export async function generateImage(slug, title, subtitle) {
  if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });
  const file = path.join(IMG_DIR, slug + ".jpg");
  const svgFile = path.join(IMG_DIR, slug + ".svg");
  fs.writeFileSync(svgFile, buildSvg(title, subtitle), "utf8");
  const npx = spawnSync("npx", ["-y", "sharp-cli", "-i", svgFile, "-o", file, "resize", "1200", "630"], {
    encoding: null, shell: false, timeout: 120000
  });
  try { fs.unlinkSync(svgFile); } catch { /* ignore */ }
  if (npx.status !== 0) throw new Error("sharp failed");
  return { file, rel: "blogs/img/" + slug + ".jpg", url: `${BASE}/blogs/img/${slug}.jpg` };
}

/* ---------- OAuth 1.0a signing (X and Tumblr) ---------- */

export function signOAuth1(method, url, params, consumerSecret, tokenSecret) {
  const paramString = Object.keys(params).sort().map((k) => pct(k) + "=" + pct(params[k])).join("&");
  const base = `${method}&${pct(url)}&${pct(paramString)}`;
  const key = pct(consumerSecret) + "&" + pct(tokenSecret);
  const sig = crypto.createHmac("sha1", key).update(base).digest("base64");
  return sig;
}

/* ---------- raw platform senders ---------- */

export async function sendTelegram({ text, imgUrl }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { name: "Telegram", status: "skipped" };
  if (imgUrl) {
    if (!(await waitImageLive(imgUrl))) return { name: "Telegram", status: "skipped (image not live)" };
    const r = await jsonFetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, photo: imgUrl, caption: truncate(text, 1024) })
    });
    return { name: "Telegram", status: r.ok ? "posted" : `failed (${r.status})` };
  }
  const r = await jsonFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text })
  });
  return { name: "Telegram", status: r.ok ? "posted" : `failed (${r.status})` };
}

export async function sendX({ text }) {
  const need = ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"];
  if (need.some((k) => !process.env[k])) return { name: "X", status: "skipped" };
  const url = "https://api.twitter.com/2/tweets";
  const body = truncate(text, 279);
  const oauth = {
    oauth_consumer_key: process.env.X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.X_ACCESS_TOKEN,
    oauth_version: "1.0"
  };
  const sig = signOAuth1("POST", url, { ...oauth, status: body }, process.env.X_API_SECRET, process.env.X_ACCESS_TOKEN_SECRET);
  const header = "OAuth " + Object.keys(oauth).map((k) => `${k}="${pct(oauth[k])}"`).join(", ") + `, oauth_signature="${pct(sig)}"`;
  const r = await jsonFetch(url, {
    method: "POST",
    headers: { Authorization: header, "Content-Type": "application/json" },
    body: JSON.stringify({ text: body })
  });
  return { name: "X", status: r.ok ? "posted" : `failed (${r.status})` };
}

export async function sendMastodon({ text, imgFile }) {
  const need = ["MASTODON_TOKEN", "MASTODON_INSTANCE"];
  if (need.some((k) => !process.env[k])) return { name: "Mastodon", status: "skipped" };
  const inst = process.env.MASTODON_INSTANCE;
  let mediaId = null;
  if (imgFile) {
    const f = new FormData();
    f.append("file", new Blob([fs.readFileSync(imgFile)], { type: "image/png" }));
    const m = await jsonFetch(`https://${inst}/api/v2/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.MASTODON_TOKEN}` },
      body: f
    });
    if (m.ok && m.data && m.data.id) mediaId = m.data.id;
  }
  const bodyObj = { status: truncate(text, 500) };
  if (mediaId) bodyObj.media_ids = [mediaId];
  const r = await jsonFetch(`https://${inst}/api/v1/statuses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MASTODON_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj)
  });
  return { name: "Mastodon", status: r.ok ? "posted" : `failed (${r.status})` };
}

export async function sendTumblr({ text, imgUrl }) {
  const need = ["TUMBLR_CONSUMER_KEY", "TUMBLR_CONSUMER_SECRET", "TUMBLR_TOKEN", "TUMBLR_TOKEN_SECRET", "TUMBLR_BLOG_IDENTIFIER"];
  if (need.some((k) => !process.env[k])) return { name: "Tumblr", status: "skipped" };
  const blog = process.env.TUMBLR_BLOG_IDENTIFIER;
  const url = `https://api.tumblr.com/v2/blog/${blog}/post`;
  const params = imgUrl
    ? { type: "photo", source: imgUrl, caption: truncate(text, 4000) }
    : { type: "text", title: truncate(text.split("\n")[0].replace(/^[^ ]+ /, "").slice(0, 90), 90), body: text };
  const oauth = {
    oauth_consumer_key: process.env.TUMBLR_CONSUMER_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: process.env.TUMBLR_TOKEN,
    oauth_version: "1.0"
  };
  const sig = signOAuth1("POST", url, { ...oauth, ...params }, process.env.TUMBLR_CONSUMER_SECRET, process.env.TUMBLR_TOKEN_SECRET);
  const header = "OAuth " + Object.keys(oauth).map((k) => `${k}="${pct(oauth[k])}"`).join(", ") + `, oauth_signature="${pct(sig)}"`;
  const form = new URLSearchParams();
  for (const k of Object.keys(params)) form.append(k, params[k]);
  const r = await jsonFetch(url, {
    method: "POST",
    headers: { Authorization: header, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });
  return { name: "Tumblr", status: r.ok ? "posted" : `failed (${r.status})` };
}

export async function sendPinterest({ text, imgFile }) {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  const board = process.env.PINTEREST_BOARD_ID;
  if (!token) return { name: "Pinterest", status: "skipped" };
  if (!board) return { name: "Pinterest", status: "skipped (no board)" };
  if (!imgFile) return { name: "Pinterest", status: "skipped (no image)" };
  const lines = text.split("\n").filter(Boolean);
  const title = truncate(lines[0].replace(/[^a-zA-Z0-9 ]/g, "").trim(), 100) || "AmzLoss free tool";
  const data = fs.readFileSync(imgFile).toString("base64");
  const r = await jsonFetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      board_id: board,
      title,
      description: truncate(text, 500),
      link: BASE + "/",
      media_source: { source_type: "image_base64", content_type: "image/png", data }
    })
  });
  return { name: "Pinterest", status: r.ok ? "posted" : `failed (${r.status})` };
}

export async function sendInstagram({ text, imgUrl }) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igId = process.env.INSTAGRAM_USER_ID;
  if (!token || !igId) return { name: "Instagram", status: "skipped" };
  if (!(await waitImageLive(imgUrl))) return { name: "Instagram", status: "skipped (image not live)" };
  const caption = truncate(`${text}\n\n${BASE}/`, 2200);
  const c = await jsonFetch(`https://graph.instagram.com/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imgUrl, caption, access_token: token })
  });
  if (!c.ok) return { name: "Instagram", status: `failed create (${c.status})` };
  const p = await jsonFetch(`https://graph.instagram.com/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: c.data.id, access_token: token })
  });
  return { name: "Instagram", status: p.ok ? "posted" : `failed publish (${p.status})` };
}

export async function sendFacebook({ text, imgUrl }) {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!token || !pageId) return { name: "Facebook", status: "skipped" };
  if (!(await waitImageLive(imgUrl))) return { name: "Facebook", status: "skipped (image not live)" };
  const body = new FormData();
  body.append("url", imgUrl);
  body.append("message", truncate(`${text}\n\n${BASE}/`, 2200));
  body.append("access_token", token);
  const r = await jsonFetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
    method: "POST", body
  });
  return { name: "Facebook", status: r.ok ? "posted" : `failed (${r.status})` };
}

export async function sendFacebookIFTTT({ text, imgUrl }) {
  const key = process.env.IFTTT_KEY;
  const event = process.env.IFTTT_EVENT;
  if (!key || !event) return { name: "Facebook", status: "skipped" };
  const r = await jsonFetch(`https://maker.ifttt.com/trigger/${event}/with/key/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value1: text, value2: imgUrl })
  });
  return { name: "Facebook", status: r.ok ? "posted" : `failed (${r.status})` };
}