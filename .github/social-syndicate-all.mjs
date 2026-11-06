/* AmzLoss social syndication runner
   Loops over every blog post slug in js/blog.js that is NOT an amzloss-daily-*
   entry and runs .github/social-post.mjs --slug=<slug> for each, so a batch of
   curated posts (like the 10 SEO-orchestrated articles) is shared across all
   configured platforms, not just the newest daily entry.

   Usage:  node .github/social-syndicate-all.mjs [--limit=N]
   Env:   inherits the platform secrets already required by social-post.mjs.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BLOG_JS = path.join(ROOT, "js", "blog.js");

const src = fs.readFileSync(BLOG_JS, "utf8");
const m = src.match(/var POSTS = \[([\s\S]*?)\n  \];/);
if (!m) throw new Error("POSTS array not found in js/blog.js");
const re = /\{\s*cat:\s*"([^"]*)",\s*[^}]*?url:\s*"([^"]*)",\s*[^}]*?\}/g;
const slugs = [];
let hit;
while ((hit = re.exec(m[1]))) {
  const url = hit[2];
  if (!url.includes("amzloss-daily-") && !url.includes("img/")) {
    const slug = url.replace(/\.html$/, "").replace(/^blogs\//, "");
    if (!slugs.includes(slug)) slugs.push(slug);
  }
}

const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : slugs.length;
const targets = slugs.slice(0, limit);
console.log(`[SYNDICATE] Sharing ${targets.length} curated posts`);

let posted = 0;
let skipped = 0;
for (const slug of targets) {
  const res = spawnSync(process.execPath, ["social-post.mjs", `--slug=${slug}`], {
    cwd: __dirname, env: process.env, encoding: "utf8", timeout: 900000,
  });
  const out = (res.stdout || "") + (res.stderr || "");
  const lines = out.split("\n").filter((l) => /^SOCIAL_|^POST_URL=|SOCIAL_DONE/.test(l));
  const socialLines = lines.filter((l) => l.startsWith("SOCIAL_") && l !== "SOCIAL_DONE=1");
  const ok = socialLines.filter((l) => /posted/.test(l)).length;
  const skip = socialLines.filter((l) => /skipped/.test(l)).length;
  posted += ok;
  skipped += skip;
  console.log(`  ${slug}: ${ok} posted, ${skip} skipped`);
}

console.log(`[SYNDICATE] DONE — ${posted} platform posts, ${skipped} skipped (missing secrets)`);