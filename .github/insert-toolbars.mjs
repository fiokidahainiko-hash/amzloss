/* AmzLoss — insert the "Free tool" toolbar above each blog article.
   Idempotent: skips files that already have a tools-bar. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { POST_TOOL, toolbarHTML } from "./blog-tools.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOGS_DIR = path.join(__dirname, "..", "blogs");

let inserted = 0;
let skipped = 0;

for (const file of Object.keys(POST_TOOL)) {
  const fp = path.join(BLOGS_DIR, file);
  if (!fs.existsSync(fp)) {
    console.log("MISSING " + file);
    continue;
  }
  let html = fs.readFileSync(fp, "utf8");
  if (html.includes('class="tools-bar"')) {
    skipped++;
    continue;
  }
  const bar = toolbarHTML(POST_TOOL[file]);
  const idx = html.indexOf("</h1>");
  if (idx === -1) {
    console.log("NO H1 in " + file);
    continue;
  }
  const insertAt = html.indexOf("\n", idx) + 1;
  html = html.slice(0, insertAt) + "\n  " + bar + "\n" + html.slice(insertAt);
  fs.writeFileSync(fp, html);
  inserted++;
}

console.log("inserted=" + inserted + " skipped=" + skipped);