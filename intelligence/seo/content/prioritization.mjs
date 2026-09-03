/* AmzLoss SEO Intelligence — Explainable Priority Score (0-100)
   Every candidate action (existing-page improvement, new content gap,
   technical fix) gets a single 0-100 priority score and a full
   breakdown so a human can see WHY it scored that way.

   Signals are all site-derived (real). Weight model in config.mjs.
   Empty/unavailable signals renormalize — the score stays comparable. */

import { PRIORITY_WEIGHTS, verdictForScore } from "../config.mjs";

export function priorityScore(site, { slug = null, title = null, cluster = null, seo_quality = null, importance = null, inbound = null, technical_issues = 0, freshness = null, backlink_asset = null, patch = {} } = {}) {
  const article = slug ? site.articles.find(a => a.slug === slug) : null;
  const clusterName = cluster || article?.topic_cluster;

  const components = [];
  let total = 0;
  let weightSum = 0;

  const add = (name, value, weight, explanation) => {
    if (value === null || value === undefined) return;
    total += value * weight;
    weightSum += weight;
    components.push({ name, value, weight: Math.round(weight * 100) / 100, explanation });
  };

  // Business importance / strategic value
  const strat = clusterName ? (site.clusters[clusterName]?.strategic_value ?? 0.5) : 0.5;
  add("cluster_strategic_value", strat * 100, PRIORITY_WEIGHTS.cluster_strategic_value, `Cluster "${clusterName}" strategic value ${Math.round(strat * 100)}`);

  const forward = (name, value, weight, explanation) => {
    if (value === null || value === undefined) return;
    total += value * weight;
    weightSum += weight;
    components.push({ name, value, weight: Math.round(weight * 100) / 100, explanation });
  };

  // SEO quality (higher is better — improvement headroom shown separately)
  const quality = seo_quality ?? article?.seo_quality;
  forward("seo_quality", quality, PRIORITY_WEIGHTS.seo_quality, `Current SEO quality ${quality}/100`);

  // Importance
  const importanceVal = importance ?? article?.importance;
  if (importanceVal) {
    const impScore = importanceVal === "HIGH" ? 90 : importanceVal === "MEDIUM" ? 60 : importanceVal === "LOW" ? 35 : 20;
    forward("business_importance", impScore, PRIORITY_WEIGHTS.business_importance, `Page importance ${importanceVal}`);
  }

  // Inbound support (internal links)
  const inboundVal = inbound ?? article?.internal_inbound;
  if (inboundVal !== undefined) {
    const linkScore = Math.min(100, inboundVal * 25);
    forward("link_support", linkScore, PRIORITY_WEIGHTS.link_support, `${inboundVal} inbound internal links`);
  }

  // Technical health
  forward("technical_health", Math.max(0, 100 - technical_issues * 12), PRIORITY_WEIGHTS.technical_health, `${technical_issues} technical issues to fix`);

  // Freshness (null when unknown)
  if (freshness !== null && freshness !== undefined) {
    forward("freshness", freshness, PRIORITY_WEIGHTS.freshness, `Freshness score ${freshness}/100`);
  }

  // Backlink asset potential
  if (backlink_asset !== null && backlink_asset !== undefined) {
    forward("backlink_asset_potential", backlink_asset, PRIORITY_WEIGHTS.backlink_asset_potential, `Linkable-asset potential ${backlink_asset}/100`);
  }

  // Gap intent coverage (only relevant for new content; caller passes patch)
  if (patch.gap_intent_coverage !== undefined) {
    forward("gap_intent_coverage", patch.gap_intent_coverage, PRIORITY_WEIGHTS.gap_intent_coverage, pronunciation(patch.gap_intent_coverage));
  }

  const score = weightSum > 0 ? clamp(total / weightSum) : 0;
  const missingSignals = [];
  if (importanceVal === undefined || importanceVal === null || !importanceVal) missingSignals.push("business_importance");
  if (seo_quality === null && article?.seo_quality === undefined) missingSignals.push("seo_quality");

  return {
    slug,
    title: title || article?.title || slug,
    cluster: clusterName,
    score: Math.round(score),
    verdict: verdictForScore(score),
    is_publish_ready: score >= 90,
    requires_revision: score < 70,
    breakdown: components,
    missing_signals: missingSignals,
    reasoning: components.map(c => `${c.name}: ${c.value} (w=${c.weight})`).join("; ")
  };
}

function pronunciation(v) { return `New content addressing unserved intent coverage worth ${v}/100`; }

function clamp(x) { return Math.max(0, Math.min(100, x)); }

/* Rank a set of candidate sources (existing pages + gaps) by priority. */
export function rankByPriority(site, { pages = [], gaps = [] } = {}) {
  const scored = [];

  for (const p of pages) {
    scored.push(priorityScore(site, { slug: p.slug, title: p.title, cluster: p.cluster, seo_quality: p.seo_quality, importance: p.importance, inbound: p.inbound, technical_issues: p.technical_issues, freshness: p.freshness }));
  }
  for (const g of gaps) {
    scored.push(priorityScore(site, { slug: g.proposed_slug, title: g.topic, cluster: g.cluster, patch: { gap_intent_coverage: g.priority_score } }));
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}