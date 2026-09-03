/* AmzLoss SEO Intelligence — Topical Authority Engine
   Measures cluster-level authority from REAL signals only:
     - member count & editorial depth (word count)
     - average SEO quality of members
     - internal-link support (inbound links to members, read from the
       existing link architecture graph — the source of truth)
     - entity coverage density
     - cannibalization risk (a cluster that cannot differentiate loses
       authority)
   Produces a 0-100 cluster authority score + tier + a growth verdict
   (grow / maintain / consolidate-intent), never a "publish more pages"
   default.

   Integrates the TOPICAL AUTHORITY GRAPH by consuming the site audit's
   relationship graph (phase2) as the single source of truth for how
   clusters are interlinked. */

export function clusterAuthorityScore(site, clusterName) {
  const cluster = site.clusters[clusterName];
  if (!cluster) return { cluster: clusterName, available: false, score: 0, reason: "cluster not present in site data" };

  const members = cluster.articles.map(slug => site.articles.find(a => a.slug === slug)).filter(Boolean);
  const memberCount = members.length;
  if (memberCount === 0) return { cluster: clusterName, available: true, score: 0, tier: "EMERGING", component_scores: {}, top_articles: [], reason: "no members" };

  const strategicWeight = cluster.strategic_value ?? 0.5;

  // 1. Breadth & depth
  const avgWords = members.reduce((s, m) => s + (m.word_count || 0), 0) / memberCount;
  const breadthScore = scale(Math.min(1, memberCount / 6) * 0.6 + Math.min(1, avgWords / 1200) * 0.4);

  // 2. Quality
  const avgQuality = members.reduce((s, m) => s + (m.seo_quality || 0), 0) / memberCount;
  const qualityScore = avgQuality;

  // 3. Internal link support from the authority graph
  const inboundCounts = members.map(m => m.internal_inbound || 0);
  const avgInbound = inboundCounts.reduce((s, n) => s + n, 0) / memberCount;
  const linkScore = scale(Math.min(1, avgInbound / 3));

  // 4. Entity coverage density
  const entitySet = new Set();
  for (const m of members) for (const e of (m.entities || [])) entitySet.add(e);
  const entityScore = scale(Math.min(1, entitySet.size / 10));

  // 5. Cannibalization risk (inverse)
  const canniHits = (site.cannibalization_cases || []).filter(c =>
    c.risk !== "RESOLVED" && c.article_a && c.article_b &&
    (cluster.articles.includes(c.article_a) || cluster.articles.includes(c.article_b)));
  const canniPenalty = scale(Math.max(0, (canniHits.length / Math.max(1, memberCount)) ));
  const cannibalizationScore = 100 - canniPenalty;

  const orphanCount = members.filter(m => m.orphan).length;
  const orphanPenalty = scale(orphanCount / Math.max(1, memberCount));

  const score = clamp(
    0.28 * breadthScore +
    0.24 * qualityScore +
    0.20 * linkScore +
    0.12 * entityScore +
    0.08 * cannibalizationScore +
    0.08 * (100 - orphanPenalty)
  );

  const importance = strategicWeight; // strategic value of the cluster to the business

  const topArticles = members
    .map(m => ({ slug: m.slug, title: m.title, seo_quality: m.seo_quality, inbound: m.internal_inbound, authority_weight: weighted(m) }))
    .sort((a, b) => b.authority_weight - a.authority_weight)
    .slice(0, 3);

  const tier = authorityTierFor(score);

  return {
    cluster: clusterName,
    available: true,
    pillar: cluster.pillar,
    strategic_importance: Math.round(importance * 100),
    members: memberCount,
    avg_words: Math.round(avgWords),
    avg_seo_quality: Math.round(avgQuality),
    avg_inbound_links: Math.round(avgInbound * 10) / 10,
    entity_coverage_size: entitySet.size,
    cannibalization_cases: canniHits.length,
    orphans: orphanCount,
    score: Math.round(score),
    tier,
    component_scores: {
      breadth: Math.round(breadthScore),
      quality: Math.round(qualityScore),
      link_support: Math.round(linkScore),
      entity_coverage: Math.round(entityScore),
      cannibalization_health: Math.round(cannibalizationScore),
      orphan_health: Math.round(100 - orphanPenalty)
    },
    top_articles: topArticles,
    verdict: growthVerdict(score, importance)
  };
}

function weighted(m) {
  return (m.seo_quality || 0) * 0.5 + Math.min(100, (m.internal_inbound || 0) * 12);
}

function authorityTierFor(score) {
  if (score >= 80) return "LEADING";
  if (score >= 60) return "GROWING";
  if (score >= 40) return "EMERGING";
  return "DORMANT";
}

function growthVerdict(score, importance) {
  if (importance >= 0.75 && score < 70) return { action: "GROW", reason: "High strategic-value cluster below authority target; deepen member quality and link support, not just volume." };
  if (score >= 80) return { action: "CONSOLIDATE", reason: "Strong authority; consolidate intent focus and defend with internal linking rather than adding marginal pages." };
  if (importance < 0.6 && score < 50) return { action: "FIRST_PRINCIPLES", reason: "Low strategic value + low authority; invest only if business priority rises." };
  return { action: "MAINTAIN", reason: "Healthy authority level; maintain through audits and decay handling." };
}

function scale(x) { return clamp(x * 100); }
function clamp(x, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, x)); }

/* Score ALL clusters. */
export function topicalAuthorityMap(site) {
  const clusters = Object.keys(site.clusters).map(c => clusterAuthorityScore(site, c));
  clusters.sort((a, b) => b.score - a.score);
  return {
    clusters,
    average_score: clusters.length ? Math.round(clusters.reduce((s, c) => s + c.score, 0) / clusters.length) : 0,
    leading: clusters.filter(c => c.tier === "LEADING").length,
    growing: clusters.filter(c => c.tier === "GROWING").length,
    emerging: clusters.filter(c => c.tier === "EMERGING").length,
    dormant: clusters.filter(c => c.tier === "DORMANT").length,
    highest_value_gap: clusters.filter(c => c.verdict?.action === "GROW").sort((a, b) => b.strategic_importance - a.strategic_importance)[0] || null
  };
}

/* Topical authority graph: digest of how clusters interconnect, read
   from the existing relationship graph in the audit (source of truth). */
export function topicalAuthorityGraph(site) {
  const relCounts = site.graph?.relationship_counts || {};
  const opportunities = site.link_opportunities || [];
  return {
    relationship_types: relCounts,
    cluster_to_cluster_edges: opportunities
      .filter(o => o.relationship === "SUPPORTS→PILLAR" || o.relationship === "SUPPORTS")
      .map(o => ({ source: o.source, target: o.target, relationship: o.relationship })),
    note: "Relationship graph is the existing Editorial Content Network graph. Do not rebuild — read from it."
  };
}