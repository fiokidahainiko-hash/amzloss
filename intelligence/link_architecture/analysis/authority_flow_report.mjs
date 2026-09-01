/* AmzLoss Internal Link Architecture — Site-Wide Authority Flow Report
   Shows where high-importance pages link, which important pages they support,
   which pages are under-supported, and architecture weaknesses.
   IMPORTANT: This is an internal-importance model, NOT an exact Google PageRank. */

export function buildAuthorityFlowReport(pages, linkGraph) {
  const { inbound, outbound } = adjacencyList(linkGraph);

  const criticalPages = pages.filter(p => p.importanceClass === "CRITICAL");
  const highPages = pages.filter(p => p.importanceClass === "HIGH");
  const mediumPages = pages.filter(p => p.importanceClass === "MEDIUM");
  const lowPages = pages.filter(p => p.importanceClass === "LOW");
  const orphanPages = pages.filter(p => p.importanceClass === "ORPHAN");

  const pageMap = {};
  for (const p of pages) pageMap[p.slug] = p;

  const underLinked = pages.filter(p =>
    (p.importanceClass === "CRITICAL" || p.importanceClass === "HIGH") &&
    (p.contextualInbound || 0) < 3
  ).map(p => ({
    slug: p.slug,
    importance: p.importanceClass,
    contextual_inbound: p.contextualInbound || 0,
    recommended_min: p.importanceClass === "CRITICAL" ? 5 : 3
  }));

  const overLinked = pages.filter(p => (p.contextualOutbound || 0) > 15)
    .map(p => ({ slug: p.slug, contextual_outbound: p.contextualOutbound }));

  const flowEdges = [];
  for (const p of [...criticalPages, ...highPages]) {
    const outs = outbound[p.slug] || [];
    const targetsToHigh = outs
      .filter(e => pageMap[e.target] && ["CRITICAL", "HIGH"].includes(pageMap[e.target].importanceClass))
      .map(e => ({ target: e.target, anchor: e.anchorText, targetImportance: pageMap[e.target].importanceClass }));
    flowEdges.push({ source: p.slug, importance: p.importanceClass, supports: targetsToHigh });
  }

  const underSupportedImportant = pages.filter(p =>
    (p.importanceClass === "CRITICAL" || p.importanceClass === "HIGH") &&
    (inbound[p.slug] || []).length < 4
  ).map(p => ({
    slug: p.slug,
    title: p.title || p.slug,
    importance: p.importanceClass,
    current_inbound: (inbound[p.slug] || []).length
  }));

  return {
    summary: {
      total_pages: pages.length,
      critical: criticalPages.length,
      high: highPages.length,
      medium: mediumPages.length,
      low: lowPages.length,
      orphan: orphanPages.length
    },
    critical_pages: criticalPages.map(p => ({ slug: p.slug, title: p.title, score: p.importanceScore })),
    high_pages: highPages.map(p => ({ slug: p.slug, title: p.title, score: p.importanceScore })),
    flow: flowEdges,
    under_linked: underLinked,
    over_linked: overLinked,
    under_supported_important: underSupportedImportant,
    distribution: {
      total_edges: linkGraph.edges.length,
      contextual_edges: linkGraph.edges.filter(e => e.isContextual).length,
      navigational_edges: linkGraph.edges.filter(e => e.linkType === "navigational").length,
      footer_edges: linkGraph.edges.filter(e => e.linkType === "footer").length,
      avg_outbound: Math.round((linkGraph.edges.length / Math.max(1, pages.length)) * 10) / 10
    }
  };
}

function adjacencyList(graph) {
  const inbound = {};
  const outbound = {};
  for (const edge of graph.edges) {
    if (!inbound[edge.target]) inbound[edge.target] = [];
    if (!outbound[edge.source]) outbound[edge.source] = [];
    inbound[edge.target].push(edge);
    outbound[edge.source].push(edge);
  }
  return { inbound, outbound };
}
