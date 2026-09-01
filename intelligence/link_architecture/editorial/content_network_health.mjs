/* AmzLoss Editorial Content Network — Content Network Health Dashboard
   Aggregates metrics about the entire editorial content network:
   total articles, clusters, hubs, internal links, contextual links, orphans,
   under-linked, over-linked, important pages, hub/supporting/tool/collection
   counts, cluster health, and pages requiring new links. */

import { identifyHubs } from "./hub_identifier.mjs";

/**
 * Build the content network health dashboard.
 */
export function buildContentNetworkHealth(pages, linkGraph, clusters = []) {
  const contextualEdges = (linkGraph.edges || []).filter(e => e.isContextual || e.position === "body");
  const { inbound, outbound } = adjacencyOf(linkGraph);

  const orphans = pages.filter(p => (inbound[p.slug] || []).length === 0);
  const underLinked = pages.filter(p => (inbound[p.slug] || []).filter(e => e.isContextual).length < 2);
  const overLinked = pages.filter(p => (outbound[p.slug] || []).length > 15);
  const important = pages.filter(p => p.importanceClass === "CRITICAL" || p.importanceClass === "HIGH");
  const hubs = pages.filter(p => p.role === "hub" || p.role === "pillar");
  const supporting = pages.filter(p => p.role === "supporting");
  const tools = pages.filter(p => p.role === "tool");
  const collections = pages.filter(p => p.role === "collection");

  const hubSlugs = new Set(hubs.map(h => h.slug));
  const hubOpportunities = identifyHubs(pages).filter(h => !hubSlugs.has(h.hub_slug)).length;

  // Cluster health aggregation
  const clusterHealths = (Array.isArray(clusters) ? clusters : []).map(c => c.cluster_health || c.cluster_completeness || 0);
  const avgClusterHealth = clusterHealths.length ? Math.round(clusterHealths.reduce((a, b) => a + b, 0) / clusterHealths.length) : 0;

  // Pages requiring new links: high importance but under-supported
  const pagesRequiringLinks = important.filter(p => (inbound[p.slug] || []).length < 3);

  return {
    total_articles: pages.length,
    total_topic_clusters: clusters.length,
    total_hubs: hubs.length + hubOpportunities,
    hub_opportunities: hubOpportunities,
    total_internal_links: (linkGraph.edges || []).length,
    contextual_internal_links: contextualEdges.length,
    orphan_pages: orphans.length,
    under_linked_pages: underLinked.length,
    over_linked_pages: overLinked.length,
    important_pages: important.length,
    hub_pages: hubs.length,
    supporting_pages: supporting.length,
    tools: tools.length,
    collections: collections.length,
    average_cluster_health: avgClusterHealth,
    pages_requiring_new_links: pagesRequiringLinks.map(p => ({ slug: p.slug, importance: p.importanceClass, inbound: (inbound[p.slug] || []).length })),
    content_types_summary: {
      articles: supporting.length,
      pillars_hubs: hubs.length,
      tools: tools.length,
      collections: collections.length,
      comparisons: pages.filter(p => p.role === "comparison").length,
      guides: pages.filter(p => p.role === "guide").length
    }
  };
}

function adjacencyOf(graph) {
  const inbound = {};
  const outbound = {};
  for (const edge of (graph.edges || [])) {
    if (!inbound[edge.target]) inbound[edge.target] = [];
    if (!outbound[edge.source]) outbound[edge.source] = [];
    inbound[edge.target].push(edge);
    outbound[edge.source].push(edge);
  }
  return { inbound, outbound };
}
