/* AmzLoss YouTube automation — generates a short slideshow video from the
   latest daily blog post image and uploads it via the YouTube Data API v3.
   Runs after the daily blog post. Skips cleanly if secrets are missing.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BLOG_JS = path.join(ROOT, "js", "blog.js");
const BLOG_IMG_DIR = path.join(ROOT, "blogs", "img");
const VID_DIR = path.join(ROOT, "blogs", "video");
const BASE = "https://amzloss.com";
const RESULTS = [];

function readLatestPost() {
  const src = fs.readFileSync(BLOG_JS, "utf8");
  const m = src.match(/var POSTS = \[([\s\S]*?)\n  \];/);
  if (!m) throw new Error("POSTS array not found in js/blog.js");
  const re = /\{\s*cat:\s*"([^"]*)",\s*[^}]*?title:\s*"([^"]*)",\s*[^}]*?url:\s*"([^"]*)",\s*[^}]*?desc:\s*"([^"]*)"\s*\}/g;
  let hit, posts = [];
  while ((hit = re.exec(m[1]))) posts.push({ cat: hit[1], title: hit[2], url: hit[3], desc: hit[4] });
  const daily = posts.find((p) => p.url.includes("amzloss-daily-"));
  const post = daily || posts[0];
  if (!post) throw new Error("No blog posts found");
  return { ...post, full: BASE + "/" + post.url.replace(/^\/+/, "") };
}

function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "\u2026";
}

function makeVideo(imgFile, outFile, seconds) {
  if (!fs.existsSync(VID_DIR)) fs.mkdirSync(VID_DIR, { recursive: true });
  // Ken Burns-style subtle zoom on the 1200x630 image, output 1920x1080.
  const filter =
    "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080," +
    `zoompan=z='min(zoom+0.0008,1.08)':d=${Math.round(seconds * 30)}:s=1920x1080:fps=30,` +
    "format=yuv420p";
  const r = spawnSync("ffmpeg", [
    "-y", "-loop", "1", "-i", imgFile,
    "-vf", filter,
    "-t", String(seconds),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
    "-an",
    outFile
  ], { encoding: null, shell: false, timeout: 180000 });
  if (r.status !== 0) throw new Error("ffmpeg failed: " + (r.stderr ? r.stderr.toString().slice(-500) : "unknown"));
  return outFile;
}

function buildDescription(post) {
  return truncate(`${post.desc}\n\nRead the full article: ${post.full}\n\n#AmzLoss #AmazonAffiliate #AffiliateMarketing`, 5000);
}

async function getAccessToken() {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });
  const d = await r.json();
  if (!r.ok) throw new Error("token refresh failed: " + JSON.stringify(d).slice(0, 300));
  return d.access_token;
}

async function uploadVideo(token, title, description, file) {
  // Resumable upload: get the session URL, then PUT the file.
  const meta = JSON.stringify({
    snippet: {
      title: truncate(title, 100),
      description,
      categoryId: "28", // Science & Technology
      defaultLanguage: "en"
    },
    status: { privacyStatus: "public", selfDeclaredMadeForKids: false }
  });
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(fs.statSync(file).size)
    },
    body: meta
  });
  if (init.status !== 200) throw new Error("upload init failed: " + (await init.text()).slice(0, 300));
  const sessionUrl = init.headers.get("location");

  const put = await fetch(sessionUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: fs.readFileSync(file)
  });
  if (put.status !== 200 && put.status !== 201) throw new Error("upload failed: " + (await put.text()).slice(0, 400));
  return await put.json();
}

async function main() {
  const need = ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"];
  if (need.some((k) => !process.env[k])) {
    console.log("YOUTUBE=skipped (no YOUTUBE_* secrets)");
    console.log("YOUTUBE_DONE=1");
    process.exit(0);
  }
  const post = readLatestPost();
  const slug = post.url.replace(/\.html$/, "").split("/").pop();

  // Reuse the social image if it exists; otherwise generate one.
  let imgFile = path.join(BLOG_IMG_DIR, slug + ".jpg");
  if (!fs.existsSync(imgFile)) {
    // Generate a minimal image via the social-post generator output if present,
    // otherwise skip video. (Normal path: social-post already made the image.)
    console.log("YOUTUBE=skipped (no post image available)");
    console.log("YOUTUBE_DONE=1");
    process.exit(0);
  }

  const outFile = path.join(VID_DIR, slug + ".mp4");
  try {
    makeVideo(imgFile, outFile, 15);
  } catch (e) {
    console.log("YOUTUBE=video gen failed: " + e.message);
    console.log("YOUTUBE_DONE=1");
    process.exit(0);
  }

  try {
    const token = await getAccessToken();
    const video = await uploadVideo(token, post.title + " (AmzLoss)", buildDescription(post), outFile);
    RESULTS.push("YOUTUBE=https://youtu.be/" + video.id);
  } catch (e) {
    RESULTS.push("YOUTUBE=failed: " + e.message);
  }
  for (const line of RESULTS) console.log(line);
  console.log("YOUTUBE_DONE=1");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});