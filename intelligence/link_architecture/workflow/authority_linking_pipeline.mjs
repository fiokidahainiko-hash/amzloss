/* AmzLoss Internal Link Architecture — Authority-Aware Internal Linking Pipeline (v2.1.0) */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SITE_PAGES } from "../../memory/retriever.mjs";
import { scorePage } from "../importance/importance_scorer.mjs";
import { buildLinkGraph, persistGraph } from "../graph/link_graph.mjs";
import { computeCrawlDepths, crawlDepthReport } from "../analysis/crawl_depth.mjs";
import { findLinkToThisPage, findLinkFromThisPage } from "../analysis/link_recommendation_engines.mjs";
import { evaluateClusterCompleteness } from "../analysis/cluster_completeness.mjs";
import { buildAuthorityFlowReport } from "../analysis/authority_flow_report.mjs";
import { generateAnchorVariations } from "../analysis/anchor_text.mjs";
import { runUpgradedInternalLinkingAgent } from "../agents/upgraded_internal_linking_agent.mjs";
import { adjacencyList } from "../graph/link_graph.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..", "..");
const BLOGS_DIR = path.join(ROOT, "blogs");
const STATE_DIR = path.join(ROOT, "intelligence", "link_architecture", "state");

function ensureStateDir() { fs.mkdirSync(STATE_DIR, { recursive: true }); }

export async function runAuthorityLinkingPipeline(opts = {}) {
  const { topicCluster = null, newArticle = null, fullRebuild = false } = opts;

  console.log(`\n==================================================`);
  console.log(`[Authority-Aware Internal Linking Pipeline] Starting...`);
  console.log(`==================================================\n`);

  ensureStateDir();

  // 1. Collect all pages
  const allPageHtmlMap = new Map();
  const toolPages = SITE_PAGES.map(p => ({
    slug: p.url.replace(".html", ""),
    title: p.title,
    category: p.category,
    keywords: p.keywords,
    url: p.url,
    role: (p.url.includes("calculator") || p.url.includes("audit") || p.url.includes("rates")) ? "tool" : "utility",
    businessImportance: (p.url.includes("calculator") || p.url.includes("audit") || p.url.includes("rates")) ? 8 : 6,
    inboundLinks: 0, outboundLinks: 0, crawlDepth: 2
  }));

  const blogPages = [];
  if (fs.existsSync(BLOGS_DIR)) {
    const files = fs.readdirSync(BLOGS_DIR).filter(f => f.endsWith(".html"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(BLOGS_DIR, file), "utf-8");
      const slug = file.replace(".html", "");
      allPageHtmlMap.set(slug, content);
      blogPages.push({
        slug,
        title: content.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() || slug,
        content, category: extractCategory(content), keywords: extractKeywords(content),
        role: "supporting", businessImportance: 5, inboundLinks: 0, outboundLinks: 0, crawlDepth: 4
      });
    }
  }

  for (const tp of toolPages) allPageHtmlMap.set(tp.slug, "<html><body><a href='" + tp.url + "'>" + tp.title + "</a></body></html>");

  if (newArticle) {
    allPageHtmlMap.set(newArticle.slug, newArticle.content || "<h1>" + newArticle.title + "</h1>");
    blogPages.push({
      slug: newArticle.slug, title: newArticle.title, content: newArticle.content || "",
      category: newArticle.category || "Tools", keywords: newArticle.keywords || [],
      role: topicCluster?.pillar_topic === newArticle.title ? "pillar" : "supporting",
      businessImportance: 6, inboundLinks: 0, outboundLinks: 0, crawlDepth: 3, isOrphan: true
    });
  }

  const allPages = [...toolPages, ...blogPages];

  // 2. Build link graph
  console.log("[Step 2] Building internal link graph...");
  const linkGraph = buildLinkGraph(allPageHtmlMap);
  persistGraph(linkGraph);

  // 3. Compute crawl depths
  console.log("[Step 3] Computing crawl depths...");
  const crawlDepths = computeCrawlDepths(linkGraph);
  const depthReport = crawlDepthReport(crawlDepths);
  for (const p of allPages) p.crawlDepth = crawlDepths[p.slug] ?? 5;

  // 4. Count inbound/outbound
  const { inbound, outbound } = adjacencyList(linkGraph);
  for (const p of allPages) {
    p.inboundLinks = (inbound[p.slug] || []).length;
    p.outboundLinks = (outbound[p.slug] || []).length;
    p.contextualInbound = (inbound[p.slug] || []).filter(e => e.isContextual).length;
    p.contextualOutbound = (outbound[p.slug] || []).filter(e => e.isContextual).length;
    p.isOrphan = p.inboundLinks === 0;
  }

  // 5. Compute importance scores
  console.log("[Step 5] Computing internal importance scores...");
  const scoredPages = allPages.map(p => scorePage(p));

  // 6. Under-supported
  const underSupported = scoredPages.filter(p =>
    (p.importanceClass === "CRITICAL" || p.importanceClass === "HIGH") && p.contextualInbound < 3
  );

  // 7. Link-To reports
  console.log("[Step 7] Generating authority-aware link recommendations...");
  const importantPages = scoredPages.filter(p => p.importanceClass === "CRITICAL" || p.importanceClass === "HIGH").slice(0, 10);
  const linkToReports = importantPages.map(p => findLinkToThisPage(p, scoredPages, linkGraph, p.keywords || []));

  // 8. Cluster completeness
  let clusterReport = null;
  if (topicCluster?.pillar_topic && topicCluster?.supporting_topics) {
    console.log("[Step 8] Evaluating cluster completeness...");
    const clusterPages = topicCluster.supporting_topics.map(st => scoredPages.find(p => p.slug === st.target_slug || p.title === st.title)).filter(Boolean);
    clusterReport = evaluateClusterCompleteness({
      pillarSlug: scoredPages.find(p => p.title === topicCluster.pillar_topic)?.slug || topicCluster.pillar_topic,
      clusterPages, linkGraph
    });
  }

  // 9. Authority flow report
  console.log("[Step 9] Building site-wide authority flow report...");
  const authorityFlowReport = buildAuthorityFlowReport(scoredPages, linkGraph);

  // 10. Agent for new article
  let agentResult = null;
  if (newArticle) {
    console.log("[Step 10] Running authority-aware linking agent...");
    const targetPage = scoredPages.find(p => p.slug === newArticle.slug) || blogPages[blogPages.length - 1];
    const strongCandidates = scoredPages.filter(p => (p.contextualInbound > 2 || p.importanceClass !== "LOW") && p.slug !== newArticle.slug).sort((a, b) => b.importanceScore - a.importanceScore).slice(0, 10);
    agentResult = await runUpgradedInternalLinkingAgent({
      articleContent: newArticle.content || "", articleSlug: newArticle.slug, category: newArticle.category || "Tools",
      importanceScore: targetPage.importanceScore, importanceClass: targetPage.importanceClass,
      currentInboundLinks: 0, topicCluster, crawlDepth: targetPage.crawlDepth,
      candidateStrongSources: strongCandidates.map(p => ({ slug: p.slug, title: p.title, importanceClass: p.importanceClass, importanceScore: p.importanceScore, topicalRelevance: 70 }))
    });
  }

  const finalReport = {
    pipeline_timestamp: new Date().toISOString(),
    total_pages: scoredPages.length, total_tool_pages: toolPages.length, total_blog_pages: blogPages.length,
    link_graph: { nodes: linkGraph.nodes.length, edges: linkGraph.edges.length },
    crawl_depth_report: depthReport,
    page_importance_distribution: {
      CRITICAL: scoredPages.filter(p => p.importanceClass === "CRITICAL").length,
      HIGH: scoredPages.filter(p => p.importanceClass === "HIGH").length,
      MEDIUM: scoredPages.filter(p => p.importanceClass === "MEDIUM").length,
      LOW: scoredPages.filter(p => p.importanceClass === "LOW").length,
      ORPHAN: scoredPages.filter(p => p.importanceClass === "ORPHAN").length
    },
    under_supported_important_pages: underSupported.map(p => ({ slug: p.slug, title: p.title, importance: p.importanceClass, score: p.importanceScore, contextual_inbound: p.contextualInbound, recommended_min: p.importanceClass === "CRITICAL" ? 5 : 3 })),
    link_to_reports: linkToReports,
    cluster_completeness: clusterReport,
    authority_flow_report: authorityFlowReport,
    new_article_workflow: agentResult ? { slug: agentResult.article_slug, recommendations: agentResult } : null,
    anchor_variations_sample: generateAnchorVariations("Amazon Affiliate Commission Calculator", "commission calculator")
  };

  try { fs.writeFileSync(path.join(STATE_DIR, "latest_authority_report.json"), JSON.stringify(finalReport, null, 2), "utf-8"); } catch (e) {}

  console.log(`\n==================================================`);
  console.log(`[Authority-Aware Internal Linking Pipeline Complete]`);
  console.log(`Pages: ${scoredPages.length} | Edges: ${linkGraph.edges.length} | Orphans: ${finalReport.page_importance_distribution.ORPHAN}`);
  console.log(`Under-supported: ${underSupported.length} | Depth avg: ${depthReport.average_depth}`);
  console.log(`==================================================\n`);

  return finalReport;
}

function extractCategory(html) {
  if (html.includes("commission rate") || html.includes("Amazon rate")) return "Amazon";
  if (html.includes("backlink") || html.includes("link building")) return "Link Building";
  if (html.includes("ShareASale") || html.includes("CJ Affiliate")) return "Networks";
  return "Tools";
}

function extractKeywords(html) {
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "";
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] || "";
  return (title + " " + h1).toLowerCase().split(/[\s\u2013|,]+/).filter(w => w.length > 4).slice(0, 8);
}
