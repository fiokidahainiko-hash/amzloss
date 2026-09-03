/* AmzLoss SEO Intelligence — SERP Analysis Engine
   SERP intelligence is derived from two things only:
   1. A real SERP snapshot feed (serp_snapshot.json) filled by operators
      from a real rank-tracker/SERP tool.
   2. Site-internal coverage evidence.

   NEVER fabricated: estimated rankings, impressions, or CTR without a
   feed row. Every SERP observation exposes its `source` so downstream
   code can decide whether it is trustworthy enough to act on. */

import { loadSERPSnapshot } from "../site_data.mjs";
import { detectSearchIntent } from "./keyword_intelligence.mjs";

export function normalizeSERPObservation(obs) {
  const o = {
    query: obs.query,
    intent: obs.intent || detectSearchIntent(obs.query),
    source: "feed",
    features: Array.isArray(obs.features) ? obs.features : [],
    competitors: Array.isArray(obs.top_pages) ? obs.top_pages : [],
    our_rank: obs.our_rank ?? null,
    our_url: obs.our_url ?? null
  };
  return {
    ...o,
    rank_available: o.our_rank !== null && o.our_rank !== undefined,
    ranking_url: o.our_rank ? { rank: o.our_rank, url: o.our_url || "unknown" } : null,
    competitor_domains: [...new Set(o.competitors.map(c => c.domain || extractDomain(c.url)))].filter(Boolean)
  };
}

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return null; }
}

/* Real observed SERP snapshots (from feed). */
export function SERPSnapshots(site) {
  const feed = loadSERPSnapshot();
  const rows = (feed.queries || []).map(normalizeSERPObservation);
  return {
    provided: rows.length > 0,
    note: rows.length === 0
      ? "No SERP snapshot feed provided (serp_snapshot.json). Feed it from a real rank tracker; rankings are never fabricated."
      : `SERP feed provided for ${rows.length} queries.`,
    queries: rows,
    rank_measurements: rows.filter(r => r.rank_available),
    uncovered_rank_positions: rows.filter(r => !r.rank_available && r.our_url)
  };
}

/* Opportunity structure per SERP query — a "clickable" opportunity list. */
export function analyzeSERPOpportunities(site) {
  const snap = SERPSnapshots(site);
  const opportunities = snap.queries.map(q => {
    const intentHint = {
      has_people_also_ask: (q.features || []).some(f => /people also ask|pAA|related questions/i.test(f)),
      has_featured_snippet: (q.features || []).some(f => /featured snippet|answer box/i.test(f)),
      has_video: (q.features || []).some(f => /video/i.test(f)),
      has_sitelinks: (q.features || []).some(f => /sitelink/i.test(f)),
      has_image_pack: (q.features || []).some(f => /image/i.test(f)),
      has_review_stars: (q.features || []).some(f => /review|stars/i.test(f))
    };
    const gap = computeSERPGap(q, site);
    return {
      query: q.query,
      intent: q.intent,
      rank: q.our_rank ?? null,
      rank_available: q.rank_available,
      serp_features: q.features,
      feature_hints: intentHint,
      gap_for_site: gap
    };
  });
  const withRanks = opportunities.filter(o => o.rank_available);
  const noRanks = opportunities.filter(o => !o.rank_available);
  return {
    snapshots: snap,
    opportunities,
    ranked_queries: [...withRanks].sort((a, b) => a.rank - b.rank),
    unranked_queries: noRanks,
    ranked_count: withRanks.length,
    unranked_count: noRanks.length,
    note: snap.note
  };
}

/* Which SERP features could our existing content plausibly compete for,
   derived strictly from our on-page evidence (no fabricated metrics). */
function computeSERPGap(q, site) {
  const matched = matchQueryToArticle(site, q.query);
  if (!matched) {
    return {
      message: "No existing article targets this query.",
      can_target_them: true,
      competing_for_features: [],
      notes: "New intent coverage required before targeting the SERP."
    };
  }
  const a = matched;
  const possible = [];
  if (a.has_faq) possible.push({ feature: "People Also Ask / FAQ rich result", evidence: "FAQ section present on page" });
  if (a.has_images) possible.push({ feature: "Image pack", evidence: "Images present on page" });
  if (a.word_count >= 1200 && !a.orphan) possible.push({ feature: "Sitelinks (secondary)", evidence: "Substantial indexed content + internal structure" });
  const denied = [];
  if (!a.has_jsonld) denied.push({ feature: "Review stars (missing JSON-LD schema)" });
  if (!a.has_faq) denied.push({ feature: "PAA eligibility (no FAQ block)" });

  return {
    message: `Existing article "${a.slug}" can compete for this query.`,
    can_target_them: true,
    matching_article: a.slug,
    competing_for_features: possible,
    blocked_features: denied,
    notes: "Feature eligibility from on-page signal only."
  };
}

function matchQueryToArticle(site, query) {
  const q = String(query || "").toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const a of site.articles) {
    const hay = [a.primary_query, ...(a.secondary_queries || []), a.title].join(" ").toLowerCase();
    let score = 0;
    for (const term of q.split(/\s+/)) if (term.length > 3 && hay.includes(term)) score++;
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return bestScore >= 1 ? best : null;
}

/* Summary used by the dashboard. */
export function serpSummary(site) {
  const s = analyzeSERPOpportunities(site);
  return {
    provided: s.snapshots.provided,
    queries_total: s.snapshots.queries.length,
    queries_with_rank: s.ranked_count,
    queries_without_rank: s.unranked_count,
    note: s.note
  };
}