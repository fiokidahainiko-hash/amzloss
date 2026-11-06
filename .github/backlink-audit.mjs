/* AmzLoss — weekly backlink audit.
   Runs in CI (or locally) to verify every site in the backlink directory
   still contains a link back to AmzLoss. Sites that are fetchable but no
   longer link back are removed from the curated LIST and their domain is
   added to AMZLOSS_REMOVED so the directory page filters them out.

   Outputs .github/backlink-audit-report.json and a human summary on stdout.
   Exits 0 always; the workflow decides whether to commit / open an issue. */

import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIRECTORY_FILE = path.join(__dirname, "..", "js", "directory.js");
const REPORT_FILE = path.join(__dirname, "backlink-audit-report.json");

const NEEDLE = "amzloss.com";
const TIMEOUT_MS = 25000;
const MAX_BYTES = 2 * 1024 * 1024;
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0"
];

function readDirectoryFile() {
  const src = fs.readFileSync(DIRECTORY_FILE, "utf8");
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: "directory.js" });
  const win = sandbox.window;
  return {
    LIST: (win.AMZLOSS_DIRECTORY && win.AMZLOSS_DIRECTORY.LIST) || [],
    REMOVED: win.AMZLOSS_REMOVED || [],
    FORM_ENDPOINT: win.AMZLOSS_FORM_ENDPOINT || ""
  };
}

async function fetchText(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENTS[attempt % USER_AGENTS.length],
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8"
        }
      });
      const buf = Buffer.from(await res.arrayBuffer());
      const text = buf.slice(0, MAX_BYTES).toString("utf8");
      clearTimeout(timer);
      return { ok: true, status: res.status, text };
    } catch (err) {
      clearTimeout(timer);
      if (attempt === 2) return { ok: false, error: String(err && err.message || err) };
    }
  }
  return { ok: false, error: "unknown" };
}

async function fetchVerifiedSites(endpoint) {
  if (!endpoint) return [];
  try {
    const res = await fetch(endpoint + "?action=list", { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data && data.ok && Array.isArray(data.sites)) ? data.sites : [];
  } catch (err) {
    return [];
  }
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
}

function normalizeUrl(url) {
  let u = String(url || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

async function main() {
  const dir = readDirectoryFile();
  const verified = await fetchVerifiedSites(dir.FORM_ENDPOINT);

  const sites = [];
  const seen = new Set();
  dir.LIST.forEach((s) => {
    const url = normalizeUrl(s.url || s.site);
    if (!url) return;
    const key = hostOf(url);
    if (!key || seen.has(key)) return;
    seen.add(key);
    sites.push({ name: s.name || s.site || url, url, source: "curated" });
  });
  verified.forEach((s) => {
    const url = normalizeUrl(s.url);
    if (!url) return;
    const key = hostOf(url);
    if (!key || seen.has(key)) return;
    seen.add(key);
    sites.push({ name: s.name || s.site || url, url, source: "verified" });
  });

  const removedHosts = new Set();
  const unfetchable = [];
  const details = [];

  for (const site of sites) {
    const r = await fetchText(site.url);
    if (!r.ok) {
      unfetchable.push({ name: site.name, url: site.url, error: r.error });
      details.push({ name: site.name, url: site.url, status: "unfetchable" });
      continue;
    }
    const found = r.text.toLowerCase().includes(NEEDLE);
    const host = hostOf(site.url);
    if (!found) {
      if (host) removedHosts.add(host);
      details.push({ name: site.name, url: site.url, status: "no-link" });
    } else {
      details.push({ name: site.name, url: site.url, status: "ok" });
    }
  }

  const newRemoved = [...dir.REMOVED, ...removedHosts].filter(Boolean);
  const uniqueRemoved = [...new Set(newRemoved)];

  const report = {
    generatedAt: new Date().toISOString(),
    checked: sites.length,
    ok: details.filter((d) => d.status === "ok").length,
    removed: removedHosts.size,
    unfetchable: unfetchable.length,
    removedDomains: [...removedHosts],
    details
  };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  console.log("BACKLINK_AUDIT_CHECKED=" + report.checked);
  console.log("BACKLINK_AUDIT_OK=" + report.ok);
  console.log("BACKLINK_AUDIT_REMOVED=" + report.removed);
  console.log("BACKLINK_AUDIT_UNFETCHABLE=" + report.unfetchable);
  if (report.removedDomains.length) {
    console.log("BACKLINK_AUDIT_REMOVED_DOMAINS=" + report.removedDomains.join(","));
  }

  if (report.removed > 0) {
    const kept = dir.LIST.filter((s) => !removedHosts.has(hostOf(s.url || s.site || "")));
    const listBlock = "  LIST: [\n" + kept.map((s) => {
      const out = [];
      out.push("    {");
      out.push('      name: ' + JSON.stringify(s.name || s.site || ""));
      out.push('      url: ' + JSON.stringify(s.url || s.site || ""));
      out.push('      category: ' + JSON.stringify(s.category || s.cat || ""));
      out.push('      description: ' + JSON.stringify(s.description || s.desc || ""));
      out.push("    }");
      return out.join("\n");
    }).join(",\n") + "\n  ]";

    let src = fs.readFileSync(DIRECTORY_FILE, "utf8");
    src = src.replace(/  LIST: \[[\s\S]*?\n  \]/, listBlock);
    if (/window\.AMZLOSS_REMOVED/.test(src)) {
      src = src.replace(/window\.AMZLOSS_REMOVED\s*=\s*\[[\s\S]*?\];/, "window.AMZLOSS_REMOVED = " + JSON.stringify(uniqueRemoved) + ";");
    } else {
      src = src.replace(/window\.AMZLOSS_FORM_ENDPOINT/, "window.AMZLOSS_REMOVED = " + JSON.stringify(uniqueRemoved) + ";\nwindow.AMZLOSS_FORM_ENDPOINT");
    }
    fs.writeFileSync(DIRECTORY_FILE, src);
    console.log("BACKLINK_AUDIT_CHANGED=1");
  } else {
    console.log("BACKLINK_AUDIT_CHANGED=0");
  }
}

main().catch((err) => {
  console.error("backlink-audit failed:", err);
  process.exit(1);
});