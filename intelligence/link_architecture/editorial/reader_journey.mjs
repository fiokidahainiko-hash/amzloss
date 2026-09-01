/* AmzLoss Editorial Content Network — Reader Next-Step / Previous-Step & Bidirectional Engine
   Determines what a reader would logically want to read NEXT and what they should
   have read BEFORE, and decides whether a link relationship should be bidirectional
   or one-directional based on editorial usefulness. */

import { entityRelationship } from "./entity_extraction.mjs";
import { BIDIRECTIONAL_TYPES } from "./relationship_types.mjs";

/**
 * Determine "Reader Next Step" candidates for an article.
 * What would this reader logically want to know next?
 */
export function readerNextStepCandidates(page, allPages, graph = { edges: [] }) {
  const alreadyLinked = new Set(graph.edges.filter(e => e.source === page.slug).map(e => e.target));
  const nextStepPatterns = {
    "commission rate": ["commission cuts", "earnings", "calculator", "high paying categories"],
    "commission": ["earnings", "calculator", "audit", "payout"],
    "earnings": ["calculator", "audit", "optimization", "forecast"],
    "audit": ["rates", "calculator", "payout verification"],
    "beginner": ["rates", "earnings", "first commission"]
  };

  // Detect a primary topic signature for the page
  const key = Object.keys(nextStepPatterns).find(k => (page.title || "").toLowerCase().includes(k));
  const nextKeywords = key ? nextStepPatterns[key] : [];

  const candidates = allPages
    .filter(p => p.slug !== page.slug && !alreadyLinked.has(p.slug))
    .map(p => {
      const entity = entityRelationship(page, p);
      let relevance = entity.overlap_score;
      // Boost candidates whose title matches one of the logical next-step keywords
      let nextBoost = 0;
      for (const kw of nextKeywords) {
        if ((p.title || "").toLowerCase().includes(kw)) nextBoost += 15;
      }
      const usefulness = Math.min(100, relevance + nextBoost);
      return { target: p, relevance, usefulness, nextStepMatch: nextBoost > 0 };
    })
    .filter(c => c.usefulness >= 40)
    .sort((a, b) => b.usefulness - a.usefulness)
    .slice(0, 6);

  return candidates.map(c => ({
    target_slug: c.target.slug,
    target_title: c.target.title,
    entity_relevance: c.relevance,
    reader_usefulness: c.usefulness,
    is_logical_next_step: c.nextStepMatch,
    relationshipType: "READER_NEXT_STEP",
    why: c.target.title + (c.nextStepMatch ? " is a logical next step after reading " + (page.title || page.slug) + "." : " is contextually relevant to continue the reader's learning journey.")
  }));
}

/**
 * Determine "Reader Previous Step" candidates.
 * What should the reader have read before this?
 */
export function readerPreviousStepCandidates(page, allPages) {
  // A prerequisite article typically explains a concept this article references.
  return allPages
    .filter(p => p.slug !== page.slug)
    .map(p => {
      const entity = entityRelationship(page, p);
      // Previous-step articles usually have NAME_ENTITY / base concept relationship and higher importance
      const relevance = entity.overlap_score;
      const importanceBonus = p.importanceClass === "CRITICAL" || p.importanceClass === "HIGH" ? 10 : 0;
      const usefulness = Math.min(100, relevance + importanceBonus);
      return { target: p, relevance, usefulness };
    })
    .filter(c => c.usefulness >= 40)
    .sort((a, b) => b.usefulness - a.usefulness)
    .slice(0, 4)
    .map(c => ({
      target_slug: c.target.slug,
      target_title: c.target.title,
      relevance: c.relevance,
      usefulness: c.usefulness,
      relationshipType: "READER_PREVIOUS_STEP",
      why: "Readers should understand the concepts in " + (c.target.title || c.target.slug) + " before deep-diving into " + (page.title || page.slug) + "."
    }));
}

/**
 * Decide whether a relationship should be bidirectional.
 * A→B exists. Should B→A also exist? Only if editorially useful (not automatic).
 */
export function decideBidirectionality(pageA, pageB, relationshipType) {
  if (BIDIRECTIONAL_TYPES.includes(relationshipType)) {
    const entity = entityRelationship(pageA, pageB);
    // Only make bidirectional if there is meaningful shared content, to avoid
    // creating artificial circular link patterns.
    return entity.overlap_score >= 60 && entity.shared_entities.length >= 2;
  }
  // PILLAR_OF, CALCULATOR_FOR etc. are typically one-directional
  if (["PILLAR_OF", "CALCULATOR_FOR", "CONNECTS_TO_TOOL", "HOW_TO_FOR"].includes(relationshipType)) {
    return false;
  }
  return false;
}
