/* AmzLoss Internal Link Architecture — Link-To and Link-From Recommendation Engines */

import { generateAnchorVariations } from "./anchor_text.mjs";

/**
 * Link-To Engine: "Which existing pages should link TO this target?"
 */
export function findLinkToThisPage(target, allPages, linkGraph, topicKeywords = []) {
  const { inbound } = adjacencyList(linkGraph);
  const targetSlug = target.slug || (target.url || "").replace(".html", "");

  const currentInbound = (inbound[targetSlug] || []);
  const currentInboundSlugs = new Set(currentInbound.map(e => e.source));

  const candidates = allPages
    .filter(p => p.slug !== targetSlug && !currentInboundSlugs.has(p.slug))
    .map(p => ({
      slug: p.slug,
      title: p.title || p.slug,
      importanceScore: p.importanceScore || 50,
      importanceClass: p.importanceClass || "MEDIUM",
      contextualOutbound: p.contextualOutbound || 0,
      topicalRelevance: computeTopicalRelevance(p, target, topicKeywords),
    }))
    .map(c => ({
      ...c,
      combinedScore: c.topicalRelevance * 0.5 + c.importanceScore * 0.3 + Math.max(0, 100 - c.contextualOutbound * 3) * 0.2
    }))
    .filter(c => c.topicalRelevance >= 40 && c.combinedScore >= 40)
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 8);

  return {
    target_slug: targetSlug,
    target_title: target.title || targetSlug,
    target_importance: target.importanceClass,
    current_inbound_count: currentInbound.length,
    recommended_sources: candidates.map(c => ({
      source_slug: c.slug,
      source_title: c.title,
      source_importance: c.importanceClass,
      source_score: c.importanceScore,
      topical_relevance: c.topicalRelevance,
      combined_opportunity: Math.round(c.combinedScore),
      suggested_anchors: generateAnchorVariations(target.title || targetSlug, topicKeywords[0] || targetSlug, []),
      why: c.title + " discusses " + (topicKeywords[0] || "this topic") + " and has " + c.importanceClass + " importance. A contextual link here would strengthen cluster connectivity to " + (target.title || targetSlug) + "."
    }))
  };
}

/**
 * Link-From Engine: "Which pages should this source link TO?"
 */
export function findLinkFromThisPage(source, allPages, linkGraph, topicKeywords = []) {
  const { outbound, inbound } = adjacencyList(linkGraph);
  const sourceSlug = source.slug || (source.url || "").replace(".html", "");
  const currentOutbound = (outbound[sourceSlug] || []);
  const currentOutboundSlugs = new Set(currentOutbound.map(e => e.target));

  const candidates = allPages
    .filter(p => p.slug !== sourceSlug && !currentOutboundSlugs.has(p.slug))
    .map(p => ({
      slug: p.slug,
      title: p.title || p.slug,
      importanceScore: p.importanceScore || 50,
      importanceClass: p.importanceClass || "MEDIUM",
      currentInbound: (inbound[p.slug] || []).length,
      topicalRelevance: computeTopicalRelevance(source, p, topicKeywords),
    }))
    .map(c => ({
      ...c,
      combinedScore: c.topicalRelevance * 0.5 + c.importanceScore * 0.4 + Math.max(0, 100 - c.currentInbound * 8) * 0.1
    }))
    .filter(c => c.topicalRelevance >= 40 && c.combinedScore >= 40)
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 8);

  return {
    source_slug: sourceSlug,
    source_title: source.title || sourceSlug,
    current_outbound_count: currentOutbound.length,
    recommended_targets: candidates.map(c => ({
      target_slug: c.slug,
      target_title: c.title,
      target_importance: c.importanceClass,
      topical_relevance: c.topicalRelevance,
      suggested_anchors: generateAnchorVariations(c.title, topicKeywords[0] || c.slug, []),
      why: source.title + " covers " + (topicKeywords[0] || "this topic") + ". Linking to " + c.title + " helps readers find deeper information."
    }))
  };
}

function computeTopicalRelevance(pageA, pageB, keywords) {
  const textA = (pageA.title || pageA.slug || "").toLowerCase() + " " + (pageA.keywords || []).join(" ").toLowerCase();
  const textB = (pageB.title || pageB.slug || "").toLowerCase() + " " + (pageB.keywords || []).join(" ").toLowerCase();
  if (!textA || !textB) return 50;
  const wordsA = new Set(textA.split(/\s+/));
  const wordsB = new Set(textB.split(/\s+/));
  let overlap = 0;
  for (const w of wordsA) { if (wordsB.has(w) && w.length > 3) overlap++; }
  let kwBoost = 0;
  for (const kw of keywords) {
    if (textA.includes(kw.toLowerCase()) && textB.includes(kw.toLowerCase())) kwBoost += 10;
  }
  return Math.min(100, Math.round((overlap / Math.max(1, Math.min(wordsA.size, wordsB.size))) * 80 + kwBoost));
}

function adjacencyList(graph) {
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
