#!/usr/bin/env node
/* AmzLoss site checker — verifies every URL in sitemap.xml is live and has basic SEO meta. */
"use strict";

import https from "https";
import http from "http";

const BASE = process.env.SITE_BASE || "https://amzloss.com";
const USER_AGENT = "AmzLoss-SiteCheck/1.0";

function get(url, redirectsLeft) {
  return new Promise((resolve, reject) => {
    redirectsLeft = redirectsLeft === undefined ? 3 : redirectsLeft;
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, {
      headers: { "User-Agent": USER_AGENT, "Accept": "text/html" }
    }, (res) => {
      const status = res.statusCode;
      if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
        const next = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        res.resume();
        get(next, redirectsLeft - 1).then(resolve).catch(reject);
        return;
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { body += c; if (body.length > 200000) { body = body.slice(0, 200000); req.destroy(); } });
      res.on("end", () => resolve({ status, body }));
    });
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("timeout")));
  });
}

async function fetchSitemapUrls() {
  const res = await get(BASE + "/sitemap.xml", 0);
  if (res.status !== 200) throw new Error("sitemap.xml returned HTTP " + res.status);
  const urls = [...res.body.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  return urls
    .filter((u) => u.startsWith("https://amzloss.com/"))
    .map((u) => u.replace(/^https:\/\/amzloss\.com/, BASE));
}

function checkSeo(body, url) {
  const problems = [];
  if (!/<title>[^<]{10,75}<\/title>/.test(body)) problems.push("title missing or wrong length");
  if (!/name="description" content="[^"]{40,180}"/.test(body)) problems.push("meta description missing or wrong length");
  if (!/rel="canonical"/.test(body)) problems.push("canonical missing");
  if (!/property="og:title"/.test(body)) problems.push("og:title missing");
  if (!/property="og:description"/.test(body)) problems.push("og:description missing");
  if (!/property="og:image"/.test(body)) problems.push("og:image missing");
  const canon = body.match(/rel="canonical" href="([^"]*)"/);
  const strip = (s) => s.replace(/\/$/, "");
  if (BASE.indexOf("amzloss.com") !== -1 && canon && strip(canon[1]) !== strip(url)) problems.push("canonical mismatch: " + canon[1]);
  return problems;
}

async function main() {
  let urls;
  try {
    urls = await fetchSitemapUrls();
  } catch (e) {
    console.log("SITE_CHECK_RESULT=error");
    console.log("SITE_CHECK_DETAIL=" + e.message);
    process.exit(1);
  }
  if (!urls.length) {
    console.log("SITE_CHECK_RESULT=error");
    console.log("SITE_CHECK_DETAIL=no URLs found in sitemap");
    process.exit(1);
  }

  const failures = [];
  let ok = 0;
  const limit = parseInt(process.env.MAX_URLS || "200", 10);
  const batch = urls.slice(0, limit);

  for (const u of batch) {
    try {
      const res = await get(u, 0);
      if (res.status !== 200) {
        failures.push({ url: u, issue: "HTTP " + res.status });
      } else if (/name="robots" content="noindex/.test(res.body) || /<title>[^<]*404[^<]*<\/title>/i.test(res.body)) {
        // noindex pages (404, status, sponsor, audit-results) are exempt from SEO meta checks.
        ok++;
      } else {
        const seo = checkSeo(res.body, u);
        if (seo.length) failures.push({ url: u, issue: seo.join("; ") });
        else ok++;
      }
    } catch (e) {
      failures.push({ url: u, issue: "fetch error: " + e.message });
    }
  }

  console.log("SITE_CHECK_URLS=" + batch.length);
  console.log("SITE_CHECK_OK=" + ok);
  console.log("SITE_CHECK_FAILURES=" + failures.length);
  if (failures.length) {
    console.log("SITE_CHECK_RESULT=failure");
    console.log("SITE_CHECK_DETAIL=" + failures.map((f) => f.url + " -> " + f.issue).join(" | "));
    process.exit(2);
  }
  console.log("SITE_CHECK_RESULT=pass");
}

main().catch((e) => {
  console.log("SITE_CHECK_RESULT=error");
  console.log("SITE_CHECK_DETAIL=" + e.message);
  process.exit(1);
});