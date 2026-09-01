/* AmzLoss Internal Link Architecture — Crawl Depth Analyzer
   Computes how many internal clicks from homepage (depth 0) to each page.
   Uses the link graph edges and BFS traversal. */

/**
 * Compute crawl depth for every page from entry points.
 * Returns { slug -> depth } map.
 */
export function computeCrawlDepths(graph, entryPoints = ["index"]) {
  const adjacency = {};
  for (const edge of graph.edges) {
    if (!adjacency[edge.source]) adjacency[edge.source] = new Set();
    adjacency[edge.source].add(edge.target);
  }

  const depths = {};
  const queue = entryPoints.map(slug => [slug, 0]);
  const visited = new Set(entryPoints);

  while (queue.length > 0) {
    const [slug, depth] = queue.shift();
    depths[slug] = Math.min(depths[slug] ?? Infinity, depth);
    for (const neighbor of (adjacency[slug] || new Set())) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, depth + 1]);
      }
    }
  }

  // Pages not reachable from entry points get depth = 999 (orphan)
  for (const node of graph.nodes) {
    if (depths[node.slug] === undefined) depths[node.slug] = 999;
  }

  return depths;
}

/**
 * Flag pages that are unnecessarily buried.
 */
export function flagDeepPages(crawlDepths, maxAcceptableDepth = 4) {
  const deep = [];
  for (const [slug, depth] of Object.entries(crawlDepths)) {
    if (depth > maxAcceptableDepth && depth < 999) {
      deep.push({ slug, depth, severity: depth > 6 ? "critical" : "warning" });
    }
  }
  return deep;
}

/**
 * Average crawl depth
 */
export function averageCrawlDepth(crawlDepths) {
  const values = Object.values(crawlDepths).filter(d => d < 999);
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/**
 * Depth summary statistics
 */
export function crawlDepthReport(crawlDepths) {
  const reachable = Object.values(crawlDepths).filter(d => d < 999);
  const orphans = Object.entries(crawlDepths).filter(([, d]) => d === 999).map(([s]) => s);
  const deep = Object.entries(crawlDepths).filter(([, d]) => d > 4 && d < 999).map(([s, d]) => ({ slug: s, depth: d }));
  return {
    total_pages: reachable.length + orphans.length,
    reachable: reachable.length,
    orphans: orphans.length,
    average_depth: averageCrawlDepth(crawlDepths),
    deep_pages: deep,
    orphans_list: orphans,
    depth_histogram: computeHistogram(reachable)
  };
}

function computeHistogram(depths) {
  const hist = {};
  for (const d of depths) {
    hist[d] = (hist[d] || 0) + 1;
  }
  return hist;
}
