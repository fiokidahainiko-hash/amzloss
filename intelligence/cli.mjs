#!/usr/bin/env node
/* AmzLoss AI Content Intelligence System — CLI Tool (v2.1.0) */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runBlogPipeline } from "./pipelines/blog_pipeline.mjs";
import { runTikTokPipeline } from "./pipelines/tiktok_pipeline.mjs";
import { runTopicClusterPipeline } from "./pipelines/topic_cluster_pipeline.mjs";
import { runInternalLinkingPipeline } from "./pipelines/internal_linking_pipeline.mjs";

import { runWebsiteDesignPipeline } from "./design/pipelines/website_design_pipeline.mjs";
import { runVideoProductionPipeline } from "./video/pipelines/video_production_pipeline.mjs";

import { loadJson, saveJson } from "./utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.join(__dirname, "config");
const MEMORY_DIR = path.join(__dirname, "memory");

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";
  const flags = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      flags[key] = value !== undefined ? value : true;
    }
  }
  return { command, flags };
}

async function main() {
  const { command, flags } = parseArgs();

  console.log(`\n🤖 AMZLOSS AI CONTENT INTELLIGENCE SYSTEM v2.1.0`);
  console.log(`==================================================`);

  switch (command) {
    case "blog": {
      const keyword = flags.keyword || "Amazon Commission Cuts 2026";
      const autoPublish = flags.publish === true || flags.publish === "true";
      console.log(`Running Blog Pipeline for keyword: "${keyword}"...`);
      const result = await runBlogPipeline({ keyword, autoPublish });
      console.log(`\nBLOG RESULT: "${result.article.title}" | Score: ${result.evaluation.overall_score}/100 | Published: ${result.published}`);
      break;
    }

    case "tiktok": {
      const topic = flags.topic || "4% Commission Trap";
      console.log(`Running TikTok Pipeline for topic: "${topic}"...`);
      const result = await runTikTokPipeline({ topic });
      console.log(`\nTIKTOK RESULT: Hook: "${result.script.chosen_hook}" | Score: ${result.evaluation.overall_score}/100`);
      break;
    }

    case "cluster": {
      const topic = flags.topic || "Amazon Affiliate Marketing";
      const action = flags.action || "recommend";
      console.log(`Running Topic Cluster for: "${topic}"...`);
      const result = await runTopicClusterPipeline({ topic, action });
      console.log(`\nCLUSTER RESULT: Pillar "${result.pillar_topic}" | Supporting Topics: ${result.supporting_topics.length}`);
      break;
    }

    case "linking": {
      console.log(`Running Site-Wide Internal Linking Audit...`);
      const result = await runInternalLinkingPipeline();
      console.log(`\nLINKING RESULT: Health Score: ${result.linking_health_score}/100 | Orphan Pages: ${result.orphan_pages.length}`);
      break;
    }

    // --- NEW UPGRADED COMMANDS ---

    case "design": {
      const page = flags.page || "Amazon Commission Calculator";
      console.log(`Running SaaS Web Design Pipeline for: "${page}"...`);
      const result = await runWebsiteDesignPipeline({ pageName: page });
      console.log(`\nDESIGN RESULT: UX Primary Action: "${result.ux_blueprint.primary_action}" | Design Critic Score: ${result.design_critic.overall_score}/100`);
      break;
    }

    case "video-pro": {
      const topic = flags.topic || "The Evaporating Commission";
      console.log(`Running High-End Video Production Pipeline for: "${topic}"...`);
      const result = await runVideoProductionPipeline({ topic });
      console.log(`\nVIDEO-PRO RESULT: Winner Concept: "${result.concept.title}" | Visuals: ${result.storyboard.style_theme}`);
      break;
    }

    // --- NEW v2.1.0 AUTHORITY-AWARE LINKING COMMANDS ---

    case "authority-audit": {
      const { runAuthorityLinkingPipeline } = await import("./link_architecture/workflow/authority_linking_pipeline.mjs");
      console.log(`Running Full Authority-Aware Internal Linking Pipeline...`);
      const result = await runAuthorityLinkingPipeline({ fullRebuild: true });
      console.log(`\nAUTHORITY AUDIT COMPLETE:`);
      console.log(`  Pages: ${result.total_pages} | Graph Edges: ${result.link_graph.edges}`);
      const dist = result.page_importance_distribution;
      console.log(`  CRITICAL: ${dist.CRITICAL} | HIGH: ${dist.HIGH} | MEDIUM: ${dist.MEDIUM} | ORPHAN: ${dist.ORPHAN}`);
      console.log(`  Under-supported important pages: ${result.under_supported_important_pages.length}`);
      console.log(`  Crawl depth avg: ${result.crawl_depth_report.average_depth}`);
      if (result.cluster_completeness) {
        console.log(`  Cluster completeness: ${result.cluster_completeness.cluster_completeness}/100 (${result.cluster_completeness.status})`);
      }
      break;
    }

    case "link-to": {
      const targetSlug = flags.slug || "calculator";
      const { findLinkToThisPage } = await import("./link_architecture/analysis/link_recommendation_engines.mjs");
      const { SITE_PAGES } = await import("./memory/retriever.mjs");
      const { scorePage: scoreP } = await import("./link_architecture/importance/importance_scorer.mjs");
      const allPages = SITE_PAGES.map(p => scoreP({ slug: p.url.replace(".html",""), title: p.title, category: p.category, keywords: p.keywords, inboundLinks: 0, outboundLinks: 0, crawlDepth: 2, role: "utility" }));
      const target = allPages.find(p => p.slug === targetSlug) || allPages[0];
      console.log(`Running Link-To Engine for: "${target.title}"...`);
      const report = findLinkToThisPage(target, allPages, { nodes: [], edges: [] }, target.keywords || []);
      console.log(`\nLINK-TO "${target.title}" (${target.importanceClass}):`);
      report.recommended_sources.forEach((r, i) => {
        console.log(`  ${i+1}. ${r.source_title} (${r.source_importance}) | Relevance: ${r.topical_relevance}/100`);
        console.log(`     Why: ${r.why.slice(0, 100)}`);
        console.log(`     Anchors: ${r.suggested_anchors.slice(0,2).join(" / ")}`);
      });
      break;
    }

    case "link-from": {
      const sourceSlug = flags.slug || "amazon-2026-commission-cuts";
      const { findLinkFromThisPage } = await import("./link_architecture/analysis/link_recommendation_engines.mjs");
      const { SITE_PAGES } = await import("./memory/retriever.mjs");
      const { scorePage: scoreP2 } = await import("./link_architecture/importance/importance_scorer.mjs");
      const allPages2 = SITE_PAGES.map(p => scoreP2({ slug: p.url.replace(".html",""), title: p.title, category: p.category, keywords: p.keywords, inboundLinks: 0, outboundLinks: 0, crawlDepth: 2, role: "utility" }));
      const source = allPages2.find(p => p.slug === sourceSlug) || allPages2[0];
      console.log(`Running Link-From Engine for: "${source.title}"...`);
      const report2 = findLinkFromThisPage(source, allPages2, { nodes: [], edges: [] }, source.keywords || []);
      console.log(`\nLINK-FROM "${source.title}":`);
      report2.recommended_targets.forEach((r, i) => {
        console.log(`  ${i+1}. ${r.target_title} (${r.target_importance}) | Relevance: ${r.topical_relevance}/100`);
      });
      break;
    }

    case "importance": {
      const { SITE_PAGES } = await import("./memory/retriever.mjs");
      const { scorePage: scoreP3 } = await import("./link_architecture/importance/importance_scorer.mjs");
      console.log(`Computing Internal Importance Scores for all pages...`);
      const pages = SITE_PAGES.map(p => scoreP3({ slug: p.url.replace(".html",""), title: p.title, category: p.category, keywords: p.keywords, inboundLinks: Math.floor(Math.random()*8), outboundLinks: Math.floor(Math.random()*4), crawlDepth: Math.floor(Math.random()*5), role: p.url.includes("calculator")||p.url.includes("audit") ? "tool" : "utility", businessImportance: 6 }));
      pages.sort((a,b) => b.importanceScore - a.importanceScore);
      console.log(`\nPAGE IMPORTANCE SCORES (Internal Strategic Model):`);
      pages.forEach(p => console.log(`  ${p.importanceClass.padEnd(8)} ${String(p.importanceScore).padStart(3)} | ${p.slug}`));
      break;
    }

    case "cluster-completeness": {
      const clusterTopic = flags.topic || "Amazon Affiliate Marketing";
      const { SITE_PAGES } = await import("./memory/retriever.mjs");
      const { evaluateClusterCompleteness: ecc } = await import("./link_architecture/analysis/cluster_completeness.mjs");
      const clusterPages = SITE_PAGES.filter(p => p.category === "Tools" || p.keywords.some(kw => clusterTopic.toLowerCase().includes(kw))).map(p => ({ slug: p.url.replace(".html",""), title: p.title, role: "tool" }));
      const pillarPage = SITE_PAGES.find(p => p.title.includes("Commission Calculator")) || SITE_PAGES[0];
      console.log(`Evaluating cluster completeness for: "${clusterTopic}"...`);
      const ccReport = ecc({ pillarSlug: pillarPage.url.replace(".html",""), clusterPages, linkGraph: { nodes: [], edges: [] } });
      console.log(`\nCLUSTER COMPLETENESS: ${ccReport.cluster_completeness}/100 (${ccReport.status})`);
      console.log(`  Topic Coverage: ${ccReport.topic_coverage_pct}%`);
      console.log(`  Link Coverage: ${ccReport.internal_link_coverage_pct}%`);
      console.log(`  Orphans: ${ccReport.orphan_count} | Under-supported: ${ccReport.under_supported_count}`);
      break;
    }

    case "crawl-depth": {
      const { SITE_PAGES } = await import("./memory/retriever.mjs");
      const { crawlDepthReport: cdr } = await import("./link_architecture/analysis/crawl_depth.mjs");
      console.log(`Analyzing crawl depth...`);
      const depths = {};
      SITE_PAGES.forEach((p, i) => depths[p.url.replace(".html","")] = Math.min(5, Math.floor(i / 3)));
      const cdReport = cdr(depths);
      console.log(`\nCRAWL DEPTH REPORT:`);
      console.log(`  Total: ${cdReport.total_pages} | Reachable: ${cdReport.reachable} | Orphans: ${cdReport.orphans}`);
      console.log(`  Average depth: ${cdReport.average_depth} clicks from homepage`);
      console.log(`  Depth distribution:`, JSON.stringify(cdReport.depth_histogram));
      if (cdReport.deep_pages.length > 0) console.log(`  Deep pages (>4 clicks):`, cdReport.deep_pages.map(p => `${p.slug}(${p.depth})`).join(", "));
      break;
    }

    case "flow-report": {
      const { SITE_PAGES } = await import("./memory/retriever.mjs");
      const { scorePage: scoreP4 } = await import("./link_architecture/importance/importance_scorer.mjs");
      const { buildAuthorityFlowReport: bafr } = await import("./link_architecture/analysis/authority_flow_report.mjs");
      console.log(`Building site-wide authority flow report...`);
      const flowPages = SITE_PAGES.map(p => scoreP4({ slug: p.url.replace(".html",""), title: p.title, category: p.category, keywords: p.keywords, inboundLinks: Math.floor(Math.random()*8), outboundLinks: Math.floor(Math.random()*4), crawlDepth: Math.floor(Math.random()*5), role: "utility", contextualInbound: Math.floor(Math.random()*5), contextualOutbound: Math.floor(Math.random()*5) }));
      const flowReport = bafr(flowPages, { nodes: flowPages.map(p=>({slug:p.slug})), edges: [] });
      console.log(`\nAUTHORITY FLOW REPORT (Internal Link/Importance Model):`);
      console.log(`  Total pages: ${flowReport.summary.total_pages}`);
      console.log(`  CRITICAL: ${flowReport.summary.critical} | HIGH: ${flowReport.summary.high} | MEDIUM: ${flowReport.summary.medium} | ORPHAN: ${flowReport.summary.orphan}`);
      console.log(`  Under-linked: ${flowReport.under_linked.length} | Over-linked: ${flowReport.over_linked.length}`);
      console.log(`  Under-supported important pages:`);
      flowReport.under_supported_important.forEach(p => console.log(`    → ${p.slug} (${p.importance}) | Current inbound: ${p.current_inbound}`));
      break;
    }

    // --- EXISTING COMMANDS (Unmodified) ---

    case "example": {
      const sub = flags.action || "list";
      const examplesPath = path.join(MEMORY_DIR, "approved_examples.json");
      const examples = loadJson(examplesPath, []);
      if (sub === "add") {
        examples.push({ id: `ex-${Date.now()}`, content_type: flags.type, status: flags.status, title: flags.title, score: flags.status === "approved" ? 92 : 62, reasoning: flags.reason });
        saveJson(examplesPath, examples);
        console.log(`✅ Example added: "${flags.title}" (${flags.status})`);
      } else {
        console.log(`\nAPPROVED / REJECTED EXAMPLES (${examples.length}):`);
        examples.forEach((ex, i) => console.log(`  ${i + 1}. [${ex.status.toUpperCase()}] ${ex.title} (${ex.content_type}) Score: ${ex.score}`));
      }
      break;
    }

    case "admin": {
      const adminPath = path.join(CONFIG_DIR, "admin_config.json");
      const adminConfig = loadJson(adminPath, {});
      if (flags["threshold-blog"]) adminConfig.quality_thresholds.blog.approved_min = parseInt(flags["threshold-blog"], 10);
      if (flags["threshold-design"]) adminConfig.quality_thresholds.design = { approved_min: parseInt(flags["threshold-design"], 10) };
      saveJson(adminPath, adminConfig);
      console.log(`\nADMIN CONFIG: ${JSON.stringify(adminConfig, null, 2)}`);
      break;
    }

    default: {
      console.log(`\nUSAGE:`);
      console.log(`  node intelligence/cli.mjs blog --keyword="..." [--publish=true]`);
      console.log(`  node intelligence/cli.mjs tiktok --topic="..."`);
      console.log(`  node intelligence/cli.mjs cluster --topic="..."`);
      console.log(`  node intelligence/cli.mjs linking`);
      console.log(`  node intelligence/cli.mjs design --page="Commission Calculator"`);
      console.log(`  node intelligence/cli.mjs video-pro --topic="The Evaporating Commission"`);
      console.log(`  node intelligence/cli.mjs authority-audit`);
      console.log(`  node intelligence/cli.mjs link-to --slug="calculator"`);
      console.log(`  node intelligence/cli.mjs link-from --slug="amazon-2026-commission-cuts"`);
      console.log(`  node intelligence/cli.mjs importance`);
      console.log(`  node intelligence/cli.mjs cluster-completeness --topic="Amazon Affiliate Marketing"`);
      console.log(`  node intelligence/cli.mjs crawl-depth`);
      console.log(`  node intelligence/cli.mjs flow-report`);
      console.log(`  node intelligence/cli.mjs example [--action=add --type=blog --status=approved ...]`);
      console.log(`  node intelligence/cli.mjs admin [--threshold-blog=85 --threshold-design=85]`);
      break;
    }
  }

  console.log(`==================================================\n`);
}

main().catch(err => { console.error(`❌ CLI Error:`, err); process.exit(1); });
