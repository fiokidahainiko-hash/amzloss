/* AmzLoss Editorial Content Network — Internal Link Recommendation Scoring
   Every potential link receives a composite 0-100 score weighted across:
   topical relevance, user usefulness, cluster relationship, page importance,
   and context quality. Only strong opportunities rise to the top. */

import { entityRelationship } from "./entity_extraction.mjs";

/**
 * Score a single link recommendation.
 * @param {Object} source - source page
 * @param {Object} target - target page
 * @param {Object} opts - { relationshipType, sameCluster, contextual (bool), anchorDiversity }
 * @returns recommendation object with component scores + overall
 */
export function scoreLinkRecommendation(source, target, opts = {}) {
  const {
    relationshipType = "RELATED_TO",
    sameCluster = false,
    contextual = true,
    anchorDiversity = 1.0
  } = opts;

  const entity = entityRelationship(source, target);

  // Topical relevance (combo of entity overlap + keyword overlap)
  const topicalRelevance = Math.min(100, entity.overlap_score + keywordOverlap(source, target) * 0.5);

  // User usefulness: where the relationship is actionable (tool->article, next-step)
  let userUsefulness = topicalRelevance;
  if (["CALCULATOR_FOR", "HOW_TO_FOR", "READER_NEXT_STEP", "SOLVES"].includes(relationshipType)) userUsefulness += 8;

  // Cluster relationship
  const clusterRelationship = sameCluster ? (topicalRelevance >= 60 ? 96 : 80) : 55;

  // Page importance (normalized 0-100)
  const pageImportance = (source.importanceScore + target.importanceScore) / 2;

  // Context quality
  const contextQuality = contextual ? 95 : 60;

  // Anchor diversity factor
  const diversityPenalty = Math.max(0, (1 - anchorDiversity) * 10);

  // Weighted composite (weights sum to 1.0)
  const overall = Math.round(
    topicalRelevance * 0.35 +
    userUsefulness * 0.25 +
    clusterRelationship * 0.15 +
    pageImportance * 0.15 +
    contextQuality * 0.10
  ) - diversityPenalty;

  return {
    source_slug: source.slug,
    source_title: source.title,
    source_importance: source.importanceClass,
    target_slug: target.slug,
    target_title: target.title,
    target_importance: target.importanceClass,
    relationshipType,
    scores: {
      topical_relevance: Math.min(100, Math.round(topicalRelevance)),
      user_usefulness: Math.min(100, Math.round(userUsefulness)),
      cluster_relationship: clusterRelationship,
      page_importance: Math.round(pageImportance),
      context_quality: contextQuality,
      overall_recommendation: Math.max(0, Math.min(100, overall))
    },
    shared_entities: entity.shared_entities
  };
}

/**
 * Rank a list of potential links by recommendation score.
 */
export function rankRecommendations(recommendations, topN = 10) {
  return recommendations
    .sort((a, b) => b.scores.overall_recommendation - a.scores.overall_recommendation)
    .slice(0, topN);
}

/**
 * A link opportunity is "strong" if it clears a quality threshold.
 */
export function isStrongOpportunity(rec, threshold = 75) {
  return (
    rec.scores.overall_recommendation >= threshold &&
    rec.scores.topical_relevance >= 60 &&
    rec.scores.context_quality >= 80
  );
}

function keywordOverlap(pageA, pageB) {
  const wordsA = [...new Set(((pageA.title || "") + " " + (pageA.keywords || []).join(" ")).toLowerCase().split(/\s+/))];
  const wordsB = new Set(((pageB.title || "") + " " + (pageB.keywords || []).join(" ")).toLowerCase().split(/\s+/));
  let shared = 0;
  for (const w of wordsA) if (wordsB.has(w) && w.length > 3) shared++;
  return Math.min(100, shared * 15);
}
