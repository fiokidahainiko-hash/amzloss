/* AmzLoss SEO Intelligence — Rank Tracking Layer
   Stores and analyzes keyword rankings over time.
   Never fabricates ranking data. Requires real feed or API. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ev, DATA_UNAVAILABLE, position } from "./seo_evidence.mjs";
import { registerLocalFeedAdapter } from "./data_sources.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DATA_DIR = path.join(__dirname, "../data/");
const RANK_FEED_PATH = path.join(DATA_DIR, "rank_tracking.json");

registerLocalFeedAdapter("rank_tracking", RANK_FEED_PATH);

export function loadRankFeed() {
  if (!fs.existsSync(RANK_FEED_PATH)) return { rankings: [], history: [] };
  return JSON.parse(fs.readFileSync(RANK_FEED_PATH, "utf-8"));
}

export function currentRankings() {
  const feed = loadRankFeed();
  return (feed.rankings || []).map(r => ({
    keyword: r.keyword,
    url: r.url,
    position: position(r.position, r.source || "rank_tracker", { geo: r.geo, device: r.device }),
    serp_features: r.serp_features || [],
    country: r.country || "US",
    device: r.device || "desktop",
    date: r.date || new Date().toISOString().split("T")[0]
  }));
}

export function pageOneOpportunities() {
  return currentRankings().filter(r => r.position.available && r.position.value <= 10);
}

export function featuredSnippetOpportunities() {
  return currentRankings().filter(r => r.serp_features.includes("featured_snippet"));
}

export function urlSwitching() {
  const history = loadRankFeed().history || [];
  const byKeyword = {};
  for (const h of history) {
    if (!byKeyword[h.keyword]) byKeyword[h.keyword] = [];
    byKeyword[h.keyword].push(h);
  }
  return Object.entries(byKeyword)
    .filter(([, h]) => {
      const urls = new Set(h.map(x => x.url));
      return urls.size > 1;
    })
    .map(([keyword, h]) => ({ keyword, urls: [...new Set(h.map(x => x.url))], positions: h.map(x => x.position) }));
}

export function cannibalizationFromRankings() {
  const rankings = currentRankings();
  const byKeyword = {};
  for (const r of rankings) {
    if (!byKeyword[r.keyword]) byKeyword[r.keyword] = [];
    byKeyword[r.keyword].push(r);
  }
  return Object.entries(byKeyword)
    .filter(([, arr]) => arr.length > 1)
    .map(([keyword, arr]) => ({ keyword, pages: arr.map(a => ({ url: a.url, position: a.position.value })) }));
}

export function rankingChanges({ days = 7 } = {}) {
  const feed = loadRankFeed();
  const history = feed.history || [];
  const cutoff = Date.now() - days * 86400000;
  return history.filter(h => new Date(h.date).getTime() >= cutoff)
    .map(h => ({ keyword: h.keyword, url: h.url, position: h.position, change: h.change }));
}

export function rankSummary() {
  const rankings = currentRankings();
  const total = rankings.length;
  const ranked = rankings.filter(r => r.position.available);
  const pageOne = ranked.filter(r => r.position.value <= 10).length;
  const topThree = ranked.filter(r => r.position.value <= 3).length;
  const avgPos = ranked.length ? ranked.reduce((s, r) => s + r.position.value, 0) / ranked.length : 0;
  return {
    feed_available: total > 0,
    total_tracked: total,
    ranked_keywords: ranked.length,
    page_one: pageOne,
    top_three: topThree,
    avg_position: avgPos,
    url_switching_cases: urlSwitching().length,
    cannibalization_cases: cannibalizationFromRankings().length
  };
}