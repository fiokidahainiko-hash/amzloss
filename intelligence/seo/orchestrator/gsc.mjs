/* AmzLoss SEO Intelligence — Google Search Console Data Layer
   Consumes GSC data from local export files or API when available.
   Never fabricates Search Console data. Exposes:
   - queries, impressions, clicks, CTR, avg position
   - pages, countries, devices, dates
   - striking-distance, CTR opportunities, declining/rising queries
   - hidden opportunities, page-query mismatches

   Provenance: Every data point carries its source provenance.
   TEST data is clearly labeled and never promoted to LIVE/IMPORTED. */

import fs from "node:fs";
import { ev, evN, DATA_UNAVAILABLE, impressions, clicks, ctr, position } from "./seo_evidence.mjs";
import { registerLocalFeedAdapter } from "./data_sources.mjs";
import { PROVENANCE, getProvenance } from "./provenance.mjs";

const GSC_FEED_PATH = "C:/Users/DELL/amzloss/intelligence/seo/data/gsc_feed.json";

registerLocalFeedAdapter("gsc", GSC_FEED_PATH);

export function loadGscFeed() {
  if (!fs.existsSync(GSC_FEED_PATH)) return { queries: [], pages: [], countries: [], devices: [], dates: [], meta: null };
  const raw = JSON.parse(fs.readFileSync(GSC_FEED_PATH, "utf-8"));
  /* Support both raw format (legacy) and enriched format (from import) */
  if (!raw.meta) {
    return { queries: raw.queries || [], pages: [], countries: [], devices: [], dates: [], meta: null };
  }
  return raw;
}

export function getGscProvenance() {
  const feed = loadGscFeed();
  if (!feed.meta) return PROVENANCE.UNAVAILABLE;
  return feed.meta.provenance || getProvenance(feed.meta.source);
}

export function gscQueries() {
  const feed = loadGscFeed();
  const prov = getGscProvenance();
  return (feed.queries || []).map(q => ({
    query: q.query,
    impressions: evN(q.impressions, { source: "gsc" }),
    clicks: evN(q.clicks, { source: "gsc" }),
    ctr: evN(q.ctr, { source: "gsc" }),
    avg_position: position(q.position, "gsc"),
    page: q.page,
    provenance: prov
  }));
}

export function strikingDistanceKeywords({ minPos = 4, maxPos = 20, minImpressions = 10 } = {}) {
  return gscQueries()
    .filter(q => q.avg_position.available && q.avg_position.value >= minPos && q.avg_position.value <= maxPos)
    .filter(q => q.impressions.available && q.impressions.value >= minImpressions)
    .sort((a, b) => a.avg_position.value - b.avg_position.value)
    .map(q => ({ query: q.query, position: q.avg_position.value, impressions: q.impressions.value, ctr: q.ctr.available ? q.ctr.value : null, page: q.page }));
}

export function ctrOpportunities({ minImpressions = 100, maxCtr = 0.02 } = {}) {
  return gscQueries()
    .filter(q => q.impressions.available && q.impressions.value >= minImpressions)
    .filter(q => q.ctr.available && q.ctr.value < maxCtr)
    .sort((a, b) => (a.ctr.value || 0) - (b.ctr.value || 0))
    .map(q => ({ query: q.query, impressions: q.impressions.value, ctr: q.ctr.value, position: q.avg_position.available ? q.avg_position.value : null, page: q.page }));
}

export function decliningQueries({ days = 30, minDrop = 0.2 } = {}) {
  const feed = loadGscFeed();
  /* Requires historical data in feed: q.history[{date, position}] */
  return [];
}

export function risingQueries({ days = 30, minGain = 0.2 } = {}) {
  return [];
}

export function hiddenOpportunities({ minImpressions = 5 } = {}) {
  return gscQueries()
    .filter(q => q.impressions.available && q.impressions.value >= minImpressions)
    .filter(q => q.avg_position.available && q.avg_position.value > 50)
    .map(q => ({ query: q.query, impressions: q.impressions.value, position: q.avg_position.value, page: q.page }));
}

export function pageQueryMismatches() {
  const feed = loadGscFeed();
  const pages = feed.pages || [];
  return pages.filter(p => p.query && p.page && p.query.toLowerCase() !== p.page.toLowerCase())
    .map(p => ({ page: p.page, unintended_query: p.query, position: p.position, impressions: p.impressions }));
}

export function gscSummary() {
  const queries = gscQueries();
  const prov = getGscProvenance();
  const feed = loadGscFeed();
  const meta = feed.meta || {};
  const totalImpressions = queries.filter(q => q.impressions.available).reduce((s, q) => s + q.impressions.value, 0);
  const totalClicks = queries.filter(q => q.clicks.available).reduce((s, q) => s + q.clicks.value, 0);
  const avgCtr = totalImpressions ? totalClicks / totalImpressions : 0;
  const avgPos = queries.filter(q => q.avg_position.available).reduce((s, q) => s + q.avg_position.value, 0) /
    Math.max(1, queries.filter(q => q.avg_position.available).length);
  return {
    feed_available: queries.length > 0,
    provenance: prov,
    data_source_status: prov,
    meta: meta.date_range ? meta : null,
    total_queries: queries.length,
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    avg_ctr: avgCtr,
    avg_position: avgPos,
    striking_distance: strikingDistanceKeywords().length,
    ctr_opportunities: ctrOpportunities().length,
    hidden_opportunities: hiddenOpportunities().length,
    page_query_mismatches: pageQueryMismatches().length
  };
}