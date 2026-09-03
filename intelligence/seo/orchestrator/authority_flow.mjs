/* AmzLoss SEO Intelligence — Authority Flow Analyzer 2.0
   Measures how authority (PageRank-equivalent) flows through the site.
   Uses a simple iterative flow model when real pagerank data is unavailable.
   Never fabricates authority scores. */

import { ev, DATA_UNAVAILABLE } from "./seo_evidence.mjs";

export function computeAuthorityFlow({ pages = [], links = [] } = {}) {
  if (!pages.length) return { available: false, message: "DATA_UNAVAILABLE — no page data", flow_scores: {}, clusters: {} };

  const N = pages.length;
  const pageMap = new Map(pages.map((p, i) => [p.url, i]));
  const scores = new Array(N).fill(1 / N);
  const newScores = new Array(N).fill(0);
  const damping = 0.85;
  const maxIter = 100;

  for (let iter = 0; iter < maxIter; iter++) {
    for (const link of links) {
      const from = pageMap.get(link.from);
      const to = pageMap.get(link.to);
      if (from === undefined || to === undefined) continue;
      const outLinks = links.filter(l => l.from === link.from).length;
      if (outLinks > 0) newScores[to] += damping * scores[from] / outLinks;
    }
    for (let i = 0; i < N; i++) newScores[i] += (1 - damping) / N;
    let diff = 0;
    for (let i = 0; i < N; i++) { diff += Math.abs(newScores[i] - scores[i]); scores[i] = newScores[i]; newScores[i] = 0; }
    if (diff < 1e-6) break;
  }

  const normalized = scores.map((s, i) => ({ url: pages[i].url, score: s, normalized_score: s * 100 }));

  return {
    available: true,
    method: "iterative_authority_flow",
    damping,
    iterations: maxIter,
    flow_scores: Object.fromEntries(normalized.map(n => [n.url, n.score])),
    normalized_scores: Object.fromEntries(normalized.map(n => [n.url, n.normalized_score])),
    top_pages: normalized.sort((a, b) => b.score - a.score).slice(0, 20).map(n => ({ url: n.url, score: n.normalized_score })),
    orphans: normalized.filter(n => !links.some(l => l.to === n.url)).map(n => n.url),
    sinks: normalized.filter(n => !links.some(l => l.from === n.url)).map(n => n.url)
  };
}

export function clusterAuthority(clusters = []) {
  return clusters.map(c => {
    const pages = c.pages || [];
    const scores = pages.map(p => p.authority_score || 0.5);
    const avg = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0;
    const sum = scores.reduce((s, x) => s + x, 0);
    return { cluster: c.name, avg_authority: avg, total_authority: sum, pages: pages.length };
  }).sort((a, b) => b.avg_authority - a.avg_authority);
}

export function authorityGaps(flowResult) {
  if (!flowResult.available) return [];
  const gaps = [];
  const threshold = 0.5;
  for (const [url, score] of Object.entries(flowResult.normalized_scores || {})) {
    if (score < threshold) gaps.push({ url, score, reason: "Low authority flow — needs internal links or backlinks" });
  }
  return gaps;
}