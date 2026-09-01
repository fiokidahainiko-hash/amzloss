/* AmzLoss Internal Link Architecture — Cluster Completeness Analyzer */

export function evaluateClusterCompleteness({ pillarSlug, clusterPages, linkGraph }) {
  const clusterSlugs = new Set(clusterPages.map(p => p.slug || (p.url || "").replace(".html", "")));
  clusterSlugs.add(pillarSlug);

  const topicCoverage = Math.min(100, Math.round((clusterPages.length / Math.max(6, clusterPages.length + 2)) * 100));

  const { inbound, outbound } = adjacencyListForGraph(linkGraph);
  let linkedPairs = 0;
  let expectedLinks = clusterSlugs.size * 2;

  for (const slug of clusterSlugs) {
    for (const edge of (inbound[slug] || [])) {
      if (clusterSlugs.has(edge.source)) linkedPairs++;
    }
  }

  const linkCoverage = Math.min(100, Math.round((linkedPairs / Math.max(1, expectedLinks)) * 100));

  const orphansInCluster = clusterPages.filter(p => {
    const slug = p.slug || (p.url || "").replace(".html", "");
    const inCount = (inbound[slug] || []).length;
    return inCount === 0 && slug !== pillarSlug;
  }).map(p => ({ slug: p.slug || p.url, title: p.title }));

  const underSupported = clusterPages.filter(p => {
    const slug = p.slug || (p.url || "").replace(".html", "");
    const inCount = (inbound[slug] || []).filter(e => clusterSlugs.has(e.source)).length;
    return inCount < 2 && p.role !== "supporting";
  }).map(p => ({ slug: p.slug || p.url, title: p.title, inbound: (inbound[p.slug || (p.url || "").replace(".html", "")] || []).length }));

  let pillarLinkBacks = 0;
  for (const slug of clusterSlugs) {
    if (slug === pillarSlug) continue;
    const outs = (outbound[slug] || []).filter(e => e.target === pillarSlug);
    pillarLinkBacks += outs.length;
  }
  const pillarLinkBackRatio = clusterSlugs.size > 1 ? Math.min(1, pillarLinkBacks / (clusterSlugs.size - 1)) : 1;

  const completenessScore = Math.round(
    topicCoverage * 0.3 +
    linkCoverage * 0.35 +
    Math.max(0, 100 - orphansInCluster.length * 25) * 0.15 +
    Math.max(0, 100 - underSupported.length * 20) * 0.1 +
    pillarLinkBackRatio * 100 * 0.1
  );

  return {
    pillar_slug: pillarSlug,
    topic_coverage_pct: topicCoverage,
    internal_link_coverage_pct: linkCoverage,
    orphan_pages: orphansInCluster,
    orphan_count: orphansInCluster.length,
    under_supported_pages: underSupported,
    under_supported_count: underSupported.length,
    pillar_link_back_count: pillarLinkBacks,
    cluster_completeness: Math.max(0, Math.min(100, completenessScore)),
    status: completenessScore >= 80 ? "STRONG" : completenessScore >= 60 ? "NEEDS_WORK" : "WEAK"
  };
}

function adjacencyListForGraph(graph) {
  const inbound = {};
  const outbound = {};
  if (!graph?.edges) return { inbound, outbound };
  for (const edge of graph.edges) {
    if (!inbound[edge.target]) inbound[edge.target] = [];
    if (!outbound[edge.source]) outbound[edge.source] = [];
    inbound[edge.target].push(edge);
    outbound[edge.source].push(edge);
  }
  return { inbound, outbound };
}
