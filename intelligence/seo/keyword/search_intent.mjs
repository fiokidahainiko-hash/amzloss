/* AmzLoss SEO Intelligence — Search Intent Engine
   Classifies intent at multiple levels (page, query, cluster) using the
   site's own SEO rules vocabulary (informational / commercial /
   transactional + operational how-to & problem intents used by the audit).

   Intent is a governance tool: two pages sharing a primary SERP but
   differing in intent can coexist; duplicate intent with duplicate
   primary query is cannibalization. */

import { detectSearchIntent } from "./keyword_intelligence.mjs";
import { SEARCH_INTENT_TYPES } from "../config.mjs";

export const INTENT_DEFINITIONS = {
  informational: {
    label: "Informational",
    description: "User wants to learn, understand, or troubleshoot.",
    content_formats: ["Guides", "calculators", "explainer blogs", "FAQ sections"],
    cta: "Try our free tool / Read related guides"
  },
  commercial: {
    label: "Commercial Investigation",
    description: "User compares affiliate networks, tools, or rates before committing.",
    content_formats: ["Comparison tables", "pros/cons lists", "rate benchmarks", "ROI calculators"],
    cta: "Calculate your exact loss / Compare network payouts"
  },
  transactional: {
    label: "Transactional",
    description: "User wants to run an audit, build links, or calculate specific figures now.",
    content_formats: ["Interactive calculators", "URL submitters", "directory listing forms"],
    cta: "Run audit now / Submit link"
  },
  "how-to": {
    label: "How-to",
    description: "User wants step-by-step instructions to accomplish a task.",
    content_formats: ["Step-by-step walkthroughs", "tutorials", "procedure guides"],
    cta: "Run audit now / Follow the guide"
  },
  problem: {
    label: "Problem / Diagnostic",
    description: "User is investigating an anomaly (missing commission, underpayment, dropped income).",
    content_formats: ["Diagnostic explainers", "troubleshooting", "cause-and-effect analyses"],
    cta: "Run audit now / Check your report"
  }
};

export function intentDefinition(intent) {
  return INTENT_DEFINITIONS[intent] || INTENT_DEFINITIONS.informational;
}

/* Page-level intent (uses source of truth when present in audit). */
export function pageIntent(site, slug) {
  const a = site.articles.find(x => x.slug === slug);
  if (!a) return { intent: null, definition: null };
  return { intent: a.search_intent, definition: INTENT_DEFINITIONS[a.search_intent] || null, article: slug };
}

/* Site-wide intent distribution + coverage for every cluster. */
export function searchIntentAnalysis(site) {
  const clusters = Object.keys(site.clusters).map(c => clusterIntentCoverage(site, c));
  const intentDistribution = {};
  for (const a of site.articles) {
    const i = a.search_intent || "informational";
    intentDistribution[i] = (intentDistribution[i] || 0) + 1;
  }
  return {
    page_intent_distribution: intentDistribution,
    cluster_intent_coverage: clusters,
    note: "Intent is a governance signal: distinct intent can coexist on the same SERP; duplicate intent + duplicate primary query = cannibalization."
  };
}

/* Cluster intent coverage: which intents are satisfied by members. */
export function clusterIntentCoverage(site, clusterName) {
  const members = (site.clusters[clusterName]?.articles || []).map(slug => site.articles.find(a => a.slug === slug)).filter(Boolean);
  const intents = {};
  for (const m of members) intents[m.search_intent] = (intents[m.search_intent] || 0) + 1;
  const covered = Object.keys(intents)
    .map(i => ({ intent: i, count: intents[i], definition: INTENT_DEFINITIONS[i] || null }))
    .sort((a, b) => b.count - a.count);

  return {
    cluster: clusterName,
    total_members: members.length,
    intent_distribution: intents,
    covered_intents: covered,
    missing_intents: SEARCH_INTENT_TYPES.filter(i => !intents[i]),
    has_pillar: !!(site.clusters[clusterName]?.pillar),
    pillar_intent: site.clusters[clusterName]?.pillar
      ? (site.articles.find(a => a.slug === site.clusters[clusterName].pillar)?.search_intent || null)
      : null
  };
}

/* Sentence-level intent of a proposed topic (used by blueprint + gaps). */
export function classifyIntent(query, { compare = null } = {}) {
  const detected = detectSearchIntent(query);
  return {
    query,
    intent: detected,
    definition: INTENT_DEFINITIONS[detected],
    conflicts_with: compare ? detectSearchIntent(compare) : null,
    intent_matches: compare ? detected === detectSearchIntent(compare) : true
  };
}