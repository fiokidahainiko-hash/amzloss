/* AmzLoss Editorial Content Network — "Why This Article Exists" Metadata & Existing-Article Update
   Every article carries editorial metadata anchoring it in the content ecosystem:
   which cluster, which search intent, which parent/pillar, which articles it supports,
   which tools it connects to, and which articles should link to it.
   Also: when a new article is published, scan EXISTING articles for natural
   inbound-link opportunities (auto-update old articles). */

import { scoreLinkRecommendation, isStrongOpportunity, rankRecommendations } from "./link_score.mjs";
import { entityRelationship } from "./entity_extraction.mjs";

/**
 * Generate the editorial metadata ("why this article exists") for an article.
 */
export function whyThisArticleExists(article, cluster, allPages, linkGraph) {
  const slug = article.slug;
  const { inbound, outbound } = adjacencyOf(linkGraph);

  const existingInbound = (inbound[slug] || []).map(e => ({ source: e.source, relationshipType: e.relationshipType || "RELATED_TO" }));
  const existingOutbound = (outbound[slug] || []).map(e => ({ target: e.target, relationshipType: e.relationshipType || "RELATED_TO" }));

  // Which articles SHOULD link to this article (candidates from existing pages)
  const shouldLinkToMe = allPages
    .filter(p => p.slug !== slug)
    .map(p => {
      const entity = entityRelationship(p, article);
      const relevance = entity.overlap_score;
      const rec = scoreLinkRecommendation(p, article, { relationshipType: "SUPPORTS", sameCluster: p.cluster === (cluster?.pillar_topic) || false });
      return { source: p, relevance, rec };
    })
    .filter(x => isStrongOpportunity(x.rec, 60))
    .sort((a, b) => b.rec.scores.overall_recommendation - a.rec.scores.overall_recommendation)
    .slice(0, 6)
    .map(x => ({ source_slug: x.source.slug, source_title: x.source.title, score: x.rec.scores.overall_recommendation, relevance: x.relevance }));

  return {
    article_slug: slug,
    belongs_to_cluster: cluster?.pillar_topic || "standalone",
    satisfies_search_intent: article.searchIntent || "informational",
    parent_pillar: cluster?.pillar_topic || null,
    articles_it_supports: shouldLinkToMe.map(x => x.source_slug),
    tools_it_connects_to: allPages.filter(p => p.role === "tool" && (p.keywords || []).some(k => (article.keywords || []).includes(k))).map(p => p.slug),
    articles_that_should_link_to_it: shouldLinkToMe,
    existing_inbound_links: existingInbound,
    existing_outbound_links: existingOutbound
  };
}

/**
 * Scan existing articles for natural places to add links TO a new article.
 * This is the "auto-update old articles" engine: it recommends link insertions
 * in EXISTING articles that point to the newly published article.
 * @returns recommendations with approve/reject/edit/undo flags
 */
export function scanExistingArticlesForInboundLinks(newArticle, existingPages, linkGraph, topicalContext) {
  const slug = newArticle.slug;
  const { inbound } = adjacencyOf(linkGraph);

  const recommendations = existingPages
    .filter(p => p.slug !== slug)
    .map(source => {
      const entity = entityRelationship(source, newArticle);
      const rec = scoreLinkRecommendation(source, newArticle, {
        relationshipType: "SUPPORTS",
        sameCluster: source.cluster === topicalContext?.cluster || false,
        contextual: true
      });
      const currentInbound = (inbound[slug] || []).length;
      return {
        source_slug: source.slug,
        source_title: source.title,
        source_importance: source.importanceClass,
        target_slug: slug,
        target_title: newArticle.title,
        target_importance: newArticle.importanceClass,
        score: rec.scores.overall_recommendation,
        topical_relevance: rec.scores.topical_relevance,
        shared_entities: entity.shared_entities,
        suggested_anchor: generateSuggestedAnchor(newArticle.title),
        suggested_location: (source.content || "").slice(0, 200).includes("calc") || (source.title || "").toLowerCase().includes("earn") ? "Body section discussing calculations" : "Body content",
        reason: `${source.title} discusses topics related to ${newArticle.title}; a contextual link here helps the reader discover the new resource.`,
        status: "pending",
        approve: "accept", reject: "decline", edit: "customize", undo: "revert"
      };
    })
    .filter(r => r.score >= 60 && r.topical_relevance >= 50)
    .sort((a, b) => b.score - a.score);

  return {
    target_slug: slug,
    existing_opportunities_found: recommendations.length,
    recommendations
  };
}

function generateSuggestedAnchor(title) {
  return (title || "this resource").replace(/[:–-].*$/, "").toLowerCase().trim();
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
