/* AmzLoss Editorial Content Network — Integration Test
   Exercises all editorial features with realistic site data.
   Demonstrates: relationship types, entity overlap, hubs/collections,
   reader next/previous step, link scoring, topic coverage,
   cluster completeness, content network health, article metadata,
   auto-update existing articles, related content modules. */

import { extractEntities, entityRelationship, entityOverlap } from "../entity_extraction.mjs";
import { buildContentRelationshipGraph, createRelationshipEdge, semanticNeighbors, findRelationshipsOfType } from "../relationship_graph.mjs";
import { RELATIONSHIP_TYPES, RELATIONSHIP_MEANING, BIDIRECTIONAL_TYPES, inferRelationshipType } from "../relationship_types.mjs";
import { identifyHubs, detectHubForCluster } from "../hub_identifier.mjs";
import { readerNextStepCandidates, readerPreviousStepCandidates, decideBidirectionality } from "../reader_journey.mjs";
import { scoreLinkRecommendation, rankRecommendations, isStrongOpportunity } from "../link_score.mjs";
import { buildTopicCoverageMap } from "../topic_coverage_map.mjs";
import { evaluateEditorialClusterCompleteness } from "../cluster_completeness_editorial.mjs";
import { buildContentNetworkHealth } from "../content_network_health.mjs";
import { whyThisArticleExists, scanExistingArticlesForInboundLinks } from "../article_metadata.mjs";
import { buildEditorialCollections, buildRelatedContentModules } from "../collections.mjs";

/* --- Realistic site content --- */
const pages = [
  { slug: "amazon-affiliate-marketing-guide", title: "Amazon Affiliate Marketing Guide", category: "Tools", keywords: ["amazon affiliate", "marketing", "earnings", "commission", "associates"], role: "pillar", importanceClass: "HIGH", importanceScore: 85 },
  { slug: "commission-rates", title: "Amazon Associates Commission Rates 2026", category: "Tools", keywords: ["commission rates", "amazon associates", "rate table", "category rates"], role: "supporting", importanceClass: "HIGH", importanceScore: 82 },
  { slug: "commission-cuts", title: "Amazon Commission Cuts Explained", category: "Tools", keywords: ["commission cuts", "amazon", "rate cuts", "earnings reduction"], role: "supporting", importanceClass: "MEDIUM", importanceScore: 74 },
  { slug: "affiliate-earnings", title: "How Amazon Affiliate Earnings Work", category: "Tools", keywords: ["affiliate earnings", "amazon", "commission", "earnings calculation", "payout"], role: "supporting", importanceClass: "MEDIUM", importanceScore: 71 },
  { slug: "calculator", title: "Amazon Affiliate Commission Calculator", category: "Tools", keywords: ["commission calculator", "calculate", "earnings", "amazon"], role: "tool", importanceClass: "HIGH", importanceScore: 78 },
  { slug: "earnings-analyzer", title: "Amazon Earnings Report Analyzer", category: "Tools", keywords: ["earnings report", "csv", "amazon", "audit", "payout"], role: "tool", importanceClass: "MEDIUM", importanceScore: 69 },
  { slug: "affiliate-seo", title: "Amazon Affiliate SEO", category: "Tools", keywords: ["affiliate seo", "amazon", "keyword", "ranking", "seo"], role: "supporting", importanceClass: "MEDIUM", importanceScore: 67 },
  { slug: "commission-cuts-impact", title: "How Commission Cuts Impact Your Earnings", category: "Tools", keywords: ["commission cuts", "earnings", "affiliate", "impact", "revenue"], role: "supporting", importanceClass: "MEDIUM", importanceScore: 65 },
  { slug: "high-paying-categories", title: "Highest Paying Amazon Categories", category: "Tools", keywords: ["highest paying", "categories", "commission rates", "luxury beauty", "amazon"], role: "supporting", importanceClass: "MEDIUM", importanceScore: 70 },
  { slug: "earnings-optimization", title: "Amazon Affiliate Earnings Optimization Guide", category: "Tools", keywords: ["earnings optimization", "affiliate", "increase", "commission", "earnings"], role: "supporting", importanceClass: "MEDIUM", importanceScore: 68 },
  { slug: "commission-calculator-guide", title: "Commission Calculator Guide", category: "Tools", keywords: ["commission calculator", "guide", "calculate", "earnings", "amazon"], role: "supporting", importanceClass: "LOW", importanceScore: 55 }
];

console.log("=== EDITORIAL CONTENT NETWORK INTEGRATION TEST ===\n");

/* TEST 1: Entity extraction and overlap */
console.log("--- TEST 1: Entity Extraction & Overlap ---");
const entityA = extractEntities(pages[0]);
const entityB = extractEntities(pages[1]);
console.log("Entities in \"" + pages[0].title + "\": " + entityA.join(", "));
console.log("Entities in \"" + pages[1].title + "\": " + entityB.join(", "));
const overlapScore = entityOverlap(pages[0], pages[1]);
console.log("Entity overlap: " + overlapScore);
const rel = entityRelationship(pages[0], pages[1]);
console.log("Shared entities: " + rel.shared_entities.join(", ") + " | Strong: " + rel.strong_relationship);

/* TEST 2: Relationship graph */
console.log("\n--- TEST 2: Semantic Relationship Graph ---");
const edges = [
  createRelationshipEdge({ source: pages[0], target: pages[1], relationshipType: "PILLAR_OF", anchorText: "Amazon commission rates", bidirectional: false }),
  createRelationshipEdge({ source: pages[0], target: pages[3], relationshipType: "PILLAR_OF", anchorText: "Amazon affiliate earnings", bidirectional: false }),
  createRelationshipEdge({ source: pages[1], target: pages[2], relationshipType: "EXPLAINS", anchorText: "commission cuts", bidirectional: true }),
  createRelationshipEdge({ source: pages[3], target: pages[4], relationshipType: "CALCULATOR_FOR", anchorText: "commission calculator", bidirectional: false }),
  createRelationshipEdge({ source: pages[0], target: pages[4], relationshipType: "SUPPORTS", anchorText: "use the commission calculator", bidirectional: false }),
  createRelationshipEdge({ source: pages[5], target: pages[3], relationshipType: "CONNECTS_TO_TOOL", anchorText: "earnings report analyzer", bidirectional: false }),
  createRelationshipEdge({ source: pages[6], target: pages[0], relationshipType: "SUPPORTS", anchorText: "Amazon affiliate marketing guide", bidirectional: false }),
  createRelationshipEdge({ source: pages[2], target: pages[7], relationshipType: "EXPANDS", anchorText: "how commission cuts impact your earnings", bidirectional: false }),
  createRelationshipEdge({ source: pages[1], target: pages[8], relationshipType: "EXPANDS", anchorText: "highest paying categories", bidirectional: false }),
  createRelationshipEdge({ source: pages[0], target: pages[9], relationshipType: "DEEPER_GUIDE_FOR", anchorText: "earnings optimization guide", bidirectional: false })
];

const graph = buildContentRelationshipGraph(pages, edges);
console.log("Semantic graph: " + graph.nodes.length + " nodes, " + graph.edges.length + " edges");
console.log("Relationship type distribution: " + JSON.stringify(graph.relationshipCounts));
const neighbors = semanticNeighbors(graph, "amazon-affiliate-marketing-guide");
console.log("Neighbors of guide: " + Object.entries(neighbors).map(([type, items]) => type + "(" + items.length + ")").join(", "));

/* TEST 3: Hubs and collections */
console.log("\n--- TEST 3: Hubs and Collections ---");
const hubs = identifyHubs(pages);
console.log("Hubs detected: " + hubs.length);
hubs.forEach(h => console.log("  " + h.hub_type + ": " + h.hub_title + " (" + h.member_count + " members)"));
const collections = buildEditorialCollections("Amazon Affiliate Marketing", pages, pages[0]);
console.log("Collections: " + collections.length);
collections.forEach(c => console.log("  " + c.type + ": " + c.title + " (" + c.members.length + " members)"));

/* TEST 4: Reader next/previous step */
console.log("\n--- TEST 4: Reader Journey ---");
const nextSteps = readerNextStepCandidates(pages[1], pages, graph);
console.log("Reader next steps from \"" + pages[1].title + "\":");
nextSteps.slice(0, 3).forEach(n => console.log("  \u2192 " + n.target_title + " (relevance: " + n.entity_relevance + ", usefulness: " + n.reader_usefulness + ", nextStep: " + n.is_logical_next_step + ")"));
const prevSteps = readerPreviousStepCandidates(pages[2], pages);
console.log("Reader previous steps for \"" + pages[2].title + "\":");
prevSteps.slice(0, 2).forEach(p => console.log("  \u2190 " + p.target_title + " (relevance: " + p.relevance + ")"));

/* TEST 5: Link recommendation scoring */
console.log("\n--- TEST 5: Link Recommendation Scoring ---");
const recA = scoreLinkRecommendation(pages[0], pages[4], { relationshipType: "CONNECTS_TO_TOOL", sameCluster: true, contextual: true });
console.log("Guide \u2192 Calculator: " + recA.scores.overall_recommendation + "/100");
console.log("  topical: " + recA.scores.topical_relevance + " | useful: " + recA.scores.user_usefulness + " | cluster: " + recA.scores.cluster_relationship + " | importance: " + recA.scores.page_importance + " | context: " + recA.scores.context_quality);
const allRecs = pages.slice(0, 4).flatMap(p => pages.slice(4).map(t => scoreLinkRecommendation(p, t, { sameCluster: true })));
const topRecs = rankRecommendations(allRecs, 5);
console.log("Top 5 ranked opportunities:");
topRecs.forEach(r => console.log("  " + r.source_title + " \u2192 " + r.target_title + ": " + r.scores.overall_recommendation + "/100 (strong: " + isStrongOpportunity(r) + ")"));

/* TEST 6: Topic coverage map */
console.log("\n--- TEST 6: Topic Coverage Map ---");
const topicMap = buildTopicCoverageMap("Amazon Affiliate Marketing", pages, pages[0]);
console.log("Core topic: " + topicMap.core_topic);
console.log("Subtopics covered: " + (topicMap.subtopics_covered.join(", ") || "none identified"));
console.log("Missing subtopics: " + topicMap.subtopics_missing.join(", "));
console.log("Recommended future articles: " + topicMap.recommended_future_articles.slice(0, 3).join("; "));

/* TEST 7: Editorial cluster completeness */
console.log("\n--- TEST 7: Editorial Cluster Completeness ---");
const cc = evaluateEditorialClusterCompleteness({ pillar: pages[0], clusterPages: pages.slice(1), linkGraph: graph, topic: "Amazon Affiliate Marketing" });
console.log("Cluster health: " + cc.cluster_health + "/100 (" + cc.status + ")");
console.log("  Topic coverage: " + cc.scores.topic_coverage + " | Internal linking: " + cc.scores.internal_linking);
console.log("  Hub coverage: " + cc.scores.hub_coverage + " | Search intent: " + cc.scores.search_intent_coverage);
console.log("  Orphan content: " + cc.scores.orphan_content + " pages");

/* TEST 8: Content network health dashboard */
console.log("\n--- TEST 8: Content Network Health Dashboard ---");
const health = buildContentNetworkHealth(pages, graph, [cc]);
console.log("  Articles: " + health.total_articles + " | Important: " + health.important_pages);
console.log("  Hubs: " + health.total_hubs + " | Collections: " + health.collections);
console.log("  Internal links: " + health.total_internal_links + " | Contextual: " + health.contextual_internal_links);
console.log("  Orphans: " + health.orphan_pages + " | Under-linked: " + health.under_linked_pages + " | Over-linked: " + health.over_linked_pages);
console.log("  Pages requiring new links: " + health.pages_requiring_new_links.length);

/* TEST 9: Article metadata + auto-update old articles */
console.log("\n--- TEST 9: Article Metadata & Auto-Update Existing ---");
const newArticle = { slug: "earnings-optimization", title: "Amazon Affiliate Earnings Optimization Guide", category: "Tools", keywords: ["earnings optimization", "affiliate", "commission", "earnings"], importanceClass: "MEDIUM" };
const metadata = whyThisArticleExists(pages[9], { pillar_topic: "Amazon Affiliate Marketing" }, pages, graph);
console.log("Article \"" + metadata.article_slug + "\" exists to: belongs to " + metadata.belongs_to_cluster + ", satisfies " + metadata.satisfies_search_intent + " intent");
console.log("Parent pillar: " + metadata.parent_pillar);
console.log("Articles that should link to it: " + metadata.articles_that_should_link_to_it.map(a => a.source_slug).join(", "));
const updateRecs = scanExistingArticlesForInboundLinks(newArticle, pages, graph, { cluster: "Amazon Affiliate Marketing" });
console.log("Auto-update existing articles: " + updateRecs.existing_opportunities_found + " opportunities found");
updateRecs.recommendations.slice(0, 3).forEach(r => console.log("  SOURCE: " + r.source_title + " \u2192 TARGET: " + r.target_title + " | score: " + r.score + " | anchor: \"" + r.suggested_anchor + "\""));

/* TEST 10: Related content modules */
console.log("\n--- TEST 10: Related Content Modules ---");
const modules = buildRelatedContentModules("amazon-affiliate-marketing-guide", graph, pages);
modules.modules.forEach(m => console.log("  " + m.module + ": " + m.items.map(i => i.title).join(", ")));

/* TEST 11: Bidirectional relationship detection */
console.log("\n--- TEST 11: Bidirectional Relationship Detection ---");
const bidir = decideBidirectionality(pages[0], pages[1], "RELATED_TO");
console.log(pages[0].slug + " \u2192 " + pages[1].slug + " | RELATED_TO | bidirectional: " + bidir);
const bidir2 = decideBidirectionality(pages[0], pages[4], "PILLAR_OF");
console.log(pages[0].slug + " \u2192 " + pages[4].slug + " | PILLAR_OF | bidirectional: " + bidir2);

/* TEST 12: Topic coverage - missing content */
console.log("\n--- TEST 12: Missing Content Recommendations ---");
console.log("Missing subtopics: " + (topicMap.subtopics_missing.join(", ") || "all core subtopics covered"));
console.log("Missing problem pages: " + topicMap.missing_content.problem_pages_missing);
console.log("Missing advanced guides: " + topicMap.missing_content.advanced_guides_missing);
console.log("Recommended future articles: " + topicMap.recommended_future_articles.join(" | ") || "none needed");

/* TEST 13: Relationship type distribution */
console.log("\n--- TEST 13: Relationship Types Used ---");
console.log("Types in graph: " + Object.keys(graph.relationshipCounts).join(", "));
console.log("Bidirectional types available: " + BIDIRECTIONAL_TYPES.join(", "));

console.log("\n=== ALL TESTS COMPLETE ===");
