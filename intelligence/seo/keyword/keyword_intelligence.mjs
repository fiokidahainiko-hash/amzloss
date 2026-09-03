/* AmzLoss SEO Intelligence — Keyword Intelligence Agent
   Aggregates the real keyword landscape for the site: every article's
   primary/secondary query, each cluster's coverage, and any researched
   keyword feed supplied by operators.

   Hard rule (spec): search volume / difficulty / CPC are NEVER fabricated.
   If the keyword research feed lacks a metric, the engine marks it
   `available: false` so downstream scoring can ignore it. */

import { loadKeywordFeed, loadSERPSnapshot, articleBySlug } from "../site_data.mjs";
import { SEARCH_INTENT_TYPES } from "../config.mjs";

/* Reuse the site audit intent classifier vocabulary. */
const INTENT_PATTERNS = [
  { intent: "how-to", re: /how|guide|step|walkthrough|tutorial/ },
  { intent: "informational", re: /what|explain|guide|rate|cause|why|drop|understand/ },
  { intent: "commercial", re: /compare|vs|versus|best|tools|networks|review|checker/ },
  { intent: "transactional", re: /calculator|audit|checker|submit|build|verify|tool/ },
  { intent: "problem", re: /missing|underpayment|gone|dropped|loss|cut|cannibalize/ }
];

export function detectSearchIntent(query) {
  const q = String(query || "").toLowerCase();
  for (const p of INTENT_PATTERNS) {
    if (p.re.test(q)) return p.intent;
  }
  return "informational";
}

/* Normalize a keyword row: merge feed metrics with site-derived facts,
   always tracking which fields are real vs unavailable. */
export function normalizeKeyword({ query, intent, source = "internal", volume = null, difficulty = null, cpc = null, cluster = null, matched_slug = null }) {
  const detectedIntent = intent || detectSearchIntent(query);
  const row = {
    query,
    normalized_query: query.toLowerCase().replace(/[^\w\s-]/g, "").trim(),
    intent: detectedIntent,
    intent_confidence: intent ? "provided" : "derived",
    source,
    cluster,
    matched_slug,
    metrics: {
      volume: { value: volume, available: volume !== null && volume !== undefined && volume !== "" },
      difficulty: { value: difficulty, available: difficulty !== null && difficulty !== undefined && difficulty !== "" },
      cpc: { value: cpc, available: cpc !== null && cpc !== undefined && cpc !== "" }
    }
  };
  return row;
}

/* Build the site keyword map from real articles. */
export function siteKeywordMap(site) {
  const keywords = [];
  const seen = new Set();

  for (const a of site.articles) {
    const merged = [
      { query: a.primary_query, intent: a.search_intent },
      ...(a.secondary_queries || []).map(q => ({ query: q, intent: detectSearchIntent(q) }))
    ];
    for (const { query, intent } of merged) {
      const key = query.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      keywords.push(normalizeKeyword({
        query, intent,
        source: "internal",
        cluster: a.topic_cluster,
        matched_slug: a.slug
      }));
    }
  }
  return keywords;
}

/* Add externally researched keywords (from feed). Never fabricates. */
export function researchedKeywords(site) {
  const feed = loadKeywordFeed();
  const rows = [];
  for (const kw of (feed.keywords || [])) {
    if (!kw.query) continue;
    rows.push(normalizeKeyword({
      query: kw.query,
      intent: kw.intent,
      source: "feed",
      volume: kw.volume ?? null,
      difficulty: kw.difficulty ?? null,
      cpc: kw.cpc ?? null,
      cluster: kw.cluster || null,
      matched_slug: kw.matched_slug || null
    }));
  }
  return rows;
}

/* Full keyword intelligence report. */
export function keywordIntelligence(site) {
  const internal = siteKeywordMap(site);
  const feed = researchedKeywords(site);
  const all = [...internal, ...feed];

  const intentCoverage = {};
  for (const k of all) intentCoverage[k.intent] = (intentCoverage[k.intent] || 0) + 1;

  // Group by cluster to show breadth
  const byCluster = {};
  for (const k of all) {
    const c = k.cluster || "unassigned";
    byCluster[c] = byCluster[c] || [];
    byCluster[c].push(k.query);
  }

  const volumeAvailable = all.filter(k => k.metrics.volume.available);

  return {
    total_keywords: all.length,
    internal_keywords: internal.length,
    researched_keywords: feed.length,
    search_volume_available: volumeAvailable.length,
    search_volume_unavailable: all.length - volumeAvailable.length,
    note: volumeAvailable.length === 0
      ? "No external keyword feed provided. Search volume/difficulty marked unavailable; all scoring uses site-derived signals only."
      : `Keyword research feed present with ${volumeAvailable.length} real volume entries.`,
    intent_coverage: intentCoverage,
    by_cluster: byCluster,
    keywords: all
  };
}

/* Keyword-to-content matching: is this query already covered?
   Returns the best matching article or null. */
export function matchKeywordToArticle(site, query) {
  const q = String(query || "").toLowerCase().replace(/[^\w\s-]/g, "");
  let best = null;
  let bestScore = 0;
  for (const a of site.articles) {
    const candidateTerms = [a.primary_query, ...(a.secondary_queries || []), a.title, a.slug.replace(/-/g, " ")]
      .join(" ").toLowerCase();
    let score = 0;
    for (const word of q.split(/\s+/)) {
      if (word.length < 4) continue;
      if (candidateTerms.includes(word)) score++;
    }
    if (score > bestScore) { bestScore = score; best = a; }
  }
  const seo_quality = bestScore === 0 ? 0 : Math.min(95, 30 + bestScore * 15);
  return {
    covered: bestScore >= 1,
    score: bestScore,
    seo_quality,
    article: best ? { slug: best.slug, title: best.title, seo_quality } : null
  };
}