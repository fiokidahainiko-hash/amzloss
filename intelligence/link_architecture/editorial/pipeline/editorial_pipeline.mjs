/* AmzLoss Editorial Content Network — Master Editorial Pipeline
   Ties together: relationship graph, entity extraction, hubs/collections,
   reader journey (next/previous step), link scoring, topic coverage, cluster
   completeness, content network health, article metadata, and auto-update of
   existing articles. Reuses the existing internal-link graph/importance systems. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SITE_PAGES } from "../../../memory/retriever.mjs";
import { scorePage } from "../../importance/importance_scorer.mjs";
import { buildLinkGraph, adjacencyList } from "../../graph/link_graph.mjs";

import { buildContentRelationshipGraph, createRelationshipEdge } from "../relationship_graph.mjs";
import { identifyHubs } from "../hub_identifier.mjs";
import { readerNextStepCandidates, readerPreviousStepCandidates, decideBidirectionality } from "../reader_journey.mjs";
import { scoreLinkRecommendation, rankRecommendations, isStrongOpportunity } from "../link_score.mjs";
import { buildTopicCoverageMap } from "../topic_coverage_map.mjs";
import { evaluateEditorialClusterCompleteness } from "../cluster_completeness_editorial.mjs";
import { buildContentNetworkHealth } from "../content_network_health.mjs";
import { whyThisArticleExists, scanExistingArticlesForInboundLinks } from "../article_metadata.mjs";
import { buildEditorialCollections, buildRelatedContentModules } from "../collections.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..", "..", "..");
const BLOGS_DIR = path.join(ROOT, "blogs");
const STATE_DIR = path.join(ROOT, "intelligence", "link_architecture", "editorial", "state");

/**
 * Run the editorial content-network analysis over a topic cluster.
 */
export async function runEditorialContentNetworkPipeline({ topic = "Amazon Affiliate Marketing", clusterPages = null, newArticle = null, allKnownPages = null } = {}) {
  console.log(`\n==================================================`);
  console.log(`[Editorial Content Network Pipeline] Topic: ${topic}`);
  console.log(`==================================================\n`);

  fs.mkdirSync(STATE_DIR, { recursive: true });

  // ---- Gather all pages (tools + blogs) and enrich with importance ----
  const pages = allKnownPages || collectAllPages({ includeNew: newArticle });

  const scoredPages = pages.map(p => scorePage({
    slug: p.slug, title: p.title, category: p.category, keywords: p.keywords,
    role: p.role || "supporting", crawlDepth: p.crawlDepth ?? 3,
    inboundLinks: p.inboundLinks || 0, outboundLinks: p.outboundLinks || 0,
    businessImportance: p.businessImportance || 5, contentQuality: p.contentQuality || 7,
    isOrphan: p.isOrphan || false
  }));

  const pageMap = {};
  for (const p of scoredPages) pageMap[p.slug] = p;

  // ---- Identify the cluster ----
  const cluster = clusterPages || scoredPages.filter(p => p.category === "Tools" || p.category === "Amazon" || (p.keywords || []).some(k => topic.toLowerCase().includes(k)));
  const pillar = cluster.find(p => p.title === topic || p.role === "pillar") || cluster[0] || null;

  // ---- Build the raw link graph + a semantic relationship graph ----
  const linkGraph = buildLinkGraphHtml(scoredPages);
  const { inbound, outbound } = adjacencyList(linkGraph);

  // ---- Semantic relationship edges ----
  const relationshipEdges = [];
  for (const source of scoredPages) {
    for (const target of scoredPages) {
      if (source.slug === target.slug) continue;
      const rec = scoreLinkRecommendation(source, target, {
        relationshipType: "RELATED_TO",
        sameCluster: source.category === target.category,
        contextual: true
      });
      if (!isStrongOpportunity(rec, 70)) continue;
      const bidirectional = decideBidirectionality(source, target, "RELATED_TO");
      relationshipEdges.push(createRelationshipEdge({
        source, target,
        relationshipType: bidirectional ? "RELATED_TO" : "SUPPORTS",
        anchorText: target.title,
        bidirectional
      }));
    }
  }
  const semanticGraph = buildContentRelationshipGraph(scoredPages, relationshipEdges);

  // ---- Reader journey (next/previous step) for the cluster ----
  const nextSteps = {};
  const previousSteps = {};
  for (const p of scoredPages) {
    nextSteps[p.slug] = readerNextStepCandidates(p, scoredPages, linkGraph);
    previousSteps[p.slug] = readerPreviousStepCandidates(p, scoredPages);
  }

  // ---- Hubs & collections ----
  const hubs = identifyHubs(scoredPages);
  const collections = buildEditorialCollections(topic, cluster, pillar);

  // ---- Topic coverage map ----
  const topicMap = buildTopicCoverageMap(topic, cluster, pillar);

  // ---- Cluster completeness (editorial) ----
  const clusterCompleteness = evaluateEditorialClusterCompleteness({ pillar, clusterPages: cluster, linkGraph, topic });

  // ---- Content network health ----
  const networkHealth = buildContentNetworkHealth(scoredPages, linkGraph, [clusterCompleteness]);

  // ---- Why-this-article metadata + auto-update old articles (if new article) ----
  let newArticleResult = null;
  if (newArticle) {
    const article = pageMap[newArticle.slug] || scoredPages[0];
    const inboundRecommendations = scanExistingArticlesForInboundLinks(
      { slug: newArticle.slug, title: newArticle.title, keywords: newArticle.keywords || [] },
      scoredPages.filter(p => p.slug !== newArticle.slug),
      linkGraph,
      { cluster: topic }
    );
    newArticleResult = {
      metadata: whyThisArticleExists(article, { pillar_topic: topic }, scoredPages, linkGraph),
      inbound_link_recommendations: inboundRecommendations,
      related_content_modules: buildRelatedContentModules(newArticle.slug, semanticGraph, scoredPages)
    };
  }

  const report = {
    topic,
    pillar_slug: pillar?.slug || null,
    cluster_pages: cluster.map(p => p.slug),
    relationship_types_used: Object.keys(clusterCompleteness.scores) && semanticGraph.relationshipCounts,
    semantic_graph: { nodes: semanticGraph.nodes.length, edges: semanticGraph.edges.length, relationship_count: semanticGraph.relationshipCounts },
    hubs_identified: hubs,
    collections_identified: collections,
    reader_next_steps: Object.fromEntries(Object.entries(nextSteps).slice(0, 5)),
    reader_previous_steps: Object.fromEntries(Object.entries(previousSteps).slice(0, 5)),
    topic_coverage_map: topicMap,
    cluster_completeness: clusterCompleteness,
    content_network_health: networkHealth,
    new_article_workflow: newArticleResult
  };

  try {
    fs.writeFileSync(path.join(STATE_DIR, "latest_editorial_report.json"), JSON.stringify(report, null, 2), "utf-8");
  } catch (e) {}

  console.log(`\n==================================================`);
  console.log(`[Editorial Content Network Pipeline Complete]`);
  console.log(`Cluster: ${cluster.length} pages | Hubs: ${hubs.length} | Collections: ${collections.length}`);
  console.log(`Semantic edges: ${semanticGraph.edges.length} | Cluster health: ${clusterCompleteness.cluster_health}/100 (${clusterCompleteness.status})`);
  console.log(`==================================================\n`);

  return report;
}

/* --- helpers --- */

function collectAllPages({ includeNew = null } = {}) {
  const pages = SITE_PAGES.map(p => ({
    slug: p.url.replace(".html", ""), title: p.title, category: p.category,
    keywords: p.keywords, role: (p.url.includes("calculator") || p.url.includes("audit") || p.url.includes("rates")) ? "tool" : (p.category === "Tools" ? "tool" : "supporting"),
    searchIntent: p.category === "Tools" ? "transactional" : "informational"
  }));

  if (fs.existsSync(BLOGS_DIR)) {
    const files = fs.readdirSync(BLOGS_DIR).filter(f => f.endsWith(".html"));
    for (const file of files) {
      const slug = file.replace(".html", "");
      if (!pages.some(p => p.slug === slug)) {
        pages.push({ slug, title: slug.replace(/-/g, " "), category: "Amazon", keywords: [], role: "supporting", searchIntent: "informational" });
      }
    }
  }

  if (includeNew) {
    pages.push({ slug: includeNew.slug, title: includeNew.title, category: includeNew.category || "Amazon", keywords: includeNew.keywords || [], role: "supporting", searchIntent: "informational" });
  }
  return pages;
}

function buildLinkGraphHtml(pages) {
  // Build a minimal HTML map from titles so the existing graph builder can run
  const htmlMap = new Map();
  for (const p of pages) {
    htmlMap.set(p.slug, `<html><h1>${p.title}</h1><p>${(p.keywords || []).join(" ")} </p></html>`);
  }
  return buildLinkGraph(htmlMap);
}
