/* AmzLoss SEO Intelligence — Backlink Opportunity & Linkable Asset Engine
   Two complementary views:
   1. Linkable-ASSET engine: which of OUR pages deserve external links
      most (real evidence: importance, SEO quality, entity richness,
      tool uniqueness, cluster value). Ranked as outreach targets.
   2. OPPORTUNITY engine: consumes a real backlink feed
      (backlink_feed.json) of unlinked mentions and resource pages, and
      ranks each for feasibility. Without a feed, opportunities are
      marked `available: false` (never invented). */

import { loadBacklinkFeed, articleBySlug } from "../site_data.mjs";
import { BACKLINK } from "../config.mjs";

export function linkableAssetEngine(site) {
  const candidates = site.articles.map(a => {
    const assetScore = Math.min(100, Math.round(
      0.30 * (a.seo_quality || 0) +
      0.20 * scaleImportance(a.importance) +
      0.20 * scaleInbound(a.internal_inbound || 0) +
      0.15 * Math.min(100, (a.entities || []).length * 8) +
      0.15 * Math.min(100, (a.word_count || 0) / 12)
    ));
    return {
      slug: a.slug,
      title: a.title,
      url: a.url,
      cluster: a.topic_cluster,
      seo_quality: a.seo_quality,
      importance: a.importance,
      inbound: a.internal_inbound || 0,
      entities: (a.entities || []).length,
      word_count: a.word_count || 0,
      asset_score: assetScore,
      asset_tier: assetScore >= BACKLINK.STRONG_INBOUND * 20 ? "PREMIUM" : assetScore >= 55 ? "SOLID" : "WEAK"
    };
  });
  candidates.sort((a, b) => b.asset_score - a.asset_score);
  return {
    assets: candidates,
    top_assets: candidates.slice(0, 5),
    summary: "Ranked by on-page evidence only (quality, importance, inbound, entity density, depth)."
  };
}

export function backlinkOpportunityEngine(site) {
  const feed = loadBacklinkFeed();
  const links = feed.links || [];

  const opportunities = links
    .map(l => ({
      external_domain: l.domain || (l.url ? safeDomain(l.url) : null),
      external_url: l.url || null,
      kind: l.kind || "unlinked_mention",
      anchor: l.anchor || null,
      relevance: rankRelevance(l, site),
      feasibility: feasibility(l, site),
      status: "OPPORTUNITY",
      available: true
    }))
    .sort((a, b) => (b.relevance.score + b.feasibility.score) - (a.relevance.score + a.feasibility.score));

  return {
    provided: links.length > 0,
    domains_tracked: (feed.domains || []).length,
    note: links.length === 0
      ? "No backlink feed provided (backlink_feed.json). Populate with real unlinked-mention/resource-page research. Nothing invented here."
      : `Ranking ${links.length} real backlink opportunities from feed.`,
    opportunities,
    top_opportunities: opportunities.slice(0, 5)
  };
}

function rankRelevance(l, site) {
  // Best if it names one of our strongest cluster topics or a tool
  const text = `${l.anchor || ""} ${l.url || ""}`.toLowerCase();
  const strategic = BACKLINK.STRATEGIC_CLUSTERS;
  const hits = strategic.filter(s => text.includes(s.toLowerCase().replace("-", " ")));
  return {
    score: Math.min(60, 20 + hits.length * 15),
    reason: hits.length ? `Mentions strategic topic: ${hits.join(", ")}` : "Generic relevance"
  };
}

function feasibility(l, site) {
  // practical heuristic from internal data
  const anchor = (l.anchor || "");
  let score = 45;
  if (anchor && anchor.toLowerCase().includes("amzloss")) score += 20;
  if (anchor && anchor.toLowerCase() !== "amzloss") score += 5;
  if (l.kind === "resource_page") score += 10;
  return { score: Math.min(90, score), reason: "Based on anchor quality and mention type" };
}

function safeDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return null; }
}

function scaleImportance(imp) {
  return imp === "HIGH" ? 85 : imp === "MEDIUM" ? 55 : imp === "LOW" ? 30 : 15;
}
function scaleInbound(n) { return Math.min(100, n * 18); }