/* AmzLoss Editorial Content Network — Relationship Type Typology
   Defines the semantic relationship types that give every internal link meaning.
   Each relationship reflects a logical editorial connection between two pages,
   inspired by how authoritative publishers (e.g. Serious Eats) structure
   their information architecture — recreated for THIS niche, not copied. */

export const RELATIONSHIP_TYPES = [
  "PILLAR_OF",
  "SUPPORTS",
  "RELATED_TO",
  "EXPLAINS",
  "EXPANDS",
  "HOW_TO_FOR",
  "CALCULATOR_FOR",
  "COMPARES_WITH",
  "ALTERNATIVE_TO",
  "CAUSES",
  "SOLVES",
  "EXAMPLE_OF",
  "DEEPER_GUIDE_FOR",
  "READER_NEXT_STEP",
  "READER_PREVIOUS_STEP",
  "USES",
  "CONNECTS_TO_TOOL",
  "MEMBER_OF_COLLECTION",
  "PART_OF_TRAIL"
];

/**
 * Describe the meaning of each relationship type.
 * Used as metadata to annotate every internal link edge.
 */
export const RELATIONSHIP_MEANING = {
  PILLAR_OF: "This page is the pillar/hub that organizes the target topic cluster.",
  SUPPORTS: "This page provides supporting information for the target page.",
  RELATED_TO: "These pages cover related subtopics within the same content ecosystem.",
  EXPLAINS: "This page explains a concept that the target page references.",
  EXPANDS: "This page expands on a subtopic introduced by the target page.",
  HOW_TO_FOR: "This page is a how-to guide that serves the intent of the target page.",
  CALCULATOR_FOR: "This page is a calculator/tool that helps users of the target page.",
  COMPARES_WITH: "This page compares the target with alternatives.",
  ALTERNATIVE_TO: "This page presents an alternative to the target.",
  CAUSES: "This page discusses a cause or driver related to the target's topic.",
  SOLVES: "This page provides a solution to a problem discussed in the target.",
  EXAMPLE_OF: "This page provides a concrete example of the target's concept.",
  DEEPER_GUIDE_FOR: "This page is an advanced/deeper guide for the target's topic.",
  READER_NEXT_STEP: "A reader of this page would logically want to continue to the target next.",
  READER_PREVIOUS_STEP: "A reader of this page would have logically come from the target before reading this.",
  USES: "This page uses the target (e.g. a tool or resource) in its discussion.",
  CONNECTS_TO_TOOL: "This page connects the reader to a relevant tool/calculator.",
  MEMBER_OF_COLLECTION: "This page is a member of an editorial collection (the target).",
  PART_OF_TRAIL: "This page is part of the same reading trail / user journey as the target."
};

/**
 * Relationship that should typically be bidirectional (useful in both directions).
 */
export const BIDIRECTIONAL_TYPES = [
  "RELATED_TO", "COMPARES_WITH", "EXPLAINS", "EXPANDS", "PART_OF_TRAIL"
];

/**
 * Relationship that is naturally one-directional (e.g. a supporting article
 * should link to its pillar, but the pillar does not need to enumerate every
 * supporting article link back — decision is contextual).
 */
export const ONE_DIRECTIONAL_TYPES = [
  "PILLAR_OF", "CALCULATOR_FOR", "HOW_TO_FOR", "CONNECTS_TO_TOOL"
];

/**
 * Which relationship types are editorially appropriate between a page and a hub/collection.
 */
export function relationshipBetween(sourceRole, targetRole) {
  const table = {
    "pillar->supporting": ["PILLAR_OF", "SUPPORTS", "EXPANDS"],
    "supporting->pillar": ["SUPPORTS", "EXPLAINS", "PART_OF_TRAIL"],
    "supporting->supporting": ["RELATED_TO", "EXPLAINS", "EXPANDS", "COMPARES_WITH", "READER_NEXT_STEP"],
    "article->tool": ["CALCULATOR_FOR", "USES", "CONNECTS_TO_TOOL", "SOLVES"],
    "tool->article": ["EXPLAINS", "HOW_TO_FOR", "READER_NEXT_STEP"],
    "collection->member": ["MEMBER_OF_COLLECTION", "EXAMPLE_OF", "SUPPORTS"],
    "member->collection": ["MEMBER_OF_COLLECTION", "PART_OF_TRAIL"]
  };
  return table[`${sourceRole}->${targetRole}`] || ["RELATED_TO"];
}

/**
 * Assign a relationship type between two pages based on their roles and shared intent.
 */
export function inferRelationshipType(source, target) {
  const srcRole = source.role || "article";
  const tgtRole = target.role || "article";
  const candidates = relationshipBetween(srcRole, tgtRole) || ["RELATED_TO"];
  // If both share the same cluster and source is a pillar, prefer PILLAR_OF
  if (srcRole === "pillar" && source.cluster === target.cluster) return "PILLAR_OF";
  return candidates[0];
}
