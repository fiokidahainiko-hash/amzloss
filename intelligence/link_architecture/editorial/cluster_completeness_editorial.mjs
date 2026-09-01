/* AmzLoss Editorial Content Network — Editorial Cluster Completeness
   Upgrade of the existing cluster completeness score with additional dimensions:
   Topic Coverage, Internal Linking, Hub Coverage, Search Intent Coverage, Orphan Content.
   Reuses the existing cluster_completeness evaluator as a base where useful. */

import { buildTopicCoverageMap } from "./topic_coverage_map.mjs";

const SEARCH_INTENTS = ["informational", "commercial", "transactional", "navigational", "how-to"];

/**
 * Compute an upgraded editorial cluster completeness report.
 * @param {Object} opts { pillar, clusterPages, linkGraph, topic }
 */
export function evaluateEditorialClusterCompleteness({ pillar = null, clusterPages = [], linkGraph = { nodes: [], edges: [] }, topic = "" }) {
  const searchIntentsCovered = new Set(clusterPages.map(p => p.searchIntent || "informational"));
  const searchIntentCoverage = Math.round((new Set([...searchIntentsCovered]).size / SEARCH_INTENTS.length) * 100);

  const topicMap = buildTopicCoverageMap(topic || (pillar?.title) || "Content", clusterPages, pillar);

  const topicCoverage = Math.min(100, Math.round((topicMap.subtopics_covered.length / Math.max(1, topicMap.subtopics_covered.length + topicMap.subtopics_missing.length)) * 100) || 100);

  // Internal linking coverage: ratio of in-cluster edges to expected links
  let linkedPairs = 0;
  const clusterSlugs = new Set([...(clusterPages.map(p => p.slug || (p.url || "").replace(".html", ""))), ...(pillar ? [pillar.slug] : [])]);
  for (const edge of (linkGraph.edges || [])) {
    if (clusterSlugs.has(edge.source) && clusterSlugs.has(edge.target)) linkedPairs++;
  }
  const expected = Math.max(1, clusterSlugs.size) * 2;
  const internalLinking = Math.min(100, Math.round((linkedPairs / expected) * 100));

  // Orphan content
  const { inbound } = adjacencyOf(linkGraph);
  const orphanPages = [...clusterPages, ...(pillar ? [pillar] : [])].filter(p => {
    const slug = p.slug || (p.url || "").replace(".html", "");
    return (inbound[slug] || []).length === 0 && slug !== (pillar?.slug || "");
  }).map(p => p.slug || p.url);

  // Hub coverage: cluster has at least one hub/candidates use hubs
  const hubCoverage = topicMap.hub_opportunities.length > 0 ? 70 : 30;
  if (clusterPages.some(p => p.role === "hub" || p.role === "pillar")) hubCoverage + 20;

  // Overall health - weighted composite
  const clusterHealth = Math.round(
    topicCoverage * 0.25 +
    internalLinking * 0.35 +
    hubCoverage * 0.15 +
    searchIntentCoverage * 0.25
  );

  return {
    topic,
    pillar_slug: pillar?.slug || null,
    scores: {
      topic_coverage: topicCoverage,
      internal_linking: internalLinking,
      hub_coverage: Math.min(100, hubCoverage),
      search_intent_coverage: searchIntentCoverage,
      orphan_content: orphanPages.length
    },
    orphan_pages: orphanPages,
    cluster_health: Math.max(0, Math.min(100, clusterHealth)),
    status: clusterHealth >= 80 ? "HEALTHY" : clusterHealth >= 60 ? "NEEDS_ATTENTION" : "FRAGILE",
    topic_map: topicMap,
    recommended_future_articles: topicMap.recommended_future_articles
  };
}

function adjacencyOf(graph) {
  const inbound = {};
  for (const edge of (graph.edges || [])) {
    if (!inbound[edge.target]) inbound[edge.target] = [];
    inbound[edge.target].push(edge);
  }
  return { inbound };
}
