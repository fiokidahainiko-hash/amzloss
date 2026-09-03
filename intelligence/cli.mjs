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
  let subcommand = null;
  let positionalArgCount = 0;
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      flags[key] = value !== undefined ? value : true;
    } else if (!subcommand && positionalArgCount === 0) {
      subcommand = arg;
      positionalArgCount++;
    }
  }
  return { command, subcommand, flags };
}

async function main() {
  const { command, subcommand, flags } = parseArgs();

  console.log(`\n🤖 AMZLOSS AI CONTENT INTELLIGENCE SYSTEM v2.2.0`);
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

    // --- NEW v2.2.0 EDITORIAL CONTENT NETWORK COMMANDS ---

    case "editorial": {
      const enTopic = flags.topic || "Amazon Affiliate Marketing";
      const newArt = flags["new-article"] ? { slug: flags["new-article"], title: flags["new-article"].replace(/-/g, " "), category: "Amazon", keywords: [] } : null;
      const { runEditorialContentNetworkPipeline } = await import("./link_architecture/editorial/pipeline/editorial_pipeline.mjs");
      console.log(`Running Editorial Content Network Pipeline for: "${enTopic}"...`);
      const report = await runEditorialContentNetworkPipeline({ topic: enTopic, newArticle: newArt });
      console.log(`\nEDITORIAL CONTENT NETWORK RESULT:`);
      console.log(`  Semantic edges: ${report.semantic_graph.edges} | Hubs: ${report.hubs_identified.length} | Collections: ${report.collections_identified.length}`);
      console.log(`  Cluster health: ${report.cluster_completeness.cluster_health}/100 (${report.cluster_completeness.status})`);
      console.log(`  Topic coverage: ${report.cluster_completeness.scores.topic_coverage} | Search intent: ${report.cluster_completeness.scores.search_intent_coverage}`);
      console.log(`  Relationship types used: ${Object.keys(report.semantic_graph.relationship_count).join(", ")}`);
      if (report.new_article_workflow) {
        console.log(`  NEW ARTICLE inbound opportunities (auto-update existing): ${report.new_article_workflow.inbound_link_recommendations.existing_opportunities_found}`);
      }
      break;
    }

    case "relationships": {
      const relSlug = flags.slug || "calculator";
      const { entityRelationship } = await import("./link_architecture/editorial/entity_extraction.mjs");
      const { SITE_PAGES } = await import("./memory/retriever.mjs");
      const pages = SITE_PAGES.map(p => ({ slug: p.url.replace(".html",""), title: p.title, keywords: p.keywords }));
      const target = pages.find(p => p.slug === relSlug) || pages[0];
      console.log(`Entity relationships for: "${target.title}"`);
      pages.filter(p => p.slug !== target.slug).forEach(p => {
        const rel = entityRelationship(target, p);
        if (rel.shared_entities.length > 0) {
          console.log(`  → ${p.title} | entities: ${rel.shared_entities.join(", ")} | overlap: ${rel.overlap_score}`);
        }
      });
      break;
    }

    case "collections": {
      const { buildEditorialCollections } = await import("./link_architecture/editorial/collections.mjs");
      const { SITE_PAGES } = await import("./memory/retriever.mjs");
      const cluster = SITE_PAGES.map(p => ({ slug: p.url.replace(".html",""), title: p.title, role: (p.url.includes("calculator")||p.url.includes("audit")) ? "tool" : "supporting" }));
      console.log(`Identifying editorial collections...`);
      const collections = buildEditorialCollections("Amazon Affiliate Marketing", cluster, cluster[0]);
      console.log(`\nEDITORIAL COLLECTIONS (${collections.length}):`);
      collections.forEach(c => console.log(`  ${c.type}: ${c.title} | members: ${c.members.length} | ${c.value}`));
      break;
    }

    case "network-health": {
      const { buildContentNetworkHealth } = await import("./link_architecture/editorial/content_network_health.mjs");
      const { buildTopicCoverageMap } = await import("./link_architecture/editorial/topic_coverage_map.mjs");
      const { scorePage: scoreP5 } = await import("./link_architecture/importance/importance_scorer.mjs");
      const { SITE_PAGES } = await import("./memory/retriever.mjs");
      const pages = SITE_PAGES.map(p => scoreP5({ slug: p.url.replace(".html",""), title: p.title, category: p.category, keywords: p.keywords, inboundLinks: Math.floor(Math.random()*6), outboundLinks: Math.floor(Math.random()*4), crawlDepth: 2, role: (p.url.includes("calculator")||p.url.includes("audit")) ? "tool" : "supporting", businessImportance: 6 }));
      console.log(`Building content network health dashboard...`);
      const health = buildContentNetworkHealth(pages, { edges: [] }, []);
      console.log(`\nCONTENT NETWORK HEALTH DASHBOARD:`);
      console.log(`  Articles: ${health.total_articles} | Important: ${health.important_pages} | Tools: ${health.tools}`);
      console.log(`  Hubs: ${health.total_hubs} (incl ${health.hub_opportunities} opportunities) | Collections: ${health.collections}`);
      console.log(`  Orphans: ${health.orphan_pages} | Under-linked: ${health.under_linked_pages} | Over-linked: ${health.over_linked_pages}`);
      console.log(`  Pages requiring new links: ${health.pages_requiring_new_links.length}`);
      break;
    }

    // --- v2.3.0 SEO INTELLIGENCE & TOPICAL AUTHORITY ENGINE COMMANDS ---

    case "seo": {
      const { runSeoEngine, nextAction, seoMemoryOverview, pendingApprovals, approveGate, rejectGate, contentGapAnalysis, topicalAuthorityMap, technicalPriorityFixes, competitorGapAnalysis, backlinkOpportunityEngine, linkableAssetEngine, decayAnalysis, cannibalizationAnalysis, articleBlueprint, optimizeArticle, createExperiment, listExperiments } = await import("./seo/index.mjs");
      const action = subcommand || "report";

      switch (action) {
        case "audit":
        case "opportunities":
        case "report": {
          const result = await runSeoEngine();
          console.log("\n" + result.markdown);
          console.log(`\n[SEO REPORT] saved to ${result.report_path}`);
          break;
        }
        case "keywords": {
          const { keywordIntelligence } = await import("./seo/index.mjs");
          const { site } = await runSeoEngine();
          const kw = keywordIntelligence(site);
          console.log(`\nKEYWORD INTELLIGENCE (${kw.total_keywords} keywords):`);
          kw.by_cluster && Object.entries(kw.by_cluster).forEach(([c, q]) => console.log(`  ${c}: ${q.length} queries`));
          console.log(`\n  Intent distribution: ${JSON.stringify(kw.intent_coverage)}`);
          console.log(`  ${kw.note}`);
          break;
        }
        case "gaps": {
          const { site } = await runSeoEngine();
          const gaps = contentGapAnalysis(site);
          console.log(`\nGENUINE CONTENT GAPS (${gaps.total_gaps}):`);
          gaps.gaps.slice(0, 10).forEach(g => console.log(`  [${g.priority_score}] ${g.topic} (${g.cluster}, ${g.intent})`));
          console.log(`\n${gaps.note}`);
          break;
        }
        case "cluster": {
          const clusterFlag = flags.topic || flags.cluster;
          const { clusterAuthorityScore } = await import("./seo/index.mjs");
          const { site } = await runSeoEngine();
          const target = clusterFlag && site.clusters[clusterFlag] ? clusterFlag : Object.keys(site.clusters)[0];
          const a = clusterAuthorityScore(site, target);
          console.log(`\nCLUSTER AUTHORITY: ${target} = ${a.score}/100 (${a.tier})  [strategic ${a.strategic_importance}]`);
          console.log(`  Members: ${a.members} | avg SEO ${a.avg_seo_quality} | avg inbound ${a.avg_inbound_links}`);
          console.log(`  Verdict: ${a.verdict.action} — ${a.verdict.reason}`);
          a.component_scores && Object.entries(a.component_scores).forEach(([k, v]) => console.log(`    ${k}: ${v}`));
          break;
        }
        case "cannibalization": {
          const { site } = await runSeoEngine();
          const c = cannibalizationAnalysis(site);
          console.log(`\nCANNIBALIZATION (${c.total_cases} cases, ${c.unresolved} unresolved):`);
          c.unresolved.forEach(u => console.log(`  ${u.article_a.slug} <-> ${u.article_b.slug} (${u.overlap_pct}%) => ${u.decision}${u.requires_approval ? " [APPROVAL]" : ""}`));
          break;
        }
        case "competitors": {
          const { site } = await runSeoEngine();
          const comp = competitorGapAnalysis(site);
          console.log(`\nCOMPETITOR GAP ANALYSIS (${comp.total_gaps} gaps):`);
          comp.coverage_gaps.slice(0, 8).forEach(g => console.log(`  COVERAGE → ${g.topic} (${g.competitor}) ${g.opportunity}`));
          comp.depth_gaps.filter(g => g.deeper_needed).slice(0, 8).forEach(g => console.log(`  DEPTH → ${g.our_slug} (${g.our_words}w) vs ${g.competitor}`));
          console.log(`\n  ${comp.note}`);
          break;
        }
        case "backlinks": {
          const { site } = await runSeoEngine();
          const assets = linkableAssetEngine(site);
          const opps = backlinkOpportunityEngine(site);
          console.log(`\nLINKABLE ASSET ENGINE (top ${assets.assets.length} pages):`);
          assets.top_assets.forEach(a => console.log(`  [${a.asset_score}] ${a.slug} (${a.asset_tier})`));
          console.log(`\nBACKLINK OPPORTUNITIES:`);
          if (opps.provided) opps.top_opportunities.forEach(o => console.log(`  ${o.external_domain} (${o.kind})`));
          else console.log(`  ${opps.note}`);
          break;
        }
        case "technical": {
          const { site } = await runSeoEngine();
          const fix = technicalPriorityFixes(site);
          console.log(`\nTECHNICAL SEOSITE ISSUES:`);
          fix.top_global_issues.slice(0, 8).forEach(i => console.log(`  ${i.check}: ${i.count} pages`));
          console.log(`\n  ${fix.summary}`);
          break;
        }
        case "content-decay": {
          const { site } = await runSeoEngine();
          const d = decayAnalysis(site);
          console.log(`\nCONTENT DECAY (${d.decayed_count} of ${d.total} decayed):`);
          d.decayed_pages.slice(0, 8).forEach(p => console.log(`  ${p.slug}: ${p.reasons.join("; ")} (risk ${p.risk_score})`));
          console.log(`\n  ${d.summary}`);
          break;
        }
        case "next-action": {
          const { site } = await runSeoEngine();
          const na = nextAction(site);
          console.log(`\n[SEO NEXT ACTION]`);
          console.log(`  ${na.type}: ${na.one_liner}`);
          console.log(`  Approval required: ${na.approval_required}`);
          if (na.reason) console.log(`  Why: ${na.reason}`);
          break;
        }
        case "blueprint": {
          const bpTopic = flags.topic || flags.for || "";
          const { site } = await runSeoEngine();
          if (!site) { console.log("No site data"); break; }
          const { bestGap, articleBlueprint } = await import("./seo/index.mjs");
          let candidate = null;
          if (bpTopic) {
            candidate = { topic: bpTopic, cluster: flags.cluster || null, intent: flags.intent || null, proposed_slug: bpTopic.toLowerCase().replace(/[^a-z0-9]+/g, "-") };
          } else {
            const g = bestGap(site);
            if (g) candidate = { topic: g.topic, cluster: g.cluster, intent: g.intent, proposed_slug: g.proposed_slug };
          }
          if (!candidate) { console.log("No gap found — no blueprint needed."); break; }
          const bp = articleBlueprint(site, { title: candidate.topic, cluster: candidate.cluster, intent: candidate.intent, slug: candidate.proposed_slug });
          console.log(`\nARTICLE BLUEPRINT: ${bp.title || candidate.topic}`);
          console.log(`  Slug: ${bp.slug} | Intent: ${bp.intent} | Cluster: ${bp.cluster}`);
          console.log(`  Cluster authority: ${bp.cluster_authority}/100 (${bp.cluster_tier})`);
          console.log(`  Entities to cover: ${bp.entities_to_cover.join(", ") || "none"}`);
          console.log(`  Faq seeds: ${(bp.faq_seeds || []).join("; ")}`);
          console.log(`  Approval gate: ${JSON.stringify(bp.approval_gate)}`);
          console.log(`  Original value: ${bp.original_value_mandate}`);
          break;
        }
        case "optimize": {
          const optSlug = flags.slug || flags.page || "";
          const { site } = await runSeoEngine();
          if (optSlug) {
            const opt = optimizeArticle(site, optSlug);
            if (!opt.available) { console.log(`No article "${optSlug}"`); break; }
            console.log(`\nOPTIMIZE: ${opt.title} [${opt.seo_quality}/100] priority ${opt.priority}/100`);
            opt.issues.forEach(i => console.log(`  [${i.action}] ${i.check}: ${i.fix}`));
            if (!opt.recommends_new_page && opt.issues.length > 0) console.log(`  Keep this URL — edit on-page only.`);
          } else {
            const batch = optimizeArticleBatch(site);
            console.log(`\nOPTIMIZE BATCH: ${batch.needs_attention} of ${batch.total} pages need attention`);
            batch.pages.filter(p => p.issues.length > 0).slice(0, 8).forEach(p => console.log(`  ${p.slug}: ${p.issues.length} issues (priority ${p.priority})`));
          }
          break;
        }
        case "authority": {
          const { topicalAuthorityMap } = await import("./seo/index.mjs");
          const { site } = await runSeoEngine();
          const a = topicalAuthorityMap(site);
          console.log(`\nTOPICAL AUTHORITY MAP (${a.clusters.length} clusters):`);
          a.clusters.forEach(c => console.log(`  ${c.cluster}: ${c.score}/100 (${c.tier}) | strategic ${c.strategic_importance} | ${c.verdict.action}`));
          break;
        }
        case "memory": {
          const mem = seoMemoryOverview();
          console.log(`\nSEO MEMORY:`);
          console.log(`  Recommendations: ${mem.total_recommendations} (pending: ${mem.pending_approval}, approved: ${mem.approved}, rejected: ${mem.rejected}, executed: ${mem.executed})`);
          mem.recent.forEach(r => console.log(`    ${r.id}: [${r.type}] ${r.slug || (r.pages || []).join(",")} = ${r.status} | ${(r.reason || "").slice(0, 60)}`));
          break;
        }
        case "approvals": {
          const pending = pendingApprovals();
          console.log(`\nPENDING APPROVALS (${pending.length}):`);
          pending.forEach(p => console.log(`  ${p.id}: [${p.type}] ${p.slug || (p.pages || []).join(",")} — ${p.reason}`));
          console.log(`\n  Approve with: node intelligence/cli.mjs seo-approve --id=<id>`);
          console.log(`  Reject with:  node intelligence/cli.mjs seo-reject --id=<id> --reason=...`);
          break;
        }
        case "experiment": {
          if (flags.create) {
            const ex = createExperiment({
              title: flags.name,
              hypothesis: flags.hypothesis,
              control: flags.control,
              variable: flags.variable,
              metric: flags.metric || "organic clicks",
              pages: (flags.pages || "").split(",").filter(Boolean)
            });
            console.log(`\nEXPERIMENT CREATED: ${ex.ok ? ex.experiment.id : ex.error}`);
          } else {
            const exps = listExperiments();
            console.log(`\nEXPERIMENTS (${exps.total}):`);
            exps.experiments.forEach(e => console.log(`  ${e.id}: [${e.status}] ${e.title} — vars ${e.variable} (metric ${e.metric})`));
          }
          break;
        }
        default:
          console.log(`\nSEOMAN USAGE:`);
          console.log(`  node intelligence/cli.mjs seo audit|report|opportunities`);
          console.log(`  node intelligence/cli.mjs seo keywords`);
          console.log(`  node intelligence/cli.mjs seo gaps`);
          console.log(`  node intelligence/cli.mjs seo cluster --topic="Commission Cuts"`);
          console.log(`  node intelligence/cli.mjs seo cannibalization`);
          console.log(`  node intelligence/cli.mjs seo competitors`);
          console.log(`  node intelligence/cli.mjs seo backlinks`);
          console.log(`  node intelligence/cli.mjs seo technical`);
          console.log(`  node intelligence/cli.mjs seo content-decay`);
          console.log(`  node intelligence/cli.mjs seo next-action`);
          console.log(`  node intelligence/cli.mjs seo blueprint --topic="..."`);
          console.log(`  node intelligence/cli.mjs seo optimize [--slug=amazon-2026-commission-cuts]`);
          console.log(`  node intelligence/cli.mjs seo authority`);
          console.log(`  node intelligence/cli.mjs seo memory`);
          console.log(`  node intelligence/cli.mjs seo approvals`);
          console.log(`  node intelligence/cli.mjs seo experiment [--create --name=... -hypothesis=... -control=... -variable=... -pages=a,b]`);
          break;
      }
      break;
    }

    // --- Approve/Reject approval-gated SEO actions ---
    case "seo-approve": {
      const { approveGate } = await import("./seo/index.mjs");
      const id = flags.id;
      if (!id) { console.log("Provide --id=<requirement_id>"); break; }
      const r = approveGate(id, flags.by || "human");
      console.log(`\n${r.ok ? `✅ APPROVED ${id}` : `❌ ${r.error}`}`);
      break;
    }
    case "seo-reject": {
      const { rejectGate } = await import("./seo/index.mjs");
      const id = flags.id;
      if (!id) { console.log("Provide --id=<requirement_id>"); break; }
      const r = rejectGate(id, flags.reason || "rejected via CLI");
      console.log(`\n${r.ok ? `❌ REJECTED ${id}` : `❌ ${r.error}`}`);
      break;
    }
    case "seo-experiment-status": {
      const { updateExperimentStatus } = await import("./seo/index.mjs");
      const id = flags.id;
      const status = flags.status;
      if (!id || !status) { console.log("Provide --id and --status (PLANNED|RUNNING|PAUSED|COMPLETED|REJECTED)"); break; }
      const r = updateExperimentStatus(id, { status, result_note: flags.note });
      console.log(`\n${r.ok ? `Experiment ${id} → ${status}` : r.error}`);
      break;
    }

    // --- v2.4.0 SEO COMMAND CENTER ---
    case "seo-dashboard": {
      const { SEOCommandCenter } = await import("./seo/orchestrator/seo_command_center.mjs");
      const cc = new SEOCommandCenter();
      const result = await cc.execute({ command: "dashboard" });
      console.log("\n" + JSON.stringify(result, null, 2));
      break;
    }
    case "seo-roadmap": {
      const { SEOCommandCenter } = await import("./seo/orchestrator/seo_command_center.mjs");
      const cc = new SEOCommandCenter();
      const result = await cc.execute({ command: "roadmap", args: {} }) || {};
      const stats = result.stats || {};
      console.log(`\nSEO CONTENT ROADMAP`);
      console.log(`  Total items: ${stats.total_items ?? 0}`);
      if (result.roadmap) {
        for (const [phase, items] of Object.entries(result.roadmap)) {
          if (items.length) console.log(`  ${phase}: ${items.length} items`);
        }
      }
      break;
    }
    case "seo-research": {
      const { SEOCommandCenter } = await import("./seo/orchestrator/seo_command_center.mjs");
      const cc = new SEOCommandCenter();
      const keyword = flags.keyword || flags.q || "Amazon affiliate";
      const result = await cc.execute({ command: "research", args: { keyword } }) || {};
      console.log(`\nKEYWORD RESEARCH: ${result.keyword || keyword}`);
      if (result.serp_analysis) {
        console.log(`  Intent: ${result.serp_analysis.dominant_intent} | Format: ${result.serp_analysis.dominant_page_type}`);
        console.log(`  Avg SERP depth: ${result.serp_analysis.avg_content_depth || "N/A"} words`);
        console.log(`  SERP features: ${(result.serp_analysis.serp_features || []).join(", ") || "none"}`);
      }
      if (result.opportunity) console.log(`  Opportunity score: ${result.opportunity.opportunity_score || 0}/100`);
      if (result.error) console.log(`  Error: ${result.error}`);
      break;
    }
    case "seo-rankings": {
      const { SEOCommandCenter } = await import("./seo/orchestrator/seo_command_center.mjs");
      const cc = new SEOCommandCenter();
      const result = await cc.execute({ command: "rankings" }) || {};
      const s = result.summary || {};
      console.log(`\nRANK TRACKING REPORT`);
      console.log(`  Tracked: ${s.total_tracked ?? 0} | Page 1: ${s.page_one ?? 0} | Top 3: ${s.top_three ?? 0}`);
      console.log(`  Avg position: ${(s.avg_position || 0).toFixed(1)}`);
      console.log(`  URL switching: ${s.url_switching_cases ?? 0} | Cannibalization: ${s.cannibalization_cases ?? 0}`);
      break;
    }
    case "seo-gsc": {
      const { SEOCommandCenter } = await import("./seo/orchestrator/seo_command_center.mjs");
      const { PROVENANCE, isRealData } = await import("./seo/orchestrator/provenance.mjs");
      const { formatGSCCReport, generateGSCCReport } = await import("./seo/orchestrator/gsc_report.mjs");
      const { getGSCFeedStatus } = await import("./seo/orchestrator/gsc_import.mjs");

      const cc = new SEOCommandCenter();
      const result = await cc.execute({ command: "gsc", args: {} }) || {};
      const prov = result.status?.provenance || PROVENANCE.UNAVAILABLE;

      console.log(`\nGOOGLE SEARCH CONSOLE`);
      const provLabel = prov === PROVENANCE.TEST ? "⚠️ TEST DATA" :
                        prov === PROVENANCE.IMPORTED ? "📥 IMPORTED" :
                        prov === PROVENANCE.LIVE ? "✅ LIVE" :
                        prov === PROVENANCE.ESTIMATED ? "📊 ESTIMATED" :
                        "❌ UNAVAILABLE";
      console.log(`  Provenance: ${provLabel}`);
      if (result.status?.meta?.date_range) {
        console.log(`  Date range: ${result.status.meta.date_range.start} → ${result.status.meta.date_range.end}`);
      }
      if (result.report) {
        const r = result.report;
        if (r.summary) {
          console.log(`  Queries: ${r.summary.total_queries} | Pages: ${r.summary.total_pages}`);
          console.log(`  Clicks: ${r.summary.total_clicks.toLocaleString()} | Impressions: ${r.summary.total_impressions.toLocaleString()}`);
          console.log(`  Avg CTR: ${(r.summary.avg_ctr * 100).toFixed(2)}% | Avg position: ${r.summary.avg_position !== null ? r.summary.avg_position.toFixed(1) : "DATA_UNAVAILABLE"}`);
        }
        if (r.opportunities?.length > 0) {
          console.log(`\n  TOP ${Math.min(10, r.opportunities.length)} SEO OPPORTUNITIES:`);
          r.opportunities.slice(0, 10).forEach((o, i) => {
            const actionLabel = o.recommended_action === "CREATE" ? "📄 CREATE" :
                                o.recommended_action === "OPTIMIZE" ? "🔧 OPTIMIZE" :
                                o.recommended_action === "EXPAND" ? "📈 EXPAND" :
                                o.recommended_action === "MERGE" ? "🔗 MERGE" : o.recommended_action;
            console.log(`  ${i+1}. [${actionLabel}] ${o.query} (pos: ${o.position ?? "?"}, CTR: ${typeof o.ctr === "number" ? (o.ctr*100).toFixed(1)+"%" : o.ctr})`);
          });
          console.log(`  → Run: node intelligence/cli.mjs seo-gsc-report  for full report`);
        }
      } else {
        const s = result.summary || result.report?.summary || {};
        console.log(`  Feed available: ${s.feed_available ?? false}`);
        console.log(`  Total queries: ${s.total_queries ?? 0} | Impressions: ${s.total_impressions ?? 0}`);
        console.log(`  Striking distance: ${s.striking_distance ?? 0} | CTR opportunities: ${s.ctr_opportunities ?? 0}`);
      }
      if (prov === PROVENANCE.UNAVAILABLE) {
        console.log(`\n  → No GSC data. Run: node intelligence/cli.mjs seo-import-gsc --path=<file> --property=https://example.com`);
      }
      if (prov === PROVENANCE.TEST) {
        console.log(`\n  ⚠️ WARNING: This is TEST data. Import real GSC export before making decisions.`);
      }
      break;
    }
    case "seo-gsc-report": {
      const { formatGSCCReport } = await import("./seo/orchestrator/gsc_report.mjs");
      const { getGSCReport } = await import("./seo/orchestrator/gsc_report.mjs");
      const { PROVENANCE } = await import("./seo/orchestrator/provenance.mjs");
      const { report, status } = getGSCReport();
      const prov = report.data_source_status || PROVENANCE.UNAVAILABLE;
      if (prov === PROVENANCE.UNAVAILABLE || prov === PROVENANCE.TEST) {
        console.log(`\n${formatGSCCReport(report)}`);
        if (prov === PROVENANCE.TEST) console.log(`\n⚠️ WARNING: This report contains TEST DATA. Import real GSC data to see live results.`);
        break;
      }
      console.log(formatGSCCReport(report));
      break;
    }
    case "seo-import-gsc": {
      const { importGSCFeed } = await import("./seo/orchestrator/gsc_import.mjs");
      const { PROVENANCE } = await import("./seo/orchestrator/provenance.mjs");
      const inputPath = flags.path || flags.file;
      if (!inputPath) {
        console.log(`\nUsage: node intelligence/cli.mjs seo-import-gsc --path=<gsc_export.json> --property=https://yoursite.com`);
        console.log(`\nRequired JSON format: { queries: [{ query, page, clicks, impressions, ctr, position }] }`);
        console.log(`\nTo export from GSC:`);
        console.log(`  1. GSC Web UI → Search results → Export as JSON`);
        console.log(`  2. Or use: gsc-api-export --dimensions=query,page --startDate=2024-01-01 --endDate=2024-12-31`);
        break;
      }
      console.log(`\n[SEOGSC Import] Validating ${inputPath}...`);
      const result = await importGSCFeed({ feedPath: inputPath, propertyUrl: flags.property || null });
      if (!result.ok) {
        console.log(`\n❌ Import FAILED: ${result.error}`);
        if (result.validation?.errors?.length) {
          console.log(`  Errors (${result.validation.errors.length}):`);
          result.validation.errors.slice(0, 5).forEach(e => console.log(`    [${e.code}] ${e.message} (row ${e.row})`));
        }
        break;
      }
      const prov = result.meta?.provenance || PROVENANCE.IMPORTED;
      const provLabel = prov === PROVENANCE.TEST ? "TEST" : prov;
      console.log(`\n✅ GSC import SUCCESSFUL`);
      console.log(`  Provenance: ${provLabel}`);
      console.log(`  Queries imported: ${result.meta.total_queries}`);
      console.log(`  Date range: ${result.meta.date_range?.start} → ${result.meta.date_range?.end}`);
      console.log(`  Total impressions: ${result.meta.total_impressions.toLocaleString()}`);
      console.log(`  Total clicks: ${result.meta.total_clicks.toLocaleString()}`);
      if (result.skipped > 0) console.log(`  ⚠️ Skipped records: ${result.skipped}`);
      console.log(`\n  Next steps:`);
      console.log(`  → node intelligence/cli.mjs seo-gsc`);
      console.log(`  → node intelligence/cli.mjs seo-gsc-report`);
      console.log(`  → node intelligence/cli.mjs seo-dashboard`);
      break;
    }
    case "seo-full-report": {
      const { SEOCommandCenter } = await import("./seo/orchestrator/seo_command_center.mjs");
      const cc = new SEOCommandCenter();
      const result = await cc.execute({ command: "full-report" });
      console.log("\n" + JSON.stringify(result, null, 2));
      break;
    }
    case "seo-next-actions": {
      const { SEOCommandCenter } = await import("./seo/orchestrator/seo_command_center.mjs");
      const cc = new SEOCommandCenter();
      const result = await cc.execute({ command: "next-actions" });
      console.log(`\nSEO NEXT ACTIONS`);
      result.next_actions?.forEach(a => console.log(`  [${a.action}] ${a.count} items — ${a.reason}`));
      if (!result.next_actions?.length) console.log("  No next actions generated yet — add GSC feed for data");
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
      console.log(`  node intelligence/cli.mjs editorial --topic="Amazon Affiliate Marketing"`);
      console.log(`  node intelligence/cli.mjs relationships --slug="calculator"`);
      console.log(`  node intelligence/cli.mjs collections`);
      console.log(`  node intelligence/cli.mjs network-health`);
      console.log(`  node intelligence/cli.mjs seo [audit|keywords|gaps|cluster|cannibalization|competitors|backlinks|technical|content-decay|next-action|blueprint|optimize|authority|memory|approvals|experiment]`);
      console.log(`  node intelligence/cli.mjs seo-dashboard | seo-roadmap | seo-research --keyword="..." | seo-rankings | seo-gsc | seo-full-report | seo-next-actions`);
      console.log(`  node intelligence/cli.mjs seo-approve --id=<id>`);
      console.log(`  node intelligence/cli.mjs seo-reject --id=<id> --reason=...`);
      console.log(`  node intelligence/cli.mjs seo-experiment-status --id=<id> --status=RUNNING`);
      console.log(`  node intelligence/cli.mjs example [--action=add --type=blog --status=approved ...]`);
      console.log(`  node intelligence/cli.mjs admin [--threshold-blog=85 --threshold-design=85]`);
      break;
    }
  }

  console.log(`==================================================\n`);
}

main().catch(err => { console.error(`❌ CLI Error:`, err); process.exit(1); });
