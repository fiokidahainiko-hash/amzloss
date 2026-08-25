/* AmzLoss - TikTok publisher via the official Content Posting API v2.
   Posts the daily tool explainer as a photo-mode DIRECT_POST.
   Privacy: defaults to SELF_ONLY until the developer app passes audit;
   set TIKTOK_PRIVACY=PUBLIC_TO_EVERYONE once approved.
   Auth: TIKTOK_ACCESS_TOKEN (+ auto-refresh via TIKTOK_REFRESH_TOKEN,
   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET). Refresh tokens do not
   rotate, so no server-side storage is needed. */
import fs from "node:fs";

const API = "https://open.tiktokapis.com/v2";

const TITLE = process.env.TIKTOK_TITLE || "Free affiliate tools";
const DESC = process.env.TIKTOK_DESC || "";
const LINK = process.env.TIKTOK_LINK || "https://amzloss.com";
const IMAGE_URL = process.env.TIKTOK_IMAGE_URL || "";
const PRIVACY = process.env.TIKTOK_PRIVACY || "SELF_ONLY";
const DRAFT = process.env.TIKTOK_DRAFT === "1";

function fail(msg) { console.log("TIKTOK_RESULT=failed (" + msg + ")"); process.exit(0); }

if (!process.env.TIKTOK_ACCESS_TOKEN && !process.env.TIKTOK_REFRESH_TOKEN)
  fail("no credentials configured");
if (!IMAGE_URL) fail("no image url");

let token = process.env.TIKTOK_ACCESS_TOKEN || "";

async function refreshToken() {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: process.env.TIKTOK_REFRESH_TOKEN,
    client_key: process.env.TIKTOK_CLIENT_KEY,
    client_secret: process.env.TIKTOK_CLIENT_SECRET,
  });
  const r = await fetch(API.replace("/v2", "") + "/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("refresh failed: " + JSON.stringify(j).slice(0, 200));
  console.log("TIKTOK_REFRESHED=1");
  return j.access_token;
}

async function api(pathname, payload) {
  return fetch(API + pathname, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(payload),
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));
}

async function publish() {
  const title = (TITLE + (DESC ? " - " + DESC : "")).slice(0, 90);
  const init = await api("/post/publish/content/init/", {
    post_info: {
      title,
      description: LINK,
      disable_comment: false,
      disable_duet: false,
      disable_stitch: false,
      video_cover_timestamp_ms: 0, // n/a for photo but tolerated
      privacy_level: PRIVACY,
      auto_add_music: false,
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
      photo_images: [{ download_url: IMAGE_URL }],
      photo_cover_index: 0,
    },
    source_info: { source: "PULL_FROM_URL" },
  });

  const d = init.json?.data || {};
  if (!d.publish_id) {
    const err = JSON.stringify(init.json?.error || init.json).slice(0, 300);
    throw new Error("init " + init.status + ": " + err);
  }

  // poll up to ~60s
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await api("/post/publish/status/fetch/", { publish_id: d.publish_id });
    const s = st.json?.data?.status || "";
    if (s === "PUBLISH_COMPLETE") return "published";
    if (s === "FAILED" || st.json?.error?.code === "ok_error") throw new Error("status " + s);
  }
  return "queued";
}

try {
  let out;
  try {
    out = await publish();
  } catch (e) {
    if (/access.?token|403|401/i.test(e.message) && process.env.TIKTOK_REFRESH_TOKEN) {
      token = await refreshToken();
      out = await publish();
    } else throw e;
  }
  console.log("TIKTOK_RESULT=" + out);
} catch (e) {
  console.log("TIKTOK_ERROR=" + String(e.message).slice(0, 300));
  console.log("TIKTOK_RESULT=failed");
}
