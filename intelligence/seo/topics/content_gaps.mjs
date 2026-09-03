/* AmzLoss SEO Intelligence — Content Gap Engine
   Finds genuine gaps: intent clusters that the site cannot currently
   satisfy with its real content. A "gap" exists only when the required
   primary intent for a topic is NOT already covered by a member article.

   Discipline (spec): do NOT create pages when an existing page already
   satisfies the same intent. Gaps are scored and ranked so the team
   knows the single highest-value gap. */

import { clusterIntentCoverage } from "../keyword/search_intent.mjs";
import { clusterAuthorityScore } from "./topical_authority.mjs";
import { verdictForScore } from "../config.mjs";
import { matchKeywordToArticle } from "../keyword/keyword_intelligence.mjs";

export const GAP_INTENT_TEMPLATES = [
  { intent: "informational", pattern: /(how|what|why|guide|explain)/i, label: "Core explainer" },
  { intent: "commercial", pattern: /(compare|vs|best|top|2026|rates|networks)/i, label: "Commercial comparison" },
  { intent: "transactional", pattern: /(calculator|audit|checker|tool|submit|verify)/i, label: "Transactional tool need" },
  { intent: "how-to", pattern: /(how to|step|walkthrough|tutorial)/i, label: "How-to / walkthrough" },
  { intent: "problem", pattern: /(missing|underpayment|loss|cut|dropped)/i, label: "Diagnostic / problem" }
];

/* Evaluate a proposed gap topic against existing coverage. */
export function evaluateGap(site, { topic, intent = null, cluster = null, proposed_slug }) {
  const clusterName = cluster || (proposed_slug ? site.articles.find(a => a.slug === proposed_slug)?.topic_cluster : null);
  const clusterReport = clusterName ? clusterIntentCoverage(site, clusterName) : null;

  // If the topic's target intent is already satisfied in this cluster -> NOT a gap
  const match = matchKeywordToArticle(site, topic);
  const intentCovered = clusterReport && intent && clusterReport.covered_intents.some(c => c.intent === intent);

  const authority = clusterName ? clusterAuthorityScore(site, clusterName) : null;
  const clusterStrategic = authority?.strategic_importance ?? 50;
  const clusterAuthority = authority?.score ?? 0;
  const authoritativeCluster = authority?.tier === "LEADING" || authority?.tier === "GROWING";

  const isGenuineGap = !match.covered && !intentCovered;
  let score = 0;
  let components = [];

  if (isGenuineGap) {
    // Base: cluster value
    const base = 0.3 * clusterStrategic + 0.3 * clusterAuthority + 25;
    score = base;
    components.push({ name: "cluster_value", score: Math.round(base), explanation: `Cluster "${clusterName || "n/a"}" worth ${clusterStrategic}/100 strategic value, ${clusterAuthority}/100 authority` });
    // Intent coverage boost: gap in a highly-covered SERP but missing intent is valuable
    if (clusterReport && intent) {
      const missingValuable = ["commercial", "transactional", "problem"].includes(intent);
      if (missingValuable) { score += 12; components.push({ name: "intent_value", score: 12, explanation: `Missing "${intent}" intent conversion page in ${clusterName}` }); }
    }
    score = Math.min(100, score);
  }

  return {
    topic,
    intent,
    proposed_slug,
    cluster: clusterName,
    genuine_gap: isGenuineGap,
    covered_by: match.article,
    intent_already_covered: intentCovered,
    cluster_authority: authoritativeCluster ? clusterAuthority : clusterAuthority,
    verdict: isGenuineGap ? "NEW_CONTENT_GAP" : "ALREADY_COVERED",
    priority_score: Math.round(score),
    descriptor: isGenuineGap
      ? `Gap: "${topic}" needs "${intent || "informational"}" intent coverage in cluster "${clusterName || "unassigned"}".`
      : `"${topic}" is covered by "${match.article?.title || "existing page"}" — do not create a duplicate page.`,
    components
  };
}

/* Full discovery of genuine content gaps per cluster. */
export function contentGapAnalysis(site) {
  const clusters = Object.keys(site.clusters);
  const gaps = [];
  const ignored = [];

  for (const clusterName of clusters) {
    const coverage = clusterIntentCoverage(site, clusterName);
    const clusterConfig = site.clusterPillars[clusterName];

    // Intent gaps derived from cluster structure
    for (const intentDef of GAP_INTENT_TEMPLATES) {
      if (!coverage.missing_intents.includes(intentDef.intent) && clusterConfig) continue;
      const topicHint = `${clusterName} ${intentDef.label}`;
      const existing = matchKeywordToArticle(site, topicHint);
      // Even informational intent on pillar topic may be covered by pillar page itself
      if (existing.covered && (clusterConfig?.pillar === existing.article.slug)) continue;
      const gap = evaluateGap(site, { topic: topicHint, intent: intentDef.intent, cluster: clusterName });
      if (gap.genuine_gap) gaps.push(gap); else ignored.push(gap);
    }
  }

  gaps.sort((a, b) => b.priority_score - a.priority_score);
  return {
    gaps,
    ignored: ignored.filter(g => g.covered_by),
    total_gaps: gaps.length,
    total_ignored: ignored.filter(g => g.covered_by).length,
    top_gap: gaps[0] || null,
    note: "Only genuine gaps reported: no page already satisfies the same intent for the same cluster."
  };
}

/* Scoring: the single best gap, ready for blueprint flow. */
export function bestGap(site) {
  const analysis = contentGapAnalysis(site);
  return analysis.top_gap;
}