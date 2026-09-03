/* AmzLoss SEO Intelligence — Entity & Semantic Coverage Engine
   Harvests entities from the real articles and measures how densely the
   site covers strategic entities, and across which clusters. An entity
   that is spoke about in articles but has no cluster hub, or is thin
   in coverage, is an unaddressed semantic opportunity.

   Uses data from the existing site inventory (entities are derived from
   the real HTML in site_data.mjs / the site audit). No fabricated data. */

import { loadSERPSnapshot } from "../site_data.mjs";

export const STRATEGIC_ENTITIES = [
  "Amazon Associates", "commission", "earnings", "calculator", "affiliate",
  "rates", "payout", "backlink", "audit", "category", "discount", "referral",
  "break-even", "underpayment", "report", "ShareASale", "CJ Affiliate",
  "IndexNow", "directory", "nofollow", "CSV"
];

export function entityCoverageMap(site) {
  const clusterEntities = {};
  const entityFreq = {};
  const entityClusters = {};

  for (const a of site.articles) {
    const cluster = a.topic_cluster || "unassigned";
    if (!clusterEntities[cluster]) clusterEntities[cluster] = {};
    for (const e of (a.entities || [])) {
      entityFreq[e] = (entityFreq[e] || 0) + 1;
      clusterEntities[cluster][e] = (clusterEntities[cluster][e] || 0) + 1;
      if (!entityClusters[e]) entityClusters[e] = [];
      if (!entityClusters[e].includes(cluster)) entityClusters[e].push(cluster);
    }
  }

  const strategic = STRATEGIC_ENTITIES.map(e => ({
    entity: e,
    occurrences: entityFreq[e] || 0,
    clusters_covered: entityClusters[e] || [],
    coverage_status: !entityFreq[e] ? "ABSENT" : (entityClusters[e] || []).length >= 2 ? "DENSE" : "THIN"
  })).sort((a, b) => b.occurrences - a.occurrences);

  return {
    entities_total_seen: Object.keys(entityFreq).length,
    strategic_entities: strategic,
    dense: strategic.filter(s => s.coverage_status === "DENSE"),
    thin: strategic.filter(s => s.coverage_status === "THIN"),
    absent: strategic.filter(s => s.coverage_status === "ABSENT"),
    cluster_matrix: clusterEntities
  };
}

/* Unaddressed semantic queries: real SERP snapshot queries (or research
   feed queries) whose entity set is under-served. */
export function unaddressedSemanticQueries(site) {
  const snap = loadSERPSnapshot();
  const feedQueries = (snap.queries || []).map(q => q.query).filter(Boolean);
  const coverage = entityCoverageMap(site);
  const entityNames = new Set(coverage.strategic_entities.map(e => e.entity));

  const results = feedQueries.map(query => {
    const q = query.toLowerCase();
    const relatedStrategic = STRATEGIC_ENTITIES.filter(e => q.includes(e.toLowerCase()));
    const coveredHere = relatedStrategic.filter(e => entityNames.has(e));
    const underCovered = relatedStrategic.filter(e => {
      const s = coverage.strategic_entities.find(x => x.entity === e);
      return s && s.coverage_status !== "DENSE";
    });
    return {
      query,
      related_strategic_entities: relatedStrategic,
      fully_covered: coveredHere.length === relatedStrategic.length && relatedStrategic.length > 0,
      under_covered_entities: underCovered,
      opportunity: underCovered.length > 0,
      note: underCovered.length
        ? `Query references semantically thin entities: ${underCovered.map(e => e.entity).join(", ")}`
        : "Entities for this query are well covered across the site."
    };
  });

  return {
    provided_queries: results.length,
    queries_with_entity_opportunity: results.filter(r => r.opportunity),
    results
  };
}