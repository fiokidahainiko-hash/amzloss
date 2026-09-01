/* AmzLoss Editorial Content Network — Content Relationship Graph
   A semantic graph where each edge carries a RELATIONSHIP TYPE (not just "related").
   Extends the existing internal-link graph with richer, editorial metadata:
   topic, subtopic, entity, search intent, user journey, problem solved,
   and bidirectional flag. Reuses the existing graph/node structure. */

import {
  RELATIONSHIP_TYPES, RELATIONSHIP_MEANING, BIDIRECTIONAL_TYPES,
  inferRelationshipType
} from "./relationship_types.mjs";

export const HUB_TYPES = [
  "topic", "problem", "tool", "beginner", "comparison", "resource", "seasonal"
];

export const CONTENT_ROLES = ["pillar", "hub", "supporting", "tool", "collection", "comparison", "guide"];

/**
 * A single semantic relationship edge between two content nodes.
 */
export function createRelationshipEdge({
  source, target, anchorText = "", relationshipType, position = "body",
  context = "", searchIntent = "", problemSolved = "", bidirectional = false
}) {
  const type = relationshipType || inferRelationshipType(source, target);
  return {
    source: source.slug || source,
    target: target.slug || target,
    anchorText,
    relationshipType: type,
    relationshipMeaning: RELATIONSHIP_MEANING[type] || "",
    position,
    context,
    searchIntent,
    problemSolved,
    bidirectional
  };
}

/**
 * Build the full content relationship graph from a list of content nodes
 * and a set of relationship edges.
 */
export function buildContentRelationshipGraph(nodes, edges) {
  const adjacency = {};
  for (const edge of edges) {
    if (!adjacency[edge.source]) adjacency[edge.source] = [];
    adjacency[edge.source].push(edge);
    if (edge.bidirectional) {
      if (!adjacency[edge.target]) adjacency[edge.target] = [];
      adjacency[edge.target].push({ ...edge, source: edge.target, target: edge.source, bidirectional: true });
    }
  }
  return {
    nodes,
    edges,
    adjacency,
    relationshipCounts: countRelationships(edges)
  };
}

/**
 * Count how many of each relationship type exist in the graph.
 */
function countRelationships(edges) {
  const counts = {};
  for (const edge of edges) {
    counts[edge.relationshipType] = (counts[edge.relationshipType] || 0) + 1;
  }
  return counts;
}

/**
 * Find all relationship edges of a given type involving a page.
 */
export function findRelationshipsOfType(graph, pageSlug, type) {
  return graph.edges.filter(e => (e.source === pageSlug || e.target === pageSlug) && e.relationshipType === type);
}

/**
 * Given a page, find its semantic neighbors grouped by relationship meaning.
 */
export function semanticNeighbors(graph, pageSlug) {
  const result = {};
  for (const edge of graph.edges) {
    if (edge.source !== pageSlug && edge.target !== pageSlug) continue;
    const other = edge.source === pageSlug ? edge.target : edge.source;
    const type = edge.relationshipType;
    if (!result[type]) result[type] = [];
    result[type].push({ neighbor: other, edge });
  }
  return result;
}
